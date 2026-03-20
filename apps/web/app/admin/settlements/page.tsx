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

type SettlementItem = {
  id: string;
  orderId: string;
  sellerId: string;
  amount: number | string;
  fee: number | string;
  status: 'PENDING' | 'RELEASED' | 'REJECTED';
  releasedAt?: string | null;
  createdAt: string;
  order?: {
    id: string;
    status: string;
    product?: {
      title: string;
      code: string;
    } | null;
    buyer?: {
      email: string;
    } | null;
    seller?: {
      email: string;
    } | null;
  } | null;
};

const statusLabel: Record<string, string> = {
  PENDING: '待放款',
  RELEASED: '已放款',
  REJECTED: '已拒绝'
};

function statusTone(status: string) {
  if (status === 'RELEASED') return 'success' as const;
  if (status === 'REJECTED') return 'danger' as const;
  return 'warning' as const;
}

export default function AdminSettlementsPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('PENDING');
  const [keyword, setKeyword] = useState('');
  const [list, setList] = useState<SettlementItem[]>([]);
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
        `${API_BASE}/admin/settlements?page=1&pageSize=30${status ? `&status=${status}` : ''}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取结算列表失败');
      setList(data.list || []);
    } catch (e: any) {
      setError(e.message || '读取失败');
    } finally {
      setLoading(false);
    }
  }, [status, token]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredList = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    if (!key) return list;
    return list.filter((item) => {
      return (
        item.orderId.toLowerCase().includes(key) ||
        item.sellerId.toLowerCase().includes(key) ||
        (item.order?.product?.title || '').toLowerCase().includes(key) ||
        (item.order?.buyer?.email || '').toLowerCase().includes(key) ||
        (item.order?.seller?.email || '').toLowerCase().includes(key)
      );
    });
  }, [list, keyword]);

  useEffect(() => {
    if (!filteredList.length) {
      setSelectedId('');
      return;
    }
    if (!selectedId || !filteredList.find((item) => item.id === selectedId)) {
      setSelectedId(filteredList[0].id);
    }
  }, [filteredList, selectedId]);

  const selectedItem = filteredList.find((item) => item.id === selectedId) || null;

  const release = async (orderId: string) => {
    if (!token) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/settlements/${orderId}/release`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          remark: remarks[orderId] || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '放款失败');
      setMessage('放款成功，订单已完成');
      await load();
    } catch (e: any) {
      setError(e.message || '放款失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page page-shell admin-console-page">
      <ConsolePageHeader
        eyebrow="管理后台 · 结算放款"
        title="结算与放款管理"
        description="审核完成后执行卖家放款，统一沉淀结算备注，确保资金流转可追溯。"
        tags={[
          { label: '担保结算', tone: 'info' },
          { label: '放款审核', tone: 'warning' },
          { label: `记录 ${list.length} 条`, tone: 'default' }
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
            <label>结算状态</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="PENDING">待放款</option>
              <option value="RELEASED">已放款</option>
              <option value="REJECTED">已拒绝</option>
              <option value="">全部</option>
            </select>
          </div>
          <div className="field">
            <label>关键词</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="订单号 / 卖家 / 商品 / 邮箱"
            />
          </div>
          <div className="field">
            <label>流程模式</label>
            <input value="确认后放款" disabled />
          </div>
          <div className="field">
            <label>风控关注</label>
            <input value="异常订单禁止放款" disabled />
          </div>
        </div>
      </ConsolePanel>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <ConsolePanel title="表格区 · 结算记录" className="stack-12">
        {filteredList.length === 0 ? (
          <ConsoleEmpty text={loading ? '加载中...' : '暂无结算记录'} />
        ) : (
          <div className="console-table-wrap">
            <table className="console-table console-table-mobile">
              <thead>
                <tr>
                  <th>结算单 / 订单</th>
                  <th>买家 / 卖家</th>
                  <th>金额 / 手续费</th>
                  <th>净放款</th>
                  <th>状态</th>
                  <th>时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item) => (
                  <tr key={item.id}>
                    <td data-label="结算单 / 订单">
                      <div className="console-row-primary">{item.id}</div>
                      <p className="console-row-sub">订单：{item.orderId}</p>
                      <p className="console-row-sub">{item.order?.product?.title || '未知商品'}</p>
                    </td>
                    <td data-label="买家 / 卖家">
                      <div className="console-row-primary">买家：{item.order?.buyer?.email || '-'}</div>
                      <p className="console-row-sub">卖家：{item.order?.seller?.email || item.sellerId}</p>
                    </td>
                    <td data-label="金额 / 手续费">
                      <div className="console-row-primary">{formatMoney(item.amount)}</div>
                      <p className="console-row-sub">手续费：{formatMoney(item.fee)}</p>
                    </td>
                    <td data-label="净放款">
                      <div className="console-row-primary">{formatMoney(Number(item.amount) - Number(item.fee))}</div>
                    </td>
                    <td data-label="状态">
                      <StatusBadge tone={statusTone(item.status)}>{statusLabel[item.status] || item.status}</StatusBadge>
                    </td>
                    <td data-label="时间">
                      <div className="console-row-primary">创建：{formatDateTime(item.createdAt)}</div>
                      <p className="console-row-sub">放款：{item.releasedAt ? formatDateTime(item.releasedAt) : '未放款'}</p>
                    </td>
                    <td data-label="操作">
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
        description="确认订单已满足结算条件后执行放款，处理备注建议保留财务核验说明。"
        className="console-detail stack-12"
      >
        {!selectedItem ? (
          <ConsoleEmpty text="请选择一条结算记录进行处理" />
        ) : (
          <>
            <div className="console-detail-grid">
              <div className="spec-item">
                <p className="label">结算单号</p>
                <p className="value">{selectedItem.id}</p>
              </div>
              <div className="spec-item">
                <p className="label">关联订单</p>
                <p className="value">{selectedItem.orderId}</p>
              </div>
              <div className="spec-item">
                <p className="label">净放款金额</p>
                <p className="value">{formatMoney(Number(selectedItem.amount) - Number(selectedItem.fee))}</p>
              </div>
              <div className="spec-item">
                <p className="label">状态</p>
                <p className="value">{statusLabel[selectedItem.status] || selectedItem.status}</p>
              </div>
            </div>

            <div className="console-alert">
              放款建议：仅对已完成核验、无纠纷或退款风险的订单执行放款，避免错误结算。
            </div>

            <div className="form">
              <label>放款备注（可选）</label>
              <textarea
                value={remarks[selectedItem.orderId] || ''}
                onChange={(e) =>
                  setRemarks((prev) => ({
                    ...prev,
                    [selectedItem.orderId]: e.target.value
                  }))
                }
                rows={4}
                placeholder="例如：人工核对通过，结算放款执行成功"
              />
            </div>

            {selectedItem.status === 'PENDING' ? (
              <div className="actions">
                <button className="btn primary" onClick={() => release(selectedItem.orderId)} disabled={loading}>
                  执行放款
                </button>
              </div>
            ) : (
              <p className="muted">该结算记录当前不可放款。</p>
            )}
          </>
        )}
      </ConsolePanel>
    </main>
  );
}
