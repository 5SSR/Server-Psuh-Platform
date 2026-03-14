"use client";

import { useCallback, useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type UserItem = {
  id: string;
  email: string;
  role: 'BUYER' | 'SELLER' | 'ADMIN';
  status: 'ACTIVE' | 'BANNED';
  emailVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  lastLoginIp?: string | null;
  createdAt: string;
  kyc?: {
    status: string;
    updatedAt: string;
  } | null;
  sellerApplication?: {
    status: string;
    updatedAt: string;
  } | null;
  wallet?: {
    balance: number | string;
    frozen: number | string;
    updatedAt: string;
  } | null;
};

const roleLabel: Record<string, string> = {
  BUYER: '买家',
  SELLER: '卖家',
  ADMIN: '管理员'
};

const statusLabel: Record<string, string> = {
  ACTIVE: '正常',
  BANNED: '已封禁'
};

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [list, setList] = useState<UserItem[]>([]);
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [reasons, setReasons] = useState<Record<string, string>>({});

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
      const params = new URLSearchParams({ page: '1', pageSize: '30' });
      if (role) params.set('role', role);
      if (status) params.set('status', status);
      if (keyword.trim()) params.set('keyword', keyword.trim());

      const res = await fetch(`${API_BASE}/admin/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取用户列表失败');
      setList(data.list || []);
    } catch (e: any) {
      setError(e.message || '读取失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, role, status, token]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (userId: string, nextStatus: 'ACTIVE' | 'BANNED') => {
    if (!token) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: nextStatus,
          reason: reasons[userId] || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '更新状态失败');
      setMessage(data.message || '状态已更新');
      await load();
    } catch (e: any) {
      setError(e.message || '更新状态失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <header className="section-head">
        <div>
          <p className="eyebrow">管理员中心</p>
          <h1>用户管理</h1>
        </div>
        <button onClick={load} className="secondary" disabled={loading}>
          {loading ? '刷新中...' : '刷新'}
        </button>
      </header>

      <div className="detail-grid">
        <div className="card">
          <label>角色筛选</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">全部</option>
            <option value="BUYER">BUYER</option>
            <option value="SELLER">SELLER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
        <div className="card">
          <label>状态筛选</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">全部</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="BANNED">BANNED</option>
          </select>
        </div>
        <div className="card">
          <label>关键词（邮箱/ID）</label>
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="输入邮箱或用户ID" />
        </div>
      </div>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      {list.length === 0 ? (
        <p className="muted">暂无用户记录</p>
      ) : (
        <div className="cards">
          {list.map((item) => (
            <article className="card" key={item.id}>
              <div className="card-header">
                <div>
                  <h3>{item.email}</h3>
                  <p className="muted">ID：{item.id}</p>
                </div>
                <span className="pill">{statusLabel[item.status] || item.status}</span>
              </div>
              <p className="muted">角色：{roleLabel[item.role] || item.role}</p>
              <p className="muted">邮箱验证：{item.emailVerifiedAt ? '已验证' : '未验证'}</p>
              <p className="muted">KYC：{item.kyc?.status || '未提交'}</p>
              <p className="muted">卖家认证：{item.sellerApplication?.status || '未申请'}</p>
              <p className="muted">
                钱包余额：¥{Number(item.wallet?.balance || 0).toFixed(2)} · 冻结：¥
                {Number(item.wallet?.frozen || 0).toFixed(2)}
              </p>
              <p className="muted">
                最近登录：{item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleString('zh-CN') : '暂无'}
                {item.lastLoginIp ? ` / ${item.lastLoginIp}` : ''}
              </p>
              <p className="muted">注册时间：{new Date(item.createdAt).toLocaleString('zh-CN')}</p>

              <div className="form">
                <label>操作备注（可选）</label>
                <input
                  value={reasons[item.id] || ''}
                  onChange={(e) =>
                    setReasons((prev) => ({
                      ...prev,
                      [item.id]: e.target.value
                    }))
                  }
                  placeholder="封禁/恢复原因"
                />
              </div>

              <div className="actions">
                {item.status === 'ACTIVE' ? (
                  <button
                    onClick={() => updateStatus(item.id, 'BANNED')}
                    disabled={loading || item.role === 'ADMIN'}
                    className="secondary"
                  >
                    封禁账号
                  </button>
                ) : (
                  <button onClick={() => updateStatus(item.id, 'ACTIVE')} disabled={loading}>
                    恢复账号
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
