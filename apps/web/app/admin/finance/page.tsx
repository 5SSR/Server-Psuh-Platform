'use client';

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

type FinanceChannelItem = {
  channel: string;
  totalCount: number;
  totalAmount: number;
  paidCount: number;
  paidAmount: number;
  unpaidCount: number;
  unpaidAmount: number;
  refundedCount: number;
  refundedAmount: number;
  failedCount: number;
  failedAmount: number;
};

type FinanceEvent = {
  type: 'SETTLEMENT' | 'WITHDRAWAL' | 'REFUND';
  id: string;
  orderId?: string;
  amount: number;
  fee: number;
  netAmount: number;
  status: string;
  userId?: string;
  userEmail?: string;
  channel?: string;
  createdAt: string;
};

type FinanceOverview = {
  range: {
    days: number;
    since: string;
  };
  summary: {
    paidOrderCount: number;
    paidOrderAmount: number;
    orderFeeAmount: number;
    refundApprovedCount: number;
    refundApprovedAmount: number;
    platformGrossIncomeEstimate: number;
    platformNetIncomeEstimate: number;
    disputeOpenCount: number;
  };
  settlements: {
    counts: Record<string, number>;
    pendingAmount: number;
    pendingFee: number;
    releasedAmount: number;
    releasedFee: number;
  };
  withdrawals: {
    counts: Record<string, number>;
    pendingAmount: number;
    pendingFee: number;
    paidAmount: number;
    paidFee: number;
  };
  refunds: {
    counts: Record<string, number>;
    approvedAmount: number;
  };
  paymentChannels: FinanceChannelItem[];
  events: FinanceEvent[];
};

const settlementLabel: Record<string, string> = {
  PENDING: '待放款',
  RELEASED: '已放款',
  REJECTED: '已拒绝'
};

const refundLabel: Record<string, string> = {
  PENDING: '待审核',
  APPROVED: '已同意',
  REJECTED: '已拒绝'
};

const withdrawLabel: Record<string, string> = {
  pending: '待审核',
  approved: '待打款',
  paid: '已打款',
  rejected: '已驳回'
};

function eventTone(type: FinanceEvent['type']) {
  if (type === 'SETTLEMENT') return 'success' as const;
  if (type === 'REFUND') return 'warning' as const;
  return 'info' as const;
}

function eventTypeLabel(type: FinanceEvent['type']) {
  if (type === 'SETTLEMENT') return '结算放款';
  if (type === 'REFUND') return '退款';
  return '提现';
}

function statusLabel(type: FinanceEvent['type'], status: string) {
  if (type === 'SETTLEMENT') return settlementLabel[status] || status;
  if (type === 'REFUND') return refundLabel[status] || status;
  return withdrawLabel[status] || status;
}

function channelLabel(channel: string) {
  if (channel === 'BALANCE') return '余额';
  if (channel === 'ALIPAY') return '支付宝';
  if (channel === 'WECHAT') return '微信';
  if (channel === 'USDT') return 'USDT';
  if (channel === 'MANUAL') return '人工';
  return channel;
}

export default function AdminFinancePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [days, setDays] = useState('30');
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState<'orders' | 'settlements' | 'refunds' | 'withdrawals'>(
    'orders'
  );
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [exportChannel, setExportChannel] = useState('');
  const [data, setData] = useState<FinanceOverview | null>(null);
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
      const res = await fetch(`${API_BASE}/admin/finance/overview?days=${Number(days) || 30}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || '读取财务报表失败');
      setData(json);
      setMessage(`已加载近 ${json?.range?.days || days} 天财务数据`);
    } catch (e: any) {
      setError(e.message || '读取财务报表失败');
    } finally {
      setLoading(false);
    }
  }, [days, token]);

  useEffect(() => {
    load();
  }, [load]);

  const exportJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = `finance-overview-${data.range.days}d-${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(href);
  };

  const exportCsv = async () => {
    if (!token) {
      setError('请先登录管理员账号');
      return;
    }
    const query = new URLSearchParams();
    query.set('type', exportType);
    query.set('format', 'csv');
    if (exportFrom) query.set('from', `${exportFrom}T00:00:00.000Z`);
    if (exportTo) query.set('to', `${exportTo}T23:59:59.999Z`);
    if (exportStatus.trim()) query.set('status', exportStatus.trim());
    if (exportChannel.trim()) query.set('channel', exportChannel.trim());

    setExporting(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/finance/export?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const maybeJson = await res.json().catch(() => ({} as any));
        throw new Error(maybeJson.message || '导出失败');
      }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const filename =
        res.headers.get('content-disposition')?.match(/filename="?([^"]+)"?/)?.[1] ||
        `finance-${exportType}.csv`;
      const a = document.createElement('a');
      a.href = href;
      a.download = decodeURIComponent(filename);
      a.click();
      URL.revokeObjectURL(href);
      setMessage(`已导出 ${exportType} 报表`);
    } catch (e: any) {
      setError(e.message || '导出失败');
    } finally {
      setExporting(false);
    }
  };

  const settlementTags = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.settlements.counts);
  }, [data]);

  const refundTags = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.refunds.counts);
  }, [data]);

  const withdrawalTags = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.withdrawals.counts);
  }, [data]);

  return (
    <main className="page page-shell admin-console-page">
      <ConsolePageHeader
        eyebrow="管理后台 · 财务报表"
        title="财务总览与渠道报表"
        description="统一查看支付、退款、提现、结算与手续费分布，支撑担保交易财务核对与运营决策。"
        tags={[
          { label: '财务对账', tone: 'info' },
          { label: '手续费分析', tone: 'warning' },
          { label: loading ? '同步中' : '已同步', tone: loading ? 'warning' : 'success' }
        ]}
        actions={
          <>
            <select value={days} onChange={(e) => setDays(e.target.value)}>
              <option value="7">近 7 天</option>
              <option value="30">近 30 天</option>
              <option value="90">近 90 天</option>
              <option value="180">近 180 天</option>
            </select>
            <button className="btn secondary" type="button" onClick={load} disabled={loading}>
              {loading ? '刷新中...' : '刷新数据'}
            </button>
            <button className="btn secondary" type="button" onClick={exportJson} disabled={!data}>
              导出 JSON
            </button>
          </>
        }
      />

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <ConsolePanel
        title="财务导出面板"
        description="支持导出订单、结算、退款、提现四类 CSV 报表，便于离线对账与审计复核。"
        className="stack-12"
      >
        <div className="console-filter-grid">
          <div className="field">
            <label>导出类型</label>
            <select
              value={exportType}
              onChange={(e) =>
                setExportType(
                  e.target.value as 'orders' | 'settlements' | 'refunds' | 'withdrawals'
                )
              }
            >
              <option value="orders">订单</option>
              <option value="settlements">结算</option>
              <option value="refunds">退款</option>
              <option value="withdrawals">提现</option>
            </select>
          </div>
          <div className="field">
            <label>开始日期</label>
            <input
              type="date"
              value={exportFrom}
              onChange={(e) => setExportFrom(e.target.value)}
            />
          </div>
          <div className="field">
            <label>结束日期</label>
            <input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} />
          </div>
          <div className="field">
            <label>状态（可选）</label>
            <input
              value={exportStatus}
              onChange={(e) => setExportStatus(e.target.value)}
              placeholder="例如：PAID / RELEASED"
            />
          </div>
        </div>
        <div className="console-filter-grid">
          <div className="field">
            <label>渠道（可选）</label>
            <input
              value={exportChannel}
              onChange={(e) => setExportChannel(e.target.value)}
              placeholder="例如：ALIPAY / WECHAT / USDT"
            />
          </div>
          <div className="field">
            <label>导出格式</label>
            <input value="CSV" disabled />
          </div>
        </div>
        <div className="actions">
          <button className="btn primary" type="button" onClick={exportCsv} disabled={exporting}>
            {exporting ? '导出中...' : '导出 CSV'}
          </button>
        </div>
      </ConsolePanel>

      {!data ? (
        <ConsoleEmpty text={loading ? '加载财务报表中...' : '暂无报表数据'} />
      ) : (
        <>
          <section className="metric-grid">
            <article className="metric-card">
              <p className="metric-label">支付成交额</p>
              <p className="metric-value">{formatMoney(data.summary.paidOrderAmount)}</p>
              <p className="metric-tip">成交订单 {data.summary.paidOrderCount} 笔</p>
            </article>
            <article className="metric-card">
              <p className="metric-label">服务费收入（估算）</p>
              <p className="metric-value">{formatMoney(data.summary.platformGrossIncomeEstimate)}</p>
              <p className="metric-tip">订单手续费合计 {formatMoney(data.summary.orderFeeAmount)}</p>
            </article>
            <article className="metric-card">
              <p className="metric-label">退款金额（已同意）</p>
              <p className="metric-value">{formatMoney(data.summary.refundApprovedAmount)}</p>
              <p className="metric-tip">退款单 {data.summary.refundApprovedCount} 笔</p>
            </article>
            <article className="metric-card">
              <p className="metric-label">净收入（估算）</p>
              <p className="metric-value">{formatMoney(data.summary.platformNetIncomeEstimate)}</p>
              <p className="metric-tip">未结纠纷 {data.summary.disputeOpenCount} 笔</p>
            </article>
            <article className="metric-card">
              <p className="metric-label">待放款金额</p>
              <p className="metric-value">{formatMoney(data.settlements.pendingAmount)}</p>
              <p className="metric-tip">待放款手续费 {formatMoney(data.settlements.pendingFee)}</p>
            </article>
            <article className="metric-card">
              <p className="metric-label">提现积压金额</p>
              <p className="metric-value">{formatMoney(data.withdrawals.pendingAmount)}</p>
              <p className="metric-tip">待提现手续费 {formatMoney(data.withdrawals.pendingFee)}</p>
            </article>
          </section>

          <section className="detail-grid">
            <article className="card stack-12">
              <h3>结算状态分布</h3>
              <div className="console-inline-tags">
                {settlementTags.map(([status, count]) => (
                  <StatusBadge key={status} tone={status === 'RELEASED' ? 'success' : status === 'REJECTED' ? 'danger' : 'warning'}>
                    {(settlementLabel[status] || status) + ` ${count}`}
                  </StatusBadge>
                ))}
              </div>
              <p className="muted">已放款金额：{formatMoney(data.settlements.releasedAmount)}</p>
              <p className="muted">已放款手续费：{formatMoney(data.settlements.releasedFee)}</p>
            </article>

            <article className="card stack-12">
              <h3>提现状态分布</h3>
              <div className="console-inline-tags">
                {withdrawalTags.map(([status, count]) => (
                  <StatusBadge key={status} tone={status === 'paid' ? 'success' : status === 'rejected' ? 'danger' : 'warning'}>
                    {(withdrawLabel[status] || status) + ` ${count}`}
                  </StatusBadge>
                ))}
              </div>
              <p className="muted">已打款金额：{formatMoney(data.withdrawals.paidAmount)}</p>
              <p className="muted">已打款手续费：{formatMoney(data.withdrawals.paidFee)}</p>
            </article>

            <article className="card stack-12">
              <h3>退款状态分布</h3>
              <div className="console-inline-tags">
                {refundTags.map(([status, count]) => (
                  <StatusBadge key={status} tone={status === 'APPROVED' ? 'success' : status === 'REJECTED' ? 'danger' : 'warning'}>
                    {(refundLabel[status] || status) + ` ${count}`}
                  </StatusBadge>
                ))}
              </div>
              <p className="muted">已同意退款金额：{formatMoney(data.refunds.approvedAmount)}</p>
            </article>
          </section>

          <ConsolePanel
            title="渠道收款分布"
            description="按支付渠道和支付状态拆分交易量与金额，快速发现异常渠道或积压状态。"
            className="stack-12"
          >
            {data.paymentChannels.length === 0 ? (
              <ConsoleEmpty text="近周期暂无支付渠道数据" />
            ) : (
              <div className="console-table-wrap">
                <table className="console-table console-table-mobile">
                  <thead>
                    <tr>
                      <th>渠道</th>
                      <th>总计</th>
                      <th>已支付</th>
                      <th>未支付</th>
                      <th>已退款</th>
                      <th>失败</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.paymentChannels.map((item) => (
                      <tr key={item.channel}>
                        <td data-label="渠道">
                          <div className="console-row-primary">{channelLabel(item.channel)}</div>
                          <p className="console-row-sub">{item.channel}</p>
                        </td>
                        <td data-label="总计">
                          <div className="console-row-primary">{item.totalCount} 笔</div>
                          <p className="console-row-sub">{formatMoney(item.totalAmount)}</p>
                        </td>
                        <td data-label="已支付">
                          <div className="console-row-primary">{item.paidCount} 笔</div>
                          <p className="console-row-sub">{formatMoney(item.paidAmount)}</p>
                        </td>
                        <td data-label="未支付">
                          <div className="console-row-primary">{item.unpaidCount} 笔</div>
                          <p className="console-row-sub">{formatMoney(item.unpaidAmount)}</p>
                        </td>
                        <td data-label="已退款">
                          <div className="console-row-primary">{item.refundedCount} 笔</div>
                          <p className="console-row-sub">{formatMoney(item.refundedAmount)}</p>
                        </td>
                        <td data-label="失败">
                          <div className="console-row-primary">{item.failedCount} 笔</div>
                          <p className="console-row-sub">{formatMoney(item.failedAmount)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ConsolePanel>

          <ConsolePanel
            title="最近财务事件"
            description="按时间汇总结算、提现、退款事件，便于运营和财务快速追溯。"
            className="stack-12"
          >
            {data.events.length === 0 ? (
              <ConsoleEmpty text="近周期暂无财务事件" />
            ) : (
              <div className="console-table-wrap">
                <table className="console-table console-table-mobile">
                  <thead>
                    <tr>
                      <th>类型</th>
                      <th>事件</th>
                      <th>金额</th>
                      <th>状态</th>
                      <th>关联信息</th>
                      <th>时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.events.map((event) => (
                      <tr key={`${event.type}-${event.id}`}>
                        <td data-label="类型">
                          <StatusBadge tone={eventTone(event.type)}>{eventTypeLabel(event.type)}</StatusBadge>
                        </td>
                        <td data-label="事件">
                          <div className="console-row-primary">{event.id}</div>
                          <p className="console-row-sub">{event.orderId ? `订单：${event.orderId}` : '无订单'}</p>
                        </td>
                        <td data-label="金额">
                          <div className="console-row-primary">{formatMoney(event.amount)}</div>
                          <p className="console-row-sub">
                            手续费 {formatMoney(event.fee)} · 净额 {formatMoney(event.netAmount)}
                          </p>
                        </td>
                        <td data-label="状态">
                          <div className="console-row-primary">{statusLabel(event.type, event.status)}</div>
                          <p className="console-row-sub">{statusLabel(event.type, event.status)}</p>
                        </td>
                        <td data-label="关联信息">
                          <div className="console-row-primary">{event.userEmail || event.userId || '-'}</div>
                          <p className="console-row-sub">{event.channel ? channelLabel(event.channel) : '-'}</p>
                        </td>
                        <td data-label="时间">{formatDateTime(event.createdAt)}</td>
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
