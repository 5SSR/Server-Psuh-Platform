"use client";

import { useCallback, useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type SellerOverview = {
  range: { days: number; since: string };
  products: {
    byStatus: Record<string, number>;
    newInRange: number;
  };
  orders: {
    byStatus: Record<string, number>;
    newInRange: number;
    paidAmountInRange: number;
  };
  settlements: {
    pendingCount: number;
    pendingAmount: number;
    pendingFee: number;
    releasedCount: number;
    releasedAmount: number;
    releasedFee: number;
  };
  sellerProfile?: {
    level: number;
    tradeCount: number;
    disputeRate: number;
    refundRate?: number;
    avgDeliveryMinutes: number;
    positiveRate: number;
  } | null;
  wallet: {
    balance: number;
    frozen: number;
    currency: string;
  };
  withdrawals: Record<
    string,
    {
      count: number;
      amount: number;
      fee: number;
    }
  >;
  recentOrders: Array<{
    id: string;
    status: string;
    price: number | string;
    createdAt: string;
    product?: { title?: string };
    buyer?: { email?: string };
  }>;
  recentSettlements: Array<{
    id: string;
    status: string;
    amount: number | string;
    fee: number | string;
    createdAt: string;
    order?: {
      id: string;
      product?: { title?: string };
    };
  }>;
};

export default function SellerDashboardPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [days, setDays] = useState('30');
  const [data, setData] = useState<SellerOverview | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null;

  const load = useCallback(async () => {
    if (!token) {
      setError('请先登录用户账号');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/seller/dashboard/overview?days=${Number(days) || 30}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || '读取用户看板失败');
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
          <p className="eyebrow">用户运营</p>
          <h1>用户总览看板</h1>
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
              <h3>可用余额</h3>
              <p className="price-lg">¥{Number(data.wallet.balance || 0).toFixed(2)}</p>
              <p className="muted">冻结：¥{Number(data.wallet.frozen || 0).toFixed(2)}</p>
            </article>
            <article className="card">
              <h3>近 {data.range.days} 天交易额</h3>
              <p className="price-lg">¥{Number(data.orders.paidAmountInRange || 0).toFixed(2)}</p>
              <p className="muted">新增订单：{data.orders.newInRange}</p>
            </article>
            <article className="card">
              <h3>待结算</h3>
              <p className="price-lg">¥{Number(data.settlements.pendingAmount || 0).toFixed(2)}</p>
              <p className="muted">待结算单：{data.settlements.pendingCount}</p>
            </article>
            <article className="card">
              <h3>已结算累计</h3>
              <p className="price-lg">¥{Number(data.settlements.releasedAmount || 0).toFixed(2)}</p>
              <p className="muted">已放款单：{data.settlements.releasedCount}</p>
            </article>
          </section>

          <section className="detail-grid" style={{ marginTop: 16 }}>
            <article className="card">
              <h3>用户信誉画像</h3>
              <p className="muted">等级：Lv.{data.sellerProfile?.level ?? 1}</p>
              <p className="muted">成交：{data.sellerProfile?.tradeCount ?? 0}</p>
              <p className="muted">平均交付：{data.sellerProfile?.avgDeliveryMinutes ?? 0} 分钟</p>
              <p className="muted">
                纠纷率：{((data.sellerProfile?.disputeRate ?? 0) * 100).toFixed(2)}%
              </p>
              <p className="muted">
                退款率：{((data.sellerProfile?.refundRate ?? 0) * 100).toFixed(2)}%
              </p>
              <p className="muted">
                好评率：{((data.sellerProfile?.positiveRate ?? 0) * 100).toFixed(2)}%
              </p>
            </article>
            <article className="card">
              <h3>商品状态</h3>
              {Object.entries(data.products.byStatus).map(([k, v]) => (
                <p className="muted" key={k}>
                  {k}: {v}
                </p>
              ))}
            </article>
            <article className="card">
              <h3>订单状态</h3>
              {Object.entries(data.orders.byStatus).map(([k, v]) => (
                <p className="muted" key={k}>
                  {k}: {v}
                </p>
              ))}
            </article>
            <article className="card">
              <h3>提现状态</h3>
              {Object.entries(data.withdrawals).length === 0 ? (
                <p className="muted">暂无提现记录</p>
              ) : (
                Object.entries(data.withdrawals).map(([k, v]) => (
                  <p className="muted" key={k}>
                    {k}: {v.count} 笔 / ¥{Number(v.amount || 0).toFixed(2)}
                  </p>
                ))
              )}
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
                    <p className="muted">状态：{item.status}</p>
                    <p className="price">¥{Number(item.price).toFixed(2)}</p>
                    <p className="muted">{new Date(item.createdAt).toLocaleString('zh-CN')}</p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="card" style={{ marginTop: 16 }}>
            <h3>最近结算</h3>
            {data.recentSettlements.length === 0 ? (
              <p className="muted">暂无结算</p>
            ) : (
              <div className="cards">
                {data.recentSettlements.map((item) => (
                  <article className="card nested" key={item.id}>
                    <p className="muted">订单：{item.order?.id}</p>
                    <p className="muted">商品：{item.order?.product?.title || '-'}</p>
                    <p className="muted">状态：{item.status}</p>
                    <p className="muted">金额：¥{Number(item.amount).toFixed(2)}</p>
                    <p className="muted">手续费：¥{Number(item.fee).toFixed(2)}</p>
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
