'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type DeliveryType = 'FULL_ACCOUNT' | 'PANEL_TRANSFER' | 'SUB_ACCOUNT' | 'EMAIL_CHANGE' | string;

interface Product {
  id: string;
  title: string;
  salePrice: number;
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
  expireAt?: string | null;
  status?: string;
  deliveryType?: DeliveryType;
  riskTags?: string[];
  createdAt?: string;
  seller?: {
    email: string;
    sellerProfile?: {
      level: number;
      tradeCount: number;
      positiveRate?: number;
      disputeRate?: number;
    };
  };
}

const CATEGORIES = ['VPS', 'DEDICATED', 'GPU', 'STORAGE', 'CDN', 'NAT', 'OTHER'];
const DELIVERY_OPTIONS = ['FULL_ACCOUNT', 'PANEL_TRANSFER', 'SUB_ACCOUNT', 'EMAIL_CHANGE'];
const SORT_OPTIONS = [
  { value: 'latest', label: '默认（最新上架）' },
  { value: 'price_asc', label: '价格升序' },
  { value: 'price_desc', label: '价格降序' },
  { value: 'seller_desc', label: '卖家信用优先' },
  { value: 'expire_asc', label: '到期时间优先' }
];

const DELIVERY_LABEL: Record<string, string> = {
  FULL_ACCOUNT: '整号交付',
  PANEL_TRANSFER: '面板转移',
  SUB_ACCOUNT: '子账户交付',
  EMAIL_CHANGE: '改邮箱交付'
};

export default function ProductsPage() {
  const [rawList, setRawList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');

  const [category, setCategory] = useState('');
  const [region, setRegion] = useState('');
  const [lineType, setLineType] = useState('');
  const [deliveryType, setDeliveryType] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [riskOnly, setRiskOnly] = useState(false);
  const [sortBy, setSortBy] = useState('latest');

  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('pageSize', '200');
      if (submittedKeyword) params.set('keyword', submittedKeyword);
      if (category) params.set('category', category);
      if (region) params.set('region', region);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      const res = await fetch(`${API}/products?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取商品失败');
      setRawList(data.list || []);
    } catch (e: any) {
      setError(e.message || '读取商品失败');
      setRawList([]);
    } finally {
      setLoading(false);
    }
  }, [submittedKeyword, category, region, minPrice, maxPrice]);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const qCategory = search.get('category');
    const qRegion = search.get('region');
    if (qCategory) setCategory(qCategory);
    if (qRegion) setRegion(qRegion);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [category, region, lineType, deliveryType, minPrice, maxPrice, riskOnly, sortBy, submittedKeyword]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredList = useMemo(() => {
    const list = rawList.filter((item) => {
      if (lineType && (item.lineType || '').toLowerCase().indexOf(lineType.toLowerCase()) === -1) {
        return false;
      }
      if (deliveryType && item.deliveryType !== deliveryType) {
        return false;
      }
      if (riskOnly && (!item.riskTags || item.riskTags.length === 0)) {
        return false;
      }
      return true;
    });

    const sorted = [...list];
    if (sortBy === 'price_asc') {
      sorted.sort((a, b) => Number(a.salePrice) - Number(b.salePrice));
    } else if (sortBy === 'price_desc') {
      sorted.sort((a, b) => Number(b.salePrice) - Number(a.salePrice));
    } else if (sortBy === 'seller_desc') {
      sorted.sort(
        (a, b) =>
          (b.seller?.sellerProfile?.level ?? 0) - (a.seller?.sellerProfile?.level ?? 0) ||
          (b.seller?.sellerProfile?.tradeCount ?? 0) - (a.seller?.sellerProfile?.tradeCount ?? 0)
      );
    } else if (sortBy === 'expire_asc') {
      sorted.sort((a, b) => {
        const aTime = a.expireAt ? new Date(a.expireAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.expireAt ? new Date(b.expireAt).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      });
    } else {
      sorted.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
    }

    return sorted;
  }, [rawList, lineType, deliveryType, riskOnly, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const currentList = filteredList.slice((page - 1) * pageSize, page * pageSize);

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
          <p className="muted">可按配置、地区、线路、价格、交付方式与风险状态筛选</p>
        </div>
        <div className="metric-card" style={{ minWidth: 220 }}>
          <p className="metric-label">当前结果</p>
          <p className="metric-value" style={{ fontSize: 26 }}>{filteredList.length}</p>
          <p className="metric-tip">本次加载 {rawList.length} 条，已按筛选和排序展示</p>
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
            <label>最低价</label>
            <input type="number" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
          </div>
          <div className="field">
            <label>最高价</label>
            <input type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
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
              setDeliveryType('');
              setMinPrice('');
              setMaxPrice('');
              setRiskOnly(false);
              setSortBy('latest');
            }}
          >
            重置筛选
          </button>
          <button
            type="button"
            className={`btn ${riskOnly ? 'primary' : 'secondary'}`}
            onClick={() => setRiskOnly((v) => !v)}
          >
            {riskOnly ? '仅风险标签商品' : '查看全部风险状态'}
          </button>
          <span className="muted">交易信息优先显示：配置 / 价格 / 状态 / 信用 / 到期</span>
        </div>
      </form>

      {loading ? (
        <div className="empty-state">正在加载交易数据...</div>
      ) : error ? (
        <div className="empty-state">{error}</div>
      ) : currentList.length === 0 ? (
        <div className="empty-state">当前筛选条件下暂无商品，请调整筛选条件。</div>
      ) : (
        <div className="cards">
          {currentList.map((item) => (
            <article key={item.id} className="card stack-12">
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
                    {item.riskTags?.length ? <span className="status-chip warning">风险标签</span> : null}
                  </div>
                </div>
                <div className="stack-8" style={{ textAlign: 'right' }}>
                  <span className="price">¥{Number(item.salePrice).toFixed(2)}</span>
                  <span className="muted">{DELIVERY_LABEL[item.deliveryType || ''] || item.deliveryType || '交付方式未标注'}</span>
                </div>
              </div>

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
              </div>

              <div className="card-meta" style={{ justifyContent: 'space-between' }}>
                <span>
                  卖家：{item.seller?.email || '匿名'} · Lv.{item.seller?.sellerProfile?.level ?? 1} ·
                  成交 {item.seller?.sellerProfile?.tradeCount ?? 0}
                </span>
                <span>
                  好评率 {(((item.seller?.sellerProfile?.positiveRate ?? 0.98) || 0) * 100).toFixed(1)}% ·
                  纠纷率 {(((item.seller?.sellerProfile?.disputeRate ?? 0.01) || 0) * 100).toFixed(1)}%
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

              <div className="actions">
                <Link href={`/products/${item.id}`} className="btn primary">
                  查看详情
                </Link>
                <Link href={`/products/${item.id}`} className="btn secondary">
                  快速购买
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && filteredList.length > 0 && (
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
