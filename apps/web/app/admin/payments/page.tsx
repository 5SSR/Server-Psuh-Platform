"use client";

import { useCallback, useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type PaymentItem = {
  id: string;
  orderId: string;
  channel: string;
  tradeNo?: string | null;
  amount: number | string;
  payStatus: 'UNPAID' | 'PAID' | 'REFUNDED';
  paidAt?: string | null;
  createdAt: string;
  notifyPayload?: {
    adminReview?: {
      status?: 'NORMAL' | 'SUSPICIOUS' | 'FRAUD';
      remark?: string | null;
      reviewedBy?: string;
      reviewedAt?: string;
    };
    [key: string]: unknown;
  } | null;
  order?: {
    id: string;
    status: string;
    payStatus: string;
    payChannel: string;
    price: number | string;
    fee: number | string;
    buyer?: { id: string; email: string };
    seller?: { id: string; email: string };
    product?: { id: string; title: string; code: string };
  } | null;
};

type ReviewStatus = 'NORMAL' | 'SUSPICIOUS' | 'FRAUD';

const payStatusLabel: Record<string, string> = {
  UNPAID: '待支付',
  PAID: '已支付',
  REFUNDED: '已退款'
};

const reviewStatusLabel: Record<ReviewStatus, string> = {
  NORMAL: '正常',
  SUSPICIOUS: '可疑',
  FRAUD: '风险'
};

export default function AdminPaymentsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [items, setItems] = useState<PaymentItem[]>([]);

  const [payStatus, setPayStatus] = useState('');
  const [channel, setChannel] = useState('');
  const [orderId, setOrderId] = useState('');
  const [tradeNo, setTradeNo] = useState('');
  const [userId, setUserId] = useState('');
  const [reviewForms, setReviewForms] = useState<Record<string, { status: ReviewStatus; remark: string }>>({});

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
      const params = new URLSearchParams({ page: '1', pageSize: '30' });
      if (payStatus) params.set('payStatus', payStatus);
      if (channel) params.set('channel', channel);
      if (orderId.trim()) params.set('orderId', orderId.trim());
      if (tradeNo.trim()) params.set('tradeNo', tradeNo.trim());
      if (userId.trim()) params.set('userId', userId.trim());

      const res = await fetch(`${API_BASE}/admin/payments?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取支付记录失败');
      setItems(data.list || []);
      setMessage(`已加载 ${data.total ?? 0} 条支付记录`);
    } catch (e: any) {
      setError(e.message || '读取失败');
    } finally {
      setLoading(false);
    }
  }, [channel, orderId, payStatus, token, tradeNo, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const getReviewForm = (orderId: string, item: PaymentItem) => {
    return (
      reviewForms[orderId] || {
        status: (item.notifyPayload?.adminReview?.status as ReviewStatus) || 'NORMAL',
        remark: item.notifyPayload?.adminReview?.remark || ''
      }
    );
  };

  const review = async (item: PaymentItem) => {
    if (!token) return;
    const form = getReviewForm(item.orderId, item);
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/payments/${item.orderId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: form.status,
          remark: form.remark || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '保存排查结果失败');
      setMessage(data.message || '支付排查结果已保存');
      await load();
    } catch (e: any) {
      setError(e.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <header className="section-head">
        <div>
          <p className="eyebrow">管理员中心</p>
          <h1>支付监控</h1>
        </div>
        <button onClick={load} className="secondary" disabled={loading}>
          {loading ? '刷新中...' : '刷新'}
        </button>
      </header>

      <div className="detail-grid">
        <div className="card">
          <label>支付状态</label>
          <select value={payStatus} onChange={(e) => setPayStatus(e.target.value)}>
            <option value="">全部</option>
            <option value="UNPAID">UNPAID</option>
            <option value="PAID">PAID</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>
        </div>
        <div className="card">
          <label>支付渠道</label>
          <select value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="">全部</option>
            <option value="BALANCE">BALANCE</option>
            <option value="ALIPAY">ALIPAY</option>
            <option value="WECHAT">WECHAT</option>
            <option value="MANUAL">MANUAL</option>
          </select>
        </div>
        <div className="card">
          <label>订单号</label>
          <input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="精确匹配 orderId" />
        </div>
        <div className="card">
          <label>交易号</label>
          <input value={tradeNo} onChange={(e) => setTradeNo(e.target.value)} placeholder="模糊匹配 tradeNo" />
        </div>
        <div className="card">
          <label>用户 ID（买方或卖方）</label>
          <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="用户 ID" />
        </div>
      </div>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      {items.length === 0 ? (
        <p className="muted">暂无支付记录</p>
      ) : (
        <div className="cards">
          {items.map((item) => (
            <article className="card" key={item.id}>
              <div className="card-header">
                <div>
                  <h3>{item.order?.product?.title || '未知商品'}</h3>
                  <p className="muted">订单：{item.orderId}</p>
                </div>
                <span className="pill">{payStatusLabel[item.payStatus] || item.payStatus}</span>
              </div>
              <p className="price">金额：¥{Number(item.amount).toFixed(2)}</p>
              <p className="muted">渠道：{item.channel}</p>
              <p className="muted">交易号：{item.tradeNo || '-'}</p>
              <p className="muted">订单状态：{item.order?.status || '-'}</p>
              <p className="muted">买方：{item.order?.buyer?.email || '-'}</p>
              <p className="muted">卖方：{item.order?.seller?.email || '-'}</p>
              <p className="muted">
                支付排查：{item.notifyPayload?.adminReview?.status
                  ? reviewStatusLabel[item.notifyPayload.adminReview.status as ReviewStatus]
                  : '未标注'}
              </p>
              <p className="muted">创建时间：{new Date(item.createdAt).toLocaleString('zh-CN')}</p>
              <p className="muted">
                支付时间：{item.paidAt ? new Date(item.paidAt).toLocaleString('zh-CN') : '未支付'}
              </p>
              {item.notifyPayload?.adminReview?.reviewedAt && (
                <p className="muted">
                  最近排查：{new Date(item.notifyPayload.adminReview.reviewedAt).toLocaleString('zh-CN')}
                </p>
              )}

              <div className="form">
                <label>排查标记</label>
                <select
                  value={getReviewForm(item.orderId, item).status}
                  onChange={(e) =>
                    setReviewForms((prev) => ({
                      ...prev,
                      [item.orderId]: {
                        ...getReviewForm(item.orderId, item),
                        status: e.target.value as ReviewStatus
                      }
                    }))
                  }
                >
                  <option value="NORMAL">NORMAL（正常）</option>
                  <option value="SUSPICIOUS">SUSPICIOUS（可疑）</option>
                  <option value="FRAUD">FRAUD（风险）</option>
                </select>

                <label>排查备注（可选）</label>
                <input
                  value={getReviewForm(item.orderId, item).remark}
                  onChange={(e) =>
                    setReviewForms((prev) => ({
                      ...prev,
                      [item.orderId]: {
                        ...getReviewForm(item.orderId, item),
                        remark: e.target.value
                      }
                    }))
                  }
                  placeholder="例如：交易号重复，需核对上游账单"
                />
                <button onClick={() => review(item)} disabled={loading}>
                  保存排查结果
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
