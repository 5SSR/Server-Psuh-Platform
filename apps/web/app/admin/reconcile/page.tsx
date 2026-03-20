"use client";

import { useCallback, useEffect, useState } from 'react';
import {
  PAY_CHANNEL_LABEL,
  RECONCILE_DIFF_TYPE_LABEL,
  RECONCILE_ITEM_STATUS_LABEL,
  RECONCILE_TASK_STATUS_LABEL,
  labelByMap
} from '../../../lib/admin-enums';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type Task = {
  id: string;
  channel: string;
  bizDate: string;
  status: string;
  summary?: { diffCount?: number; localCount?: number; remoteCount?: number };
  createdAt: string;
};

type Item = {
  id: string;
  orderId?: string;
  tradeNo?: string;
  diffType: string;
  status: 'OPEN' | 'RESOLVED' | 'IGNORED';
  localAmount?: number | string | null;
  remoteAmount?: number | string | null;
  note?: string | null;
};

export default function AdminReconcilePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskId, setTaskId] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [channel, setChannel] = useState('ALIPAY');
  const [bizDate, setBizDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null;

  const loadTasks = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${API_BASE}/admin/payments/reconcile/tasks?page=1&pageSize=20`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      setTasks(data.list || []);
      if (!taskId && data.list?.[0]?.id) setTaskId(data.list[0].id);
    }
  }, [token, taskId]);

  const loadItems = useCallback(async () => {
    if (!token || !taskId) return;
    const res = await fetch(`${API_BASE}/admin/payments/reconcile/tasks/${taskId}/items?page=1&pageSize=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) setItems(data.list || []);
  }, [token, taskId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const run = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/payments/reconcile/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ channel, bizDate: bizDate || undefined })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '执行对账失败');
      setMessage(`对账完成，差异 ${data.diffCount}`);
      await loadTasks();
      if (data.taskId) setTaskId(data.taskId);
      await loadItems();
    } catch (e: any) {
      setError(e.message || '执行失败');
    } finally {
      setLoading(false);
    }
  };

  const resolve = async (id: string, status: 'RESOLVED' | 'IGNORED') => {
    if (!token) return;
    const res = await fetch(`${API_BASE}/admin/payments/reconcile/items/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || '更新失败');
      return;
    }
    setMessage('差异状态已更新');
    await loadItems();
  };

  return (
    <main className="page">
      <header className="section-head">
        <div>
          <p className="eyebrow">管理员中心</p>
          <h1>支付对账</h1>
        </div>
      </header>

      <div className="detail-grid">
        <div className="card">
          <label>渠道</label>
          <select value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="ALIPAY">支付宝</option>
            <option value="WECHAT">微信支付</option>
            <option value="USDT">USDT</option>
          </select>
        </div>
        <div className="card">
          <label>业务日期（可选）</label>
          <input type="date" value={bizDate} onChange={(e) => setBizDate(e.target.value)} />
        </div>
        <div className="card" style={{ justifyContent: 'flex-end', display: 'flex' }}>
          <button onClick={run} disabled={loading}>{loading ? '执行中...' : '执行对账'}</button>
        </div>
      </div>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <section className="card">
        <h3>对账任务</h3>
        <div className="cards">
          {tasks.map((task) => (
            <article key={task.id} className="card" onClick={() => setTaskId(task.id)}>
              <p>
                <strong>{labelByMap(task.channel, PAY_CHANNEL_LABEL, task.channel)}</strong> /{' '}
                {labelByMap(task.status, RECONCILE_TASK_STATUS_LABEL, task.status)}
              </p>
              <p className="muted">日期：{new Date(task.bizDate).toLocaleDateString('zh-CN')}</p>
              <p className="muted">差异：{task.summary?.diffCount ?? 0}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card" style={{ marginTop: '1rem' }}>
        <h3>差异项</h3>
        {items.length === 0 ? <p className="muted">暂无差异项</p> : (
          <div className="cards">
            {items.map((item) => (
              <article key={item.id} className="card">
                <p>
                  <strong>{labelByMap(item.diffType, RECONCILE_DIFF_TYPE_LABEL, item.diffType)}</strong> /{' '}
                  {labelByMap(item.status, RECONCILE_ITEM_STATUS_LABEL, item.status)}
                </p>
                <p className="muted">订单：{item.orderId || '-'}</p>
                <p className="muted">交易号：{item.tradeNo || '-'}</p>
                <p className="muted">本地金额：{item.localAmount == null ? '-' : Number(item.localAmount).toFixed(2)}</p>
                <p className="muted">渠道金额：{item.remoteAmount == null ? '-' : Number(item.remoteAmount).toFixed(2)}</p>
                <p className="muted">备注：{item.note || '-'}</p>
                {item.status === 'OPEN' && (
                  <div className="actions">
                    <button onClick={() => resolve(item.id, 'RESOLVED')}>标记已处理</button>
                    <button className="secondary" onClick={() => resolve(item.id, 'IGNORED')}>忽略</button>
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
