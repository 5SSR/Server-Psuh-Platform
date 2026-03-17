"use client";

import { useCallback, useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type Product = {
  id: string;
  title: string;
  status: string;
  category: string;
  region: string;
  salePrice: number | string;
  deliveryType: string;
  createdAt: string;
  updatedAt: string;
  audits?: Array<{
    status: string;
    reason?: string | null;
    createdAt: string;
  }>;
};

type UserInfo = {
  role: string;
};

const statusLabel: Record<string, string> = {
  DRAFT: '草稿',
  PENDING: '审核中',
  ONLINE: '已上架',
  OFFLINE: '已下架'
};

const defaultForm = {
  title: '',
  category: 'VPS',
  region: 'HK',
  datacenter: '',
  lineType: '',
  salePrice: '100',
  deliveryType: 'FULL_ACCOUNT',
  negotiable: false,
  consignment: false,
  canChangeEmail: false,
  canChangeRealname: false,
  description: ''
};

export default function SellerProductsPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(defaultForm);

  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null;
  const load = useCallback(async () => {
    if (!token) {
      setError('请先登录用户账号');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const [meRes, listRes] = await Promise.all([
        fetch(`${API_BASE}/user/me`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(
          `${API_BASE}/products/mine?page=1&pageSize=30${status ? `&status=${status}` : ''}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )
      ]);
      const meData = await meRes.json();
      const listData = await listRes.json();

      if (!meRes.ok) throw new Error(meData.message || '读取用户信息失败');
      if (!listRes.ok) throw new Error(listData.message || '读取商品失败');
      setUserInfo(meData);
      setProducts(listData.list || []);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [status, token]);

  useEffect(() => {
    load();
  }, [load]);

  const createProduct = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: form.title,
          category: form.category,
          region: form.region,
          datacenter: form.datacenter || undefined,
          lineType: form.lineType || undefined,
          salePrice: Number(form.salePrice) || 0,
          deliveryType: form.deliveryType,
          negotiable: form.negotiable,
          consignment: form.consignment,
          canChangeEmail: form.canChangeEmail,
          canChangeRealname: form.canChangeRealname,
          description: form.description || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '创建失败');
      setMessage('商品创建成功，可继续提交审核');
      setForm(defaultForm);
      await load();
    } catch (e: any) {
      setError(e.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const submitAudit = async (id: string) => {
    if (!token) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/products/${id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          remark: remarks[id] || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '提交审核失败');
      setMessage('已提交审核');
      await load();
    } catch (e: any) {
      setError(e.message || '提交审核失败');
    } finally {
      setLoading(false);
    }
  };

  const toggleOnline = async (id: string, next: 'online' | 'offline') => {
    if (!token) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/products/${id}/${next}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '操作失败');
      setMessage(next === 'online' ? '商品已上架' : '商品已下架');
      await load();
    } catch (e: any) {
      setError(e.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setEditForm({
      title: product.title,
      category: product.category,
      region: product.region,
      datacenter: '',
      lineType: '',
      salePrice: String(product.salePrice),
      deliveryType: product.deliveryType,
      negotiable: false,
      consignment: false,
      canChangeEmail: false,
      canChangeRealname: false,
      description: ''
    });
  };

  const updateProduct = async () => {
    if (!token || !editingId) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/products/${editingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editForm.title,
          category: editForm.category,
          region: editForm.region,
          salePrice: Number(editForm.salePrice),
          deliveryType: editForm.deliveryType,
          description: editForm.description || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '更新失败');
      setMessage('商品已更新');
      setEditingId(null);
      await load();
    } catch (e: any) {
      setError(e.message || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <header className="section-head">
        <div>
          <p className="eyebrow">用户中心</p>
          <h1>我的商品管理</h1>
          <p className="muted">身份：{userInfo?.role || '未知'}</p>
        </div>
        <button onClick={load} className="secondary" disabled={loading}>
          {loading ? '刷新中...' : '刷新'}
        </button>
      </header>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

        <section className="card">
        <h3>发布新商品</h3>
        <p className="muted">当前身份：{userInfo?.role || '未知'}</p>
        <div className="form">
          <label>标题</label>
          <input
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="例如：香港 CN2 VPS 2C4G"
          />
          <label>分类</label>
          <select
            value={form.category}
            onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
          >
            <option value="DEDICATED">DEDICATED</option>
            <option value="VPS">VPS</option>
            <option value="CLOUD">CLOUD</option>
            <option value="NAT">NAT</option>
            <option value="LINE">LINE</option>
          </select>
          <label>地区</label>
          <input
            value={form.region}
            onChange={(e) => setForm((prev) => ({ ...prev, region: e.target.value }))}
          />
          <label>机房（可选）</label>
          <input
            value={form.datacenter}
            onChange={(e) => setForm((prev) => ({ ...prev, datacenter: e.target.value }))}
          />
          <label>线路（可选）</label>
          <input
            value={form.lineType}
            onChange={(e) => setForm((prev) => ({ ...prev, lineType: e.target.value }))}
          />
          <label>售价（元）</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.salePrice}
            onChange={(e) => setForm((prev) => ({ ...prev, salePrice: e.target.value }))}
          />
          <label>交付方式</label>
          <select
            value={form.deliveryType}
            onChange={(e) => setForm((prev) => ({ ...prev, deliveryType: e.target.value }))}
          >
            <option value="FULL_ACCOUNT">FULL_ACCOUNT</option>
            <option value="PANEL_TRANSFER">PANEL_TRANSFER</option>
            <option value="SUB_ACCOUNT">SUB_ACCOUNT</option>
            <option value="EMAIL_CHANGE">EMAIL_CHANGE</option>
          </select>
          <label>描述（可选）</label>
          <input
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />
          <button onClick={createProduct} disabled={loading || !form.title}>
            {loading ? '处理中...' : '创建商品'}
          </button>
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="section-head">
          <h3>我的商品</h3>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">全部状态</option>
            <option value="PENDING">审核中</option>
            <option value="ONLINE">已上架</option>
            <option value="OFFLINE">已下架</option>
            <option value="DRAFT">草稿</option>
          </select>
        </div>

        {products.length === 0 ? (
          <p className="muted">暂无商品</p>
        ) : (
          <div className="cards">
            {products.map((item) => (
              <article className="card nested" key={item.id}>
                <div className="card-header">
                  <div>
                    <h3>{item.title}</h3>
                    <p className="muted">
                      {item.category} · {item.region}
                    </p>
                  </div>
                  <span className="pill">{statusLabel[item.status] || item.status}</span>
                </div>
                <p className="price">¥{Number(item.salePrice).toFixed(2)}</p>
                <p className="muted">交付方式：{item.deliveryType}</p>
                <p className="muted">更新时间：{new Date(item.updatedAt).toLocaleString('zh-CN')}</p>
                {item.audits?.[0]?.reason && (
                  <p className="muted">最近审核备注：{item.audits[0].reason}</p>
                )}
                <div className="form">
                  <label>提交审核备注（可选）</label>
                  <input
                    value={remarks[item.id] || ''}
                    onChange={(e) =>
                      setRemarks((prev) => ({
                        ...prev,
                        [item.id]: e.target.value
                      }))
                    }
                  />
                </div>
                <div className="actions">
                  <button onClick={() => startEdit(item)} disabled={loading} className="secondary">
                    编辑
                  </button>
                  {item.status !== 'ONLINE' && (
                    <button onClick={() => submitAudit(item.id)} disabled={loading}>
                      提交审核
                    </button>
                  )}
                  {item.status === 'ONLINE' && (
                    <button onClick={() => toggleOnline(item.id, 'offline')} disabled={loading} className="secondary">
                      下架
                    </button>
                  )}
                  {item.status === 'OFFLINE' && (
                    <button onClick={() => toggleOnline(item.id, 'online')} disabled={loading}>
                      上架
                    </button>
                  )}
                </div>
                {editingId === item.id && (
                  <div className="form" style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                    <label>标题</label>
                    <input value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} />
                    <label>分类</label>
                    <select value={editForm.category} onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}>
                      <option value="DEDICATED">DEDICATED</option>
                      <option value="VPS">VPS</option>
                      <option value="CLOUD">CLOUD</option>
                      <option value="NAT">NAT</option>
                      <option value="LINE">LINE</option>
                    </select>
                    <label>地区</label>
                    <input value={editForm.region} onChange={(e) => setEditForm((p) => ({ ...p, region: e.target.value }))} />
                    <label>售价（元）</label>
                    <input type="number" value={editForm.salePrice} onChange={(e) => setEditForm((p) => ({ ...p, salePrice: e.target.value }))} />
                    <label>描述</label>
                    <input value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} />
                    <div className="actions">
                      <button onClick={updateProduct} disabled={loading}>保存修改</button>
                      <button onClick={() => setEditingId(null)} className="secondary">取消</button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
