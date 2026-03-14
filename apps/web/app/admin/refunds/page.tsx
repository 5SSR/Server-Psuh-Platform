"use client";

import { useCallback, useEffect, useState } from 'react';

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

export default function AdminRefundsPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('PENDING');
  const [items, setItems] = useState<RefundRecord[]>([]);
  const [remarks, setRemarks] = useState<Record<string, string>>({});

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
    <main className="page">
      <header className="section-head">
        <div>
          <p className="eyebrow">管理员中心</p>
          <h1>退款审核</h1>
        </div>
        <button className="secondary" onClick={load} disabled={loading}>
          {loading ? '刷新中...' : '刷新'}
        </button>
      </header>

      <div className="actions">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="PENDING">待审核</option>
          <option value="APPROVED">已通过</option>
          <option value="REJECTED">已拒绝</option>
          <option value="">全部</option>
        </select>
      </div>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      {items.length === 0 ? (
        <p className="muted">暂无退款记录</p>
      ) : (
        <div className="cards">
          {items.map((item) => (
            <article className="card" key={item.id}>
              <div className="card-header">
                <div>
                  <h3>订单 {item.orderId}</h3>
                  <p className="muted">申请人：{item.applicantId}</p>
                </div>
                <span className="pill">{statusLabel[item.status] || item.status}</span>
              </div>
              <p className="muted">金额：¥{Number(item.amount).toFixed(2)}</p>
              <p className="muted">原因：{item.reason}</p>
              <p className="muted">申请时间：{new Date(item.createdAt).toLocaleString('zh-CN')}</p>
              {item.status === 'PENDING' && (
                <>
                  <div className="form">
                    <label>审核备注（可选）</label>
                    <input
                      value={remarks[item.orderId] || ''}
                      onChange={(e) =>
                        setRemarks((prev) => ({
                          ...prev,
                          [item.orderId]: e.target.value
                        }))
                      }
                      placeholder="填写处理意见"
                    />
                  </div>
                  <div className="actions">
                    <button onClick={() => decision(item.orderId, 'APPROVED')} disabled={loading}>
                      通过退款
                    </button>
                    <button
                      onClick={() => decision(item.orderId, 'REJECTED')}
                      disabled={loading}
                      className="secondary"
                    >
                      拒绝退款
                    </button>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
