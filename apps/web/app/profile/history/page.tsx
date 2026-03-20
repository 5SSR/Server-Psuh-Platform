"use client";

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type HistoryItem = {
  id: string;
  viewedAt: string;
  product: {
    id: string;
    title: string;
    salePrice: number | string;
    status: string;
  };
};

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setMsg('');
    const res = await fetch(`${API}/user/history?page=1&pageSize=50`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      setItems(data.list || []);
    } else {
      setMsg(data.message || '加载失败');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const clear = async () => {
    const token = getToken();
    if (!token) return;
    if (!window.confirm('确认清空全部浏览记录？')) return;
    const res = await fetch(`${API}/user/history`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      setItems([]);
      setMsg(data.message || '已清空');
    } else {
      setMsg(data.message || '操作失败');
    }
  };

  return (
    <main className="page page-shell">
      <header className="section-head">
        <div>
          <p className="eyebrow">个人中心</p>
          <h1>浏览历史</h1>
          <p className="muted">用于快速找回最近看过的机器，支持一键清空。</p>
        </div>
        <button className="btn secondary" onClick={clear} disabled={loading || items.length === 0}>
          清空记录
        </button>
      </header>

      {msg ? <p className="muted">{msg}</p> : null}
      {loading ? <p className="muted">加载中...</p> : null}

      {!loading && items.length === 0 ? (
        <div className="empty-state">暂无浏览记录。</div>
      ) : (
        <div className="cards">
          {items.map((item) => (
            <article key={item.id} className="card nested stack-8">
              <h3 style={{ fontSize: 16 }}>{item.product.title}</h3>
              <p className="muted">
                ¥{Number(item.product.salePrice).toFixed(2)} · 状态 {item.product.status} · 浏览时间{' '}
                {new Date(item.viewedAt).toLocaleString('zh-CN')}
              </p>
              <Link className="btn primary" href={`/products/${item.product.id}`}>
                查看商品
              </Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
