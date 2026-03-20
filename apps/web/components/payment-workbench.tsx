"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocale } from '../lib/use-locale';

type Channel = 'BALANCE' | 'ALIPAY' | 'WECHAT' | 'USDT' | 'MANUAL';

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

type PaymentStatusInfo = {
  order?: {
    status?: string;
    payStatus?: string;
    payChannel?: string;
    price?: number | string;
    fee?: number | string;
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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('idc_token');
}

export default function PaymentWorkbench({
  amount,
  productId,
  orderId,
  showOrderLink = true
}: {
  amount: number;
  productId?: string;
  orderId?: string;
  showOrderLink?: boolean;
}) {
  const { t } = useLocale();
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(orderId || null);
  const [channel, setChannel] = useState<Channel>('ALIPAY');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [payInfo, setPayInfo] = useState<PayInfo | null>(null);
  const [status, setStatus] = useState<PaymentStatusInfo | null>(null);

  useEffect(() => {
    setCurrentOrderId(orderId || null);
  }, [orderId]);

  useEffect(() => {
    setError('');
    setMessage('');
  }, [channel]);

  const ensureToken = () => {
    const token = getToken();
    if (!token) {
      setError(t('请先登录后操作支付。', 'Please sign in before payment.'));
      return null;
    }
    return token;
  };

  const createOrderIfNeeded = async (token: string) => {
    if (currentOrderId) return currentOrderId;
    if (!productId) {
      throw new Error(t('当前页面未提供商品上下文，无法创建新订单', 'Product context missing, cannot create order'));
    }
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ productId })
    });
    const data = await res.json();
      if (!res.ok) throw new Error(data.message || t('创建订单失败', 'Failed to create order'));
    setCurrentOrderId(data.id);
    return data.id as string;
  };

  const refreshStatus = async (orderToQuery?: string) => {
    const token = ensureToken();
    const targetOrderId = orderToQuery || currentOrderId;
      if (!token || !targetOrderId) {
      setError(t('请先创建订单后再查询支付状态', 'Create an order before checking payment status'));
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/payments/${targetOrderId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || t('查询支付状态失败', 'Failed to fetch payment status'));
      setStatus(data);
      setMessage(t('支付状态已刷新', 'Payment status refreshed'));
    } catch (e: any) {
      setError(e.message || t('查询支付状态失败', 'Failed to fetch payment status'));
    }
  };

  const pay = async () => {
    const token = ensureToken();
    if (!token) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const targetOrderId = await createOrderIfNeeded(token);
      const res = await fetch(`${API_BASE}/payments/${targetOrderId}/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ channel })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || t('支付失败', 'Payment failed'));

      if (channel === 'BALANCE') {
        setMessage(t('余额支付已完成，订单进入待交付状态。', 'Balance payment completed. Order is waiting for delivery.'));
      } else {
        setPayInfo(data);
        setMessage(t('支付意图已生成，可继续支付并刷新状态。', 'Payment intent created. Continue payment and refresh status.'));
      }

      await refreshStatus(targetOrderId);
    } catch (e: any) {
      setError(e.message || t('支付失败', 'Payment failed'));
    } finally {
      setLoading(false);
    }
  };

  const mockSuccess = async () => {
    const token = ensureToken();
    if (!token || !currentOrderId) {
      setError(t('请先创建订单再模拟支付', 'Create an order before mock payment'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/payments/${currentOrderId}/mock-success`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || t('模拟支付失败', 'Mock payment failed'));
      setMessage(
        data?.alreadyPaid
          ? t('该订单已支付', 'This order is already paid')
          : t('已模拟支付成功，可继续履约流程测试', 'Mock payment succeeded, you can continue fulfillment tests')
      );
      setStatus(data);
      await refreshStatus(currentOrderId);
    } catch (e: any) {
      setError(e.message || t('模拟支付失败', 'Mock payment failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stack-12">
      <div className="spec-grid">
        <div className="spec-item">
          <p className="label">{t('托管金额', 'Escrow Amount')}</p>
          <p className="value">¥{Number(amount || 0).toFixed(2)}</p>
        </div>
        <div className="spec-item">
          <p className="label">{t('交易模式', 'Trade Mode')}</p>
          <p className="value">{t('平台担保托管', 'Platform Escrow')}</p>
        </div>
        <div className="spec-item">
          <p className="label">{t('支付渠道', 'Payment Channel')}</p>
          <select value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
            <option value="ALIPAY">{t('支付宝（模拟）', 'Alipay (Mock)')}</option>
            <option value="WECHAT">{t('微信（模拟）', 'WeChat (Mock)')}</option>
            <option value="USDT">{t('USDT（模拟）', 'USDT (Mock)')}</option>
            <option value="MANUAL">{t('人工确认', 'Manual Review')}</option>
            <option value="BALANCE">{t('余额支付', 'Wallet Balance')}</option>
          </select>
        </div>
      </div>

      <div className="status-line">
        <span className="status-chip info">{t('创建订单', 'Create Order')}</span>
        <span className="status-chip info">{t('发起支付', 'Initiate Payment')}</span>
        <span className="status-chip info">{t('平台托管', 'Escrow')}</span>
        <span className="status-chip info">{t('核验交付', 'Verification & Delivery')}</span>
        <span className="status-chip success">{t('结算放款', 'Settlement')}</span>
      </div>

      <div className="actions">
        <button onClick={pay} className="btn primary" disabled={loading}>
          {loading
            ? t('处理中...', 'Processing...')
            : currentOrderId
              ? t('继续支付', 'Continue Payment')
              : t('下单并支付', 'Create & Pay')}
        </button>
        <button onClick={() => refreshStatus()} className="btn secondary" disabled={!currentOrderId || loading}>
          {t('刷新支付状态', 'Refresh Status')}
        </button>
        <button onClick={mockSuccess} className="btn secondary" disabled={!currentOrderId || loading}>
          {t('模拟支付成功', 'Mock Success')}
        </button>
        {showOrderLink && (
          <Link className="btn ghost" href="/orders">
            {t('返回订单中心', 'Back to Orders')}
          </Link>
        )}
      </div>

      {currentOrderId && (
        <p className="muted">
          {t('当前订单号：', 'Order ID:')}<code>{currentOrderId}</code>{' '}
          <Link href={`/pay/${currentOrderId}`}>{t('打开独立支付页', 'Open Payment Page')}</Link>
        </p>
      )}

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      {payInfo?.checkout && (
        <div className="card nested stack-8">
          <h3 style={{ fontSize: 15 }}>{t('支付意图', 'Payment Intent')}</h3>
          <p className="muted">{t('跳转地址：', 'Pay URL:')}{payInfo.checkout.payUrl || '-'}</p>
          <p className="muted">{t('二维码串：', 'QR Data:')}{payInfo.checkout.qrData || '-'}</p>
          <p className="muted">{t('回调地址：', 'Webhook URL:')}{payInfo.checkout.webhook?.url || '-'}</p>
          {payInfo.checkout.webhook?.payload && (
            <pre className="code">{JSON.stringify(payInfo.checkout.webhook.payload, null, 2)}</pre>
          )}
        </div>
      )}

      {status && (
        <div className="card nested stack-8">
          <h3 style={{ fontSize: 15 }}>{t('支付状态回执', 'Payment Status')}</h3>
          <p className="muted">{t('订单状态：', 'Order Status:')}{status.order?.status || '-'}</p>
          <p className="muted">{t('支付状态：', 'Pay Status:')}{status.order?.payStatus || '-'}</p>
          <p className="muted">{t('支付渠道：', 'Channel:')}{status.order?.payChannel || '-'}</p>
          <p className="muted">{t('交易号：', 'Trade No:')}{status.payment?.tradeNo || '-'}</p>
          <p className="muted">
            {t('支付时间：', 'Paid At:')}
            {status.payment?.paidAt ? new Date(status.payment.paidAt).toLocaleString('zh-CN') : t('未支付', 'Unpaid')}
          </p>
          <p className="muted">{t('下一步：', 'Next Action:')}{status.nextAction || '-'}</p>
        </div>
      )}
    </div>
  );
}
