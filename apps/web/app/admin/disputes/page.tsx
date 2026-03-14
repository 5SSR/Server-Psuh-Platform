"use client";

import { useCallback, useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type DisputeEvidence = {
  id: string;
  userId: string;
  url: string;
  note?: string | null;
  createdAt: string;
};

type DisputeRecord = {
  id: string;
  orderId: string;
  initiator: string;
  status: 'OPEN' | 'PROCESSING' | 'RESOLVED' | 'REJECTED';
  result?: string | null;
  resolution?: string | null;
  evidences?: DisputeEvidence[];
  createdAt: string;
  updatedAt: string;
};

const statusLabel: Record<string, string> = {
  OPEN: '待处理',
  PROCESSING: '处理中',
  RESOLVED: '已解决',
  REJECTED: '已驳回'
};

type DecisionForm = {
  action: 'REFUND' | 'RELEASE';
  status: 'RESOLVED' | 'REJECTED';
  result: string;
  resolution: string;
};

export default function AdminDisputesPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('OPEN');
  const [items, setItems] = useState<DisputeRecord[]>([]);
  const [forms, setForms] = useState<Record<string, DecisionForm>>({});

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
      const res = await fetch(
        `${API_BASE}/admin/disputes?page=1&pageSize=30${status ? `&status=${status}` : ''}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取纠纷列表失败');
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

  const getForm = (orderId: string): DecisionForm => {
    return (
      forms[orderId] || {
        action: 'REFUND',
        status: 'RESOLVED',
        result: '',
        resolution: ''
      }
    );
  };

  const updateForm = (orderId: string, patch: Partial<DecisionForm>) => {
    setForms((prev) => ({
      ...prev,
      [orderId]: {
        ...getForm(orderId),
        ...patch
      }
    }));
  };

  const decide = async (orderId: string) => {
    if (!token) return;
    const form = getForm(orderId);
    if (!form.result.trim()) {
      setError('请填写裁决结论');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/disputes/${orderId}/decision`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: form.status,
          action: form.action,
          result: form.result.trim(),
          resolution: form.resolution.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '裁决失败');
      setMessage('纠纷裁决已处理');
      await load();
    } catch (e: any) {
      setError(e.message || '裁决失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <header className="section-head">
        <div>
          <p className="eyebrow">管理员中心</p>
          <h1>纠纷仲裁</h1>
        </div>
        <button className="secondary" onClick={load} disabled={loading}>
          {loading ? '刷新中...' : '刷新'}
        </button>
      </header>

      <div className="actions">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="OPEN">待处理</option>
          <option value="PROCESSING">处理中</option>
          <option value="RESOLVED">已解决</option>
          <option value="REJECTED">已驳回</option>
          <option value="">全部</option>
        </select>
      </div>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      {items.length === 0 ? (
        <p className="muted">暂无纠纷记录</p>
      ) : (
        <div className="cards">
          {items.map((item) => {
            const form = getForm(item.orderId);
            const canDecide = item.status === 'OPEN' || item.status === 'PROCESSING';
            return (
              <article className="card" key={item.id}>
                <div className="card-header">
                  <div>
                    <h3>订单 {item.orderId}</h3>
                    <p className="muted">发起方：{item.initiator}</p>
                  </div>
                  <span className="pill">{statusLabel[item.status] || item.status}</span>
                </div>

                {item.result && <p className="muted">当前结论：{item.result}</p>}
                {item.resolution && <p className="muted">处理说明：{item.resolution}</p>}
                <p className="muted">创建时间：{new Date(item.createdAt).toLocaleString('zh-CN')}</p>

                <div className="card nested">
                  <h3>证据列表</h3>
                  {!item.evidences || item.evidences.length === 0 ? (
                    <p className="muted">暂无证据</p>
                  ) : (
                    <div className="cards">
                      {item.evidences.map((ev) => (
                        <article className="card nested" key={ev.id}>
                          <p className="muted">用户：{ev.userId}</p>
                          <p className="muted">链接：{ev.url}</p>
                          <p className="muted">备注：{ev.note || '无'}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                {canDecide && (
                  <div className="form">
                    <label>裁决状态</label>
                    <select
                      value={form.status}
                      onChange={(e) =>
                        updateForm(item.orderId, { status: e.target.value as 'RESOLVED' | 'REJECTED' })
                      }
                    >
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>

                    <label>执行动作</label>
                    <select
                      value={form.action}
                      onChange={(e) =>
                        updateForm(item.orderId, { action: e.target.value as 'REFUND' | 'RELEASE' })
                      }
                    >
                      <option value="REFUND">REFUND（退款买家）</option>
                      <option value="RELEASE">RELEASE（放款卖家）</option>
                    </select>

                    <label>裁决结论（必填）</label>
                    <input
                      value={form.result}
                      onChange={(e) => updateForm(item.orderId, { result: e.target.value })}
                      placeholder="例如：卖家交付信息不一致，支持退款"
                    />

                    <label>处理说明（可选）</label>
                    <input
                      value={form.resolution}
                      onChange={(e) => updateForm(item.orderId, { resolution: e.target.value })}
                    />

                    <button onClick={() => decide(item.orderId)} disabled={loading}>
                      提交裁决
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
