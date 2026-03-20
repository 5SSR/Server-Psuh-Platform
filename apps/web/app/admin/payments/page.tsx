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
import {
  FEE_PAYER_LABEL,
  NOTICE_CHANNEL_MODE_LABEL,
  ORDER_STATUS_LABEL,
  PAY_CHANNEL_LABEL,
  PAY_STATUS_LABEL,
  REVIEW_STATUS_LABEL,
  RECONCILE_TASK_STATUS_LABEL,
  labelByMap
} from '../../../lib/admin-enums';

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
    feePayer?: string;
    buyer?: { id: string; email: string };
    seller?: { id: string; email: string };
    product?: { id: string; title: string; code: string };
  } | null;
};

type ReviewStatus = 'NORMAL' | 'SUSPICIOUS' | 'FRAUD';
type FeeMode = 'FIXED' | 'RATE' | 'TIER';
type FeePayer = 'BUYER' | 'SELLER' | 'SHARED';

type OrderFeeConfig = {
  source: 'ENV' | 'DB';
  mode: FeeMode;
  payer: FeePayer;
  fixedFee: number;
  rate: number;
  minFee: number;
  tiers: Array<{ upTo: number | null; rate: number }>;
  remark?: string;
  updatedAt?: string;
  updatedBy?: string | null;
};

type FeeDraft = {
  mode: FeeMode;
  payer: FeePayer;
  fixedFee: string;
  rate: string;
  minFee: string;
  tiersText: string;
  remark: string;
};

type PaymentIntegrationItem = {
  channel: 'BALANCE' | 'ALIPAY' | 'WECHAT' | 'USDT' | 'MANUAL';
  mode: 'INTERNAL' | 'MANUAL_REVIEW' | 'MOCK' | 'REMOTE' | 'DISABLED' | string;
  enabled: boolean;
  payEntryBase?: string;
  webhook?: {
    path?: string;
    secretConfigured?: boolean;
    enabled?: boolean;
  };
  reconcile?: {
    endpointConfigured?: boolean;
    tokenConfigured?: boolean;
    lastTask?: {
      id: string;
      status: string;
      diffCount?: number | null;
      error?: string | null;
      startedAt?: string | null;
      finishedAt?: string | null;
      createdAt?: string | null;
    } | null;
  };
  metrics24h?: {
    paidCount?: number;
    lastPaidAt?: string | null;
  };
  warnings?: string[];
};

type PaymentDiagnosticsReport = {
  generatedAt: string;
  window: {
    last24h: string;
    last7d: string;
  };
  summary: {
    totalChannels: number;
    enabledChannels: number;
    remoteChannels: number;
    warningChannels: number;
    unpaidCount24h: number;
    runningReconcileCount: number;
    suspiciousCount7d: number;
    fraudCount7d: number;
  };
  channelStatus: PaymentIntegrationItem[];
  highRiskPayments: Array<{
    id: string;
    orderId: string;
    channel: string;
    amount: number;
    payStatus: string;
    tradeNo?: string | null;
    createdAt: string;
    paidAt?: string | null;
    orderStatus?: string | null;
    buyerId?: string | null;
    sellerId?: string | null;
    reviewStatus: 'SUSPICIOUS' | 'FRAUD';
    reviewRemark?: string | null;
    reviewedAt?: string | null;
    reviewedBy?: string | null;
  }>;
};

function payTone(status: string) {
  if (status === 'PAID') return 'success' as const;
  if (status === 'REFUNDED') return 'warning' as const;
  return 'info' as const;
}

function reviewTone(status?: ReviewStatus) {
  if (status === 'FRAUD') return 'danger' as const;
  if (status === 'SUSPICIOUS') return 'warning' as const;
  if (status === 'NORMAL') return 'success' as const;
  return 'default' as const;
}

function gatewayModeTone(mode?: string) {
  if (mode === 'REMOTE') return 'success' as const;
  if (mode === 'MOCK') return 'warning' as const;
  if (mode === 'DISABLED') return 'danger' as const;
  if (mode === 'INTERNAL' || mode === 'MANUAL_REVIEW') return 'info' as const;
  return 'default' as const;
}

function feeTiersToText(tiers: Array<{ upTo: number | null; rate: number }> = []) {
  if (tiers.length === 0) return '';
  return tiers
    .map((item) => `${item.upTo === null ? '*' : item.upTo}:${item.rate}`)
    .join('\n');
}

function feeConfigToDraft(config: OrderFeeConfig): FeeDraft {
  return {
    mode: config.mode,
    payer: config.payer,
    fixedFee: String(config.fixedFee ?? ''),
    rate: String(config.rate ?? ''),
    minFee: String(config.minFee ?? ''),
    tiersText: feeTiersToText(config.tiers),
    remark: config.remark || ''
  };
}

export default function AdminPaymentsPage() {
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [integrationLoading, setIntegrationLoading] = useState(false);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<PaymentDiagnosticsReport | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [items, setItems] = useState<PaymentItem[]>([]);
  const [integrations, setIntegrations] = useState<PaymentIntegrationItem[]>([]);
  const [orderFeeConfig, setOrderFeeConfig] = useState<OrderFeeConfig | null>(null);
  const [feeDraft, setFeeDraft] = useState<FeeDraft>({
    mode: 'RATE',
    payer: 'SELLER',
    fixedFee: '1',
    rate: '0.015',
    minFee: '0',
    tiersText: '200:0.03\n1000:0.02\n*:0.015',
    remark: ''
  });

  const [payStatus, setPayStatus] = useState('');
  const [channel, setChannel] = useState('');
  const [orderId, setOrderId] = useState('');
  const [tradeNo, setTradeNo] = useState('');
  const [userId, setUserId] = useState('');
  const [keyword, setKeyword] = useState('');
  const [selectedId, setSelectedId] = useState('');

  const [reviewForms, setReviewForms] = useState<Record<string, { status: ReviewStatus; remark: string }>>({});

  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null;

  const loadIntegrations = useCallback(async () => {
    if (!token) return;
    setIntegrationLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/payments/integrations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取支付接入状态失败');
      setIntegrations(Array.isArray(data.channels) ? data.channels : []);
    } catch (e: any) {
      setError(e.message || '读取支付接入状态失败');
    } finally {
      setIntegrationLoading(false);
    }
  }, [token]);

  const loadDiagnostics = useCallback(async () => {
    if (!token) return null;
    setDiagnosticsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/payments/diagnostics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取支付诊断报告失败');
      setDiagnostics(data as PaymentDiagnosticsReport);
      return data as PaymentDiagnosticsReport;
    } catch (e: any) {
      setError(e.message || '读取支付诊断报告失败');
      return null;
    } finally {
      setDiagnosticsLoading(false);
    }
  }, [token]);

  const loadFeeConfig = useCallback(async () => {
    if (!token) return;
    setConfigLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/payments/fee-config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取手续费配置失败');
      const config = data as OrderFeeConfig;
      setOrderFeeConfig(config);
      setFeeDraft(feeConfigToDraft(config));
    } catch (e: any) {
      setError(e.message || '读取手续费配置失败');
    } finally {
      setConfigLoading(false);
    }
  }, [token]);

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
    loadFeeConfig();
    loadIntegrations();
    loadDiagnostics();
  }, [load, loadFeeConfig, loadIntegrations, loadDiagnostics]);

  const filteredItems = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    if (!key) return items;
    return items.filter((item) => {
      return (
        item.orderId.toLowerCase().includes(key) ||
        (item.tradeNo || '').toLowerCase().includes(key) ||
        (item.order?.product?.title || '').toLowerCase().includes(key) ||
        (item.order?.buyer?.email || '').toLowerCase().includes(key) ||
        (item.order?.seller?.email || '').toLowerCase().includes(key)
      );
    });
  }, [items, keyword]);

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedId('');
      return;
    }
    if (!selectedId || !filteredItems.find((item) => item.id === selectedId)) {
      setSelectedId(filteredItems[0].id);
    }
  }, [filteredItems, selectedId]);

  const selectedItem = filteredItems.find((item) => item.id === selectedId) || null;

  const getReviewForm = (orderIdValue: string, item: PaymentItem) => {
    return (
      reviewForms[orderIdValue] || {
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

  const saveFeeConfig = async () => {
    if (!token) return;
    const fixedFee = Number(feeDraft.fixedFee);
    const rate = Number(feeDraft.rate);
    const minFee = Number(feeDraft.minFee);
    const tiers = feeDraft.tiersText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [upToRaw, rateRaw] = line.split(':').map((item) => item.trim());
        const tierRate = Number(rateRaw);
        const upTo = upToRaw === '*' || upToRaw === '' ? null : Number(upToRaw);
        if (Number.isNaN(tierRate) || tierRate < 0 || tierRate > 1) {
          throw new Error(`无效阶梯费率：${line}`);
        }
        if (upTo !== null && (Number.isNaN(upTo) || upTo < 0)) {
          throw new Error(`无效阶梯上限：${line}`);
        }
        return { upTo, rate: tierRate };
      });

    if (feeDraft.mode === 'FIXED' && (!Number.isFinite(fixedFee) || fixedFee < 0)) {
      setError('固定模式下，fixedFee 必须是非负数字');
      return;
    }
    if (feeDraft.mode === 'RATE' && (!Number.isFinite(rate) || rate < 0 || rate > 1)) {
      setError('比例模式下，rate 必须在 0~1');
      return;
    }
    if (!Number.isFinite(minFee) || minFee < 0) {
      setError('minFee 必须是非负数字');
      return;
    }
    if (feeDraft.mode === 'TIER' && tiers.length === 0) {
      setError('阶梯模式至少需要一条阶梯配置');
      return;
    }

    setConfigLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/payments/fee-config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          mode: feeDraft.mode,
          payer: feeDraft.payer,
          fixedFee,
          rate,
          minFee,
          tiers,
          remark: feeDraft.remark.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '保存手续费配置失败');
      setMessage(data.message || '手续费配置已更新');
      await loadFeeConfig();
    } catch (e: any) {
      setError(e.message || '保存手续费配置失败');
    } finally {
      setConfigLoading(false);
    }
  };

  const exportDiagnostics = async () => {
    const report = diagnostics || (await loadDiagnostics());
    if (!report) return;
    const stamp = new Date(report.generatedAt || Date.now())
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+$/, '');
    const filename = `payment-diagnostics-${stamp}.json`;
    const json = JSON.stringify(report, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    setMessage(`诊断报告已导出：${filename}`);
  };

  return (
    <main className="page page-shell admin-console-page">
      <ConsolePageHeader
        eyebrow="管理后台 · 支付监控"
        title="支付流水与风控排查"
        description="统一查看支付状态、交易号与关联订单，标记可疑交易并留存排查结论。"
        tags={[
          { label: '资金托管', tone: 'info' },
          { label: '支付风控', tone: 'warning' },
          { label: `记录 ${items.length} 条`, tone: 'default' }
        ]}
        actions={
          <button onClick={load} className="btn secondary" disabled={loading}>
            {loading ? '刷新中...' : '刷新列表'}
          </button>
        }
      />

      <ConsolePanel title="筛选区" className="stack-12">
        <div className="console-filter-grid">
          <div className="field">
            <label>支付状态</label>
            <select value={payStatus} onChange={(e) => setPayStatus(e.target.value)}>
              <option value="">全部</option>
              <option value="UNPAID">待支付</option>
              <option value="PAID">已支付</option>
              <option value="REFUNDED">已退款</option>
            </select>
          </div>
          <div className="field">
            <label>支付渠道</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="">全部</option>
              <option value="BALANCE">余额</option>
              <option value="ALIPAY">支付宝</option>
              <option value="WECHAT">微信支付</option>
              <option value="USDT">USDT</option>
              <option value="MANUAL">人工</option>
            </select>
          </div>
          <div className="field">
            <label>订单号</label>
            <input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="精确匹配" />
          </div>
          <div className="field">
            <label>交易号</label>
            <input value={tradeNo} onChange={(e) => setTradeNo(e.target.value)} placeholder="模糊匹配" />
          </div>
          <div className="field">
            <label>用户 ID</label>
            <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="买方或卖方" />
          </div>
          <div className="field">
            <label>关键词</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="订单 / 商品 / 邮箱 / 交易号"
            />
          </div>
        </div>
      </ConsolePanel>

      <ConsolePanel
        title="详情操作区 · 支付接入状态"
        description="统一查看各支付渠道运行模式、验签配置、对账链路与近期交易活跃度。"
        className="stack-12"
      >
        {diagnostics ? (
          <div className="console-detail-grid">
            <div className="spec-item">
              <p className="label">渠道总数 / 启用数</p>
              <p className="value">
                {diagnostics.summary.totalChannels} / {diagnostics.summary.enabledChannels}
              </p>
            </div>
            <div className="spec-item">
              <p className="label">告警渠道数</p>
              <p className="value">{diagnostics.summary.warningChannels}</p>
            </div>
            <div className="spec-item">
              <p className="label">24h 未支付积压</p>
              <p className="value">{diagnostics.summary.unpaidCount24h}</p>
            </div>
            <div className="spec-item">
              <p className="label">进行中对账任务</p>
              <p className="value">{diagnostics.summary.runningReconcileCount}</p>
            </div>
            <div className="spec-item">
              <p className="label">7d 可疑 / 风险支付</p>
              <p className="value">
                {diagnostics.summary.suspiciousCount7d} / {diagnostics.summary.fraudCount7d}
              </p>
            </div>
            <div className="spec-item">
              <p className="label">报告生成时间</p>
              <p className="value">{formatDateTime(diagnostics.generatedAt)}</p>
            </div>
          </div>
        ) : null}

        {integrations.length === 0 ? (
          <ConsoleEmpty text={integrationLoading ? '读取中...' : '暂无渠道接入状态数据'} />
        ) : (
          <div className="console-table-wrap">
            <table className="console-table console-table-mobile">
              <thead>
                <tr>
                  <th>渠道</th>
                  <th>运行模式</th>
                  <th>验签 / 回调</th>
                  <th>对账链路</th>
                  <th>24h 活跃</th>
                  <th>告警</th>
                </tr>
              </thead>
              <tbody>
                {integrations.map((item) => (
                  <tr key={item.channel}>
                    <td data-label="渠道">
                      <div className="console-row-primary">{labelByMap(item.channel, PAY_CHANNEL_LABEL, item.channel)}</div>
                      <p className="console-row-sub">{item.enabled ? '已启用' : '已禁用'}</p>
                    </td>
                    <td data-label="运行模式">
                      <StatusBadge tone={gatewayModeTone(item.mode)}>{labelByMap(item.mode, NOTICE_CHANNEL_MODE_LABEL, item.mode)}</StatusBadge>
                    </td>
                    <td data-label="验签 / 回调">
                      <div className="console-inline-tags">
                        <StatusBadge tone={item.webhook?.enabled ? 'info' : 'default'}>
                          {item.webhook?.enabled ? 'Webhook 启用' : 'Webhook 关闭'}
                        </StatusBadge>
                        <StatusBadge tone={item.webhook?.secretConfigured ? 'success' : 'warning'}>
                          {item.webhook?.secretConfigured ? '密钥已配置' : '密钥缺失'}
                        </StatusBadge>
                      </div>
                    </td>
                    <td data-label="对账链路">
                      <div className="console-inline-tags">
                        <StatusBadge tone={item.reconcile?.endpointConfigured ? 'success' : 'warning'}>
                          {item.reconcile?.endpointConfigured ? '对账接口已配置' : '对账接口缺失'}
                        </StatusBadge>
                        <StatusBadge tone={item.reconcile?.tokenConfigured ? 'success' : 'warning'}>
                          {item.reconcile?.tokenConfigured ? 'Token 已配置' : 'Token 缺失'}
                        </StatusBadge>
                        {item.reconcile?.lastTask ? (
                          <StatusBadge tone={item.reconcile.lastTask.status === 'COMPLETED' ? 'success' : 'warning'}>
                            最近对账 {labelByMap(item.reconcile.lastTask.status, RECONCILE_TASK_STATUS_LABEL, item.reconcile.lastTask.status)}
                          </StatusBadge>
                        ) : (
                          <StatusBadge tone="default">暂无对账任务</StatusBadge>
                        )}
                      </div>
                    </td>
                    <td data-label="24h 活跃">
                      <div className="console-row-primary">{item.metrics24h?.paidCount || 0} 笔</div>
                      <p className="console-row-sub">{formatDateTime(item.metrics24h?.lastPaidAt)}</p>
                    </td>
                    <td data-label="告警">
                      {item.warnings?.length ? (
                        <div className="stack-8">
                          {item.warnings.map((warn, idx) => (
                            <p key={`${item.channel}-${idx}`} className="error">
                              {warn}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <StatusBadge tone="success">无告警</StatusBadge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="actions">
          <button className="btn secondary" type="button" onClick={loadIntegrations} disabled={integrationLoading}>
            {integrationLoading ? '刷新中...' : '刷新接入状态'}
          </button>
          <button className="btn secondary" type="button" onClick={loadDiagnostics} disabled={diagnosticsLoading}>
            {diagnosticsLoading ? '刷新中...' : '刷新诊断摘要'}
          </button>
          <button className="btn primary" type="button" onClick={exportDiagnostics} disabled={diagnosticsLoading}>
            {diagnosticsLoading ? '生成中...' : '导出诊断报告 JSON'}
          </button>
        </div>
      </ConsolePanel>

      <ConsolePanel
        title="表格区 · 高风险支付快照（近 7 天）"
        description="展示已被人工标记为可疑/风险的支付记录，用于财务复核和仲裁联动。"
        className="stack-12"
      >
        {!diagnostics || diagnostics.highRiskPayments.length === 0 ? (
          <ConsoleEmpty text={diagnosticsLoading ? '读取中...' : '近 7 天暂无高风险支付'} />
        ) : (
          <div className="console-table-wrap">
            <table className="console-table console-table-mobile">
              <thead>
                <tr>
                  <th>支付 / 订单</th>
                  <th>风险级别</th>
                  <th>渠道 / 金额</th>
                  <th>订单状态</th>
                  <th>复核信息</th>
                </tr>
              </thead>
              <tbody>
                {diagnostics.highRiskPayments.map((item) => (
                  <tr key={item.id}>
                    <td data-label="支付 / 订单">
                      <div className="console-row-primary">{item.id}</div>
                      <p className="console-row-sub">订单：{item.orderId}</p>
                    </td>
                    <td data-label="风险级别">
                      <StatusBadge tone={item.reviewStatus === 'FRAUD' ? 'danger' : 'warning'}>
                        {labelByMap(item.reviewStatus, REVIEW_STATUS_LABEL, item.reviewStatus)}
                      </StatusBadge>
                    </td>
                    <td data-label="渠道 / 金额">
                      <div className="console-row-primary">
                        {labelByMap(item.channel, PAY_CHANNEL_LABEL, item.channel)} / {formatMoney(item.amount)}
                      </div>
                      <p className="console-row-sub">{item.tradeNo || '无交易号'}</p>
                    </td>
                    <td data-label="订单状态">
                      <div className="console-row-primary">{labelByMap(item.orderStatus || '', ORDER_STATUS_LABEL, item.orderStatus || '-')}</div>
                      <p className="console-row-sub">支付：{labelByMap(item.payStatus, PAY_STATUS_LABEL, item.payStatus)}</p>
                    </td>
                    <td data-label="复核信息">
                      <div className="console-row-primary">{formatDateTime(item.reviewedAt)}</div>
                      <p className="console-row-sub">{item.reviewRemark || '无备注'}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ConsolePanel>

      <ConsolePanel
        title="详情操作区 · 手续费策略"
        description="支持固定费、比例费、阶梯费三种模式，更新后新订单即时按新规则计费。"
        className="console-detail stack-12"
      >
        <div className="console-detail-grid">
              <div className="spec-item">
                <p className="label">配置来源</p>
                <p className="value">{orderFeeConfig?.source === 'DB' ? '数据库配置' : '环境变量默认'}</p>
              </div>
          <div className="spec-item">
            <p className="label">最近更新时间</p>
            <p className="value">{formatDateTime(orderFeeConfig?.updatedAt)}</p>
          </div>
          <div className="spec-item">
            <p className="label">最近操作人</p>
            <p className="value">{orderFeeConfig?.updatedBy || '未记录'}</p>
          </div>
        </div>

        <div className="console-filter-grid">
          <div className="field">
            <label>计费模式</label>
            <select
              value={feeDraft.mode}
              onChange={(e) =>
                setFeeDraft((prev) => ({ ...prev, mode: e.target.value as FeeMode }))
              }
            >
              <option value="FIXED">固定金额</option>
              <option value="RATE">按比例</option>
              <option value="TIER">阶梯费率</option>
            </select>
          </div>
          <div className="field">
            <label>手续费承担方</label>
            <select
              value={feeDraft.payer}
              onChange={(e) =>
                setFeeDraft((prev) => ({ ...prev, payer: e.target.value as FeePayer }))
              }
            >
              <option value="SELLER">卖家承担</option>
              <option value="BUYER">买家承担</option>
              <option value="SHARED">买卖各半</option>
            </select>
          </div>
          <div className="field">
            <label>固定费用（元）</label>
            <input
              value={feeDraft.fixedFee}
              onChange={(e) => setFeeDraft((prev) => ({ ...prev, fixedFee: e.target.value }))}
              placeholder="固定金额（元）"
            />
          </div>
          <div className="field">
            <label>费率（0~1）</label>
            <input
              value={feeDraft.rate}
              onChange={(e) => setFeeDraft((prev) => ({ ...prev, rate: e.target.value }))}
              placeholder="比例（0~1）"
            />
          </div>
          <div className="field">
            <label>最低费用（元）</label>
            <input
              value={feeDraft.minFee}
              onChange={(e) => setFeeDraft((prev) => ({ ...prev, minFee: e.target.value }))}
              placeholder="最小手续费（元）"
            />
          </div>
        </div>

        <div className="form">
          <label>阶梯配置（每行 `上限:费率`，无限上限用 `*`）</label>
          <textarea
            rows={4}
            value={feeDraft.tiersText}
            onChange={(e) => setFeeDraft((prev) => ({ ...prev, tiersText: e.target.value }))}
            placeholder={`200:0.03\n1000:0.02\n*:0.015`}
          />
        </div>

        <div className="form">
          <label>备注（可选）</label>
          <textarea
            rows={2}
            value={feeDraft.remark}
            onChange={(e) => setFeeDraft((prev) => ({ ...prev, remark: e.target.value }))}
            placeholder="例如：大额订单服务费从 1.5% 调整为 1.2%"
          />
        </div>

        <div className="actions">
          <button className="btn secondary" type="button" onClick={loadFeeConfig} disabled={configLoading}>
            {configLoading ? '刷新中...' : '刷新配置'}
          </button>
          <button className="btn primary" type="button" onClick={saveFeeConfig} disabled={configLoading}>
            {configLoading ? '保存中...' : '保存手续费策略'}
          </button>
        </div>
      </ConsolePanel>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <ConsolePanel title="表格区 · 支付记录" className="stack-12">
        {filteredItems.length === 0 ? (
          <ConsoleEmpty text={loading ? '加载中...' : '暂无支付记录'} />
        ) : (
          <div className="console-table-wrap">
            <table className="console-table console-table-mobile">
              <thead>
                <tr>
                  <th>支付 / 订单</th>
                  <th>买家 / 卖家</th>
                  <th>渠道 / 交易号</th>
                  <th>金额</th>
                  <th>支付状态</th>
                  <th>排查标记</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const reviewStatus = item.notifyPayload?.adminReview?.status as ReviewStatus | undefined;
                  return (
                    <tr key={item.id}>
                      <td data-label="支付 / 订单">
                        <div className="console-row-primary">{item.id}</div>
                        <p className="console-row-sub">订单：{item.orderId}</p>
                      </td>
                      <td data-label="买家 / 卖家">
                        <div className="console-row-primary">买家：{item.order?.buyer?.email || '-'}</div>
                        <p className="console-row-sub">卖家：{item.order?.seller?.email || '-'}</p>
                      </td>
                      <td data-label="渠道 / 交易号">
                        <div className="console-row-primary">{labelByMap(item.channel, PAY_CHANNEL_LABEL, item.channel)}</div>
                        <p className="console-row-sub">{item.tradeNo || '无交易号'}</p>
                      </td>
                      <td data-label="金额">
                        <div className="console-row-primary">{formatMoney(item.amount)}</div>
                        <p className="console-row-sub">创建：{formatDateTime(item.createdAt)}</p>
                      </td>
                      <td data-label="支付状态">
                        <div className="console-inline-tags">
                          <StatusBadge tone={payTone(item.payStatus)}>{labelByMap(item.payStatus, PAY_STATUS_LABEL, item.payStatus)}</StatusBadge>
                          {item.paidAt ? <span className="console-row-sub">{formatDateTime(item.paidAt)}</span> : null}
                        </div>
                      </td>
                      <td data-label="排查标记">
                        {reviewStatus ? (
                          <div className="console-inline-tags">
                            <StatusBadge tone={reviewTone(reviewStatus)}>{labelByMap(reviewStatus, REVIEW_STATUS_LABEL, reviewStatus)}</StatusBadge>
                            {item.notifyPayload?.adminReview?.reviewedAt ? (
                              <span className="console-row-sub">{formatDateTime(item.notifyPayload.adminReview.reviewedAt)}</span>
                            ) : null}
                          </div>
                        ) : (
                          <StatusBadge>未标注</StatusBadge>
                        )}
                      </td>
                      <td data-label="操作">
                        <button
                          type="button"
                          className={`btn ${selectedId === item.id ? 'primary' : 'secondary'} btn-sm`}
                          onClick={() => setSelectedId(item.id)}
                        >
                          {selectedId === item.id ? '处理中' : '处理'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ConsolePanel>

      <ConsolePanel
        title="详情操作区"
        description="对支付记录进行人工排查标记，可用于后续风控审计与纠纷处理追溯。"
        className="console-detail stack-12"
      >
        {!selectedItem ? (
          <ConsoleEmpty text="请选择一条支付记录进行处理" />
        ) : (
          <>
            <div className="console-detail-grid">
              <div className="spec-item">
                <p className="label">支付编号</p>
                <p className="value">{selectedItem.id}</p>
              </div>
              <div className="spec-item">
                <p className="label">关联订单</p>
                <p className="value">{selectedItem.orderId}</p>
              </div>
              <div className="spec-item">
                <p className="label">商品</p>
                <p className="value">{selectedItem.order?.product?.title || '未知商品'}</p>
              </div>
              <div className="spec-item">
                <p className="label">金额</p>
                <p className="value">{formatMoney(selectedItem.amount)}</p>
              </div>
              <div className="spec-item">
                <p className="label">订单手续费</p>
                <p className="value">
                  {formatMoney(selectedItem.order?.fee || 0)} / {labelByMap(selectedItem.order?.feePayer || 'SELLER', FEE_PAYER_LABEL, selectedItem.order?.feePayer || 'SELLER')}
                </p>
              </div>
            </div>

            <div className="console-alert">
              排查建议：重点核对交易号唯一性、买卖双方资金流向与订单状态是否一致，异常应标记为「可疑/风险」。
            </div>

            <div className="form stack-12">
              <div className="console-filter-grid">
                <div className="field">
                  <label>排查标记</label>
                  <select
                    value={getReviewForm(selectedItem.orderId, selectedItem).status}
                    onChange={(e) =>
                      setReviewForms((prev) => ({
                        ...prev,
                        [selectedItem.orderId]: {
                          ...getReviewForm(selectedItem.orderId, selectedItem),
                          status: e.target.value as ReviewStatus
                        }
                      }))
                    }
                  >
                    <option value="NORMAL">正常</option>
                    <option value="SUSPICIOUS">可疑</option>
                    <option value="FRAUD">风险</option>
                  </select>
                </div>
                <div className="field">
                  <label>支付状态</label>
                  <input value={labelByMap(selectedItem.payStatus, PAY_STATUS_LABEL, selectedItem.payStatus)} disabled />
                </div>
              </div>

              <div className="form">
                <label>排查备注（可选）</label>
                <textarea
                  value={getReviewForm(selectedItem.orderId, selectedItem).remark}
                  onChange={(e) =>
                    setReviewForms((prev) => ({
                      ...prev,
                      [selectedItem.orderId]: {
                        ...getReviewForm(selectedItem.orderId, selectedItem),
                        remark: e.target.value
                      }
                    }))
                  }
                  rows={4}
                  placeholder="例如：交易号重复，已通知财务核对上游账单"
                />
              </div>

              <div className="actions">
                <button className="btn primary" onClick={() => review(selectedItem)} disabled={loading}>
                  保存排查结果
                </button>
              </div>
            </div>
          </>
        )}
      </ConsolePanel>
    </main>
  );
}
