"use client";

import { useCallback, useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type Overview = {
  range: { days: number; since: string };
  users: {
    total: number;
    active: number;
    banned: number;
    sellers: number;
    buyers: number;
    newInRange: number;
  };
  products: {
    byStatus: Record<string, number>;
    newInRange: number;
  };
  orders: {
    byStatus: Record<string, number>;
    newInRange: number;
    paidAmountInRange: number;
  };
  finance: {
    settlementPendingAmount: number;
    settlementPendingFee: number;
    settlementReleasedAmount: number;
    settlementReleasedFee: number;
    withdrawalPendingAmount: number;
    withdrawalPendingFee: number;
  };
  risk: {
    refundPendingCount: number;
    disputeOpenCount: number;
    kycPendingCount: number;
    sellerAppPendingCount: number;
    failedLogin24h: number;
  };
  recentOrders: Array<{
    id: string;
    status: string;
    price: number | string;
    createdAt: string;
    product?: { title?: string };
    buyer?: { email?: string };
    seller?: { email?: string };
  }>;
};

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [days, setDays] = useState('30');
  const [data, setData] = useState<Overview | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null;

  const load = useCallback(async () => {
    if (!token) {
      setError('请先登录管理员账号');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/dashboard/overview?days=${Number(days) || 30}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || '读取看板失败');
      setData(json);
    } catch (e: any) {
      setError(e.message || '读取失败');
    } finally {
      setLoading(false);
    }
  }, [days, token]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="page">
      <header className="section-head">
        <div>
          <p className="eyebrow">管理员运营</p>
          <h1>运营总览看板</h1>
        </div>
        <div className="actions">
          <select value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="7">近 7 天</option>
            <option value="30">近 30 天</option>
            <option value="90">近 90 天</option>
          </select>
          <button className="secondary" onClick={load} disabled={loading}>
            {loading ? '刷新中...' : '刷新'}
          </button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}
      {!data ? (
        <p className="muted">{loading ? '加载中...' : '暂无数据'}</p>
      ) : (
        <>
          <section className="detail-grid">
            <article className="card">
              <h3>用户总量</h3>
              <p className="price-lg">{data.users.total}</p>
              <p className="muted">近 {data.range.days} 天新增：{data.users.newInRange}</p>
            </article>
            <article className="card">
              <h3>订单交易额</h3>
              <p className="price-lg">¥{Number(data.orders.paidAmountInRange || 0).toFixed(2)}</p>
              <p className="muted">近 {data.range.days} 天订单数：{data.orders.newInRange}</p>
            </article>
            <article className="card">
              <h3>待放款金额</h3>
              <p className="price-lg">¥{Number(data.finance.settlementPendingAmount || 0).toFixed(2)}</p>
              <p className="muted">待提现金额：¥{Number(data.finance.withdrawalPendingAmount || 0).toFixed(2)}</p>
            </article>
            <article className="card">
              <h3>风控告警</h3>
              <p className="muted">退款待审：{data.risk.refundPendingCount}</p>
              <p className="muted">纠纷处理中：{data.risk.disputeOpenCount}</p>
              <p className="muted">24h 登录失败：{data.risk.failedLogin24h}</p>
            </article>
          </section>

          <section className="detail-grid" style={{ marginTop: 16 }}>
            <article className="card">
              <h3>用户结构</h3>
              <p className="muted">活跃：{data.users.active}</p>
              <p className="muted">封禁：{data.users.banned}</p>
              <p className="muted">卖家：{data.users.sellers}</p>
              <p className="muted">买家：{data.users.buyers}</p>
            </article>
            <article className="card">
              <h3>商品状态</h3>
              {Object.entries(data.products.byStatus).map(([k, v]) => (
                <p key={k} className="muted">
                  {k}: {v}
                </p>
              ))}
            </article>
            <article className="card">
              <h3>订单状态</h3>
              {Object.entries(data.orders.byStatus).map(([k, v]) => (
                <p key={k} className="muted">
                  {k}: {v}
                </p>
              ))}
            </article>
            <article className="card">
              <h3>审核积压</h3>
              <p className="muted">KYC 待审：{data.risk.kycPendingCount}</p>
              <p className="muted">卖家认证待审：{data.risk.sellerAppPendingCount}</p>
              <p className="muted">近 {data.range.days} 天新商品：{data.products.newInRange}</p>
            </article>
          </section>

          <section className="card" style={{ marginTop: 16 }}>
            <h3>最近订单</h3>
            {data.recentOrders.length === 0 ? (
              <p className="muted">暂无订单</p>
            ) : (
              <div className="cards">
                {data.recentOrders.map((item) => (
                  <article className="card nested" key={item.id}>
                    <p className="muted">订单号：{item.id}</p>
                    <p className="muted">商品：{item.product?.title || '-'}</p>
                    <p className="muted">买家：{item.buyer?.email || '-'}</p>
                    <p className="muted">卖家：{item.seller?.email || '-'}</p>
                    <p className="muted">状态：{item.status}</p>
                    <p className="price">¥{Number(item.price).toFixed(2)}</p>
                    <p className="muted">{new Date(item.createdAt).toLocaleString('zh-CN')}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
