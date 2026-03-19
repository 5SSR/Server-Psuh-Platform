"use client";

import { useEffect, useState } from 'react';

type Channel = 'BALANCE' | 'ALIPAY' | 'WECHAT' | 'MANUAL';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('idc_token');
}

type PayInfo = {
  checkout?: {
    payUrl?: string;
    qrData?: string;
    webhook?: {
      url?: string;
      payload?: Record<string, unknown>;
    };
  };
};

export function PurchaseBox({ productId, price }: { productId: string; price: number }) {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [channel, setChannel] = useState<Channel>('ALIPAY');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [payInfo, setPayInfo] = useState<PayInfo | null>(null);
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    setError('');
    setMessage('');
  }, [channel]);

  const ensureToken = () => {
    const token = getToken();
    if (!token) {
      setError('请先登录后下单，登录状态由浏览器本地 token 管理。');
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
          ? '余额支付已完成，订单进入待交付状态。'
          : '支付意图已生成，可继续支付并刷新状态。'
      );
    } catch (e: any) {
      setError(e.message || '支付失败');
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = async () => {
    const token = ensureToken();
    if (!token || !orderId) {
      setError('请先创建订单后再查询状态');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/payments/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '查询失败');
      setStatus(data);
      setMessage('支付状态已刷新');
    } catch (e: any) {
      setError(e.message || '查询失败');
    }
  };

  const mockSuccess = async () => {
    const token = ensureToken();
    if (!token || !orderId) {
      setError('请先创建订单再模拟支付');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/payments/${orderId}/mock-success`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '模拟支付失败');
      setMessage('已模拟支付成功，可继续履约流程测试');
      setStatus(data);
    } catch (e: any) {
      setError(e.message || '模拟支付失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stack-12">
      <div className="spec-grid">
        <div className="spec-item">
          <p className="label">成交价格</p>
          <p className="value">¥{price.toFixed(2)}</p>
        </div>
        <div className="spec-item">
          <p className="label">交易模式</p>
          <p className="value">担保托管</p>
        </div>
        <div className="spec-item">
          <p className="label">支付渠道</p>
          <select value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
            <option value="ALIPAY">支付宝（模拟）</option>
            <option value="WECHAT">微信（模拟）</option>
            <option value="MANUAL">人工确认</option>
            <option value="BALANCE">余额支付</option>
          </select>
        </div>
      </div>

      <div className="status-line">
        <span className="status-chip info">1. 创建订单</span>
        <span className="status-chip info">2. 发起支付</span>
        <span className="status-chip info">3. 平台托管</span>
        <span className="status-chip info">4. 核验后结算</span>
      </div>

      <div className="actions">
        <button onClick={pay} className="btn primary" disabled={loading}>
          {loading ? '处理中...' : '下单并支付'}
        </button>
        <button onClick={refreshStatus} className="btn secondary" disabled={!orderId || loading}>
          刷新支付状态
        </button>
        <button onClick={mockSuccess} className="btn secondary" disabled={!orderId || loading}>
          模拟支付成功
        </button>
      </div>

      {orderId && (
        <p className="muted">
          当前订单号：<code>{orderId}</code>
        </p>
      )}

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      {payInfo?.checkout && (
        <div className="card nested stack-8">
          <h3 style={{ fontSize: 15 }}>支付意图</h3>
          <p className="muted">跳转地址：{payInfo.checkout.payUrl || '-'}</p>
          <p className="muted">二维码串：{payInfo.checkout.qrData || '-'}</p>
          <p className="muted">回调地址：{payInfo.checkout.webhook?.url || '-'}</p>
          {payInfo.checkout.webhook?.payload && (
            <pre className="code">{JSON.stringify(payInfo.checkout.webhook.payload, null, 2)}</pre>
          )}
        </div>
      )}

      {status && (
        <div className="card nested stack-8">
          <h3 style={{ fontSize: 15 }}>支付状态回执</h3>
          <pre className="code">{JSON.stringify(status, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
