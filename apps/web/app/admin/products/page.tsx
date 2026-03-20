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
  PRODUCT_AUDIT_STATUS_LABEL,
  PRODUCT_CATEGORY_LABEL,
  PRODUCT_STATUS_LABEL,
  RISK_LEVEL_LABEL,
  labelByMap
} from '../../../lib/admin-enums';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type ConsignmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED';

type Product = {
  id: string;
  title: string;
  code: string;
  category: string;
  region: string;
  datacenter?: string | null;
  status?: string;
  lineType?: string | null;
  providerName?: string | null;
  providerUrl?: string | null;
  cpuModel?: string | null;
  cpuCores?: number | null;
  memoryGb?: number | null;
  diskGb?: number | null;
  diskType?: string | null;
  bandwidthMbps?: number | null;
  trafficLimit?: number | null;
  ipCount?: number | null;
  ddos?: number | null;
  purchasePrice?: number | string | null;
  salePrice: number | string;
  minAcceptPrice?: number | string | null;
  renewPrice?: number | string | null;
  expireAt?: string | null;
  negotiable?: boolean;
  riskLevel?: string;
  riskTags?: string[] | null;
  deliveryType?: string;
  feePayer?: string;
  canChangeEmail?: boolean;
  canChangeRealname?: boolean;
  canTest?: boolean;
  canTransfer?: boolean;
  abuseHistory?: boolean;
  accountRecallRisk?: boolean;
  isPremium?: boolean;
  premiumRate?: number | string | null;
  consignment?: boolean;
  description?: string | null;
  updatedAt?: string;
  sellerId: string;
  seller?: {
    id: string;
    email: string;
    sellerProfile?: {
      level: number;
      tradeCount: number;
      disputeRate: number;
      refundRate?: number;
      positiveRate: number;
    } | null;
  } | null;
  consignmentApplications?: Array<{
    id: string;
    status: ConsignmentStatus;
    sellerNote?: string | null;
    adminRemark?: string | null;
    reviewedAt?: string | null;
    createdAt: string;
    reviewer?: {
      id: string;
      email: string;
    } | null;
  }>;
  createdAt: string;
  audits?: Array<{
    status: string;
    reason?: string | null;
    createdAt: string;
  }>;
};

const consignmentStatusLabel: Record<ConsignmentStatus, string> = {
  PENDING: '寄售待审核',
  APPROVED: '寄售已通过',
  REJECTED: '寄售已驳回',
  CANCELED: '寄售已撤销'
};

function consignmentTone(status?: string) {
  if (status === 'APPROVED') return 'success' as const;
  if (status === 'REJECTED') return 'danger' as const;
  if (status === 'CANCELED') return 'default' as const;
  return 'warning' as const;
}

function riskTone(level?: string) {
  if (level === 'HIGH') return 'danger' as const;
  if (level === 'LOW') return 'success' as const;
  return 'warning' as const;
}

function riskLabel(level?: string) {
  if (!level) return '未标注';
  return labelByMap(level, RISK_LEVEL_LABEL, '未标注');
}

function formatRate(value?: number | null) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '0.0%';
  return `${n <= 1 ? (n * 100).toFixed(1) : n.toFixed(1)}%`;
}

function readRiskTagsText(tags: Product['riskTags']) {
  if (!Array.isArray(tags)) return '';
  return tags.map((item) => String(item).trim()).filter(Boolean).join(', ');
}

type MarketDraft = {
  status: string;
  riskLevel: string;
  riskTags: string;
  isPremium: boolean;
  premiumRate: string;
};

type CoreDraft = {
  title: string;
  category: string;
  region: string;
  datacenter: string;
  lineType: string;
  providerName: string;
  providerUrl: string;
  cpuModel: string;
  cpuCores: string;
  memoryGb: string;
  diskGb: string;
  diskType: string;
  bandwidthMbps: string;
  trafficLimit: string;
  ipCount: string;
  ddos: string;
  salePrice: string;
  purchasePrice: string;
  minAcceptPrice: string;
  renewPrice: string;
  expireAt: string;
  deliveryType: string;
  feePayer: string;
  negotiable: boolean;
  consignment: boolean;
  canChangeEmail: boolean;
  canChangeRealname: boolean;
  canTest: boolean;
  canTransfer: boolean;
  riskLevel: string;
  riskTags: string;
  abuseHistory: boolean;
  accountRecallRisk: boolean;
  description: string;
  status: string;
};

const DELIVERY_TYPE_LABEL: Record<string, string> = {
  FULL_ACCOUNT: '整账号交付',
  PANEL_TRANSFER: '面板转移',
  SUB_ACCOUNT: '子账号交付',
  EMAIL_CHANGE: '邮箱改绑'
};

function decimalToInput(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : '';
}

function intToInput(value: number | null | undefined) {
  if (value === null || value === undefined) return '';
  return Number.isFinite(value) ? String(Math.trunc(value)) : '';
}

export default function AdminProductsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState('');
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketProducts, setMarketProducts] = useState<Product[]>([]);
  const [marketKeyword, setMarketKeyword] = useState('');
  const [marketStatus, setMarketStatus] = useState('');
  const [marketOnlyFeatured, setMarketOnlyFeatured] = useState(false);
  const [marketSelectedId, setMarketSelectedId] = useState('');
  const [marketDrafts, setMarketDrafts] = useState<Record<string, MarketDraft>>({});
  const [coreDrafts, setCoreDrafts] = useState<Record<string, CoreDraft>>({});
  const [coreSaving, setCoreSaving] = useState(false);

  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [region, setRegion] = useState('');

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
      const res = await fetch(`${API_BASE}/admin/products/pending?page=1&pageSize=30`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取待审商品失败');
      setProducts(data.list || []);
    } catch (e: any) {
      setError(e.message || '读取失败');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const buildMarketDraft = useCallback((item: Product): MarketDraft => {
    const premiumValue =
      item.premiumRate === null || item.premiumRate === undefined
        ? ''
        : String(Number(item.premiumRate));
    return {
      status: item.status || 'ONLINE',
      riskLevel: item.riskLevel || 'MEDIUM',
      riskTags: readRiskTagsText(item.riskTags),
      isPremium: Boolean(item.isPremium),
      premiumRate: premiumValue
    };
  }, []);

  const buildCoreDraft = useCallback((item: Product): CoreDraft => {
    return {
      title: item.title || '',
      category: item.category || 'VPS',
      region: item.region || '',
      datacenter: item.datacenter || '',
      lineType: item.lineType || '',
      providerName: item.providerName || '',
      providerUrl: item.providerUrl || '',
      cpuModel: item.cpuModel || '',
      cpuCores: intToInput(item.cpuCores),
      memoryGb: intToInput(item.memoryGb),
      diskGb: intToInput(item.diskGb),
      diskType: item.diskType || '',
      bandwidthMbps: intToInput(item.bandwidthMbps),
      trafficLimit: intToInput(item.trafficLimit),
      ipCount: intToInput(item.ipCount),
      ddos: intToInput(item.ddos),
      salePrice: decimalToInput(item.salePrice),
      purchasePrice: decimalToInput(item.purchasePrice),
      minAcceptPrice: decimalToInput(item.minAcceptPrice),
      renewPrice: decimalToInput(item.renewPrice),
      expireAt: item.expireAt ? item.expireAt.slice(0, 10) : '',
      deliveryType: item.deliveryType || 'FULL_ACCOUNT',
      feePayer: item.feePayer || 'SELLER',
      negotiable: Boolean(item.negotiable),
      consignment: Boolean(item.consignment),
      canChangeEmail: Boolean(item.canChangeEmail),
      canChangeRealname: Boolean(item.canChangeRealname),
      canTest: Boolean(item.canTest),
      canTransfer: Boolean(item.canTransfer),
      riskLevel: item.riskLevel || 'MEDIUM',
      riskTags: readRiskTagsText(item.riskTags),
      abuseHistory: Boolean(item.abuseHistory),
      accountRecallRisk: Boolean(item.accountRecallRisk),
      description: item.description || '',
      status: item.status || 'ONLINE'
    };
  }, []);

  const loadMarket = useCallback(async () => {
    if (!token) return;
    setMarketLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/products?page=1&pageSize=80`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取运营商品失败');
      const list: Product[] = data.list || [];
      setMarketProducts(list);
      setMarketDrafts(() => {
        const next: Record<string, MarketDraft> = {};
        for (const item of list) {
          next[item.id] = buildMarketDraft(item);
        }
        return next;
      });
      setCoreDrafts(() => {
        const next: Record<string, CoreDraft> = {};
        for (const item of list) {
          next[item.id] = buildCoreDraft(item);
        }
        return next;
      });
    } catch (e: any) {
      setError(e.message || '读取运营商品失败');
    } finally {
      setMarketLoading(false);
    }
  }, [buildCoreDraft, buildMarketDraft, token]);

  useEffect(() => {
    load();
    loadMarket();
  }, [load, loadMarket]);

  const filteredProducts = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    return products.filter((item) => {
      if (category && item.category !== category) return false;
      if (region.trim() && !item.region.toLowerCase().includes(region.trim().toLowerCase())) return false;
      if (!key) return true;
      return (
        item.title.toLowerCase().includes(key) ||
        item.code.toLowerCase().includes(key) ||
        item.sellerId.toLowerCase().includes(key) ||
        item.seller?.id?.toLowerCase().includes(key) ||
        item.seller?.email?.toLowerCase().includes(key)
      );
    });
  }, [products, keyword, category, region]);

  useEffect(() => {
    if (!filteredProducts.length) {
      setSelectedId('');
      return;
    }
    if (!selectedId || !filteredProducts.find((item) => item.id === selectedId)) {
      setSelectedId(filteredProducts[0].id);
    }
  }, [filteredProducts, selectedId]);

  const selectedProduct = filteredProducts.find((item) => item.id === selectedId) || null;
  const selectedConsignment = selectedProduct?.consignmentApplications?.[0];
  const selectedAudit = selectedProduct?.audits?.[0];

  const audit = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    if (!token) return;
    const reason = (reasons[id] || '').trim();
    if (status === 'REJECTED' && !reason) {
      setError('驳回时请填写原因');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/products/${id}/audit`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status,
          reason: reason || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '审核失败');
      setMessage(status === 'APPROVED' ? '审核通过，商品已上架' : '审核驳回完成');
      await load();
    } catch (e: any) {
      setError(e.message || '审核失败');
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = Array.from(new Set(products.map((item) => item.category))).sort();
  const marketStatusOptions = Array.from(
    new Set(marketProducts.map((item) => item.status).filter(Boolean))
  ).sort();

  const marketFiltered = useMemo(() => {
    const key = marketKeyword.trim().toLowerCase();
    return marketProducts.filter((item) => {
      if (marketStatus && item.status !== marketStatus) return false;
      if (marketOnlyFeatured && !item.isPremium) return false;
      if (!key) return true;
      return (
        item.title.toLowerCase().includes(key) ||
        item.code.toLowerCase().includes(key) ||
        item.sellerId.toLowerCase().includes(key) ||
        item.seller?.email?.toLowerCase().includes(key)
      );
    });
  }, [marketKeyword, marketOnlyFeatured, marketProducts, marketStatus]);

  useEffect(() => {
    if (!marketFiltered.length) {
      setMarketSelectedId('');
      return;
    }
    if (!marketSelectedId || !marketFiltered.find((item) => item.id === marketSelectedId)) {
      setMarketSelectedId(marketFiltered[0].id);
    }
  }, [marketFiltered, marketSelectedId]);

  const selectedMarket = marketFiltered.find((item) => item.id === marketSelectedId) || null;

  const ensureMarketDraft = useCallback(
    (item: Product | null) => {
      if (!item) return null;
      return marketDrafts[item.id] || buildMarketDraft(item);
    },
    [buildMarketDraft, marketDrafts]
  );

  const selectedMarketDraft = ensureMarketDraft(selectedMarket);

  const ensureCoreDraft = useCallback(
    (item: Product | null) => {
      if (!item) return null;
      return coreDrafts[item.id] || buildCoreDraft(item);
    },
    [buildCoreDraft, coreDrafts]
  );

  const selectedCoreDraft = ensureCoreDraft(selectedMarket);

  const updateMarketField = (id: string, patch: Partial<MarketDraft>) => {
    setMarketDrafts((prev) => {
      const found = marketProducts.find((p) => p.id === id);
      const base: MarketDraft =
        prev[id] ||
        (found
          ? buildMarketDraft(found)
          : {
              status: 'ONLINE',
              riskLevel: 'MEDIUM',
              riskTags: '',
              isPremium: false,
              premiumRate: ''
            });
      return {
        ...prev,
        [id]: {
          ...base,
          ...patch
        }
      };
    });
  };

  const updateCoreField = (id: string, patch: Partial<CoreDraft>) => {
    setCoreDrafts((prev) => {
      const found = marketProducts.find((p) => p.id === id);
      const base: CoreDraft =
        prev[id] ||
        (found
          ? buildCoreDraft(found)
          : {
              title: '',
              category: 'VPS',
              region: '',
              datacenter: '',
              lineType: '',
              providerName: '',
              providerUrl: '',
              cpuModel: '',
              cpuCores: '',
              memoryGb: '',
              diskGb: '',
              diskType: '',
              bandwidthMbps: '',
              trafficLimit: '',
              ipCount: '',
              ddos: '',
              salePrice: '',
              purchasePrice: '',
              minAcceptPrice: '',
              renewPrice: '',
              expireAt: '',
              deliveryType: 'FULL_ACCOUNT',
              feePayer: 'SELLER',
              negotiable: false,
              consignment: false,
              canChangeEmail: false,
              canChangeRealname: false,
              canTest: false,
              canTransfer: false,
              riskLevel: 'MEDIUM',
              riskTags: '',
              abuseHistory: false,
              accountRecallRisk: false,
              description: '',
              status: 'ONLINE'
            });
      return {
        ...prev,
        [id]: {
          ...base,
          ...patch
        }
      };
    });
  };

  const parseOptionalNumber = (text: string) => {
    const value = text.trim();
    if (!value) return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : Number.NaN;
  };

  const parseNullableNumber = (text: string) => {
    const value = text.trim();
    if (!value) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : Number.NaN;
  };

  const saveMarketConfig = async () => {
    if (!token || !selectedMarket || !selectedMarketDraft) return;
    const premiumRateText = selectedMarketDraft.premiumRate.trim();
    if (premiumRateText && Number.isNaN(Number(premiumRateText))) {
      setError('溢价系数必须是数字');
      return;
    }
    setMarketLoading(true);
    setError('');
    setMessage('');
    try {
      const riskTags = selectedMarketDraft.riskTags
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      const res = await fetch(`${API_BASE}/admin/products/${selectedMarket.id}/market`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: selectedMarketDraft.status || undefined,
          riskLevel: selectedMarketDraft.riskLevel || undefined,
          riskTags,
          isPremium: selectedMarketDraft.isPremium,
          premiumRate: premiumRateText ? Number(premiumRateText) : null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '更新运营配置失败');
      setMessage('运营配置已保存');
      await loadMarket();
    } catch (e: any) {
      setError(e.message || '更新运营配置失败');
    } finally {
      setMarketLoading(false);
    }
  };

  const saveCoreConfig = async () => {
    if (!token || !selectedMarket || !selectedCoreDraft) return;
    if (!selectedCoreDraft.title.trim()) {
      setError('商品标题不能为空');
      return;
    }
    if (!selectedCoreDraft.region.trim()) {
      setError('地区不能为空');
      return;
    }
    const salePrice = parseOptionalNumber(selectedCoreDraft.salePrice);
    if (!Number.isFinite(salePrice)) {
      setError('售价必须是有效数字');
      return;
    }

    const numericPayload = {
      cpuCores: parseOptionalNumber(selectedCoreDraft.cpuCores),
      memoryGb: parseOptionalNumber(selectedCoreDraft.memoryGb),
      diskGb: parseOptionalNumber(selectedCoreDraft.diskGb),
      bandwidthMbps: parseOptionalNumber(selectedCoreDraft.bandwidthMbps),
      trafficLimit: parseOptionalNumber(selectedCoreDraft.trafficLimit),
      ipCount: parseOptionalNumber(selectedCoreDraft.ipCount),
      ddos: parseOptionalNumber(selectedCoreDraft.ddos)
    };
    if (Object.values(numericPayload).some((v) => Number.isNaN(v))) {
      setError('配置中的数字字段格式不正确');
      return;
    }

    const purchasePrice = parseNullableNumber(selectedCoreDraft.purchasePrice);
    const minAcceptPrice = parseNullableNumber(selectedCoreDraft.minAcceptPrice);
    const renewPrice = parseNullableNumber(selectedCoreDraft.renewPrice);
    if ([purchasePrice, minAcceptPrice, renewPrice].some((v) => Number.isNaN(v))) {
      setError('交易价格相关字段格式不正确');
      return;
    }

    setCoreSaving(true);
    setError('');
    setMessage('');
    try {
      const riskTags = selectedCoreDraft.riskTags
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      const res = await fetch(`${API_BASE}/admin/products/${selectedMarket.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: selectedCoreDraft.title.trim(),
          category: selectedCoreDraft.category,
          region: selectedCoreDraft.region.trim(),
          datacenter: selectedCoreDraft.datacenter,
          lineType: selectedCoreDraft.lineType,
          providerName: selectedCoreDraft.providerName,
          providerUrl: selectedCoreDraft.providerUrl,
          cpuModel: selectedCoreDraft.cpuModel,
          cpuCores: numericPayload.cpuCores,
          memoryGb: numericPayload.memoryGb,
          diskGb: numericPayload.diskGb,
          diskType: selectedCoreDraft.diskType,
          bandwidthMbps: numericPayload.bandwidthMbps,
          trafficLimit: numericPayload.trafficLimit,
          ipCount: numericPayload.ipCount,
          ddos: numericPayload.ddos,
          salePrice,
          purchasePrice,
          minAcceptPrice,
          renewPrice,
          expireAt: selectedCoreDraft.expireAt || null,
          status: selectedCoreDraft.status,
          deliveryType: selectedCoreDraft.deliveryType,
          feePayer: selectedCoreDraft.feePayer,
          negotiable: selectedCoreDraft.negotiable,
          consignment: selectedCoreDraft.consignment,
          canChangeEmail: selectedCoreDraft.canChangeEmail,
          canChangeRealname: selectedCoreDraft.canChangeRealname,
          canTest: selectedCoreDraft.canTest,
          canTransfer: selectedCoreDraft.canTransfer,
          riskLevel: selectedCoreDraft.riskLevel,
          riskTags,
          abuseHistory: selectedCoreDraft.abuseHistory,
          accountRecallRisk: selectedCoreDraft.accountRecallRisk,
          description: selectedCoreDraft.description.trim() || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '保存核心字段失败');
      setMessage('商品核心字段已更新');
      await loadMarket();
      await load();
    } catch (e: any) {
      setError(e.message || '保存核心字段失败');
    } finally {
      setCoreSaving(false);
    }
  };

  return (
    <main className="page page-shell admin-console-page">
      <ConsolePageHeader
        eyebrow="管理后台 · 商品审核"
        title="待审商品管理"
        description="按商品配置、地区、卖家信誉与寄售申请记录进行综合审核，确保可进入担保交易流程。"
        tags={[
          { label: '上架审核', tone: 'info' },
          { label: '担保链路前置校验', tone: 'warning' },
          { label: `待审 ${products.length} 条`, tone: 'default' }
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
            <label>关键词</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="标题 / 编号 / 卖家 ID / 卖家邮箱"
            />
          </div>
          <div className="field">
            <label>商品类型</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">全部</option>
              {categoryOptions.map((item) => (
                <option key={item} value={item}>
                  {labelByMap(item, PRODUCT_CATEGORY_LABEL, item)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>地区</label>
            <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="例如：香港 / 东京" />
          </div>
          <div className="field">
            <label>审核状态</label>
            <input value="待审核" disabled />
          </div>
        </div>
      </ConsolePanel>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <ConsolePanel
        title="表格区 · 待审核商品"
        description="统一展示交易字段、寄售状态与卖家信誉，点击“处理”进入详情操作区。"
        className="stack-12"
      >
        {filteredProducts.length === 0 ? (
          <ConsoleEmpty text={loading ? '加载中...' : '当前筛选条件下无待审商品'} />
        ) : (
          <div className="console-table-wrap">
            <table className="console-table console-table-mobile">
              <thead>
                <tr>
                  <th>商品</th>
                  <th>类型 / 地区</th>
                  <th>价格</th>
                  <th>卖家</th>
                  <th>担保 / 审核 / 风险</th>
                  <th>提交时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((item) => {
                  const latestConsignment = item.consignmentApplications?.[0];
                  const sellerLevel = item.seller?.sellerProfile?.level ?? 1;
                  const sellerTrades = item.seller?.sellerProfile?.tradeCount ?? 0;

                  return (
                    <tr key={item.id}>
                      <td data-label="商品">
                        <div className="console-row-primary">{item.title}</div>
                        <p className="console-row-sub">编号：{item.code}</p>
                      </td>
                      <td data-label="类型 / 地区">
                        <div className="console-row-primary">{labelByMap(item.category, PRODUCT_CATEGORY_LABEL, item.category)}</div>
                        <p className="console-row-sub">
                          {item.region || '-'} · {item.lineType || '线路未标注'}
                        </p>
                      </td>
                      <td data-label="价格">
                        <div className="console-row-primary">{formatMoney(item.salePrice)}</div>
                        <p className="console-row-sub">发布审核阶段</p>
                      </td>
                      <td data-label="卖家">
                        <div className="console-row-primary">{item.seller?.email || item.sellerId}</div>
                        <p className="console-row-sub">
                          Lv.{sellerLevel} · 成交 {sellerTrades}
                        </p>
                      </td>
                      <td data-label="担保 / 审核 / 风险">
                        <div className="console-inline-tags">
                          <StatusBadge tone="info">担保交易</StatusBadge>
                          {item.consignment ? (
                            <StatusBadge tone="success">平台寄售</StatusBadge>
                          ) : latestConsignment?.status ? (
                            <StatusBadge tone={consignmentTone(latestConsignment.status)}>
                              {consignmentStatusLabel[latestConsignment.status]}
                            </StatusBadge>
                          ) : (
                            <StatusBadge tone="default">未启用寄售</StatusBadge>
                          )}
                          <StatusBadge tone={riskTone(item.riskLevel)}>风险 {riskLabel(item.riskLevel)}</StatusBadge>
                        </div>
                      </td>
                      <td data-label="提交时间">
                        <div className="console-row-primary">{formatDateTime(item.createdAt)}</div>
                        <p className="console-row-sub">寄售审结：{formatDateTime(latestConsignment?.reviewedAt)}</p>
                      </td>
                      <td data-label="操作">
                        <button
                          className={`btn ${selectedId === item.id ? 'primary' : 'secondary'} btn-sm`}
                          onClick={() => setSelectedId(item.id)}
                          type="button"
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
        description="填写审核意见后执行通过或驳回，驳回时请明确风险或不合规原因。"
        className="console-detail stack-12"
      >
        {!selectedProduct ? (
          <ConsoleEmpty text="请选择一条商品记录进行处理" />
        ) : (
          <>
            <div className="console-detail-grid">
              <div className="spec-item">
                <p className="label">商品标题</p>
                <p className="value">{selectedProduct.title}</p>
              </div>
              <div className="spec-item">
                <p className="label">商品编号</p>
                <p className="value">{selectedProduct.code}</p>
              </div>
              <div className="spec-item">
                <p className="label">卖家账号</p>
                <p className="value">{selectedProduct.seller?.email || selectedProduct.sellerId}</p>
              </div>
              <div className="spec-item">
                <p className="label">卖家信誉</p>
                <p className="value">
                  Lv.{selectedProduct.seller?.sellerProfile?.level ?? 1} · 成交 {selectedProduct.seller?.sellerProfile?.tradeCount ?? 0}
                </p>
              </div>
              <div className="spec-item">
                <p className="label">标价</p>
                <p className="value">{formatMoney(selectedProduct.salePrice)}</p>
              </div>
              <div className="spec-item">
                <p className="label">线路 / 地区</p>
                <p className="value">
                  {selectedProduct.lineType || '未标注'} · {selectedProduct.region || '-'}
                </p>
              </div>
              <div className="spec-item">
                <p className="label">风险等级</p>
                <p className="value">{riskLabel(selectedProduct.riskLevel)}</p>
              </div>
              <div className="spec-item">
                <p className="label">寄售状态</p>
                <p className="value">
                  {selectedProduct.consignment
                    ? '已启用平台寄售'
                    : selectedConsignment?.status
                      ? consignmentStatusLabel[selectedConsignment.status]
                      : '未申请寄售'}
                </p>
              </div>
              <div className="spec-item">
                <p className="label">寄售申请时间</p>
                <p className="value">{formatDateTime(selectedConsignment?.createdAt)}</p>
              </div>
              <div className="spec-item">
                <p className="label">寄售审核时间</p>
                <p className="value">{formatDateTime(selectedConsignment?.reviewedAt)}</p>
              </div>
              <div className="spec-item">
                <p className="label">寄售审核人</p>
                <p className="value">{selectedConsignment?.reviewer?.email || '未记录'}</p>
              </div>
              <div className="spec-item">
                <p className="label">历史审核结果</p>
                <p className="value">
                  {selectedAudit?.status
                    ? labelByMap(selectedAudit.status, PRODUCT_AUDIT_STATUS_LABEL, selectedAudit.status)
                    : '暂无记录'}
                </p>
              </div>
            </div>

            <div className="console-alert">
              审核建议：优先核对商品描述、寄售申请材料、卖家信誉与风险标签一致性，确保进入担保流程后的交付可核验、结算可追踪。
            </div>

            {selectedConsignment?.adminRemark ? <p className="muted">寄售审核备注：{selectedConsignment.adminRemark}</p> : null}
            {selectedConsignment?.sellerNote ? <p className="muted">寄售申请说明：{selectedConsignment.sellerNote}</p> : null}
            {selectedAudit?.reason ? <p className="muted">上次商品审核备注：{selectedAudit.reason}</p> : null}
            <p className="muted">
              卖家履约：好评率 {formatRate(selectedProduct.seller?.sellerProfile?.positiveRate)} · 纠纷率 {formatRate(selectedProduct.seller?.sellerProfile?.disputeRate)} · 退款率 {formatRate(selectedProduct.seller?.sellerProfile?.refundRate)}
            </p>

            <div className="form">
              <label>审核备注（驳回必填）</label>
              <textarea
                value={reasons[selectedProduct.id] || ''}
                onChange={(e) =>
                  setReasons((prev) => ({
                    ...prev,
                    [selectedProduct.id]: e.target.value
                  }))
                }
                rows={4}
                placeholder="例如：配置参数与截图不一致，需要补充证明材料"
              />
            </div>

            <p className="muted">商品说明：{selectedProduct.description || '无商品说明'}</p>

            <div className="actions">
              <button onClick={() => audit(selectedProduct.id, 'APPROVED')} disabled={loading} className="btn primary">
                通过并上架
              </button>
              <button onClick={() => audit(selectedProduct.id, 'REJECTED')} disabled={loading} className="btn secondary">
                驳回并退回修改
              </button>
            </div>
          </>
        )}
      </ConsolePanel>

      <ConsolePanel
        title="表格区 · 运营商品池"
        description="用于维护推荐位、风险标签与上下架状态，支撑首页推荐专区与交易风险提示。"
        className="stack-12"
      >
        <div className="console-filter-grid">
          <div className="field">
            <label>关键词</label>
            <input
              value={marketKeyword}
              onChange={(e) => setMarketKeyword(e.target.value)}
              placeholder="标题 / 编号 / 卖家邮箱"
            />
          </div>
          <div className="field">
            <label>商品状态</label>
            <select value={marketStatus} onChange={(e) => setMarketStatus(e.target.value)}>
              <option value="">全部</option>
              {marketStatusOptions.map((item) => (
                <option key={item} value={item}>
                  {labelByMap(item, PRODUCT_STATUS_LABEL, item)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>推荐位</label>
            <select
              value={marketOnlyFeatured ? 'featured' : 'all'}
              onChange={(e) => setMarketOnlyFeatured(e.target.value === 'featured')}
            >
              <option value="all">全部</option>
              <option value="featured">仅推荐商品</option>
            </select>
          </div>
          <div className="field">
            <label>数据同步</label>
            <button className="btn secondary btn-sm" type="button" onClick={loadMarket} disabled={marketLoading}>
              {marketLoading ? '刷新中...' : '刷新运营池'}
            </button>
          </div>
        </div>

        {marketFiltered.length === 0 ? (
          <ConsoleEmpty text={marketLoading ? '加载中...' : '暂无可运营商品'} />
        ) : (
          <div className="console-table-wrap">
            <table className="console-table console-table-mobile">
              <thead>
                <tr>
                  <th>商品</th>
                  <th>状态</th>
                  <th>风险标记</th>
                  <th>推荐位</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {marketFiltered.map((item) => (
                  <tr key={item.id}>
                    <td data-label="商品">
                      <div className="console-row-primary">{item.title}</div>
                      <p className="console-row-sub">
                        {item.code} · {item.seller?.email || item.sellerId}
                      </p>
                    </td>
                    <td data-label="状态">
                      <StatusBadge tone={item.status === 'ONLINE' ? 'success' : item.status === 'OFFLINE' ? 'warning' : 'default'}>
                        {labelByMap(item.status, PRODUCT_STATUS_LABEL, '未知')}
                      </StatusBadge>
                    </td>
                    <td data-label="风险标记">
                      <div className="console-inline-tags">
                        <StatusBadge tone={riskTone(item.riskLevel)}>风险 {riskLabel(item.riskLevel)}</StatusBadge>
                        {Array.isArray(item.riskTags) && item.riskTags.length > 0 ? (
                          <StatusBadge tone="warning">{item.riskTags.length} 个标签</StatusBadge>
                        ) : (
                          <StatusBadge tone="default">无标签</StatusBadge>
                        )}
                      </div>
                    </td>
                    <td data-label="推荐位">
                      <div className="console-inline-tags">
                        <StatusBadge tone={item.isPremium ? 'info' : 'default'}>
                          {item.isPremium ? '已推荐' : '普通'}
                        </StatusBadge>
                        {item.premiumRate !== null && item.premiumRate !== undefined ? (
                          <StatusBadge tone="default">溢价 {Number(item.premiumRate).toFixed(2)}</StatusBadge>
                        ) : null}
                      </div>
                    </td>
                    <td data-label="更新时间">
                      <div className="console-row-primary">{formatDateTime(item.updatedAt || item.createdAt)}</div>
                    </td>
                    <td data-label="操作">
                      <button
                        className={`btn ${marketSelectedId === item.id ? 'primary' : 'secondary'} btn-sm`}
                        type="button"
                        onClick={() => setMarketSelectedId(item.id)}
                      >
                        {marketSelectedId === item.id ? '配置中' : '配置'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ConsolePanel>

      <ConsolePanel
        title="详情操作区 · 运营配置"
        description="统一维护商品风险等级、风险标签、推荐位和溢价系数，配置后即时生效。"
        className="console-detail stack-12"
      >
        {!selectedMarket || !selectedMarketDraft ? (
          <ConsoleEmpty text="请选择一条运营商品记录" />
        ) : (
          <>
            <div className="console-detail-grid">
              <div className="spec-item">
                <p className="label">商品标题</p>
                <p className="value">{selectedMarket.title}</p>
              </div>
              <div className="spec-item">
                <p className="label">商品编号</p>
                <p className="value">{selectedMarket.code}</p>
              </div>
              <div className="spec-item">
                <p className="label">当前状态</p>
                <p className="value">{labelByMap(selectedMarket.status, PRODUCT_STATUS_LABEL, '未知状态')}</p>
              </div>
              <div className="spec-item">
                <p className="label">当前风险标签</p>
                <p className="value">{readRiskTagsText(selectedMarket.riskTags) || '无'}</p>
              </div>
            </div>
            <div className="console-filter-grid">
              <div className="field">
                <label>商品状态</label>
                <select
                  value={selectedMarketDraft.status}
                  onChange={(e) => updateMarketField(selectedMarket.id, { status: e.target.value })}
                >
                  <option value="ONLINE">上架中</option>
                  <option value="OFFLINE">已下架</option>
                  <option value="PENDING">待审核</option>
                </select>
              </div>
              <div className="field">
                <label>风险等级</label>
                <select
                  value={selectedMarketDraft.riskLevel}
                  onChange={(e) => updateMarketField(selectedMarket.id, { riskLevel: e.target.value })}
                >
                  <option value="LOW">低风险</option>
                  <option value="MEDIUM">中风险</option>
                  <option value="HIGH">高风险</option>
                </select>
              </div>
              <div className="field">
                <label>推荐位</label>
                <select
                  value={selectedMarketDraft.isPremium ? '1' : '0'}
                  onChange={(e) => updateMarketField(selectedMarket.id, { isPremium: e.target.value === '1' })}
                >
                  <option value="0">普通商品</option>
                  <option value="1">推荐商品</option>
                </select>
              </div>
              <div className="field">
                <label>溢价系数（0~5）</label>
                <input
                  value={selectedMarketDraft.premiumRate}
                  onChange={(e) => updateMarketField(selectedMarket.id, { premiumRate: e.target.value })}
                  placeholder="留空表示不设置"
                />
              </div>
            </div>

            <div className="form">
              <label>风险标签（逗号分隔）</label>
              <textarea
                value={selectedMarketDraft.riskTags}
                onChange={(e) => updateMarketField(selectedMarket.id, { riskTags: e.target.value })}
                rows={3}
                placeholder="例如：找回风险, 账单缺失, 高争议线路"
              />
            </div>

            <div className="actions">
              <button className="btn primary" type="button" onClick={saveMarketConfig} disabled={marketLoading}>
                {marketLoading ? '保存中...' : '保存运营配置'}
              </button>
            </div>
          </>
        )}
      </ConsolePanel>

      <ConsolePanel
        title="详情操作区 · 商品核心字段编辑"
        description="维护地区、线路、配置参数、交付属性与风险属性，保存后会同步影响前台详情与交易流程。"
        className="console-detail stack-12"
      >
        {!selectedMarket || !selectedCoreDraft ? (
          <ConsoleEmpty text="请选择一条运营商品记录进行核心字段维护" />
        ) : (
          <>
            <div className="console-alert">
              核心字段会直接影响下单决策与履约风险，请在保存前核对配置真实性、到期时间与交付能力。
            </div>

            <div className="console-filter-grid">
              <div className="field">
                <label>商品标题</label>
                <input
                  value={selectedCoreDraft.title}
                  onChange={(e) => updateCoreField(selectedMarket.id, { title: e.target.value })}
                />
              </div>
              <div className="field">
                <label>商品类型</label>
                <select
                  value={selectedCoreDraft.category}
                  onChange={(e) =>
                    updateCoreField(selectedMarket.id, { category: e.target.value })
                  }
                >
                  {Object.entries(PRODUCT_CATEGORY_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>地区</label>
                <input
                  value={selectedCoreDraft.region}
                  onChange={(e) => updateCoreField(selectedMarket.id, { region: e.target.value })}
                />
              </div>
              <div className="field">
                <label>线路</label>
                <input
                  value={selectedCoreDraft.lineType}
                  onChange={(e) =>
                    updateCoreField(selectedMarket.id, { lineType: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="console-filter-grid">
              <div className="field">
                <label>机房/数据中心</label>
                <input
                  value={selectedCoreDraft.datacenter}
                  onChange={(e) =>
                    updateCoreField(selectedMarket.id, { datacenter: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>服务商名称</label>
                <input
                  value={selectedCoreDraft.providerName}
                  onChange={(e) =>
                    updateCoreField(selectedMarket.id, { providerName: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>服务商链接</label>
                <input
                  value={selectedCoreDraft.providerUrl}
                  onChange={(e) =>
                    updateCoreField(selectedMarket.id, { providerUrl: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>到期时间</label>
                <input
                  type="date"
                  value={selectedCoreDraft.expireAt}
                  onChange={(e) =>
                    updateCoreField(selectedMarket.id, { expireAt: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="console-filter-grid">
              <div className="field">
                <label>CPU 型号</label>
                <input
                  value={selectedCoreDraft.cpuModel}
                  onChange={(e) =>
                    updateCoreField(selectedMarket.id, { cpuModel: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>CPU 核心数</label>
                <input
                  value={selectedCoreDraft.cpuCores}
                  onChange={(e) =>
                    updateCoreField(selectedMarket.id, { cpuCores: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>内存(GB)</label>
                <input
                  value={selectedCoreDraft.memoryGb}
                  onChange={(e) =>
                    updateCoreField(selectedMarket.id, { memoryGb: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>磁盘(GB)</label>
                <input
                  value={selectedCoreDraft.diskGb}
                  onChange={(e) => updateCoreField(selectedMarket.id, { diskGb: e.target.value })}
                />
              </div>
            </div>

            <div className="console-filter-grid">
              <div className="field">
                <label>磁盘类型</label>
                <input
                  value={selectedCoreDraft.diskType}
                  onChange={(e) =>
                    updateCoreField(selectedMarket.id, { diskType: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>带宽(Mbps)</label>
                <input
                  value={selectedCoreDraft.bandwidthMbps}
                  onChange={(e) =>
                    updateCoreField(selectedMarket.id, { bandwidthMbps: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>流量上限(GB)</label>
                <input
                  value={selectedCoreDraft.trafficLimit}
                  onChange={(e) =>
                    updateCoreField(selectedMarket.id, { trafficLimit: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>IP 数量</label>
                <input
                  value={selectedCoreDraft.ipCount}
                  onChange={(e) => updateCoreField(selectedMarket.id, { ipCount: e.target.value })}
                />
              </div>
            </div>

            <div className="console-filter-grid">
              <div className="field">
                <label>DDoS 防护(Gbps)</label>
                <input
                  value={selectedCoreDraft.ddos}
                  onChange={(e) => updateCoreField(selectedMarket.id, { ddos: e.target.value })}
                />
              </div>
              <div className="field">
                <label>销售价</label>
                <input
                  value={selectedCoreDraft.salePrice}
                  onChange={(e) =>
                    updateCoreField(selectedMarket.id, { salePrice: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>采购价（可空）</label>
                <input
                  value={selectedCoreDraft.purchasePrice}
                  onChange={(e) =>
                    updateCoreField(selectedMarket.id, { purchasePrice: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>最低接受价（可空）</label>
                <input
                  value={selectedCoreDraft.minAcceptPrice}
                  onChange={(e) =>
                    updateCoreField(selectedMarket.id, { minAcceptPrice: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="console-filter-grid">
              <div className="field">
                <label>续费价（可空）</label>
                <input
                  value={selectedCoreDraft.renewPrice}
                  onChange={(e) =>
                    updateCoreField(selectedMarket.id, { renewPrice: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>商品状态</label>
                <select
                  value={selectedCoreDraft.status}
                  onChange={(e) => updateCoreField(selectedMarket.id, { status: e.target.value })}
                >
                  {Object.entries(PRODUCT_STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>交付方式</label>
                <select
                  value={selectedCoreDraft.deliveryType}
                  onChange={(e) =>
                    updateCoreField(selectedMarket.id, { deliveryType: e.target.value })
                  }
                >
                  {Object.entries(DELIVERY_TYPE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>手续费承担</label>
                <select
                  value={selectedCoreDraft.feePayer}
                  onChange={(e) =>
                    updateCoreField(selectedMarket.id, { feePayer: e.target.value })
                  }
                >
                  {Object.entries(FEE_PAYER_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="console-filter-grid">
              <div className="field">
                <label>风险等级</label>
                <select
                  value={selectedCoreDraft.riskLevel}
                  onChange={(e) =>
                    updateCoreField(selectedMarket.id, { riskLevel: e.target.value })
                  }
                >
                  {Object.entries(RISK_LEVEL_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ gridColumn: 'span 3' }}>
                <label>风险标签（逗号分隔）</label>
                <input
                  value={selectedCoreDraft.riskTags}
                  onChange={(e) =>
                    updateCoreField(selectedMarket.id, { riskTags: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form">
              <label>商品说明</label>
              <textarea
                rows={4}
                value={selectedCoreDraft.description}
                onChange={(e) =>
                  updateCoreField(selectedMarket.id, { description: e.target.value })
                }
                placeholder="可补充测试策略、迁移说明、风控提示等"
              />
            </div>

            <div className="actions">
              <label>
                <input
                  type="checkbox"
                  checked={selectedCoreDraft.negotiable}
                  onChange={(e) =>
                    updateCoreField(selectedMarket.id, { negotiable: e.target.checked })
                  }
                />{' '}
                支持议价
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={selectedCoreDraft.consignment}
                  onChange={(e) =>
                    updateCoreField(selectedMarket.id, { consignment: e.target.checked })
                  }
                />{' '}
                启用寄售
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={selectedCoreDraft.canChangeEmail}
                  onChange={(e) =>
                    updateCoreField(selectedMarket.id, { canChangeEmail: e.target.checked })
                  }
                />{' '}
                可改邮箱
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={selectedCoreDraft.canChangeRealname}
                  onChange={(e) =>
                    updateCoreField(selectedMarket.id, { canChangeRealname: e.target.checked })
                  }
                />{' '}
                可改实名
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={selectedCoreDraft.canTest}
                  onChange={(e) =>
                    updateCoreField(selectedMarket.id, { canTest: e.target.checked })
                  }
                />{' '}
                支持测试
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={selectedCoreDraft.canTransfer}
                  onChange={(e) =>
                    updateCoreField(selectedMarket.id, { canTransfer: e.target.checked })
                  }
                />{' '}
                支持过户
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={selectedCoreDraft.abuseHistory}
                  onChange={(e) =>
                    updateCoreField(selectedMarket.id, { abuseHistory: e.target.checked })
                  }
                />{' '}
                存在滥用历史
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={selectedCoreDraft.accountRecallRisk}
                  onChange={(e) =>
                    updateCoreField(selectedMarket.id, { accountRecallRisk: e.target.checked })
                  }
                />{' '}
                账号找回风险
              </label>
            </div>

            <div className="actions">
              <button className="btn primary" type="button" onClick={saveCoreConfig} disabled={coreSaving}>
                {coreSaving ? '保存中...' : '保存核心字段'}
              </button>
              <button
                className="btn secondary"
                type="button"
                disabled={coreSaving}
                onClick={() =>
                  setCoreDrafts((prev) => ({
                    ...prev,
                    [selectedMarket.id]: buildCoreDraft(selectedMarket)
                  }))
                }
              >
                重置为当前值
              </button>
            </div>
          </>
        )}
      </ConsolePanel>
    </main>
  );
}
