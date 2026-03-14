"use client";

import { useCallback, useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type Order = {
  id: string;
  status: string;
  payStatus: string;
  payChannel: string;
  price: number | string;
  product?: {
    id: string;
    title: string;
  };
  buyer?: {
    id: string;
    email: string;
  };
  deliveryRecords?: Array<{
    id: string;
    providerAccount?: string | null;
    panelUrl?: string | null;
    remark?: string | null;
    createdAt: string;
  }>;
};

const statusLabel: Record<string, string> = {
  PENDING_PAYMENT: '待支付',
  PAID_WAITING_DELIVERY: '待交付',
  VERIFYING: '平台核验中',
  BUYER_CHECKING: '买家验机中',
  COMPLETED_PENDING_SETTLEMENT: '待结算',
  COMPLETED: '已完成',
  REFUNDING: '退款中',
  DISPUTING: '纠纷中',
  CANCELED: '已取消'
};

type DeliverForm = {
  providerAccount: string;
  panelUrl: string;
  loginInfo: string;
  remark: string;
};

export default function SellerOrdersPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [forms, setForms] = useState<Record<string, DeliverForm>>({});

  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null;

  const load = useCallback(async () => {
    if (!token) {
      setError('请先登录用户账号');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/orders?as=seller`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取订单失败');
      setOrders(data || []);
    } catch (e: any) {
      setError(e.message || '读取失败');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const getForm = (orderId: string): DeliverForm => {
    return (
      forms[orderId] || {
        providerAccount: '',
        panelUrl: '',
        loginInfo: '',
        remark: ''
      }
    );
  };

  const updateForm = (orderId: string, patch: Partial<DeliverForm>) => {
    setForms((prev) => ({
      ...prev,
      [orderId]: {
        ...getForm(orderId),
        ...patch
      }
    }));
  };

  const deliver = async (orderId: string) => {
    if (!token) return;
    const form = getForm(orderId);
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/deliver`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          providerAccount: form.providerAccount || undefined,
          panelUrl: form.panelUrl || undefined,
          loginInfo: form.loginInfo || undefined,
          remark: form.remark || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '交付失败');
      setMessage('交付信息已提交，订单已进入后续验收流程');
      await load();
    } catch (e: any) {
      setError(e.message || '交付失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <header className="section-head">
        <div>
          <p className="eyebrow">用户履约</p>
          <h1>我的订单履约</h1>
        </div>
        <button onClick={load} className="secondary" disabled={loading}>
          {loading ? '刷新中...' : '刷新'}
        </button>
      </header>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      {orders.length === 0 ? (
        <p className="muted">暂无可履约订单</p>
      ) : (
        <div className="cards">
          {orders.map((order) => {
            const form = getForm(order.id);
            return (
              <article className="card" key={order.id}>
                <div className="card-header">
                  <div>
                    <h3>{order.product?.title || '未知商品'}</h3>
                    <p className="muted">订单号：{order.id}</p>
                  </div>
                  <span className="pill">{statusLabel[order.status] || order.status}</span>
                </div>
                <p className="muted">买家：{order.buyer?.email || '-'}</p>
                <p className="muted">支付状态：{order.payStatus} · 渠道：{order.payChannel}</p>
                <p className="price">¥{Number(order.price).toFixed(2)}</p>

                {order.deliveryRecords?.[0] && (
                  <div className="card nested">
                    <h3>最近交付记录</h3>
                    <p className="muted">账号：{order.deliveryRecords[0].providerAccount || '-'}</p>
                    <p className="muted">面板：{order.deliveryRecords[0].panelUrl || '-'}</p>
                    <p className="muted">备注：{order.deliveryRecords[0].remark || '-'}</p>
                  </div>
                )}

                {order.status === 'PAID_WAITING_DELIVERY' && (
                  <div className="form">
                    <label>服务商账号（可选）</label>
                    <input
                      value={form.providerAccount}
                      onChange={(e) => updateForm(order.id, { providerAccount: e.target.value })}
                    />
                    <label>控制台地址（可选）</label>
                    <input
                      value={form.panelUrl}
                      onChange={(e) => updateForm(order.id, { panelUrl: e.target.value })}
                    />
                    <label>登录信息（可选）</label>
                    <input
                      value={form.loginInfo}
                      onChange={(e) => updateForm(order.id, { loginInfo: e.target.value })}
                    />
                    <label>交付备注（可选）</label>
                    <input
                      value={form.remark}
                      onChange={(e) => updateForm(order.id, { remark: e.target.value })}
                    />
                    <button onClick={() => deliver(order.id)} disabled={loading}>
                      提交交付
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
