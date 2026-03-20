"use client";

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type ProductLite = {
  id: string;
  code: string;
  title: string;
  status: string;
  salePrice: number | string;
  region?: string;
  lineType?: string;
  consignment?: boolean;
};

type ConsignmentItem = {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED';
  sellerNote?: string | null;
  adminRemark?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  product: ProductLite;
  reviewer?: {
    id: string;
    email: string;
  } | null;
};

const statusLabel: Record<string, string> = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  CANCELED: '已撤销'
};

function statusTone(status: string) {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'danger';
  if (status === 'CANCELED') return '';
  return 'warning';
}

function fmtMoney(value: number | string | null | undefined) {
  return `¥${Number(value || 0).toFixed(2)}`;
}

function fmtDateTime(value?: string | null) {
  if (!value) return '-';
  const t = new Date(value);
  if (Number.isNaN(t.getTime())) return '-';
  return t.toLocaleString('zh-CN');
}

export default function SellerConsignmentsPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [items, setItems] = useState<ConsignmentItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [sellerNote, setSellerNote] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null;

  const load = useCallback(async () => {
    if (!token) {
      setError('请先登录卖家账号');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const [productRes, consignmentRes] = await Promise.all([
        fetch(`${API_BASE}/products/mine?page=1&pageSize=100`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(
          `${API_BASE}/consignments/mine?page=1&pageSize=50${status ? `&status=${status}` : ''}${
            keyword ? `&keyword=${encodeURIComponent(keyword)}` : ''
          }`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )
      ]);
      const productData = await productRes.json();
      const consignmentData = await consignmentRes.json();
      if (!productRes.ok) throw new Error(productData.message || '读取商品失败');
      if (!consignmentRes.ok) throw new Error(consignmentData.message || '读取寄售申请失败');

      const mineProducts = (productData.list || []) as ProductLite[];
      const candidates = mineProducts.filter((item) => item.status !== 'DRAFT');
      setProducts(candidates);
      setItems((consignmentData.list || []) as ConsignmentItem[]);
      if (!selectedProductId && candidates.length > 0) {
        setSelectedProductId(candidates[0].id);
      }
    } catch (e: any) {
      setError(e.message || '读取失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, selectedProductId, status, token]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!token) return;
    if (!selectedProductId) {
      setError('请先选择商品');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/consignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: selectedProductId,
          sellerNote: sellerNote.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '提交寄售申请失败');
      setSellerNote('');
      setMessage(data.message || '寄售申请提交成功');
      await load();
    } catch (e: any) {
      setError(e.message || '提交失败');
    } finally {
      setLoading(false);
    }
  };

  const cancel = async (id: string) => {
    if (!token) return;
    if (!window.confirm('确认撤销该寄售申请？')) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/consignments/${id}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '撤销失败');
      setMessage(data.message || '寄售申请已撤销');
      await load();
    } catch (e: any) {
      setError(e.message || '撤销失败');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.status === 'PENDING') acc.pending += 1;
        if (item.status === 'APPROVED') acc.approved += 1;
        if (item.status === 'REJECTED') acc.rejected += 1;
        return acc;
      },
      { total: 0, pending: 0, approved: 0, rejected: 0 }
    );
  }, [items]);

  return (
    <main className="page page-shell">
      <header className="section-head">
        <div>
          <p className="eyebrow">卖家中心 · 寄售模式</p>
          <h1>寄售申请与审核状态</h1>
          <p className="muted">
            寄售模式由平台代管交付环节，审核通过后商品将标记为寄售，提高买家信任与成交效率。
          </p>
        </div>
        <div className="actions" style={{ marginTop: 0 }}>
          <button onClick={load} className="btn secondary" disabled={loading}>
            {loading ? '刷新中...' : '刷新'}
          </button>
          <Link href="/seller/products" className="btn ghost">
            返回商品管理
          </Link>
        </div>
      </header>

      <section className="metric-grid">
        <article className="metric-card">
          <p className="metric-label">申请总数</p>
          <p className="metric-value">{stats.total}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">待审核</p>
          <p className="metric-value">{stats.pending}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">已通过</p>
          <p className="metric-value">{stats.approved}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">已驳回</p>
          <p className="metric-value">{stats.rejected}</p>
        </article>
      </section>

      <section className="card stack-12">
        <div className="section-head">
          <div>
            <p className="eyebrow">申请区</p>
            <h2 style={{ fontSize: 20 }}>提交寄售申请</h2>
          </div>
          <span className="status-chip info">平台审核后生效</span>
        </div>
        <div className="form-row">
          <div className="field half">
            <label>选择商品</label>
            <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
              {products.length === 0 && <option value="">暂无可申请商品</option>}
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}（{item.code}）· {fmtMoney(item.salePrice)} · {item.status}
                </option>
              ))}
            </select>
          </div>
          <div className="field half">
            <label>申请说明（可选）</label>
            <input
              value={sellerNote}
              onChange={(e) => setSellerNote(e.target.value)}
              placeholder="例如：支持整账户交付，可配合面板改绑"
            />
          </div>
        </div>
        <div className="actions">
          <button className="btn primary" disabled={loading || !selectedProductId} onClick={submit}>
            提交寄售申请
          </button>
        </div>
      </section>

      <section className="card stack-12">
        <div className="console-filter-grid">
          <div className="field">
            <label>状态筛选</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">全部状态</option>
              <option value="PENDING">待审核</option>
              <option value="APPROVED">已通过</option>
              <option value="REJECTED">已驳回</option>
              <option value="CANCELED">已撤销</option>
            </select>
          </div>
          <div className="field">
            <label>关键词</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="申请ID / 商品标题 / 商品编号"
            />
          </div>
        </div>

        {message ? <p className="success">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}

        {items.length === 0 ? (
          <div className="empty-state">{loading ? '加载中...' : '暂无寄售申请记录'}</div>
        ) : (
          <div className="cards">
            {items.map((item) => (
              <article className="card stack-8" key={item.id}>
                <div className="card-header">
                  <div>
                    <h3 style={{ fontSize: 16 }}>{item.product?.title || '-'}</h3>
                    <p className="card-meta">
                      {item.product?.code || '-'} · {item.product?.region || '-'} · {item.product?.lineType || '-'}
                    </p>
                  </div>
                  <span className={`status-chip ${statusTone(item.status)}`}>{statusLabel[item.status] || item.status}</span>
                </div>
                <p className="muted">申请编号：{item.id}</p>
                <p className="muted">商品价格：{fmtMoney(item.product?.salePrice)}</p>
                <p className="muted">提交时间：{fmtDateTime(item.createdAt)}</p>
                <p className="muted">审核时间：{fmtDateTime(item.reviewedAt)}</p>
                {item.sellerNote ? <p className="muted">申请说明：{item.sellerNote}</p> : null}
                {item.adminRemark ? <p className="muted">审核备注：{item.adminRemark}</p> : null}
                {item.reviewer?.email ? <p className="muted">审核人：{item.reviewer.email}</p> : null}
                <div className="actions">
                  <Link className="btn secondary" href={`/products/${item.product?.id || ''}`}>
                    查看商品
                  </Link>
                  {item.status === 'PENDING' && (
                    <button className="btn danger" onClick={() => cancel(item.id)} disabled={loading}>
                      撤销申请
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
