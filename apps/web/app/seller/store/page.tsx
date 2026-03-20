"use client";

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type StoreProfile = {
  id: string;
  userId: string;
  name: string;
  slug: string;
  logo?: string | null;
  banner?: string | null;
  intro?: string | null;
  notice?: string | null;
  verifiedBadge: boolean;
  responseMinutes: number;
};

export default function SellerStorePage() {
  const [form, setForm] = useState({
    name: '',
    slug: '',
    logo: '',
    banner: '',
    intro: '',
    notice: '',
    responseMinutes: '30'
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [store, setStore] = useState<StoreProfile | null>(null);

  const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setMsg('');
    const res = await fetch(`${API}/stores/mine`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok && data) {
      setStore(data);
      setForm({
        name: data.name || '',
        slug: data.slug || '',
        logo: data.logo || '',
        banner: data.banner || '',
        intro: data.intro || '',
        notice: data.notice || '',
        responseMinutes: String(data.responseMinutes || 30)
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    const token = getToken();
    if (!token) return;
    if (!form.name.trim()) {
      setMsg('店铺名称不能为空');
      return;
    }
    setLoading(true);
    setMsg('');
    const res = await fetch(`${API}/stores/mine`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: form.name,
        slug: form.slug || undefined,
        logo: form.logo || undefined,
        banner: form.banner || undefined,
        intro: form.intro || undefined,
        notice: form.notice || undefined,
        responseMinutes: Number(form.responseMinutes) || 30
      })
    });
    const data = await res.json();
    if (res.ok) {
      setStore(data);
      setMsg('店铺信息已保存');
    } else {
      setMsg(data.message || '保存失败');
    }
    setLoading(false);
  };

  return (
    <main className="page page-shell">
      <header className="section-head">
        <div>
          <p className="eyebrow">卖家中心</p>
          <h1>店铺资料</h1>
          <p className="muted">用于建设店铺主页、沉淀信誉资产与复购转化。</p>
        </div>
      </header>

      <section className="card stack-12">
        <div className="form-row">
          <div className="field half">
            <label>店铺名称</label>
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="field half">
            <label>店铺短链 slug</label>
            <input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} />
          </div>
          <div className="field half">
            <label>Logo URL（可选）</label>
            <input value={form.logo} onChange={(e) => setForm((p) => ({ ...p, logo: e.target.value }))} />
          </div>
          <div className="field half">
            <label>Banner URL（可选）</label>
            <input value={form.banner} onChange={(e) => setForm((p) => ({ ...p, banner: e.target.value }))} />
          </div>
          <div className="field half">
            <label>平均响应时长（分钟）</label>
            <input
              type="number"
              min="1"
              value={form.responseMinutes}
              onChange={(e) => setForm((p) => ({ ...p, responseMinutes: e.target.value }))}
            />
          </div>
          <div className="field full">
            <label>店铺简介</label>
            <textarea rows={3} value={form.intro} onChange={(e) => setForm((p) => ({ ...p, intro: e.target.value }))} />
          </div>
          <div className="field full">
            <label>店铺公告</label>
            <textarea rows={2} value={form.notice} onChange={(e) => setForm((p) => ({ ...p, notice: e.target.value }))} />
          </div>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={save} disabled={loading}>
            {loading ? '保存中...' : '保存店铺资料'}
          </button>
          {store?.userId ? (
            <Link className="btn secondary" href={`/stores/${store.userId}`}>
              预览店铺主页
            </Link>
          ) : null}
        </div>
        {msg ? <p className="muted">{msg}</p> : null}
      </section>
    </main>
  );
}
