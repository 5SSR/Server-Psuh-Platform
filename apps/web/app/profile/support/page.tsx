"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type TicketItem = {
  id: string;
  type: 'AFTER_SALE' | 'APPEAL' | 'OTHER' | string;
  status: 'OPEN' | 'PROCESSING' | 'RESOLVED' | 'CLOSED' | 'REJECTED' | string;
  subject: string;
  content: string;
  orderId?: string | null;
  productId?: string | null;
  reviewRemark?: string | null;
  contact?: string | null;
  evidence?: string[];
  resolver?: {
    id: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

const typeLabel: Record<string, string> = {
  AFTER_SALE: '售后问题',
  APPEAL: '申诉仲裁',
  OTHER: '其他问题'
};

const statusLabel: Record<string, string> = {
  OPEN: '待处理',
  PROCESSING: '处理中',
  RESOLVED: '已处理',
  CLOSED: '已关闭',
  REJECTED: '已驳回'
};

function statusTone(status: string) {
  if (status === 'RESOLVED') return 'success';
  if (status === 'OPEN' || status === 'PROCESSING') return 'warning';
  if (status === 'REJECTED') return 'danger';
  return '';
}

export default function ProfileSupportPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [tickets, setTickets] = useState<TicketItem[]>([]);

  const [form, setForm] = useState({
    type: 'AFTER_SALE',
    orderId: '',
    productId: '',
    subject: '',
    content: '',
    contact: '',
    evidence: ''
  });

  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null;

  const stats = useMemo(() => {
    return tickets.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.status === 'OPEN') acc.open += 1;
        if (item.status === 'PROCESSING') acc.processing += 1;
        if (item.status === 'RESOLVED') acc.resolved += 1;
        return acc;
      },
      { total: 0, open: 0, processing: 0, resolved: 0 }
    );
  }, [tickets]);

  const load = useCallback(async () => {
    if (!token) {
      setError('请先登录后查看工单');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const query = new URLSearchParams();
      query.set('page', '1');
      query.set('pageSize', '50');
      if (status) query.set('status', status);
      const res = await fetch(`${API_BASE}/support/tickets?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '工单列表加载失败');
      setTickets(data.list || []);
    } catch (e: any) {
      setError(e.message || '工单列表加载失败');
    } finally {
      setLoading(false);
    }
  }, [status, token]);

  useEffect(() => {
    load();
  }, [load]);

  const createTicket = async () => {
    if (!token) return;
    if (!form.subject.trim() || !form.content.trim()) {
      setError('请填写工单标题和问题描述');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const evidence = form.evidence
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean);
      const res = await fetch(`${API_BASE}/support/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          type: form.type,
          orderId: form.orderId || undefined,
          productId: form.productId || undefined,
          subject: form.subject,
          content: form.content,
          contact: form.contact || undefined,
          evidence
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '工单提交失败');
      setMessage('工单已提交，平台会在审核队列中处理。');
      setForm({
        type: 'AFTER_SALE',
        orderId: '',
        productId: '',
        subject: '',
        content: '',
        contact: '',
        evidence: ''
      });
      await load();
    } catch (e: any) {
      setError(e.message || '工单提交失败');
    } finally {
      setLoading(false);
    }
  };

  const closeTicket = async (id: string) => {
    if (!token) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/support/tickets/${id}/close`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '关闭工单失败');
      setMessage('工单已关闭');
      await load();
    } catch (e: any) {
      setError(e.message || '关闭工单失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page page-shell">
      <header className="section-head">
        <div>
          <p className="eyebrow">买家中心 · 售后工单</p>
          <h1>售后与申诉中心</h1>
          <p className="muted">提交售后问题、申诉材料与证据链接，平台将按担保规则处理并留痕。</p>
        </div>
        <button className="btn secondary" onClick={load} disabled={loading}>
          {loading ? '刷新中...' : '刷新'}
        </button>
      </header>

      <section className="metric-grid">
        <article className="metric-card">
          <p className="metric-label">工单总数</p>
          <p className="metric-value">{stats.total}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">待处理</p>
          <p className="metric-value">{stats.open}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">处理中</p>
          <p className="metric-value">{stats.processing}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">已处理</p>
          <p className="metric-value">{stats.resolved}</p>
        </article>
      </section>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <section className="card stack-12">
        <h3>提交新工单</h3>
        <div className="form-row">
          <div className="field third">
            <label>工单类型</label>
            <select value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}>
              <option value="AFTER_SALE">售后问题</option>
              <option value="APPEAL">申诉仲裁</option>
              <option value="OTHER">其他问题</option>
            </select>
          </div>
          <div className="field third">
            <label>关联订单（可选）</label>
            <input
              value={form.orderId}
              onChange={(e) => setForm((prev) => ({ ...prev, orderId: e.target.value }))}
              placeholder="订单 ID"
            />
          </div>
          <div className="field third">
            <label>关联商品（可选）</label>
            <input
              value={form.productId}
              onChange={(e) => setForm((prev) => ({ ...prev, productId: e.target.value }))}
              placeholder="商品 ID"
            />
          </div>
          <div className="field full">
            <label>工单标题</label>
            <input
              value={form.subject}
              onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
              placeholder="例如：交付配置与商品描述不一致"
            />
          </div>
          <div className="field full">
            <label>问题描述</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
              rows={4}
              placeholder="请明确描述问题现象、时间点、影响范围与诉求"
            />
          </div>
          <div className="field half">
            <label>联系信息（可选）</label>
            <input
              value={form.contact}
              onChange={(e) => setForm((prev) => ({ ...prev, contact: e.target.value }))}
              placeholder="邮箱/Telegram/手机号"
            />
          </div>
          <div className="field half">
            <label>证据链接（可选）</label>
            <input
              value={form.evidence}
              onChange={(e) => setForm((prev) => ({ ...prev, evidence: e.target.value }))}
              placeholder="多个链接用逗号分隔"
            />
          </div>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={createTicket} disabled={loading}>
            提交工单
          </button>
        </div>
      </section>

      <section className="card stack-12">
        <div className="section-head">
          <div>
            <h3>我的工单</h3>
            <p className="muted">可按状态筛选并查看处理备注。</p>
          </div>
          <div className="field" style={{ minWidth: 180 }}>
            <label>状态筛选</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">全部</option>
              <option value="OPEN">待处理</option>
              <option value="PROCESSING">处理中</option>
              <option value="RESOLVED">已处理</option>
              <option value="CLOSED">已关闭</option>
              <option value="REJECTED">已驳回</option>
            </select>
          </div>
        </div>

        {tickets.length === 0 ? (
          <div className="empty-state">{loading ? '加载中...' : '暂无工单记录'}</div>
        ) : (
          <div className="cards">
            {tickets.map((item) => (
              <article key={item.id} className="card nested stack-8">
                <div className="section-head" style={{ gap: 8 }}>
                  <div>
                    <p className="eyebrow" style={{ marginBottom: 0 }}>
                      {typeLabel[item.type] || item.type}
                    </p>
                    <h4 style={{ fontSize: 16 }}>{item.subject}</h4>
                  </div>
                  <span className={`status-chip ${statusTone(item.status)}`}>
                    {statusLabel[item.status] || item.status}
                  </span>
                </div>
                <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>{item.content}</p>
                <div className="status-line">
                  {item.orderId ? <span className="status-chip">订单：{item.orderId}</span> : null}
                  {item.productId ? <span className="status-chip">商品：{item.productId}</span> : null}
                  {item.contact ? <span className="status-chip">联系：{item.contact}</span> : null}
                  <span className="status-chip">提交：{new Date(item.createdAt).toLocaleString('zh-CN')}</span>
                </div>
                {item.reviewRemark ? <p className="muted">处理备注：{item.reviewRemark}</p> : null}
                {item.resolver?.email ? <p className="muted">处理人：{item.resolver.email}</p> : null}
                {item.evidence && item.evidence.length > 0 ? (
                  <div className="status-line">
                    {item.evidence.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer" className="status-chip info">
                        证据链接
                      </a>
                    ))}
                  </div>
                ) : null}
                {(item.status === 'OPEN' || item.status === 'PROCESSING') ? (
                  <div className="actions">
                    <button className="btn secondary" onClick={() => closeTicket(item.id)} disabled={loading}>
                      关闭工单
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
