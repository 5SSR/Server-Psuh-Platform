'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

interface Product {
  id: string;
  title: string;
  salePrice: number;
  category: string;
  region: string;
  lineType?: string;
  riskTags?: string[];
  seller?: { email: string; sellerProfile?: { level: number; tradeCount: number } };
}

const CATEGORIES = ['VPS', 'DEDICATED', 'GPU', 'STORAGE', 'CDN', 'OTHER'];

export default function ProductsPage() {
  const [list, setList] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [region, setRegion] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (keyword) params.set('keyword', keyword);
    if (category) params.set('category', category);
    if (region) params.set('region', region);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);

    const res = await fetch(`${API}/products?${params.toString()}`);
    const data = await res.json();
    setList(data.list || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [page, keyword, category, region, minPrice, maxPrice]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / pageSize);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  return (
    <main className="page">
      <header className="section-head">
        <div>
          <p className="eyebrow">服务器交易</p>
          <h1>在售商品</h1>
        </div>
        <div className="muted">共 {total} 条</div>
      </header>

      {/* Filters */}
      <form onSubmit={handleSearch} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: '1.5rem' }}>
        <input placeholder="搜索关键词" value={keyword} onChange={(e) => setKeyword(e.target.value)} style={{ flex: '1 1 200px' }} />
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="">全部分类</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input placeholder="地区" value={region} onChange={(e) => setRegion(e.target.value)} style={{ width: 100 }} />
        <input placeholder="最低价" type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} style={{ width: 100 }} />
        <input placeholder="最高价" type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} style={{ width: 100 }} />
        <button type="submit" className="btn btn-primary">搜索</button>
      </form>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>加载中...</div>
      ) : list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>暂无商品</div>
      ) : (
        <div className="cards">
          {list.map((item) => (
            <Link key={item.id} href={`/products/${item.id}`} className="card link">
              <div className="card-header">
                <h3>{item.title}</h3>
                <span className="price">¥{Number(item.salePrice).toFixed(2)}</span>
              </div>
              <div className="card-meta">
                <span>{item.category}</span>
                <span>{item.region}</span>
                {item.lineType && <span>{item.lineType}</span>}
              </div>
              <div className="card-meta">
                <span>卖家：{item.seller?.email || '未知'}</span>
                <span>等级：Lv.{item.seller?.sellerProfile?.level ?? 1}</span>
                <span>成交：{item.seller?.sellerProfile?.tradeCount ?? 0}</span>
              </div>
              {item.riskTags && item.riskTags.length > 0 && (
                <div className="tags">
                  {item.riskTags.slice(0, 3).map((tag) => (
                    <span key={tag} className="pill warning">{tag}</span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: '2rem' }}>
          <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</button>
          <span style={{ lineHeight: '32px', color: 'var(--text-secondary)' }}>{page} / {totalPages}</span>
          <button className="btn btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</button>
        </div>
      )}
    </main>
  );
}
