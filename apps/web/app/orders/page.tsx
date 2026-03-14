"use client";

import { useCallback, useEffect, useState } from 'react';
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

type TimelineItem = {
  id: string;
  action: string;
  actorType: string;
  remark?: string | null;
  createdAt: string;
};

type DisputeInfo = {
  id: string;
  status: string;
  result?: string | null;
  resolution?: string | null;
  evidences?: Array<{
    id: string;
    url: string;
    note?: string | null;
    createdAt: string;
  }>;
};

const statusLabel: Record<string, string> = {
  PENDING_PAYMENT: '待支付',
  PAID_WAITING_DELIVERY: '待交付',
  VERIFYING: '平台核验中',
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
  const [refundReasons, setRefundReasons] = useState<Record<string, string>>({});
  const [disputeReasons, setDisputeReasons] = useState<Record<string, string>>({});
  const [evidenceUrls, setEvidenceUrls] = useState<Record<string, string>>({});
  const [timeline, setTimeline] = useState<Record<string, TimelineItem[]>>({});
  const [disputeMap, setDisputeMap] = useState<Record<string, DisputeInfo | null>>({});
  const [timelineLoadingId, setTimelineLoadingId] = useState('');
  const [disputeLoadingId, setDisputeLoadingId] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null;

  const load = useCallback(async () => {
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
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

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

  const refund = async (orderId: string) => {
    if (!token) return;
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const reason = (refundReasons[orderId] || '').trim() || '买家申请退款';
      const res = await fetch(`${API_BASE}/orders/${orderId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '退款申请失败');
      setMessage('退款申请已提交，等待管理员审核');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const openDispute = async (orderId: string) => {
    if (!token) return;
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const reason = (disputeReasons[orderId] || '').trim() || '买家发起纠纷，等待仲裁';
      const res = await fetch(`${API_BASE}/orders/${orderId}/dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '发起纠纷失败');
      setMessage('纠纷已发起，请补充证据等待平台处理');
      await load();
      await loadDispute(orderId);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const addEvidence = async (orderId: string) => {
    if (!token) return;
    const url = (evidenceUrls[orderId] || '').trim();
    if (!url) {
      setError('请先填写证据链接');
      return;
    }
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/dispute/evidence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          url,
          note: '买家补充证据'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '补充证据失败');
      setMessage('证据已补充');
      await loadDispute(orderId);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTimeline = async (orderId: string) => {
    if (!token) return;
    setTimelineLoadingId(orderId);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/timeline`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取时间线失败');
      setTimeline((prev) => ({
        ...prev,
        [orderId]: data
      }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setTimelineLoadingId('');
    }
  };

  const loadDispute = async (orderId: string) => {
    if (!token) return;
    setDisputeLoadingId(orderId);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/dispute`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取纠纷详情失败');
      setDisputeMap((prev) => ({
        ...prev,
        [orderId]: data
      }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDisputeLoadingId('');
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
              {(order.status === 'PAID_WAITING_DELIVERY' || order.status === 'BUYER_CHECKING') && (
                <button onClick={() => refund(order.id)} disabled={loading} className="secondary">
                  申请退款
                </button>
              )}
              {(order.status === 'PAID_WAITING_DELIVERY' ||
                order.status === 'BUYER_CHECKING' ||
                order.status === 'REFUNDING') && (
                <button onClick={() => openDispute(order.id)} disabled={loading} className="secondary">
                  发起纠纷
                </button>
              )}
              <button onClick={() => loadTimeline(order.id)} disabled={timelineLoadingId === order.id} className="secondary">
                {timelineLoadingId === order.id ? '加载中...' : '查看时间线'}
              </button>
              {(order.status === 'DISPUTING' || disputeMap[order.id]) && (
                <button onClick={() => loadDispute(order.id)} disabled={disputeLoadingId === order.id} className="secondary">
                  {disputeLoadingId === order.id ? '加载中...' : '查看纠纷'}
                </button>
              )}
            </div>

            {(order.status === 'PAID_WAITING_DELIVERY' || order.status === 'BUYER_CHECKING') && (
              <div className="form">
                <label>退款原因（可选）</label>
                <input
                  value={refundReasons[order.id] || ''}
                  onChange={(e) =>
                    setRefundReasons((prev) => ({
                      ...prev,
                      [order.id]: e.target.value
                    }))
                  }
                  placeholder="例如：卖家超时未交付"
                />
              </div>
            )}

            {(order.status === 'PAID_WAITING_DELIVERY' ||
              order.status === 'BUYER_CHECKING' ||
              order.status === 'REFUNDING') && (
              <div className="form">
                <label>纠纷说明（可选）</label>
                <input
                  value={disputeReasons[order.id] || ''}
                  onChange={(e) =>
                    setDisputeReasons((prev) => ({
                      ...prev,
                      [order.id]: e.target.value
                    }))
                  }
                  placeholder="例如：配置与描述不一致"
                />
              </div>
            )}

            {(order.status === 'DISPUTING' || disputeMap[order.id]) && (
              <div className="form">
                <label>证据链接（可选）</label>
                <input
                  value={evidenceUrls[order.id] || ''}
                  onChange={(e) =>
                    setEvidenceUrls((prev) => ({
                      ...prev,
                      [order.id]: e.target.value
                    }))
                  }
                  placeholder="https://..."
                />
                <button onClick={() => addEvidence(order.id)} disabled={loading}>
                  补充证据
                </button>
              </div>
            )}

            {timeline[order.id] && timeline[order.id].length > 0 && (
              <div className="card nested">
                <h3>订单时间线</h3>
                {timeline[order.id].map((item) => (
                  <p key={item.id} className="muted">
                    [{new Date(item.createdAt).toLocaleString('zh-CN')}] {item.action} / {item.actorType}
                    {item.remark ? ` / ${item.remark}` : ''}
                  </p>
                ))}
              </div>
            )}

            {disputeMap[order.id] && (
              <div className="card nested">
                <h3>纠纷详情</h3>
                <p className="muted">状态：{disputeMap[order.id]?.status}</p>
                <p className="muted">结论：{disputeMap[order.id]?.result || '待处理'}</p>
                <p className="muted">说明：{disputeMap[order.id]?.resolution || '无'}</p>
                <p className="muted">证据数：{disputeMap[order.id]?.evidences?.length || 0}</p>
                {(disputeMap[order.id]?.evidences || []).map((ev) => (
                  <p key={ev.id} className="muted">
                    - {ev.url} {ev.note ? `（${ev.note}）` : ''}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
