"use client";

import { useCallback, useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type Withdrawal = {
  id: string;
  amount: number | string;
  fee: number | string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  channel: string;
  accountInfo: string;
  createdAt: string;
  wallet: {
    user: {
      id: string;
      email: string;
      role: string;
    };
  };
};

const statusLabel: Record<string, string> = {
  pending: '待审核',
  approved: '待打款',
  paid: '已打款',
  rejected: '已驳回'
};

const roleLabel: Record<string, string> = {
  USER: '普通用户',
  ADMIN: '管理员'
};

export default function AdminWithdrawalsPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('pending');
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [remarks, setRemarks] = useState<Record<string, string>>({});

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
        `${API_BASE}/admin/withdrawals?page=1&pageSize=30${status ? `&status=${status}` : ''}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取提现列表失败');
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

  const decide = async (id: string, action: 'APPROVED' | 'REJECTED' | 'PAID') => {
    if (!token) return;
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/withdrawals/${id}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          remark: remarks[id] || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '处理失败');
      setMessage(data.message || '处理成功');
      await load();
    } catch (e: any) {
      setError(e.message || '处理失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <header className="section-head">
        <div>
          <p className="eyebrow">管理员中心</p>
          <h1>提现审核</h1>
        </div>
        <button onClick={load} className="secondary" disabled={loading}>
          {loading ? '刷新中...' : '刷新'}
        </button>
      </header>

      <div className="actions">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="pending">待审核</option>
          <option value="approved">待打款</option>
          <option value="paid">已打款</option>
          <option value="rejected">已驳回</option>
        </select>
      </div>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      {items.length === 0 ? (
        <p className="muted">暂无记录</p>
      ) : (
        <div className="cards">
          {items.map((item) => (
            <article className="card" key={item.id}>
              <div className="card-header">
                <div>
                  <h3>{item.wallet?.user?.email || '未知用户'}</h3>
                  <p className="muted">{roleLabel[item.wallet?.user?.role] || item.wallet?.user?.role || '-'}</p>
                </div>
                <span className="pill">{statusLabel[item.status] || item.status}</span>
              </div>
              <p className="muted">提现金额：¥{Number(item.amount).toFixed(2)}</p>
              <p className="muted">手续费：¥{Number(item.fee).toFixed(2)}</p>
              <p className="muted">渠道：{item.channel}</p>
              <p className="muted">账号：{item.accountInfo}</p>
              <p className="muted">申请时间：{new Date(item.createdAt).toLocaleString('zh-CN')}</p>
              <div className="form">
                <label>处理备注（可选）</label>
                <input
                  value={remarks[item.id] || ''}
                  onChange={(e) =>
                    setRemarks((prev) => ({
                      ...prev,
                      [item.id]: e.target.value
                    }))
                  }
                  placeholder="填写处理备注"
                />
              </div>
              <div className="actions">
                {item.status === 'pending' && (
                  <>
                    <button onClick={() => decide(item.id, 'APPROVED')} disabled={loading}>
                      通过
                    </button>
                    <button
                      onClick={() => decide(item.id, 'REJECTED')}
                      disabled={loading}
                      className="secondary"
                    >
                      驳回
                    </button>
                  </>
                )}
                {item.status === 'approved' && (
                  <>
                    <button onClick={() => decide(item.id, 'PAID')} disabled={loading}>
                      标记打款完成
                    </button>
                    <button
                      onClick={() => decide(item.id, 'REJECTED')}
                      disabled={loading}
                      className="secondary"
                    >
                      驳回并退回
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
