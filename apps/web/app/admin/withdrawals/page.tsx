"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ConsoleEmpty,
  ConsolePageHeader,
  ConsolePanel,
  StatusBadge,
  formatDateTime,
  formatMoney
} from '../../../components/admin/console-primitives';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type Withdrawal = {
  id: string;
  amount: number | string;
  fee: number | string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  channel: string;
  accountInfo: string;
  createdAt: string;
  wallet: {
    user: {
      id: string;
      email: string;
      role: string;
    };
  };
};

const statusLabel: Record<string, string> = {
  pending: '待审核',
  approved: '待打款',
  paid: '已打款',
  rejected: '已驳回'
};

const roleLabel: Record<string, string> = {
  USER: '普通用户',
  ADMIN: '管理员'
};

function statusTone(status: string) {
  if (status === 'paid') return 'success' as const;
  if (status === 'rejected') return 'danger' as const;
  if (status === 'approved') return 'info' as const;
  return 'warning' as const;
}

export default function AdminWithdrawalsPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('pending');
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null;

  const load = useCallback(async () => {
    if (!token) {
      setError('请先登录管理员账号');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(
        `${API_BASE}/admin/withdrawals?page=1&pageSize=30${status ? `&status=${status}` : ''}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取提现列表失败');
      setItems(data.list || []);
    } catch (e: any) {
      setError(e.message || '读取失败');
    } finally {
      setLoading(false);
    }
  }, [status, token]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredItems = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    if (!key) return items;
    return items.filter((item) => {
      return (
        item.id.toLowerCase().includes(key) ||
        item.wallet?.user?.id.toLowerCase().includes(key) ||
        item.wallet?.user?.email.toLowerCase().includes(key) ||
        item.channel.toLowerCase().includes(key)
      );
    });
  }, [items, keyword]);

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedId('');
      return;
    }
    if (!selectedId || !filteredItems.find((item) => item.id === selectedId)) {
      setSelectedId(filteredItems[0].id);
    }
  }, [filteredItems, selectedId]);

  const selectedItem = filteredItems.find((item) => item.id === selectedId) || null;

  const decide = async (id: string, action: 'APPROVED' | 'REJECTED' | 'PAID') => {
    if (!token) return;
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/withdrawals/${id}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          remark: remarks[id] || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '处理失败');
      setMessage(data.message || '处理成功');
      await load();
    } catch (e: any) {
      setError(e.message || '处理失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page page-shell admin-console-page">
      <ConsolePageHeader
        eyebrow="管理后台 · 提现审核"
        title="提现审核与打款管理"
        description="核对提现申请与账户信息，按流程执行通过、驳回或打款完成，保障结算资金安全。"
        tags={[
          { label: '结算资金', tone: 'info' },
          { label: '提现风控', tone: 'warning' },
          { label: `记录 ${items.length} 条`, tone: 'default' }
        ]}
        actions={
          <button onClick={load} className="btn secondary" disabled={loading}>
            {loading ? '刷新中...' : '刷新列表'}
          </button>
        }
      />

      <ConsolePanel title="筛选区" className="stack-12">
        <div className="console-filter-grid">
          <div className="field">
            <label>提现状态</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="pending">待审核</option>
              <option value="approved">待打款</option>
              <option value="paid">已打款</option>
              <option value="rejected">已驳回</option>
            </select>
          </div>
          <div className="field">
            <label>关键词</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="提现单号 / 用户ID / 邮箱 / 渠道"
            />
          </div>
          <div className="field">
            <label>处理策略</label>
            <input value="审核通过后再打款" disabled />
          </div>
          <div className="field">
            <label>安全要求</label>
            <input value="备注留痕 + 状态闭环" disabled />
          </div>
        </div>
      </ConsolePanel>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <ConsolePanel title="表格区 · 提现申请" className="stack-12">
        {filteredItems.length === 0 ? (
          <ConsoleEmpty text={loading ? '加载中...' : '暂无提现记录'} />
        ) : (
          <div className="console-table-wrap">
            <table className="console-table">
              <thead>
                <tr>
                  <th>提现单号</th>
                  <th>用户</th>
                  <th>金额 / 手续费</th>
                  <th>净打款</th>
                  <th>渠道</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="console-row-primary">{item.id}</div>
                      <p className="console-row-sub">{formatDateTime(item.createdAt)}</p>
                    </td>
                    <td>
                      <div className="console-row-primary">{item.wallet?.user?.email || '-'}</div>
                      <p className="console-row-sub">{roleLabel[item.wallet?.user?.role] || item.wallet?.user?.role}</p>
                    </td>
                    <td>
                      <div className="console-row-primary">{formatMoney(item.amount)}</div>
                      <p className="console-row-sub">手续费：{formatMoney(item.fee)}</p>
                    </td>
                    <td>
                      <div className="console-row-primary">{formatMoney(Number(item.amount) - Number(item.fee))}</div>
                    </td>
                    <td>
                      <div className="console-row-primary">{item.channel}</div>
                    </td>
                    <td>
                      <StatusBadge tone={statusTone(item.status)}>{statusLabel[item.status] || item.status}</StatusBadge>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className={`btn ${selectedId === item.id ? 'primary' : 'secondary'} btn-sm`}
                      >
                        {selectedId === item.id ? '处理中' : '处理'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ConsolePanel>

      <ConsolePanel
        title="详情操作区"
        description="核验收款信息后执行流程动作，所有审批备注均建议填写以便财务审计。"
        className="console-detail stack-12"
      >
        {!selectedItem ? (
          <ConsoleEmpty text="请选择一条提现申请进行处理" />
        ) : (
          <>
            <div className="console-detail-grid">
              <div className="spec-item">
                <p className="label">提现单号</p>
                <p className="value">{selectedItem.id}</p>
              </div>
              <div className="spec-item">
                <p className="label">申请用户</p>
                <p className="value">{selectedItem.wallet?.user?.email || '-'}</p>
              </div>
              <div className="spec-item">
                <p className="label">净打款金额</p>
                <p className="value">{formatMoney(Number(selectedItem.amount) - Number(selectedItem.fee))}</p>
              </div>
              <div className="spec-item">
                <p className="label">当前状态</p>
                <p className="value">{statusLabel[selectedItem.status] || selectedItem.status}</p>
              </div>
            </div>

            <div className="console-alert">
              审核建议：确认账户信息准确、提现申请与冻结资金匹配后再进入打款流程。
            </div>

            <p className="muted">收款账户：{selectedItem.accountInfo}</p>

            <div className="form">
              <label>处理备注（可选）</label>
              <textarea
                value={remarks[selectedItem.id] || ''}
                onChange={(e) =>
                  setRemarks((prev) => ({
                    ...prev,
                    [selectedItem.id]: e.target.value
                  }))
                }
                rows={4}
                placeholder="例如：银行信息核验通过，已安排财务打款"
              />
            </div>

            <div className="actions">
              {selectedItem.status === 'pending' && (
                <>
                  <button className="btn primary" onClick={() => decide(selectedItem.id, 'APPROVED')} disabled={loading}>
                    审核通过
                  </button>
                  <button className="btn secondary" onClick={() => decide(selectedItem.id, 'REJECTED')} disabled={loading}>
                    驳回申请
                  </button>
                </>
              )}
              {selectedItem.status === 'approved' && (
                <>
                  <button className="btn primary" onClick={() => decide(selectedItem.id, 'PAID')} disabled={loading}>
                    标记打款完成
                  </button>
                  <button className="btn secondary" onClick={() => decide(selectedItem.id, 'REJECTED')} disabled={loading}>
                    驳回并退回
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </ConsolePanel>
    </main>
  );
}
