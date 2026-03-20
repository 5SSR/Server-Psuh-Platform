"use client";

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type AlertItem = {
  id: string;
  targetPrice: number | string;
  createdAt: string;
  product: {
    id: string;
    title: string;
    salePrice: number | string;
  };
};

export default function AlertsPage() {
  const [items, setItems] = useState<AlertItem[]>([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [productId, setProductId] = useState('');
  const [targetPrice, setTargetPrice] = useState('');

  const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setMsg('');
    const res = await fetch(`${API}/user/price-alerts`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      setItems(data || []);
    } else {
      setMsg(data.message || '加载失败');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const query = new URLSearchParams(window.location.search);
      const pid = query.get('productId');
      if (pid) setProductId(pid);
    }
    void load();
  }, [load]);

  const create = async () => {
    const token = getToken();
    if (!token) return;
    if (!productId.trim() || !targetPrice.trim()) {
      setMsg('请填写商品 ID 与目标价格');
      return;
    }
    const res = await fetch(`${API}/user/price-alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        productId: productId.trim(),
        targetPrice: Number(targetPrice)
      })
    });
    const data = await res.json();
    if (res.ok) {
      setMsg('降价提醒已创建');
      setTargetPrice('');
      await load();
    } else {
      setMsg(data.message || '创建失败');
    }
  };

  const remove = async (id: string) => {
    const token = getToken();
    if (!token) return;
    const res = await fetch(`${API}/user/price-alerts/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      setMsg(data.message || '已删除');
      setItems((prev) => prev.filter((item) => item.id !== id));
    } else {
      setMsg(data.message || '删除失败');
    }
  };

  return (
    <main className="page page-shell">
      <header className="section-head">
        <div>
          <p className="eyebrow">个人中心</p>
          <h1>价格提醒</h1>
          <p className="muted">当商品价格低于目标值时，系统会自动发送站内通知。</p>
        </div>
      </header>

      <section className="card stack-12">
        <h3>新增提醒</h3>
        <div className="form-row">
          <div className="field half">
            <label>商品 ID</label>
            <input value={productId} onChange={(e) => setProductId(e.target.value)} />
          </div>
          <div className="field half">
            <label>目标价格</label>
            <input
              type="number"
              min="0"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
            />
          </div>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={create} disabled={loading}>
            创建提醒
          </button>
        </div>
        {msg ? <p className="muted">{msg}</p> : null}
      </section>

      <section className="card stack-12">
        <h3>我的提醒</h3>
        {loading ? <p className="muted">加载中...</p> : null}
        {!loading && items.length === 0 ? (
          <div className="empty-state">暂无提醒记录。</div>
        ) : (
          <div className="cards">
            {items.map((item) => (
              <article key={item.id} className="card nested stack-8">
                <h4 style={{ fontSize: 15 }}>{item.product.title}</h4>
                <p className="muted">
                  当前价 ¥{Number(item.product.salePrice).toFixed(2)} · 目标价 ¥
                  {Number(item.targetPrice).toFixed(2)}
                </p>
                <div className="actions">
                  <Link className="btn secondary" href={`/products/${item.product.id}`}>
                    查看商品
                  </Link>
                  <button className="btn secondary" onClick={() => remove(item.id)}>
                    删除提醒
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
