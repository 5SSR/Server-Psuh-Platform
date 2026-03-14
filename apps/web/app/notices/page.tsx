"use client";

import { useCallback, useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type Notice = {
  id: string;
  type: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  payload?: {
    title?: string | null;
    content?: string;
    at?: string;
  } | null;
  createdAt: string;
  sentAt?: string | null;
};

const statusLabel: Record<string, string> = {
  PENDING: '未读',
  SENT: '已读',
  FAILED: '失败'
};

export default function NoticesPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);

  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null;

  const load = useCallback(async () => {
    if (!token) {
      setError('请先登录后查看通知');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const [listRes, countRes] = await Promise.all([
        fetch(
          `${API_BASE}/notices?page=1&pageSize=30${status ? `&status=${status}` : ''}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        ),
        fetch(`${API_BASE}/notices/unread-count`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      const listData = await listRes.json();
      const countData = await countRes.json();
      if (!listRes.ok) throw new Error(listData.message || '读取通知失败');
      if (!countRes.ok) throw new Error(countData.message || '读取未读数失败');
      setNotices(listData.list || []);
      setUnread(Number(countData.unread || 0));
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [status, token]);

  useEffect(() => {
    load();
  }, [load]);

  const readOne = async (id: string) => {
    if (!token) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/notices/${id}/read`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '标记已读失败');
      setMessage(data.message || '已标记为已读');
      await load();
    } catch (e: any) {
      setError(e.message || '标记已读失败');
    } finally {
      setLoading(false);
    }
  };

  const readAll = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/notices/read-all`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '全部已读失败');
      setMessage(data.message || '操作成功');
      await load();
    } catch (e: any) {
      setError(e.message || '全部已读失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <header className="section-head">
        <div>
          <p className="eyebrow">消息中心</p>
          <h1>站内通知</h1>
          <p className="muted">未读：{unread}</p>
        </div>
        <button onClick={load} className="secondary" disabled={loading}>
          {loading ? '刷新中...' : '刷新'}
        </button>
      </header>

      <div className="actions">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">全部状态</option>
          <option value="PENDING">未读</option>
          <option value="SENT">已读</option>
          <option value="FAILED">失败</option>
        </select>
        <button onClick={readAll} className="secondary" disabled={loading || unread === 0}>
          全部标记已读
        </button>
      </div>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      {notices.length === 0 ? (
        <p className="muted">暂无通知</p>
      ) : (
        <div className="cards">
          {notices.map((item) => (
            <article className="card" key={item.id}>
              <div className="card-header">
                <div>
                  <h3>{item.payload?.title || item.type}</h3>
                  <p className="muted">类型：{item.type}</p>
                </div>
                <span className="pill">{statusLabel[item.status] || item.status}</span>
              </div>
              <p className="muted">{item.payload?.content || '无详情内容'}</p>
              <p className="muted">
                创建时间：{new Date(item.createdAt).toLocaleString('zh-CN')}
                {item.sentAt ? ` · 已读时间：${new Date(item.sentAt).toLocaleString('zh-CN')}` : ''}
              </p>
              {item.status === 'PENDING' && (
                <div className="actions">
                  <button onClick={() => readOne(item.id)} disabled={loading}>
                    标记已读
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
