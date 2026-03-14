"use client";

import { useCallback, useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type Notice = {
  id: string;
  userId?: string | null;
  type: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  payload?: {
    title?: string | null;
    content?: string;
  } | null;
  createdAt: string;
  user?: {
    email?: string;
  } | null;
};

const statusLabel: Record<string, string> = {
  PENDING: '未读',
  SENT: '已读',
  FAILED: '失败'
};

export default function AdminNoticesPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [items, setItems] = useState<Notice[]>([]);
  const [status, setStatus] = useState('');

  const [type, setType] = useState('SYSTEM_NOTICE');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [userId, setUserId] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null;

  const load = useCallback(async () => {
    if (!token) {
      setError('请先登录管理员账号');
      return;
    }
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch(
        `${API_BASE}/admin/notices?page=1&pageSize=30${status ? `&status=${status}` : ''}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取通知列表失败');
      setItems(data.list || []);
    } catch (e: any) {
      setError(e.message || '读取失败');
    } finally {
      setLoading(false);
    }
  }, [status, token]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/notices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: userId || undefined,
          type,
          title: title || undefined,
          content
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '发送失败');
      setMessage(data.message || '发送成功');
      setContent('');
      setTitle('');
      setUserId('');
      await load();
    } catch (e: any) {
      setError(e.message || '发送失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <header className="section-head">
        <div>
          <p className="eyebrow">管理员中心</p>
          <h1>通知管理</h1>
        </div>
        <button onClick={load} className="secondary" disabled={loading}>
          {loading ? '刷新中...' : '刷新'}
        </button>
      </header>

      <section className="card">
        <h3>发送站内通知</h3>
        <p className="muted">userId 留空即广播给全部 ACTIVE 用户。</p>
        <div className="form">
          <label>通知类型</label>
          <input value={type} onChange={(e) => setType(e.target.value)} />
          <label>标题（可选）</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
          <label>通知内容</label>
          <input value={content} onChange={(e) => setContent(e.target.value)} />
          <label>指定用户 ID（可选）</label>
          <input value={userId} onChange={(e) => setUserId(e.target.value)} />
          <button onClick={submit} disabled={loading || !type || !content}>
            {loading ? '发送中...' : '发送通知'}
          </button>
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="section-head">
          <h3>通知记录</h3>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">全部状态</option>
            <option value="PENDING">未读</option>
            <option value="SENT">已读</option>
            <option value="FAILED">失败</option>
          </select>
        </div>
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}

        {items.length === 0 ? (
          <p className="muted">暂无记录</p>
        ) : (
          <div className="cards">
            {items.map((item) => (
              <article className="card nested" key={item.id}>
                <div className="card-header">
                  <div>
                    <strong>{item.payload?.title || item.type}</strong>
                    <p className="muted">
                      {item.user?.email || item.userId || '广播记录'}
                    </p>
                  </div>
                  <span className="pill">{statusLabel[item.status] || item.status}</span>
                </div>
                <p className="muted">{item.payload?.content || '无内容'}</p>
                <p className="muted">{new Date(item.createdAt).toLocaleString('zh-CN')}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
