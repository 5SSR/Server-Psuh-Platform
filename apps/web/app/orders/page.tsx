"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type Order = {
  id: string;
  status: string;
  payStatus: string;
  payChannel: string;
  price: number;
  product?: { id: string; title: string };
};

const statusLabel: Record<string, string> = {
  PENDING_PAYMENT: '待支付',
  PAID_WAITING_DELIVERY: '待交付',
  BUYER_CHECKING: '验机中',
  COMPLETED_PENDING_SETTLEMENT: '待结算',
  COMPLETED: '已完成',
  REFUNDING: '退款中',
  DISPUTING: '纠纷中',
  CANCELED: '已取消'
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null;

  const load = async () => {
    if (!token) {
      setError('请先登录后查看订单');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '获取订单失败');
      setOrders(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pay = async (orderId: string) => {
    if (!token) return;
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/pay`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ channel: 'BALANCE' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '支付失败');
      setMessage('余额支付成功，等待卖家交付');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const confirm = async (orderId: string) => {
    if (!token) return;
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/confirm`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ remark: '买家确认收货' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '确认失败');
      setMessage('已确认收货，进入结算流程');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <header className="section-head">
        <div>
          <p className="eyebrow">订单中心</p>
          <h1>我的担保订单</h1>
        </div>
        <button onClick={load} className="secondary" disabled={loading}>
          {loading ? '刷新中...' : '刷新列表'}
        </button>
      </header>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      {orders.length === 0 && <p className="muted">暂无订单，先去浏览商品吧。</p>}

      <div className="cards">
        {orders.map((order) => (
          <div key={order.id} className="card">
            <div className="card-header">
              <div>
                <p className="muted">订单号：{order.id}</p>
                <h3>{order.product?.title ?? '未知商品'}</h3>
              </div>
              <span className="pill">{statusLabel[order.status] ?? order.status}</span>
            </div>
            <p className="card-meta">支付状态：{order.payStatus} · 渠道：{order.payChannel}</p>
            <p className="price">¥{Number(order.price).toFixed(2)}</p>
            <div className="actions">
              <Link className="btn ghost" href={`/products/${order.product?.id ?? ''}`}>
                商品详情
              </Link>
              {order.status === 'PENDING_PAYMENT' && (
                <button onClick={() => pay(order.id)} disabled={loading}>
                  余额支付
                </button>
              )}
              {order.status === 'BUYER_CHECKING' && (
                <button onClick={() => confirm(order.id)} disabled={loading} className="secondary">
                  确认收货
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
