'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

interface FavoriteItem {
  id: string;
  productId: string;
  product: {
    id: string;
    title: string;
    salePrice: number;
    status: string;
  };
  createdAt: string;
}

export default function FavoritesPage() {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null;

  const load = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${API}/user/favorites?page=${page}&pageSize=20`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setItems(data.list || []);
    setTotal(data.total || 0);
  }, [token, page]);

  useEffect(() => { load(); }, [load]);

  const remove = async (productId: string) => {
    if (!token) return;
    await fetch(`${API}/user/favorites/${productId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    load();
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <main className="container" style={{ maxWidth: 800, paddingTop: '2rem' }}>
      <h1>我的收藏</h1>
      {items.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', marginTop: '2rem' }}>暂无收藏</p>
      ) : (
        <div style={{ marginTop: '1.5rem' }}>
          {items.map((item) => (
            <div key={item.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <Link href={`/products/${item.product.id}`} style={{ fontWeight: 600 }}>{item.product.title}</Link>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>¥{item.product.salePrice}</p>
              </div>
              <button className="btn btn-sm" onClick={() => remove(item.productId)}>取消收藏</button>
            </div>
          ))}
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
              <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</button>
              <span style={{ lineHeight: '32px' }}>{page} / {totalPages}</span>
              <button className="btn btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
