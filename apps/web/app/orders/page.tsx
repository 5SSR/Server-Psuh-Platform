"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type Channel = 'BALANCE' | 'ALIPAY' | 'WECHAT' | 'MANUAL';

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

type PaymentIntent = {
  payUrl?: string;
  qrData?: string;
  webhook?: {
    url?: string;
    payload?: Record<string, unknown>;
  };
};

type PaymentStatusInfo = {
  order?: {
    status?: string;
    payStatus?: string;
    payChannel?: string;
  };
  payment?: {
    channel?: string;
    tradeNo?: string;
    amount?: number | string;
    payStatus?: string;
    paidAt?: string;
  } | null;
  nextAction?: string;
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

const statusClass: Record<string, string> = {
  PENDING_PAYMENT: 'status-chip warning',
  PAID_WAITING_DELIVERY: 'status-chip info',
  VERIFYING: 'status-chip info',
  BUYER_CHECKING: 'status-chip info',
  COMPLETED_PENDING_SETTLEMENT: 'status-chip',
  COMPLETED: 'status-chip success',
  REFUNDING: 'status-chip warning',
  DISPUTING: 'status-chip danger',
  CANCELED: 'status-chip'
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
  const [payChannelByOrder, setPayChannelByOrder] = useState<Record<string, Channel>>({});
  const [paymentIntentMap, setPaymentIntentMap] = useState<Record<string, PaymentIntent>>({});
  const [paymentStatusMap, setPaymentStatusMap] = useState<Record<string, PaymentStatusInfo>>({});

  const stats = useMemo(() => {
    return orders.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.status === 'PENDING_PAYMENT') acc.pendingPayment += 1;
        if (item.status === 'PAID_WAITING_DELIVERY') acc.waitingDelivery += 1;
        if (item.status === 'VERIFYING' || item.status === 'BUYER_CHECKING') acc.verifying += 1;
        if (item.status === 'COMPLETED' || item.status === 'COMPLETED_PENDING_SETTLEMENT') acc.completed += 1;
        if (item.status === 'REFUNDING' || item.status === 'DISPUTING') acc.risk += 1;
        return acc;
      },
      { total: 0, pendingPayment: 0, waitingDelivery: 0, verifying: 0, completed: 0, risk: 0 }
    );
  }, [orders]);

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

  const selectedChannel = (orderId: string): Channel => payChannelByOrder[orderId] || 'BALANCE';

  const paymentHint = (orderId: string) => {
    const selected = selectedChannel(orderId);
    const currentPayStatus = paymentStatusMap[orderId]?.order?.payStatus;
    if (selected === 'BALANCE') {
      return '余额支付会直接扣减钱包可用余额，并立即推进到待交付状态。';
    }
    if (currentPayStatus === 'PAID') {
      return '该订单已完成支付，可刷新订单列表确认后续履约状态。';
    }
    if (currentPayStatus === 'UNPAID') {
      return '当前仍未支付，可切换渠道后重试，或使用“模拟支付成功”完成联调。';
    }
    return '第三方渠道支付需等待回调确认，超时可切换渠道后重新发起。';
  };

  const pay = async (orderId: string) => {
    if (!token) return;
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const channel = selectedChannel(orderId);
      const res = await fetch(`${API_BASE}/orders/${orderId}/pay`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ channel })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '支付失败');
      if (channel === 'BALANCE') {
        setMessage('余额支付成功，等待卖家交付');
        await load();
        return;
      }

      if (data?.checkout) {
        setPaymentIntentMap((prev) => ({
          ...prev,
          [orderId]: data.checkout
        }));
      }
      setMessage('支付意图已生成，可跳转支付或执行本地模拟回调');
      await refreshPayStatus(orderId);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshPayStatus = async (orderId: string) => {
    if (!token) return;
    setError('');
    try {
      const res = await fetch(`${API_BASE}/payments/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取支付状态失败');
      setPaymentStatusMap((prev) => ({
        ...prev,
        [orderId]: data
      }));
      setMessage('支付状态已刷新');
    } catch (e: any) {
      setError(e.message || '读取支付状态失败');
    }
  };

  const mockPaySuccess = async (orderId: string) => {
    if (!token) return;
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch(`${API_BASE}/payments/${orderId}/mock-success`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '模拟支付失败');
      setMessage(data?.alreadyPaid ? '该订单已是支付状态' : '已模拟支付成功');
      await refreshPayStatus(orderId);
      await load();
    } catch (e: any) {
      setError(e.message || '模拟支付失败');
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

  const cancelOrder = async (orderId: string) => {
    if (!token) return;
    if (!window.confirm('确认取消此订单？')) return;
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '取消失败');
      setMessage('订单已取消');
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
    <main className="page page-shell">
      <header className="section-head">
        <div>
          <p className="eyebrow">订单中心</p>
          <h1>我的担保订单</h1>
          <p className="muted">流程状态：下单支付 → 卖家交付 → 平台核验 → 买家确认 → 结算完成</p>
        </div>
        <button onClick={load} className="btn secondary" disabled={loading}>
          {loading ? '刷新中...' : '刷新列表'}
        </button>
      </header>

      <section className="metric-grid">
        <article className="metric-card">
          <p className="metric-label">订单总数</p>
          <p className="metric-value">{stats.total}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">待支付</p>
          <p className="metric-value">{stats.pendingPayment}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">待交付 / 核验</p>
          <p className="metric-value">{stats.waitingDelivery + stats.verifying}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">已完成</p>
          <p className="metric-value">{stats.completed}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">退款 / 纠纷</p>
          <p className="metric-value">{stats.risk}</p>
        </article>
      </section>

      <div className="status-line">
        <span className="status-chip">待支付</span>
        <span className="status-chip">待交付</span>
        <span className="status-chip info">平台核验</span>
        <span className="status-chip info">买家验机</span>
        <span className="status-chip success">交易完成</span>
        <span className="status-chip warning">退款中</span>
        <span className="status-chip danger">纠纷中</span>
      </div>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      {orders.length === 0 && <div className="empty-state">暂无订单，先去交易市场浏览商品吧。</div>}

      <div className="cards">
        {orders.map((order) => (
          <div key={order.id} className="card">
            <div className="card-header">
              <div>
                <p className="muted">订单号：{order.id}</p>
                <h3>{order.product?.title ?? '未知商品'}</h3>
              </div>
              <span className={statusClass[order.status] || 'status-chip'}>
                {statusLabel[order.status] ?? order.status}
              </span>
            </div>
            <p className="card-meta">支付状态：{order.payStatus} · 渠道：{order.payChannel}</p>
            <p className="price">¥{Number(order.price).toFixed(2)}</p>
            <div className="actions">
              <Link className="btn ghost" href={`/products/${order.product?.id ?? ''}`}>
                商品详情
              </Link>
              {order.status === 'PENDING_PAYMENT' && (
                <button onClick={() => pay(order.id)} disabled={loading}>
                  发起支付
                </button>
              )}
              {order.status === 'PENDING_PAYMENT' && (
                <button onClick={() => cancelOrder(order.id)} disabled={loading} className="btn secondary">
                  取消订单
                </button>
              )}
              {order.status === 'PENDING_PAYMENT' && (
                <button onClick={() => refreshPayStatus(order.id)} disabled={loading} className="btn secondary">
                  刷新支付状态
                </button>
              )}
              {order.status === 'PENDING_PAYMENT' && (
                <button onClick={() => mockPaySuccess(order.id)} disabled={loading} className="btn secondary">
                  模拟支付成功
                </button>
              )}
              {order.status === 'BUYER_CHECKING' && (
                <button onClick={() => confirm(order.id)} disabled={loading} className="btn secondary">
                  确认收货
                </button>
              )}
              {(order.status === 'PAID_WAITING_DELIVERY' || order.status === 'BUYER_CHECKING') && (
                <button onClick={() => refund(order.id)} disabled={loading} className="btn secondary">
                  申请退款
                </button>
              )}
              {(order.status === 'PAID_WAITING_DELIVERY' ||
                order.status === 'BUYER_CHECKING' ||
                order.status === 'REFUNDING') && (
                <button onClick={() => openDispute(order.id)} disabled={loading} className="btn secondary">
                  发起纠纷
                </button>
              )}
              <button onClick={() => loadTimeline(order.id)} disabled={timelineLoadingId === order.id} className="btn secondary">
                {timelineLoadingId === order.id ? '加载中...' : '查看时间线'}
              </button>
              {(order.status === 'DISPUTING' || disputeMap[order.id]) && (
                <button onClick={() => loadDispute(order.id)} disabled={disputeLoadingId === order.id} className="btn secondary">
                  {disputeLoadingId === order.id ? '加载中...' : '查看纠纷'}
                </button>
              )}
            </div>

            {order.status === 'PENDING_PAYMENT' && (
              <div className="form">
                <label>支付渠道</label>
                <select
                  value={selectedChannel(order.id)}
                  onChange={(e) =>
                    setPayChannelByOrder((prev) => ({
                      ...prev,
                      [order.id]: e.target.value as Channel
                    }))
                  }
                >
                  <option value="BALANCE">BALANCE（余额）</option>
                  <option value="ALIPAY">ALIPAY（模拟）</option>
                  <option value="WECHAT">WECHAT（模拟）</option>
                  <option value="MANUAL">MANUAL（人工）</option>
                </select>
                <p className="muted">{paymentHint(order.id)}</p>
              </div>
            )}

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

            {paymentIntentMap[order.id] && (
              <div className="card nested">
                <h3>支付意图</h3>
                <p className="muted">跳转地址：{paymentIntentMap[order.id]?.payUrl || '-'}</p>
                <p className="muted">二维码串：{paymentIntentMap[order.id]?.qrData || '-'}</p>
                <p className="muted">回调地址：{paymentIntentMap[order.id]?.webhook?.url || '-'}</p>
                {paymentIntentMap[order.id]?.webhook?.payload && (
                  <pre className="code">
                    {JSON.stringify(paymentIntentMap[order.id]?.webhook?.payload, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {paymentStatusMap[order.id] && (
              <div className="card nested">
                <h3>支付状态回执</h3>
                <p className="muted">订单状态：{paymentStatusMap[order.id]?.order?.status || '-'}</p>
                <p className="muted">支付状态：{paymentStatusMap[order.id]?.order?.payStatus || '-'}</p>
                <p className="muted">支付渠道：{paymentStatusMap[order.id]?.order?.payChannel || '-'}</p>
                <p className="muted">交易号：{paymentStatusMap[order.id]?.payment?.tradeNo || '-'}</p>
                <p className="muted">
                  回执支付时间：
                  {(() => {
                    const paidAt = paymentStatusMap[order.id]?.payment?.paidAt;
                    return paidAt ? new Date(paidAt).toLocaleString('zh-CN') : '未支付';
                  })()}
                </p>
                <p className="muted">下一步动作：{paymentStatusMap[order.id]?.nextAction || '-'}</p>
              </div>
            )}

            {timeline[order.id] && timeline[order.id].length > 0 && (
              <div className="card nested stack-12">
                <h3>订单时间线</h3>
                <div className="timeline">
                  {timeline[order.id].map((item) => (
                    <div key={item.id} className="timeline-item">
                      <p>{item.action}</p>
                      <p className="timeline-meta">
                        {item.actorType} · {new Date(item.createdAt).toLocaleString('zh-CN')}
                      </p>
                      {item.remark && <p className="muted">{item.remark}</p>}
                    </div>
                  ))}
                </div>
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
