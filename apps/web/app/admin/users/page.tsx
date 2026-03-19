"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ConsoleEmpty,
  ConsolePageHeader,
  ConsolePanel,
  StatusBadge,
  formatDateTime,
  formatMoney
} from '../../../components/admin/console-primitives';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type UserItem = {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
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
  USER: '普通用户',
  ADMIN: '管理员'
};

const statusLabel: Record<string, string> = {
  ACTIVE: '正常',
  BANNED: '已封禁'
};

function statusTone(status: string) {
  if (status === 'ACTIVE') return 'success' as const;
  return 'danger' as const;
}

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [list, setList] = useState<UserItem[]>([]);
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [localKeyword, setLocalKeyword] = useState('');
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState('');

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

  const filteredList = useMemo(() => {
    const key = localKeyword.trim().toLowerCase();
    if (!key) return list;
    return list.filter((item) => {
      return (
        item.email.toLowerCase().includes(key) ||
        item.id.toLowerCase().includes(key) ||
        (item.lastLoginIp || '').toLowerCase().includes(key)
      );
    });
  }, [list, localKeyword]);

  useEffect(() => {
    if (!filteredList.length) {
      setSelectedId('');
      return;
    }
    if (!selectedId || !filteredList.find((item) => item.id === selectedId)) {
      setSelectedId(filteredList[0].id);
    }
  }, [filteredList, selectedId]);

  const selectedUser = filteredList.find((item) => item.id === selectedId) || null;

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
    <main className="page page-shell admin-console-page">
      <ConsolePageHeader
        eyebrow="管理后台 · 用户管理"
        title="用户与信誉状态管理"
        description="查看用户认证、交易资质、钱包余额与登录行为，执行封禁/恢复并记录操作原因。"
        tags={[
          { label: '用户信誉', tone: 'info' },
          { label: '风控管控', tone: 'warning' },
          { label: `用户 ${list.length} 条`, tone: 'default' }
        ]}
        actions={
          <button onClick={load} className="btn secondary" disabled={loading}>
            {loading ? '刷新中...' : '刷新列表'}
          </button>
        }
      />

      <ConsolePanel title="筛选区" className="stack-12">
        <div className="console-filter-grid">
          <div className="field">
            <label>角色筛选</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">全部</option>
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </div>
          <div className="field">
            <label>状态筛选</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">全部</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="BANNED">BANNED</option>
            </select>
          </div>
          <div className="field">
            <label>接口关键词（邮箱/ID）</label>
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="触发后端筛选" />
          </div>
          <div className="field">
            <label>本地关键词</label>
            <input value={localKeyword} onChange={(e) => setLocalKeyword(e.target.value)} placeholder="当前页内快速过滤" />
          </div>
        </div>
      </ConsolePanel>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <ConsolePanel title="表格区 · 用户列表" className="stack-12">
        {filteredList.length === 0 ? (
          <ConsoleEmpty text={loading ? '加载中...' : '暂无用户记录'} />
        ) : (
          <div className="console-table-wrap">
            <table className="console-table">
              <thead>
                <tr>
                  <th>账号 / ID</th>
                  <th>角色 / 状态</th>
                  <th>认证与资质</th>
                  <th>钱包</th>
                  <th>最近登录</th>
                  <th>注册时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="console-row-primary">{item.email}</div>
                      <p className="console-row-sub">{item.id}</p>
                    </td>
                    <td>
                      <div className="console-inline-tags">
                        <StatusBadge tone={item.role === 'ADMIN' ? 'warning' : 'info'}>{roleLabel[item.role] || item.role}</StatusBadge>
                        <StatusBadge tone={statusTone(item.status)}>{statusLabel[item.status] || item.status}</StatusBadge>
                      </div>
                    </td>
                    <td>
                      <div className="console-row-primary">KYC：{item.kyc?.status || '未提交'}</div>
                      <p className="console-row-sub">交易资质：{item.sellerApplication?.status || '未申请'}</p>
                      <p className="console-row-sub">邮箱验证：{item.emailVerifiedAt ? '已验证' : '未验证'}</p>
                    </td>
                    <td>
                      <div className="console-row-primary">余额：{formatMoney(item.wallet?.balance || 0)}</div>
                      <p className="console-row-sub">冻结：{formatMoney(item.wallet?.frozen || 0)}</p>
                    </td>
                    <td>
                      <div className="console-row-primary">{item.lastLoginAt ? formatDateTime(item.lastLoginAt) : '暂无'}</div>
                      <p className="console-row-sub">IP：{item.lastLoginIp || '-'}</p>
                    </td>
                    <td>{formatDateTime(item.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className={`btn ${selectedId === item.id ? 'primary' : 'secondary'} btn-sm`}
                      >
                        {selectedId === item.id ? '处理中' : '处理'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ConsolePanel>

      <ConsolePanel
        title="详情操作区"
        description="封禁/恢复时建议填写原因，形成可追溯审计记录。"
        className="console-detail stack-12"
      >
        {!selectedUser ? (
          <ConsoleEmpty text="请选择一条用户记录进行处理" />
        ) : (
          <>
            <div className="console-detail-grid">
              <div className="spec-item">
                <p className="label">账号</p>
                <p className="value">{selectedUser.email}</p>
              </div>
              <div className="spec-item">
                <p className="label">用户 ID</p>
                <p className="value">{selectedUser.id}</p>
              </div>
              <div className="spec-item">
                <p className="label">当前状态</p>
                <p className="value">{statusLabel[selectedUser.status] || selectedUser.status}</p>
              </div>
              <div className="spec-item">
                <p className="label">角色</p>
                <p className="value">{roleLabel[selectedUser.role] || selectedUser.role}</p>
              </div>
            </div>

            <div className="console-alert">
              风控建议：优先核对登录异常、纠纷记录、提现行为后再执行封禁操作，避免误伤正常交易用户。
            </div>

            <div className="form">
              <label>操作备注（可选）</label>
              <textarea
                value={reasons[selectedUser.id] || ''}
                onChange={(e) =>
                  setReasons((prev) => ({
                    ...prev,
                    [selectedUser.id]: e.target.value
                  }))
                }
                rows={4}
                placeholder="例如：异常登录触发高风险规则，临时封禁待复核"
              />
            </div>

            <div className="actions">
              {selectedUser.status === 'ACTIVE' ? (
                <button
                  onClick={() => updateStatus(selectedUser.id, 'BANNED')}
                  disabled={loading || selectedUser.role === 'ADMIN'}
                  className="btn secondary"
                >
                  封禁账号
                </button>
              ) : (
                <button onClick={() => updateStatus(selectedUser.id, 'ACTIVE')} disabled={loading} className="btn primary">
                  恢复账号
                </button>
              )}
            </div>
          </>
        )}
      </ConsolePanel>
    </main>
  );
}
