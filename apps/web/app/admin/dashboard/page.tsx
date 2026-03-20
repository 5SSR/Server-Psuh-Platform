"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ConsoleEmpty,
  ConsolePageHeader,
  ConsolePanel,
  StatusBadge,
  formatDateTime,
  formatMoney
} from '../../../components/admin/console-primitives';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type Overview = {
  range: { days: number; since: string };
  users: {
    total: number;
    active: number;
    banned: number;
    regular: number;
    newInRange: number;
  };
  products: {
    byStatus: Record<string, number>;
    newInRange: number;
  };
  orders: {
    byStatus: Record<string, number>;
    newInRange: number;
    paidAmountInRange: number;
  };
  bargains: {
    total: number;
    byStatus: Record<string, number>;
    withOrder: number;
    highRoundActive: number;
  };
  finance: {
    settlementPendingAmount: number;
    settlementPendingFee: number;
    settlementReleasedAmount: number;
    settlementReleasedFee: number;
    withdrawalPendingAmount: number;
    withdrawalPendingFee: number;
  };
  risk: {
    refundPendingCount: number;
    disputeOpenCount: number;
    kycPendingCount: number;
    qualificationPendingCount?: number;
    sellerAppPendingCount: number;
    failedLogin24h: number;
  };
  recentOrders: Array<{
    id: string;
    status: string;
    price: number | string;
    createdAt: string;
    product?: { title?: string };
    buyer?: { email?: string };
    seller?: { email?: string };
  }>;
};

const orderStatusLabel: Record<string, string> = {
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

const bargainStatusLabel: Record<string, string> = {
  WAIT_SELLER: '待卖家响应',
  WAIT_BUYER: '待买家响应',
  ACCEPTED: '已成交',
  REJECTED: '已拒绝',
  CANCELED: '已取消'
};

function bargainStatusTone(status: string) {
  if (status === 'ACCEPTED') return 'success' as const;
  if (status === 'REJECTED') return 'danger' as const;
  if (status === 'CANCELED') return 'warning' as const;
  return 'info' as const;
}

function orderStatusTone(status: string) {
  if (status === 'COMPLETED') return 'success' as const;
  if (status === 'DISPUTING' || status === 'REFUNDING' || status === 'CANCELED') return 'danger' as const;
  if (status === 'VERIFYING' || status === 'BUYER_CHECKING') return 'warning' as const;
  return 'info' as const;
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [days, setDays] = useState('30');
  const [data, setData] = useState<Overview | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null;

  const load = useCallback(async () => {
    if (!token) {
      setError('请先登录管理员账号');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/dashboard/overview?days=${Number(days) || 30}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || '读取看板失败');
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

  const waitingReviewCount = useMemo(() => {
    if (!data) return 0;
    return data.risk.kycPendingCount + (data.risk.qualificationPendingCount ?? data.risk.sellerAppPendingCount);
  }, [data]);

  return (
    <main className="page page-shell admin-console-page">
      <ConsolePageHeader
        eyebrow="管理后台 · 运营总览"
        title="交易平台运营看板"
        description="聚焦担保交易链路：上架审核、支付监控、交付核验、纠纷与结算，快速识别风险积压与资金状态。"
        tags={[
          { label: '担保交易闭环', tone: 'info' },
          { label: '风险告警可追踪', tone: 'warning' },
          { label: '结算资金可核验', tone: 'success' }
        ]}
        actions={
          <>
            <select value={days} onChange={(e) => setDays(e.target.value)}>
              <option value="7">近 7 天</option>
              <option value="30">近 30 天</option>
              <option value="90">近 90 天</option>
            </select>
            <button className="btn secondary" onClick={load} disabled={loading}>
              {loading ? '刷新中...' : '刷新数据'}
            </button>
          </>
        }
      />

      {error ? <p className="error">{error}</p> : null}

      {!data ? (
        <ConsoleEmpty text={loading ? '看板加载中...' : '暂无可展示的看板数据'} />
      ) : (
        <>
          <section className="metric-grid">
            <article className="metric-card">
              <p className="metric-label">近 {data.range.days} 天交易额</p>
              <p className="metric-value">{formatMoney(data.orders.paidAmountInRange || 0)}</p>
              <p className="metric-tip">订单新增 {data.orders.newInRange} 笔</p>
            </article>
            <article className="metric-card">
              <p className="metric-label">待放款金额</p>
              <p className="metric-value">{formatMoney(data.finance.settlementPendingAmount || 0)}</p>
              <p className="metric-tip">待提现 {formatMoney(data.finance.withdrawalPendingAmount || 0)}</p>
            </article>
            <article className="metric-card">
              <p className="metric-label">待审核积压</p>
              <p className="metric-value">{waitingReviewCount}</p>
              <p className="metric-tip">退款待审 {data.risk.refundPendingCount} · 纠纷处理中 {data.risk.disputeOpenCount}</p>
            </article>
            <article className="metric-card">
              <p className="metric-label">用户总量</p>
              <p className="metric-value">{data.users.total}</p>
              <p className="metric-tip">近 {data.range.days} 天新增 {data.users.newInRange}</p>
            </article>
            <article className="metric-card">
              <p className="metric-label">议价活跃会话</p>
              <p className="metric-value">
                {(data.bargains.byStatus.WAIT_BUYER || 0) + (data.bargains.byStatus.WAIT_SELLER || 0)}
              </p>
              <p className="metric-tip">高轮次风险 {data.bargains.highRoundActive} 条</p>
            </article>
          </section>

          <section className="detail-grid">
            <article className="card stack-12">
              <h3>交易流程态势</h3>
              <div className="console-inline-tags">
                {Object.entries(data.orders.byStatus).map(([status, count]) => (
                  <StatusBadge key={status} tone={orderStatusTone(status)}>
                    {(orderStatusLabel[status] || status) + ` ${count}`}
                  </StatusBadge>
                ))}
              </div>
              <p className="muted">重点关注「平台核验中」「退款中」「纠纷中」阶段是否持续积压。</p>
            </article>

            <article className="card stack-12">
              <h3>上架审核与用户状态</h3>
              <div className="console-inline-tags">
                <StatusBadge tone="info">活跃用户 {data.users.active}</StatusBadge>
                <StatusBadge tone="warning">封禁用户 {data.users.banned}</StatusBadge>
                <StatusBadge tone="info">新商品 {data.products.newInRange}</StatusBadge>
                <StatusBadge tone="warning">登录失败 24h {data.risk.failedLogin24h}</StatusBadge>
              </div>
              <p className="muted">待审核越多，说明交易入口堆积越明显，应优先处理审核队列。</p>
            </article>

            <article className="card stack-12">
              <h3>资金与手续费</h3>
              <p className="muted">待结算手续费：{formatMoney(data.finance.settlementPendingFee || 0)}</p>
              <p className="muted">已结算金额：{formatMoney(data.finance.settlementReleasedAmount || 0)}</p>
              <p className="muted">已结算手续费：{formatMoney(data.finance.settlementReleasedFee || 0)}</p>
              <p className="muted">待提现手续费：{formatMoney(data.finance.withdrawalPendingFee || 0)}</p>
            </article>

            <article className="card stack-12">
              <h3>议价转化态势</h3>
              <div className="console-inline-tags">
                {Object.entries(data.bargains.byStatus).map(([status, count]) => (
                  <StatusBadge key={status} tone={bargainStatusTone(status)}>
                    {(bargainStatusLabel[status] || status) + ` ${count}`}
                  </StatusBadge>
                ))}
                <StatusBadge tone="success">已建单 {data.bargains.withOrder}</StatusBadge>
                <StatusBadge tone={data.bargains.highRoundActive > 0 ? 'warning' : 'default'}>
                  高轮次 {data.bargains.highRoundActive}
                </StatusBadge>
              </div>
              <p className="muted">议价达成后自动转订单，若高轮次会话持续积压建议及时介入。</p>
            </article>
          </section>

          <ConsolePanel
            title="最近订单流转"
            description="按时间展示关键订单，便于管理员追踪担保链路是否顺畅。"
            className="stack-12"
          >
            {data.recentOrders.length === 0 ? (
              <ConsoleEmpty text="暂无最近订单" />
            ) : (
              <div className="console-table-wrap">
                <table className="console-table console-table-mobile">
                  <thead>
                    <tr>
                      <th>订单 / 商品</th>
                      <th>买家 / 卖家</th>
                      <th>状态</th>
                      <th>金额</th>
                      <th>创建时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentOrders.map((item) => (
                      <tr key={item.id}>
                        <td data-label="订单 / 商品">
                          <div className="console-row-primary">{item.id}</div>
                          <p className="console-row-sub">{item.product?.title || '未知商品'}</p>
                        </td>
                        <td data-label="买家 / 卖家">
                          <div className="console-row-primary">买家：{item.buyer?.email || '-'}</div>
                          <p className="console-row-sub">卖家：{item.seller?.email || '-'}</p>
                        </td>
                        <td data-label="状态">
                          <StatusBadge tone={orderStatusTone(item.status)}>
                            {orderStatusLabel[item.status] || item.status}
                          </StatusBadge>
                        </td>
                        <td data-label="金额">
                          <div className="console-row-primary">{formatMoney(item.price)}</div>
                          <p className="console-row-sub">担保托管交易</p>
                        </td>
                        <td data-label="创建时间">{formatDateTime(item.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ConsolePanel>
        </>
      )}
    </main>
  );
}
