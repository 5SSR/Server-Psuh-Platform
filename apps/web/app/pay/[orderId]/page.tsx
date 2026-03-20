"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

import PaymentWorkbench from '../../../components/payment-workbench';
import { useLocale } from '../../../lib/use-locale';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type OrderSummary = {
  id: string;
  status: string;
  payStatus: string;
  payChannel: string;
  price: number;
  fee?: number;
  escrowAmount?: number;
  createdAt?: string;
  product?: {
    id: string;
    title: string;
    region?: string;
    lineType?: string;
  };
  seller?: {
    id: string;
    email: string;
  };
};

function statusTone(status?: string) {
  if (!status) return '';
  if (status === 'COMPLETED' || status === 'COMPLETED_PENDING_SETTLEMENT') return 'success';
  if (status === 'PENDING_PAYMENT' || status === 'REFUNDING') return 'warning';
  if (status === 'DISPUTING') return 'danger';
  return 'info';
}

export default function PayOrderPage() {
  const { t } = useLocale();
  const params = useParams<{ orderId: string }>();
  const orderId = useMemo(() => String(params?.orderId || ''), [params]);

  const statusLabel: Record<string, string> = {
    PENDING_PAYMENT: t('待支付', 'Pending Payment'),
    PAID_WAITING_DELIVERY: t('待交付', 'Waiting Delivery'),
    VERIFYING: t('平台核验中', 'Platform Verifying'),
    BUYER_CHECKING: t('买家验机中', 'Buyer Checking'),
    COMPLETED_PENDING_SETTLEMENT: t('待结算', 'Pending Settlement'),
    COMPLETED: t('已完成', 'Completed'),
    REFUNDING: t('退款中', 'Refunding'),
    DISPUTING: t('纠纷中', 'In Dispute'),
    CANCELED: t('已取消', 'Canceled')
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<OrderSummary | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('idc_token');
    if (!token) {
      setError(t('请先登录后继续支付', 'Please sign in before payment'));
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE}/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || t('读取订单失败', 'Failed to load orders'));
        }
        const list = Array.isArray(data) ? (data as OrderSummary[]) : [];
        const matched = list.find((item) => item.id === orderId) || null;
        if (!matched) {
          throw new Error(t('未找到该订单或当前账号无权限访问', 'Order not found or access denied'));
        }
        setOrder(matched);
      } catch (e: any) {
        setError(e.message || t('读取订单失败', 'Failed to load orders'));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [orderId, t]);

  return (
    <main className="page page-shell">
      <header className="section-head">
        <div>
          <p className="eyebrow">{t('支付中心 · 担保托管', 'Payment Center · Escrow')}</p>
          <h1>{t('订单支付与托管确认', 'Order Payment & Escrow Confirmation')}</h1>
          <p className="muted">{t('订单号：', 'Order ID:')}{orderId}</p>
        </div>
        <div className="actions" style={{ marginTop: 0 }}>
          <Link href="/orders" className="btn secondary">
            {t('返回订单中心', 'Back to Orders')}
          </Link>
          <Link href="/help" className="btn ghost">
            {t('查看担保流程', 'View Escrow Flow')}
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="empty-state">{t('支付信息加载中...', 'Loading payment information...')}</div>
      ) : error ? (
        <div className="empty-state">
          <p>{error}</p>
          <div className="actions" style={{ justifyContent: 'center' }}>
            <Link href="/orders" className="btn primary">
              {t('返回订单列表', 'Back to Order List')}
            </Link>
          </div>
        </div>
      ) : order ? (
        <>
          <section className="metric-grid">
            <article className="metric-card">
              <p className="metric-label">{t('商品', 'Product')}</p>
              <p className="metric-value" style={{ fontSize: 20 }}>
                {order.product?.title || t('未知商品', 'Unknown Product')}
              </p>
              <p className="metric-tip">
                {order.product?.region || '-'} · {order.product?.lineType || '-'}
              </p>
            </article>
            <article className="metric-card">
              <p className="metric-label">{t('订单状态', 'Order Status')}</p>
              <p className="metric-value" style={{ fontSize: 20 }}>
                {statusLabel[order.status] || order.status}
              </p>
              <p className="metric-tip">
                <span className={`status-chip ${statusTone(order.status)}`}>{statusLabel[order.status] || order.status}</span>
              </p>
            </article>
            <article className="metric-card">
              <p className="metric-label">{t('托管金额', 'Escrow Amount')}</p>
              <p className="metric-value">¥{Number(order.escrowAmount || order.price || 0).toFixed(2)}</p>
              <p className="metric-tip">
                {t('商品价', 'Price')} ¥{Number(order.price || 0).toFixed(2)} · {t('服务费', 'Fee')} ¥{Number(order.fee || 0).toFixed(2)}
              </p>
            </article>
            <article className="metric-card">
              <p className="metric-label">{t('卖家账号', 'Seller')}</p>
              <p className="metric-value" style={{ fontSize: 18 }}>
                {order.seller?.email || '-'}
              </p>
              <p className="metric-tip">
                {t(
                  '支付成功后将进入“待交付”并由平台担保流程接管',
                  'After successful payment, order enters waiting-delivery under platform escrow'
                )}
              </p>
            </article>
          </section>

          <section className="card stack-16">
            <div>
              <p className="eyebrow">{t('支付执行区', 'Payment Actions')}</p>
              <h2 style={{ fontSize: 22 }}>{t('发起支付 / 刷新状态 / 模拟回调', 'Initiate / Refresh / Mock Callback')}</h2>
              <p className="muted">
                {t(
                  '支持余额、支付宝模拟、微信模拟与人工确认渠道；非余额渠道需等待回调状态推进。',
                  'Supports wallet, mock Alipay/WeChat, USDT and manual review. Non-balance channels depend on callback updates.'
                )}
              </p>
            </div>
            <PaymentWorkbench amount={Number(order.escrowAmount || order.price || 0)} orderId={order.id} />
          </section>

          <section className="grid">
            <article className="card stack-8" style={{ gridColumn: 'span 4' }}>
              <h3 style={{ fontSize: 16 }}>{t('资金托管保障', 'Escrow Protection')}</h3>
              <p className="muted">
                {t(
                  '买家付款后资金进入平台托管，不直接划转给卖家，降低交易风险。',
                  'Buyer funds are escrowed by platform before release to seller.'
                )}
              </p>
            </article>
            <article className="card stack-8" style={{ gridColumn: 'span 4' }}>
              <h3 style={{ fontSize: 16 }}>{t('交付核验机制', 'Delivery Verification')}</h3>
              <p className="muted">
                {t(
                  '卖家交付后平台可执行账号与配置核验，再进入买家验机确认环节。',
                  'Platform verifies delivery and configuration before buyer confirmation.'
                )}
              </p>
            </article>
            <article className="card stack-8" style={{ gridColumn: 'span 4' }}>
              <h3 style={{ fontSize: 16 }}>{t('退款纠纷处理', 'Refund & Dispute')}</h3>
              <p className="muted">
                {t(
                  '若交付不符或争议，订单可进入退款/纠纷流程，由平台仲裁并留痕。',
                  'If mismatch or dispute happens, platform handles arbitration with full logs.'
                )}
              </p>
            </article>
          </section>
        </>
      ) : (
        <div className="empty-state">{t('未找到可支付的订单记录。', 'No payable order found.')}</div>
      )}
    </main>
  );
}
