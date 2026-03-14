"use client";

import { useCallback, useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type Product = {
  id: string;
  title: string;
  code: string;
  category: string;
  region: string;
  salePrice: number | string;
  description?: string | null;
  sellerId: string;
  createdAt: string;
  audits?: Array<{
    status: string;
    reason?: string | null;
    createdAt: string;
  }>;
};

export default function AdminProductsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [reasons, setReasons] = useState<Record<string, string>>({});

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

  useEffect(() => {
    load();
  }, [load]);

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

  return (
    <main className="page">
      <header className="section-head">
        <div>
          <p className="eyebrow">管理员中心</p>
          <h1>商品审核</h1>
        </div>
        <button onClick={load} className="secondary" disabled={loading}>
          {loading ? '刷新中...' : '刷新'}
        </button>
      </header>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      {products.length === 0 ? (
        <p className="muted">当前没有待审核商品</p>
      ) : (
        <div className="cards">
          {products.map((item) => (
            <article className="card" key={item.id}>
              <div className="card-header">
                <div>
                  <h3>{item.title}</h3>
                  <p className="muted">
                    编号：{item.code} · 卖家：{item.sellerId}
                  </p>
                </div>
                <span className="pill">待审核</span>
              </div>
              <p className="muted">
                {item.category} · {item.region}
              </p>
              <p className="price">¥{Number(item.salePrice).toFixed(2)}</p>
              <p className="muted">{item.description || '无商品描述'}</p>
              <p className="muted">提交时间：{new Date(item.createdAt).toLocaleString('zh-CN')}</p>
              <div className="form">
                <label>审核备注（驳回必填）</label>
                <input
                  value={reasons[item.id] || ''}
                  onChange={(e) =>
                    setReasons((prev) => ({
                      ...prev,
                      [item.id]: e.target.value
                    }))
                  }
                  placeholder="填写审核意见"
                />
              </div>
              <div className="actions">
                <button onClick={() => audit(item.id, 'APPROVED')} disabled={loading}>
                  通过并上架
                </button>
                <button
                  onClick={() => audit(item.id, 'REJECTED')}
                  disabled={loading}
                  className="secondary"
                >
                  驳回
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
