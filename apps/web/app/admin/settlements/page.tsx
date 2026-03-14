"use client";

import { useCallback, useEffect, useState } from 'react';

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

export default function AdminSettlementsPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('PENDING');
  const [list, setList] = useState<SettlementItem[]>([]);
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
    <main className="page">
      <header className="section-head">
        <div>
          <p className="eyebrow">管理员财务</p>
          <h1>结算放款</h1>
        </div>
        <button className="secondary" onClick={load} disabled={loading}>
          {loading ? '刷新中...' : '刷新'}
        </button>
      </header>

      <div className="actions">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="PENDING">待放款</option>
          <option value="RELEASED">已放款</option>
          <option value="REJECTED">已拒绝</option>
          <option value="">全部</option>
        </select>
      </div>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      {list.length === 0 ? (
        <p className="muted">暂无结算记录</p>
      ) : (
        <div className="cards">
          {list.map((item) => (
            <article className="card" key={item.id}>
              <div className="card-header">
                <div>
                  <h3>{item.order?.product?.title || '未知商品'}</h3>
                  <p className="muted">订单号：{item.orderId}</p>
                </div>
                <span className="pill">{statusLabel[item.status] || item.status}</span>
              </div>
              <p className="muted">买家：{item.order?.buyer?.email || '-'}</p>
              <p className="muted">卖家：{item.order?.seller?.email || item.sellerId}</p>
              <p className="muted">结算金额：¥{Number(item.amount).toFixed(2)}</p>
              <p className="muted">手续费：¥{Number(item.fee).toFixed(2)}</p>
              <p className="muted">净放款：¥{(Number(item.amount) - Number(item.fee)).toFixed(2)}</p>
              <p className="muted">创建时间：{new Date(item.createdAt).toLocaleString('zh-CN')}</p>
              {item.releasedAt && (
                <p className="muted">放款时间：{new Date(item.releasedAt).toLocaleString('zh-CN')}</p>
              )}

              {item.status === 'PENDING' && (
                <>
                  <div className="form">
                    <label>放款备注（可选）</label>
                    <input
                      value={remarks[item.orderId] || ''}
                      onChange={(e) =>
                        setRemarks((prev) => ({
                          ...prev,
                          [item.orderId]: e.target.value
                        }))
                      }
                      placeholder="例如：人工核对通过"
                    />
                  </div>
                  <div className="actions">
                    <button onClick={() => release(item.orderId)} disabled={loading}>
                      执行放款
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
