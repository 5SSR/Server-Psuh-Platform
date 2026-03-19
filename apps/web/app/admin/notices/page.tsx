"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ConsoleEmpty,
  ConsolePageHeader,
  ConsolePanel,
  StatusBadge,
  formatDateTime
} from '../../../components/admin/console-primitives';

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

function statusTone(status: string) {
  if (status === 'SENT') return 'success' as const;
  if (status === 'FAILED') return 'danger' as const;
  return 'info' as const;
}

export default function AdminNoticesPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [items, setItems] = useState<Notice[]>([]);
  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [selectedId, setSelectedId] = useState('');

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

  const filteredItems = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    if (!key) return items;
    return items.filter((item) => {
      return (
        item.id.toLowerCase().includes(key) ||
        item.type.toLowerCase().includes(key) ||
        (item.payload?.title || '').toLowerCase().includes(key) ||
        (item.payload?.content || '').toLowerCase().includes(key) ||
        (item.user?.email || '').toLowerCase().includes(key) ||
        (item.userId || '').toLowerCase().includes(key)
      );
    });
  }, [items, keyword]);

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedId('');
      return;
    }
    if (!selectedId || !filteredItems.find((item) => item.id === selectedId)) {
      setSelectedId(filteredItems[0].id);
    }
  }, [filteredItems, selectedId]);

  const selectedItem = filteredItems.find((item) => item.id === selectedId) || null;

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
    <main className="page page-shell admin-console-page">
      <ConsolePageHeader
        eyebrow="管理后台 · 通知管理"
        title="站内通知与触达记录"
        description="支持面向全体用户或指定用户发送通知，统一查看发送结果与状态记录。"
        tags={[
          { label: '交易通知', tone: 'info' },
          { label: '系统公告', tone: 'warning' },
          { label: `记录 ${items.length} 条`, tone: 'default' }
        ]}
        actions={
          <button onClick={load} className="btn secondary" disabled={loading}>
            {loading ? '刷新中...' : '刷新列表'}
          </button>
        }
      />

      <ConsolePanel
        title="发送区"
        description="`userId` 留空则广播给全部 ACTIVE 用户，建议公告内容简明清晰并标注处理指引。"
        className="stack-12"
      >
        <div className="console-filter-grid">
          <div className="field">
            <label>通知类型</label>
            <input value={type} onChange={(e) => setType(e.target.value)} />
          </div>
          <div className="field">
            <label>标题（可选）</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <label>指定用户 ID（可选）</label>
            <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="留空即广播" />
          </div>
        </div>

        <div className="form">
          <label>通知内容</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="例如：订单核验流程升级，请卖家及时补充交付凭证"
          />
        </div>

        <div className="actions">
          <button onClick={submit} disabled={loading || !type || !content} className="btn primary">
            {loading ? '发送中...' : '发送通知'}
          </button>
        </div>
      </ConsolePanel>

      <ConsolePanel title="筛选区" className="stack-12">
        <div className="console-filter-grid">
          <div className="field">
            <label>状态筛选</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">全部状态</option>
              <option value="PENDING">未读</option>
              <option value="SENT">已读</option>
              <option value="FAILED">失败</option>
            </select>
          </div>
          <div className="field">
            <label>关键词</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="标题 / 内容 / 用户 / 类型"
            />
          </div>
          <div className="field">
            <label>触达范围</label>
            <input value="全体 / 指定用户" disabled />
          </div>
          <div className="field">
            <label>通知渠道</label>
            <input value="站内通知" disabled />
          </div>
        </div>
      </ConsolePanel>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <ConsolePanel title="表格区 · 通知记录" className="stack-12">
        {filteredItems.length === 0 ? (
          <ConsoleEmpty text={loading ? '加载中...' : '暂无通知记录'} />
        ) : (
          <div className="console-table-wrap">
            <table className="console-table">
              <thead>
                <tr>
                  <th>通知</th>
                  <th>目标用户</th>
                  <th>类型</th>
                  <th>状态</th>
                  <th>发送时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="console-row-primary">{item.payload?.title || item.type}</div>
                      <p className="console-row-sub">{item.payload?.content || '无内容'}</p>
                    </td>
                    <td>
                      <div className="console-row-primary">{item.user?.email || item.userId || '广播记录'}</div>
                    </td>
                    <td>
                      <div className="console-row-primary">{item.type}</div>
                    </td>
                    <td>
                      <StatusBadge tone={statusTone(item.status)}>{statusLabel[item.status] || item.status}</StatusBadge>
                    </td>
                    <td>{formatDateTime(item.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className={`btn ${selectedId === item.id ? 'primary' : 'secondary'} btn-sm`}
                      >
                        {selectedId === item.id ? '查看中' : '查看'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ConsolePanel>

      <ConsolePanel title="详情操作区" className="console-detail stack-12">
        {!selectedItem ? (
          <ConsoleEmpty text="请选择一条通知记录查看详情" />
        ) : (
          <>
            <div className="console-detail-grid">
              <div className="spec-item">
                <p className="label">通知 ID</p>
                <p className="value">{selectedItem.id}</p>
              </div>
              <div className="spec-item">
                <p className="label">目标用户</p>
                <p className="value">{selectedItem.user?.email || selectedItem.userId || '广播记录'}</p>
              </div>
              <div className="spec-item">
                <p className="label">通知类型</p>
                <p className="value">{selectedItem.type}</p>
              </div>
              <div className="spec-item">
                <p className="label">状态</p>
                <p className="value">{statusLabel[selectedItem.status] || selectedItem.status}</p>
              </div>
            </div>

            <div className="console-alert">通知建议：涉及订单、支付、风控处理时，尽量明确下一步操作入口与处理时限。</div>

            <div className="form">
              <label>通知内容</label>
              <textarea value={selectedItem.payload?.content || ''} rows={6} disabled />
            </div>
          </>
        )}
      </ConsolePanel>
    </main>
  );
}
