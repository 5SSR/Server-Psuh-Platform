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

type RefundRecord = {
  id: string;
  orderId: string;
  applicantId: string;
  reason: string;
  amount: number | string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
};

const statusLabel: Record<string, string> = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已拒绝'
};

function statusTone(status: string) {
  if (status === 'APPROVED') return 'success' as const;
  if (status === 'REJECTED') return 'danger' as const;
  return 'warning' as const;
}

export default function AdminRefundsPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('PENDING');
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<RefundRecord[]>([]);
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
        `${API_BASE}/admin/refunds?page=1&pageSize=30${status ? `&status=${status}` : ''}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取退款列表失败');
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
        item.orderId.toLowerCase().includes(key) ||
        item.applicantId.toLowerCase().includes(key) ||
        item.reason.toLowerCase().includes(key)
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

  const decision = async (orderId: string, action: 'APPROVED' | 'REJECTED') => {
    if (!token) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}/refund`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          decision: action,
          remark: remarks[orderId] || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '审核失败');
      setMessage(action === 'APPROVED' ? '退款审核通过并已执行退款' : '退款申请已拒绝');
      await load();
    } catch (e: any) {
      setError(e.message || '审核失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page page-shell admin-console-page">
      <ConsolePageHeader
        eyebrow="管理后台 · 退款审核"
        title="退款工单处理"
        description="统一处理退款申请，沉淀审核记录，保障担保交易资金回退流程清晰可追溯。"
        tags={[
          { label: '担保退款流程', tone: 'info' },
          { label: '风控审核', tone: 'warning' },
          { label: `记录 ${items.length} 条`, tone: 'default' }
        ]}
        actions={
          <button className="btn secondary" onClick={load} disabled={loading}>
            {loading ? '刷新中...' : '刷新列表'}
          </button>
        }
      />

      <ConsolePanel title="筛选区" className="stack-12">
        <div className="console-filter-grid">
          <div className="field">
            <label>退款状态</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="PENDING">待审核</option>
              <option value="APPROVED">已通过</option>
              <option value="REJECTED">已拒绝</option>
              <option value="">全部</option>
            </select>
          </div>
          <div className="field">
            <label>关键词</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="订单号 / 申请人 / 退款原因"
            />
          </div>
          <div className="field">
            <label>交易模式</label>
            <input value="担保托管" disabled />
          </div>
          <div className="field">
            <label>处理维度</label>
            <input value="金额 + 原因 + 风险说明" disabled />
          </div>
        </div>
      </ConsolePanel>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <ConsolePanel title="表格区 · 退款申请" className="stack-12">
        {filteredItems.length === 0 ? (
          <ConsoleEmpty text={loading ? '加载中...' : '暂无退款记录'} />
        ) : (
          <div className="console-table-wrap">
            <table className="console-table">
              <thead>
                <tr>
                  <th>工单 / 订单</th>
                  <th>申请人</th>
                  <th>退款原因</th>
                  <th>金额</th>
                  <th>状态</th>
                  <th>申请时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="console-row-primary">{item.id}</div>
                      <p className="console-row-sub">订单：{item.orderId}</p>
                    </td>
                    <td>
                      <div className="console-row-primary">{item.applicantId}</div>
                      <p className="console-row-sub">退款发起方</p>
                    </td>
                    <td>
                      <div className="console-row-primary">{item.reason}</div>
                    </td>
                    <td>
                      <div className="console-row-primary">{formatMoney(item.amount)}</div>
                    </td>
                    <td>
                      <StatusBadge tone={statusTone(item.status)}>{statusLabel[item.status] || item.status}</StatusBadge>
                    </td>
                    <td>{formatDateTime(item.createdAt)}</td>
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
        description="确认退款原因与证据后执行通过或拒绝，处理备注将用于售后与纠纷追溯。"
        className="console-detail stack-12"
      >
        {!selectedItem ? (
          <ConsoleEmpty text="请选择一条退款工单进行处理" />
        ) : (
          <>
            <div className="console-detail-grid">
              <div className="spec-item">
                <p className="label">退款工单</p>
                <p className="value">{selectedItem.id}</p>
              </div>
              <div className="spec-item">
                <p className="label">关联订单</p>
                <p className="value">{selectedItem.orderId}</p>
              </div>
              <div className="spec-item">
                <p className="label">退款金额</p>
                <p className="value">{formatMoney(selectedItem.amount)}</p>
              </div>
              <div className="spec-item">
                <p className="label">当前状态</p>
                <p className="value">{statusLabel[selectedItem.status] || selectedItem.status}</p>
              </div>
            </div>

            <div className="console-alert">
              审核建议：确认交付记录、核验结果与买家诉求是否一致，避免误退或漏退。
            </div>

            <p className="muted">退款原因：{selectedItem.reason}</p>

            <div className="form">
              <label>审核备注（可选）</label>
              <textarea
                value={remarks[selectedItem.orderId] || ''}
                onChange={(e) =>
                  setRemarks((prev) => ({
                    ...prev,
                    [selectedItem.orderId]: e.target.value
                  }))
                }
                rows={4}
                placeholder="例如：核验记录支持退款，金额一致，执行原路退回"
              />
            </div>

            {selectedItem.status === 'PENDING' ? (
              <div className="actions">
                <button className="btn primary" onClick={() => decision(selectedItem.orderId, 'APPROVED')} disabled={loading}>
                  通过退款
                </button>
                <button className="btn secondary" onClick={() => decision(selectedItem.orderId, 'REJECTED')} disabled={loading}>
                  拒绝退款
                </button>
              </div>
            ) : (
              <p className="muted">该退款工单已处理完成，无需重复操作。</p>
            )}
          </>
        )}
      </ConsolePanel>
    </main>
  );
}
