"use client";

import { useEffect, useState } from 'react';

type Channel = 'BALANCE' | 'ALIPAY' | 'WECHAT' | 'MANUAL';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('idc_token');
}

export function PurchaseBox({ productId, price }: { productId: string; price: number }) {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [channel, setChannel] = useState<Channel>('ALIPAY');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [payInfo, setPayInfo] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    setError('');
    setMessage('');
  }, [channel]);

  const ensureToken = () => {
    const token = getToken();
    if (!token) {
      setError('请先登录（右上角登录），Token 会保存在本地浏览器。');
      return null;
    }
    return token;
  };

  const createOrderIfNeeded = async (token: string) => {
    if (orderId) return orderId;
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ productId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || '创建订单失败');
    setOrderId(data.id);
    return data.id as string;
  };

  const pay = async () => {
    const token = ensureToken();
    if (!token) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const currentOrderId = await createOrderIfNeeded(token);
      const res = await fetch(`${API_BASE}/orders/${currentOrderId}/pay`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ channel })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '支付失败');
      setPayInfo(data);
      setMessage(
        channel === 'BALANCE'
          ? '余额支付完成，等待卖家交付'
          : '支付意图已生成，可用回调/模拟完成支付'
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = async () => {
    const token = ensureToken();
    if (!token || !orderId) {
      setError('没有订单号或未登录');
      return;
    }
    const res = await fetch(`${API_BASE}/payments/${orderId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || '查询失败');
      return;
    }
    setStatus(data);
    setMessage('已刷新支付状态');
  };

  const mockSuccess = async () => {
    const token = ensureToken();
    if (!token || !orderId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/payments/${orderId}/mock-success`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '模拟支付失败');
      setMessage('已模拟支付成功，状态已更新为已支付');
      setStatus(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="flex-between">
        <div>
          <h3>担保下单 & 支付</h3>
          <p className="muted">价格 ¥{price.toFixed(2)}，选择渠道后立即创建订单并发起支付。</p>
        </div>
        <div>
          <label className="muted">支付渠道</label>
          <select value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
            <option value="ALIPAY">支付宝（模拟）</option>
            <option value="WECHAT">微信（模拟）</option>
            <option value="MANUAL">人工确认</option>
            <option value="BALANCE">余额</option>
          </select>
        </div>
      </div>

      <div className="actions">
        <button onClick={pay} disabled={loading}>
          {loading ? '处理中...' : '下单并发起支付'}
        </button>
        <button onClick={refreshStatus} className="secondary" disabled={!orderId || loading}>
          刷新支付状态
        </button>
        <button onClick={mockSuccess} className="secondary" disabled={!orderId || loading}>
          本地模拟支付成功
        </button>
      </div>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
      {orderId && (
        <p className="muted">
          当前订单号：<code>{orderId}</code>
        </p>
      )}

      {payInfo?.checkout && (
        <div className="card nested">
          <h4>支付意图</h4>
          <p>跳转链接（模拟）：<code>{payInfo.checkout.payUrl}</code></p>
          <p>Webhook：<code>{payInfo.checkout.webhook.url}</code></p>
          <p className="muted">可直接 POST 下方 Payload 到 webhook 以模拟第三方回调。</p>
          <pre className="code">{JSON.stringify(payInfo.checkout.webhook.payload, null, 2)}</pre>
        </div>
      )}

      {status && (
        <div className="card nested">
          <h4>支付状态</h4>
          <pre className="code">{JSON.stringify(status, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
