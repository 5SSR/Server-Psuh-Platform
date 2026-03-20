'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type DeliveryType = 'FULL_ACCOUNT' | 'PANEL_TRANSFER' | 'SUB_ACCOUNT' | 'EMAIL_CHANGE' | string;

interface Product {
  id: string;
  title: string;
  salePrice: number;
  purchasePrice?: number | null;
  minAcceptPrice?: number | null;
  category: string;
  region: string;
  lineType?: string | null;
  datacenter?: string | null;
  cpuCores?: number | null;
  memoryGb?: number | null;
  diskGb?: number | null;
  diskType?: string | null;
  bandwidthMbps?: number | null;
  trafficLimit?: number | null;
  ipCount?: number | null;
  ddos?: number | null;
  expireAt?: string | null;
  status?: string;
  deliveryType?: DeliveryType;
  feePayer?: 'BUYER' | 'SELLER' | 'SHARED' | string;
  consignment?: boolean;
  isPremium?: boolean;
  premiumRate?: number | string | null;
  negotiable?: boolean;
  canTest?: boolean;
  canTransfer?: boolean;
  riskTags?: string[];
  createdAt?: string;
  consignmentApplications?: Array<{
    id: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED';
    adminRemark?: string | null;
    reviewedAt?: string | null;
    createdAt?: string;
  }>;
  seller?: {
    id?: string;
    email: string;
    sellerProfile?: {
      level: number;
      tradeCount: number;
      positiveRate?: number;
      disputeRate?: number;
      refundRate?: number;
    };
  };
  _count?: {
    browsingHistory?: number;
    orders?: number;
    favorites?: number;
  };
}

const CATEGORIES = ['VPS', 'DEDICATED', 'CLOUD', 'NAT', 'LINE'];
const DELIVERY_OPTIONS = ['FULL_ACCOUNT', 'PANEL_TRANSFER', 'SUB_ACCOUNT', 'EMAIL_CHANGE'];
const SORT_OPTIONS = [
  { value: 'latest', label: '默认（最新上架）' },
  { value: 'price_asc', label: '价格升序' },
  { value: 'price_desc', label: '价格降序' },
  { value: 'expire_asc', label: '到期时间优先' },
  { value: 'views_desc', label: '浏览量优先' },
  { value: 'hot_desc', label: '热度优先（订单）' }
];

const DELIVERY_LABEL: Record<string, string> = {
  FULL_ACCOUNT: '整号交付',
  PANEL_TRANSFER: '面板转移',
  SUB_ACCOUNT: '子账户交付',
  EMAIL_CHANGE: '改邮箱交付'
};

const CONSIGNMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: '寄售审核中',
  APPROVED: '寄售已通过',
  REJECTED: '寄售已驳回',
  CANCELED: '寄售已撤销'
};

const FEE_PAYER_LABEL: Record<string, string> = {
  BUYER: '买家承担服务费',
  SELLER: '卖家承担服务费',
  SHARED: '双方分摊服务费'
};

function consignmentTone(status?: string) {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'danger';
  if (status === 'PENDING') return 'warning';
  return '';
}

export default function ProductsPage() {
  const [list, setList] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');

  const [category, setCategory] = useState('');
  const [region, setRegion] = useState('');
  const [lineType, setLineType] = useState('');
  const [diskType, setDiskType] = useState('');
  const [deliveryType, setDeliveryType] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [minPremiumRate, setMinPremiumRate] = useState('');
  const [maxPremiumRate, setMaxPremiumRate] = useState('');
  const [minTraffic, setMinTraffic] = useState('');
  const [minIp, setMinIp] = useState('');
  const [minDdos, setMinDdos] = useState('');
  const [riskOnly, setRiskOnly] = useState(false);
  const [canTestOnly, setCanTestOnly] = useState(false);
  const [canTransferOnly, setCanTransferOnly] = useState(false);
  const [feePayer, setFeePayer] = useState('');
  const [sortBy, setSortBy] = useState('latest');

  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (submittedKeyword) params.set('keyword', submittedKeyword);
      if (category) params.set('category', category);
      if (region) params.set('region', region);
      if (lineType) params.set('lineType', lineType);
      if (diskType) params.set('diskType', diskType);
      if (deliveryType) params.set('deliveryType', deliveryType);
      if (feePayer) params.set('feePayer', feePayer);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      if (premiumOnly) params.set('premiumOnly', 'true');
      if (minPremiumRate) params.set('minPremiumRate', minPremiumRate);
      if (maxPremiumRate) params.set('maxPremiumRate', maxPremiumRate);
      if (minTraffic) params.set('minTraffic', minTraffic);
      if (minIp) params.set('minIp', minIp);
      if (minDdos) params.set('minDdos', minDdos);
      if (riskOnly) params.set('riskOnly', 'true');
      if (canTestOnly) params.set('canTest', 'true');
      if (canTransferOnly) params.set('canTransfer', 'true');
      if (sortBy) params.set('sortBy', sortBy);

      const res = await fetch(`${API}/products?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取商品失败');
      setList(data.list || []);
      setTotal(Number(data.total || 0));
    } catch (e: any) {
      setError(e.message || '读取商品失败');
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    submittedKeyword,
    category,
    region,
    lineType,
    diskType,
    deliveryType,
    feePayer,
    minPrice,
    maxPrice,
    premiumOnly,
    minPremiumRate,
    maxPremiumRate,
    minTraffic,
    minIp,
    minDdos,
    riskOnly,
    canTestOnly,
    canTransferOnly,
    sortBy
  ]);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const qCategory = search.get('category');
    const qRegion = search.get('region');
    if (qCategory) setCategory(qCategory);
    if (qRegion) setRegion(qRegion);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [
    category,
    region,
    lineType,
    diskType,
    deliveryType,
    feePayer,
    minPrice,
    maxPrice,
    premiumOnly,
    minPremiumRate,
    maxPremiumRate,
    minTraffic,
    minIp,
    minDdos,
    riskOnly,
    canTestOnly,
    canTransferOnly,
    sortBy,
    submittedKeyword
  ]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedKeyword(keyword.trim());
  };

  return (
    <main className="page page-shell">
      <header className="section-head">
        <div>
          <p className="eyebrow">二手服务器交易市场</p>
          <h1>在售商品列表</h1>
          <p className="muted">筛选与排序由后端统一处理，数据结果与分页可追溯</p>
        </div>
        <div className="metric-card" style={{ minWidth: 220 }}>
          <p className="metric-label">当前结果</p>
          <p className="metric-value" style={{ fontSize: 26 }}>{total}</p>
          <p className="metric-tip">第 {page}/{totalPages} 页 · 每页 {pageSize} 条</p>
        </div>
      </header>

      <form className="filter-bar" onSubmit={onSearch}>
        <div className="filter-grid">
          <div className="field">
            <label>关键词</label>
            <input
              placeholder="标题/描述关键字"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <div className="field">
            <label>商品类型</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">全部</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>地区</label>
            <input placeholder="如 香港/东京" value={region} onChange={(e) => setRegion(e.target.value)} />
          </div>
          <div className="field">
            <label>线路</label>
            <input placeholder="如 CN2/BGP" value={lineType} onChange={(e) => setLineType(e.target.value)} />
          </div>
          <div className="field">
            <label>硬盘类型</label>
            <input placeholder="如 SSD/NVMe/SAS" value={diskType} onChange={(e) => setDiskType(e.target.value)} />
          </div>
          <div className="field">
            <label>最低价</label>
            <input type="number" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
          </div>
          <div className="field">
            <label>最高价</label>
            <input type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          </div>
          <div className="field">
            <label>最小流量（GB/月）</label>
            <input type="number" min="0" value={minTraffic} onChange={(e) => setMinTraffic(e.target.value)} />
          </div>
          <div className="field">
            <label>溢价下限（0-1）</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={minPremiumRate}
              onChange={(e) => setMinPremiumRate(e.target.value)}
            />
          </div>
          <div className="field">
            <label>溢价上限（0-1）</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={maxPremiumRate}
              onChange={(e) => setMaxPremiumRate(e.target.value)}
            />
          </div>
          <div className="field">
            <label>最小 IP 数</label>
            <input type="number" min="0" value={minIp} onChange={(e) => setMinIp(e.target.value)} />
          </div>
          <div className="field">
            <label>最小防御（G）</label>
            <input type="number" min="0" value={minDdos} onChange={(e) => setMinDdos(e.target.value)} />
          </div>
          <div className="field">
            <label>交付方式</label>
            <select value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)}>
              <option value="">全部</option>
              {DELIVERY_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {DELIVERY_LABEL[v] || v}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>服务费承担方</label>
            <select value={feePayer} onChange={(e) => setFeePayer(e.target.value)}>
              <option value="">全部</option>
              <option value="BUYER">BUYER（买家）</option>
              <option value="SELLER">SELLER（卖家）</option>
              <option value="SHARED">SHARED（分摊）</option>
            </select>
          </div>
          <div className="field">
            <label>排序方式</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              {SORT_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="toolbar">
          <button type="submit" className="btn primary">
            搜索
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              setKeyword('');
              setSubmittedKeyword('');
              setCategory('');
              setRegion('');
              setLineType('');
              setDiskType('');
              setDeliveryType('');
              setFeePayer('');
              setMinPrice('');
              setMaxPrice('');
              setPremiumOnly(false);
              setMinPremiumRate('');
              setMaxPremiumRate('');
              setMinTraffic('');
              setMinIp('');
              setMinDdos('');
              setRiskOnly(false);
              setCanTestOnly(false);
              setCanTransferOnly(false);
              setSortBy('latest');
              setPage(1);
            }}
          >
            重置筛选
          </button>
          <button
            type="button"
            className={`btn ${premiumOnly ? 'primary' : 'secondary'}`}
            onClick={() => setPremiumOnly((v) => !v)}
          >
            {premiumOnly ? '仅看溢价商品' : '包含普通商品'}
          </button>
          <button
            type="button"
            className={`btn ${riskOnly ? 'primary' : 'secondary'}`}
            onClick={() => setRiskOnly((v) => !v)}
          >
            {riskOnly ? '仅风险标签商品' : '查看全部风险状态'}
          </button>
          <button
            type="button"
            className={`btn ${canTestOnly ? 'primary' : 'secondary'}`}
            onClick={() => setCanTestOnly((v) => !v)}
          >
            {canTestOnly ? '仅可测试' : '支持测试'}
          </button>
          <button
            type="button"
            className={`btn ${canTransferOnly ? 'primary' : 'secondary'}`}
            onClick={() => setCanTransferOnly((v) => !v)}
          >
            {canTransferOnly ? '仅可过户' : '支持过户'}
          </button>
          <span className="muted">交易信息优先显示：配置 / 价格 / 状态 / 信用 / 到期</span>
        </div>
      </form>

      {loading ? (
        <div className="empty-state">正在加载交易数据...</div>
      ) : error ? (
        <div className="empty-state">{error}</div>
      ) : list.length === 0 ? (
        <div className="empty-state">当前筛选条件下暂无商品，请调整筛选条件。</div>
      ) : (
        <div className="cards">
          {list.map((item) => (
            <article key={item.id} className="card stack-12">
              {(() => {
                const latestConsignment = item.consignmentApplications?.[0];
                return (
              <div className="card-header">
                <div className="stack-8">
                  <Link href={`/products/${item.id}`} style={{ color: 'var(--color-text)' }}>
                    <h3 style={{ fontSize: 17 }}>{item.title}</h3>
                  </Link>
                  <div className="status-line">
                    <span className="status-chip info">{item.category}</span>
                    <span className="status-chip">{item.region || '-'}</span>
                    <span className="status-chip">{item.lineType || '线路待补充'}</span>
                    <span className="status-chip success">担保交易</span>
                    {item.consignment ? <span className="status-chip success">平台寄售</span> : null}
                    {latestConsignment?.status ? (
                      <span className={`status-chip ${consignmentTone(latestConsignment.status)}`}>
                        {CONSIGNMENT_STATUS_LABEL[latestConsignment.status] || latestConsignment.status}
                      </span>
                    ) : null}
                    {item.negotiable ? <span className="status-chip info">支持议价</span> : null}
                    {item.canTest ? <span className="status-chip info">支持测试</span> : null}
                    {item.canTransfer ? <span className="status-chip info">支持过户</span> : null}
                    {item.isPremium ? <span className="status-chip danger">急售</span> : null}
                    {item.premiumRate !== null && item.premiumRate !== undefined ? (
                      <span className="status-chip warning">溢价 {Number(item.premiumRate).toFixed(2)}</span>
                    ) : null}
                    {item.riskTags?.length ? <span className="status-chip warning">风险标签</span> : null}
                  </div>
                </div>
                <div className="stack-8" style={{ textAlign: 'right' }}>
                  <span className="price">¥{Number(item.salePrice).toFixed(2)}</span>
                  {item.minAcceptPrice ? (
                    <span className="muted">最低可接受：¥{Number(item.minAcceptPrice).toFixed(2)}</span>
                  ) : null}
                  <span className="muted">{DELIVERY_LABEL[item.deliveryType || ''] || item.deliveryType || '交付方式未标注'}</span>
                  <span className="muted">{FEE_PAYER_LABEL[item.feePayer || ''] || `服务费：${item.feePayer || 'SELLER'}`}</span>
                  {latestConsignment?.reviewedAt ? (
                    <span className="muted">
                      寄售审结：{new Date(latestConsignment.reviewedAt).toLocaleDateString('zh-CN')}
                    </span>
                  ) : null}
                </div>
              </div>
                );
              })()}

              <div className="spec-grid">
                <div className="spec-item">
                  <p className="label">CPU</p>
                  <p className="value">{item.cpuCores ? `${item.cpuCores} Core` : '-'}</p>
                </div>
                <div className="spec-item">
                  <p className="label">内存</p>
                  <p className="value">{item.memoryGb ? `${item.memoryGb} GB` : '-'}</p>
                </div>
                <div className="spec-item">
                  <p className="label">硬盘</p>
                  <p className="value">
                    {item.diskGb ? `${item.diskGb} GB` : '-'} {item.diskType || ''}
                  </p>
                </div>
                <div className="spec-item">
                  <p className="label">带宽</p>
                  <p className="value">{item.bandwidthMbps ? `${item.bandwidthMbps} Mbps` : '-'}</p>
                </div>
                <div className="spec-item">
                  <p className="label">流量</p>
                  <p className="value">{item.trafficLimit ? `${item.trafficLimit} GB/月` : '不限/未填'}</p>
                </div>
                <div className="spec-item">
                  <p className="label">到期时间</p>
                  <p className="value">
                    {item.expireAt ? new Date(item.expireAt).toLocaleDateString('zh-CN') : '未标注'}
                  </p>
                </div>
                <div className="spec-item">
                  <p className="label">IP / 防御</p>
                  <p className="value">
                    {item.ipCount || 0} IP / {item.ddos ? `${item.ddos} G` : '-'}
                  </p>
                </div>
                <div className="spec-item">
                  <p className="label">原购入价</p>
                  <p className="value">
                    {item.purchasePrice ? `¥${Number(item.purchasePrice).toFixed(2)}` : '未填写'}
                  </p>
                </div>
              </div>

              <div className="card-meta" style={{ justifyContent: 'space-between' }}>
                <span>
                  卖家：{item.seller?.email || '匿名'} · Lv.{item.seller?.sellerProfile?.level ?? 1} ·
                  成交 {item.seller?.sellerProfile?.tradeCount ?? 0}
                </span>
                <span>
                  浏览 {item._count?.browsingHistory ?? 0} · 订单 {item._count?.orders ?? 0} · 收藏 {item._count?.favorites ?? 0} ·
                </span>
                <span>
                  好评率 {(((item.seller?.sellerProfile?.positiveRate ?? 0.98) || 0) * 100).toFixed(1)}% ·
                  纠纷率 {(((item.seller?.sellerProfile?.disputeRate ?? 0.01) || 0) * 100).toFixed(1)}% ·
                  退款率 {(((item.seller?.sellerProfile?.refundRate ?? 0.01) || 0) * 100).toFixed(1)}%
                </span>
              </div>

              {!!item.riskTags?.length && (
                <div className="tags">
                  {item.riskTags.slice(0, 4).map((tag) => (
                    <span key={tag} className="status-chip warning">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {item.consignmentApplications?.[0]?.adminRemark ? (
                <p className="muted">寄售审核备注：{item.consignmentApplications[0].adminRemark}</p>
              ) : null}

              <div className="actions">
                <Link href={`/products/${item.id}`} className="btn primary">
                  查看详情
                </Link>
                {item.seller?.id ? (
                  <Link href={`/stores/${item.seller.id}`} className="btn secondary">
                    店铺主页
                  </Link>
                ) : null}
                <Link href={`/products/${item.id}`} className="btn secondary">
                  快速购买
                </Link>
                {item.negotiable ? (
                  <Link href={`/products/${item.id}`} className="btn secondary">
                    发起议价
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && total > 0 && (
        <div className="toolbar" style={{ justifyContent: 'center' }}>
          <button className="btn secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            上一页
          </button>
          <span className="muted">
            第 {page} / {totalPages} 页
          </span>
          <button
            className="btn secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </button>
        </div>
      )}
    </main>
  );
}
