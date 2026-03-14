"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type SettlementItem = {
  id: string;
  orderId: string;
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
  } | null;
};

type SettlementStats = {
  totalCount: number;
  totalAmount: number | string;
  totalFee: number | string;
};

const statusLabel: Record<string, string> = {
  PENDING: '待放款',
  RELEASED: '已放款',
  REJECTED: '已拒绝'
};

export default function SellerSettlementsPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [list, setList] = useState<SettlementItem[]>([]);
  const [stats, setStats] = useState<SettlementStats>({
    totalCount: 0,
    totalAmount: 0,
    totalFee: 0
  });

  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null;
  const netIncome = useMemo(() => {
    return Number(stats.totalAmount || 0) - Number(stats.totalFee || 0);
  }, [stats.totalAmount, stats.totalFee]);

  const load = useCallback(async () => {
    if (!token) {
      setError('请先登录用户账号');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(
        `${API_BASE}/wallet/settlements?page=1&pageSize=30${status ? `&status=${status}` : ''}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取结算记录失败');
      setList(data.list || []);
      setStats(
        data.stats || {
          totalCount: 0,
          totalAmount: 0,
          totalFee: 0
        }
      );
    } catch (e: any) {
      setError(e.message || '读取失败');
    } finally {
      setLoading(false);
    }
  }, [status, token]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="page">
      <header className="section-head">
        <div>
          <p className="eyebrow">用户财务</p>
          <h1>我的结算记录</h1>
        </div>
        <button onClick={load} className="secondary" disabled={loading}>
          {loading ? '刷新中...' : '刷新'}
        </button>
      </header>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <section className="detail-grid">
        <article className="card">
          <h3>累计结算金额</h3>
          <p className="price-lg">¥{Number(stats.totalAmount || 0).toFixed(2)}</p>
        </article>
        <article className="card">
          <h3>累计手续费</h3>
          <p className="price-lg">¥{Number(stats.totalFee || 0).toFixed(2)}</p>
        </article>
        <article className="card">
          <h3>累计净收入</h3>
          <p className="price-lg">¥{netIncome.toFixed(2)}</p>
          <p className="muted">累计单量：{stats.totalCount}</p>
        </article>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="section-head">
          <h3>结算明细</h3>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">全部</option>
            <option value="PENDING">待放款</option>
            <option value="RELEASED">已放款</option>
            <option value="REJECTED">已拒绝</option>
          </select>
        </div>

        {list.length === 0 ? (
          <p className="muted">暂无结算记录</p>
        ) : (
          <div className="cards">
            {list.map((item) => (
              <article className="card nested" key={item.id}>
                <div className="card-header">
                  <div>
                    <h3>{item.order?.product?.title || '未知商品'}</h3>
                    <p className="muted">订单号：{item.orderId}</p>
                  </div>
                  <span className="pill">{statusLabel[item.status] || item.status}</span>
                </div>
                <p className="muted">买家：{item.order?.buyer?.email || '-'}</p>
                <p className="muted">结算金额：¥{Number(item.amount).toFixed(2)}</p>
                <p className="muted">手续费：¥{Number(item.fee).toFixed(2)}</p>
                <p className="muted">
                  净到账：¥{(Number(item.amount) - Number(item.fee)).toFixed(2)}
                </p>
                <p className="muted">创建时间：{new Date(item.createdAt).toLocaleString('zh-CN')}</p>
                {item.releasedAt && (
                  <p className="muted">放款时间：{new Date(item.releasedAt).toLocaleString('zh-CN')}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
