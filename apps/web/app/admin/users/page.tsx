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
import {
  KYC_STATUS_LABEL,
  SELLER_APPLICATION_STATUS_LABEL,
  USER_ROLE_LABEL,
  USER_STATUS_LABEL,
  labelByMap
} from '../../../lib/admin-enums';

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
  sellerProfile?: {
    level: number;
    tradeCount: number;
    disputeRate: number;
    refundRate?: number;
    avgDeliveryMinutes: number;
    positiveRate: number;
  } | null;
  wallet?: {
    balance: number | string;
    frozen: number | string;
    updatedAt: string;
  } | null;
  riskMarks?: string[];
  riskEntities?: Array<{
    id: string;
    listType: string;
    entityType: string;
    entityValue: string;
    reason?: string | null;
    expiresAt?: string | null;
    createdAt: string;
  }>;
};

type KycItem = {
  id: string;
  userId: string;
  realName: string;
  idNumber: string;
  docImages?: string | null;
  status: 'pending' | 'approved' | 'rejected' | string;
  reason?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    role: 'USER' | 'ADMIN';
    createdAt: string;
  } | null;
};

type SellerApplicationItem = {
  id: string;
  userId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  reason?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    role: 'USER' | 'ADMIN';
    kyc?: { status?: string } | null;
  } | null;
};

function userStatusTone(status: string) {
  return status === 'ACTIVE' ? ('success' as const) : ('danger' as const);
}

function kycStatusTone(status: string) {
  if (status === 'approved') return 'success' as const;
  if (status === 'rejected') return 'danger' as const;
  return 'warning' as const;
}

function sellerStatusTone(status: string) {
  if (status === 'APPROVED') return 'success' as const;
  if (status === 'REJECTED') return 'danger' as const;
  return 'warning' as const;
}

const riskMarkLabel: Record<string, string> = {
  BLACKLIST: '黑名单',
  WATCHLIST: '观察名单',
  WHITELIST: '白名单'
};

function riskMarkTone(mark: string) {
  if (mark === 'BLACKLIST') return 'danger' as const;
  if (mark === 'WATCHLIST') return 'warning' as const;
  return 'success' as const;
}

function maskIdNumber(value?: string | null) {
  if (!value) return '-';
  if (value.length <= 8) return value;
  return `${value.slice(0, 4)}********${value.slice(-4)}`;
}

export default function AdminUsersPage() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingKyc, setLoadingKyc] = useState(false);
  const [loadingSellerApplications, setLoadingSellerApplications] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [users, setUsers] = useState<UserItem[]>([]);
  const [kycList, setKycList] = useState<KycItem[]>([]);
  const [sellerApplications, setSellerApplications] = useState<SellerApplicationItem[]>([]);

  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [localKeyword, setLocalKeyword] = useState('');

  const [kycStatusFilter, setKycStatusFilter] = useState('pending');
  const [kycLocalKeyword, setKycLocalKeyword] = useState('');

  const [sellerStatusFilter, setSellerStatusFilter] = useState('PENDING');
  const [sellerLocalKeyword, setSellerLocalKeyword] = useState('');

  const [userReasons, setUserReasons] = useState<Record<string, string>>({});
  const [riskReasons, setRiskReasons] = useState<Record<string, string>>({});
  const [kycReasons, setKycReasons] = useState<Record<string, string>>({});
  const [sellerReasons, setSellerReasons] = useState<Record<string, string>>({});

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedKycUserId, setSelectedKycUserId] = useState('');
  const [selectedSellerUserId, setSelectedSellerUserId] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null;

  const loadUsers = useCallback(async () => {
    if (!token) {
      setError('请先登录管理员账号');
      return;
    }
    setLoadingUsers(true);
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
      setUsers(data.list || []);
    } catch (e: any) {
      setError(e.message || '读取用户列表失败');
    } finally {
      setLoadingUsers(false);
    }
  }, [keyword, role, status, token]);

  const loadKyc = useCallback(async () => {
    if (!token) return;
    setLoadingKyc(true);
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '50' });
      if (kycStatusFilter) params.set('status', kycStatusFilter);
      const res = await fetch(`${API_BASE}/admin/users/kyc?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取实名认证审核列表失败');
      setKycList(data.list || []);
    } catch (e: any) {
      setError(e.message || '读取实名认证审核列表失败');
    } finally {
      setLoadingKyc(false);
    }
  }, [kycStatusFilter, token]);

  const loadSellerApplications = useCallback(async () => {
    if (!token) return;
    setLoadingSellerApplications(true);
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '50' });
      if (sellerStatusFilter) params.set('status', sellerStatusFilter);
      const res = await fetch(`${API_BASE}/admin/users/seller-applications?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取交易资质审核列表失败');
      setSellerApplications(data.list || []);
    } catch (e: any) {
      setError(e.message || '读取交易资质审核列表失败');
    } finally {
      setLoadingSellerApplications(false);
    }
  }, [sellerStatusFilter, token]);

  const refreshAll = useCallback(async () => {
    setError('');
    setMessage('');
    await Promise.all([loadUsers(), loadKyc(), loadSellerApplications()]);
  }, [loadUsers, loadKyc, loadSellerApplications]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const filteredUsers = useMemo(() => {
    const key = localKeyword.trim().toLowerCase();
    if (!key) return users;
    return users.filter((item) => {
      return (
        item.email.toLowerCase().includes(key) ||
        item.id.toLowerCase().includes(key) ||
        (item.lastLoginIp || '').toLowerCase().includes(key)
      );
    });
  }, [users, localKeyword]);

  const filteredKyc = useMemo(() => {
    const key = kycLocalKeyword.trim().toLowerCase();
    if (!key) return kycList;
    return kycList.filter((item) => {
      return (
        (item.user?.email || '').toLowerCase().includes(key) ||
        item.userId.toLowerCase().includes(key) ||
        (item.realName || '').toLowerCase().includes(key)
      );
    });
  }, [kycList, kycLocalKeyword]);

  const filteredSellerApplications = useMemo(() => {
    const key = sellerLocalKeyword.trim().toLowerCase();
    if (!key) return sellerApplications;
    return sellerApplications.filter((item) => {
      return (
        (item.user?.email || '').toLowerCase().includes(key) ||
        item.userId.toLowerCase().includes(key)
      );
    });
  }, [sellerApplications, sellerLocalKeyword]);

  useEffect(() => {
    if (!filteredUsers.length) {
      setSelectedUserId('');
      return;
    }
    if (!selectedUserId || !filteredUsers.find((item) => item.id === selectedUserId)) {
      setSelectedUserId(filteredUsers[0].id);
    }
  }, [filteredUsers, selectedUserId]);

  useEffect(() => {
    if (!filteredKyc.length) {
      setSelectedKycUserId('');
      return;
    }
    if (!selectedKycUserId || !filteredKyc.find((item) => item.userId === selectedKycUserId)) {
      setSelectedKycUserId(filteredKyc[0].userId);
    }
  }, [filteredKyc, selectedKycUserId]);

  useEffect(() => {
    if (!filteredSellerApplications.length) {
      setSelectedSellerUserId('');
      return;
    }
    if (
      !selectedSellerUserId ||
      !filteredSellerApplications.find((item) => item.userId === selectedSellerUserId)
    ) {
      setSelectedSellerUserId(filteredSellerApplications[0].userId);
    }
  }, [filteredSellerApplications, selectedSellerUserId]);

  const selectedUser = filteredUsers.find((item) => item.id === selectedUserId) || null;
  const selectedKyc = filteredKyc.find((item) => item.userId === selectedKycUserId) || null;
  const selectedSellerApplication =
    filteredSellerApplications.find((item) => item.userId === selectedSellerUserId) || null;

  const pendingKycCount = kycList.filter((item) => item.status === 'pending').length;
  const pendingSellerApplicationCount = sellerApplications.filter(
    (item) => item.status === 'PENDING'
  ).length;

  const updateUserStatus = async (userId: string, nextStatus: 'ACTIVE' | 'BANNED') => {
    if (!token) return;
    setActionLoading(true);
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
          reason: userReasons[userId] || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '更新用户状态失败');
      setMessage(data.message || '用户状态已更新');
      await refreshAll();
    } catch (e: any) {
      setError(e.message || '更新用户状态失败');
    } finally {
      setActionLoading(false);
    }
  };

  const reviewKyc = async (userId: string, decision: 'approved' | 'rejected') => {
    if (!token) return;
    const reason = (kycReasons[userId] || '').trim();
    if (decision === 'rejected' && !reason) {
      setError('驳回实名认证必须填写原因');
      return;
    }
    setActionLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/kyc`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: decision,
          reason: reason || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '实名认证审核失败');
      setMessage(data.message || '实名认证审核完成');
      await refreshAll();
    } catch (e: any) {
      setError(e.message || '实名认证审核失败');
    } finally {
      setActionLoading(false);
    }
  };

  const reviewSellerApplication = async (
    userId: string,
    decision: 'APPROVED' | 'REJECTED'
  ) => {
    if (!token) return;
    const reason = (sellerReasons[userId] || '').trim();
    if (decision === 'REJECTED' && !reason) {
      setError('驳回交易资质申请必须填写原因');
      return;
    }
    setActionLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/seller-application`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: decision,
          reason: reason || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '交易资质审核失败');
      setMessage(data.message || '交易资质审核完成');
      await refreshAll();
    } catch (e: any) {
      setError(e.message || '交易资质审核失败');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleRiskMark = async (
    user: UserItem,
    listType: 'BLACKLIST' | 'WATCHLIST',
    enabled: boolean
  ) => {
    if (!token) return;
    setActionLoading(true);
    setError('');
    setMessage('');
    try {
      if (enabled) {
        const res = await fetch(`${API_BASE}/admin/risk/entities`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            listType,
            entityType: 'USER_ID',
            entityValue: user.id,
            enabled: true,
            reason: (riskReasons[user.id] || '').trim() || undefined
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || '风险名单更新失败');
      } else {
        const matched = (user.riskEntities || []).filter((item) => item.listType === listType);
        if (matched.length === 0) {
          setMessage(`当前用户不在${riskMarkLabel[listType]}中`);
          return;
        }
        for (const item of matched) {
          const res = await fetch(`${API_BASE}/admin/risk/entities/${item.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              enabled: false,
              reason: (riskReasons[user.id] || '').trim() || undefined
            })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || '风险名单更新失败');
        }
      }

      setMessage(
        enabled
          ? `已加入${riskMarkLabel[listType]}`
          : `已从${riskMarkLabel[listType]}移除`
      );
      await refreshAll();
    } catch (e: any) {
      setError(e.message || '风险名单更新失败');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <main className="page page-shell admin-console-page">
      <ConsolePageHeader
        eyebrow="管理后台 · 用户与认证审核"
        title="用户状态 / 实名认证 / 交易资质工作台"
        description="统一处理用户状态、实名认证审核和交易资质审核，形成可追溯的风控处置链路。"
        tags={[
          { label: `用户 ${users.length} 条`, tone: 'info' },
          { label: `待审实名认证 ${pendingKycCount}`, tone: 'warning' },
          { label: `待审交易资质 ${pendingSellerApplicationCount}`, tone: 'warning' }
        ]}
        actions={
          <button
            onClick={refreshAll}
            className="btn secondary"
            disabled={
              loadingUsers || loadingKyc || loadingSellerApplications || actionLoading
            }
          >
            刷新全部
          </button>
        }
      />

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <ConsolePanel title="用户状态筛选区" className="stack-12">
        <div className="console-filter-grid">
          <div className="field">
            <label>角色筛选</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">全部</option>
              <option value="USER">普通用户</option>
              <option value="ADMIN">管理员</option>
            </select>
          </div>
          <div className="field">
            <label>状态筛选</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">全部</option>
              <option value="ACTIVE">正常</option>
              <option value="BANNED">已封禁</option>
            </select>
          </div>
          <div className="field">
            <label>接口关键词（邮箱/ID）</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="触发后端筛选"
            />
          </div>
          <div className="field">
            <label>本地关键词</label>
            <input
              value={localKeyword}
              onChange={(e) => setLocalKeyword(e.target.value)}
              placeholder="当前页内快速过滤"
            />
          </div>
        </div>
      </ConsolePanel>

      <ConsolePanel title="表格区 · 用户列表" className="stack-12">
        {filteredUsers.length === 0 ? (
          <ConsoleEmpty text={loadingUsers ? '加载中...' : '暂无用户记录'} />
        ) : (
          <div className="console-table-wrap">
            <table className="console-table console-table-mobile">
              <thead>
                <tr>
                  <th>账号 / ID</th>
                  <th>角色 / 状态</th>
                  <th>风险标签</th>
                  <th>认证与资质</th>
                  <th>钱包</th>
                  <th>最近登录</th>
                  <th>注册时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((item) => (
                  <tr key={item.id}>
                    <td data-label="账号 / ID">
                      <div className="console-row-primary">{item.email}</div>
                      <p className="console-row-sub">{item.id}</p>
                    </td>
                    <td data-label="角色 / 状态">
                      <div className="console-inline-tags">
                        <StatusBadge tone={item.role === 'ADMIN' ? 'warning' : 'info'}>
                          {labelByMap(item.role, USER_ROLE_LABEL, item.role)}
                        </StatusBadge>
                        <StatusBadge tone={userStatusTone(item.status)}>
                          {labelByMap(item.status, USER_STATUS_LABEL, item.status)}
                        </StatusBadge>
                      </div>
                    </td>
                    <td data-label="风险标签">
                      <div className="console-inline-tags">
                        {(item.riskMarks || []).length === 0 ? (
                          <StatusBadge tone="success">正常</StatusBadge>
                        ) : (
                          (item.riskMarks || []).map((mark) => (
                            <StatusBadge key={`${item.id}-${mark}`} tone={riskMarkTone(mark)}>
                              {riskMarkLabel[mark] || mark}
                            </StatusBadge>
                          ))
                        )}
                      </div>
                    </td>
                    <td data-label="认证与资质">
                      <div className="console-row-primary">
                        KYC：{item.kyc?.status ? labelByMap(item.kyc.status, KYC_STATUS_LABEL, item.kyc.status) : '未提交'}
                      </div>
                      <p className="console-row-sub">
                        交易资质：
                        {item.sellerApplication?.status
                          ? labelByMap(item.sellerApplication.status, SELLER_APPLICATION_STATUS_LABEL, item.sellerApplication.status)
                          : '未申请'}
                      </p>
                      <p className="console-row-sub">
                        信用等级：Lv.{item.sellerProfile?.level ?? 1}
                      </p>
                      <p className="console-row-sub">
                        邮箱验证：{item.emailVerifiedAt ? '已验证' : '未验证'}
                      </p>
                    </td>
                    <td data-label="钱包">
                      <div className="console-row-primary">
                        余额：{formatMoney(item.wallet?.balance || 0)}
                      </div>
                      <p className="console-row-sub">
                        冻结：{formatMoney(item.wallet?.frozen || 0)}
                      </p>
                    </td>
                    <td data-label="最近登录">
                      <div className="console-row-primary">
                        {item.lastLoginAt ? formatDateTime(item.lastLoginAt) : '暂无'}
                      </div>
                      <p className="console-row-sub">IP：{item.lastLoginIp || '-'}</p>
                    </td>
                    <td data-label="注册时间">{formatDateTime(item.createdAt)}</td>
                    <td data-label="操作">
                      <button
                        type="button"
                        onClick={() => setSelectedUserId(item.id)}
                        className={`btn ${selectedUserId === item.id ? 'primary' : 'secondary'} btn-sm`}
                      >
                        {selectedUserId === item.id ? '已选中' : '选择'}
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
        title="详情操作区 · 用户状态处置"
        description="封禁/恢复前建议核对登录异常、纠纷记录和资金行为。"
        className="console-detail stack-12"
      >
        {!selectedUser ? (
          <ConsoleEmpty text="请选择一条用户记录进行处置" />
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
                <p className="value">
                  {labelByMap(selectedUser.status, USER_STATUS_LABEL, selectedUser.status)}
                </p>
              </div>
              <div className="spec-item">
                <p className="label">角色</p>
                <p className="value">
                  {labelByMap(selectedUser.role, USER_ROLE_LABEL, selectedUser.role)}
                </p>
              </div>
              <div className="spec-item">
                <p className="label">风险标记</p>
                <p className="value">
                  {(selectedUser.riskMarks || []).length
                    ? (selectedUser.riskMarks || [])
                        .map((mark) => riskMarkLabel[mark] || mark)
                        .join(' / ')
                    : '正常'}
                </p>
              </div>
              <div className="spec-item">
                <p className="label">卖家信誉</p>
                <p className="value">Lv.{selectedUser.sellerProfile?.level ?? 1}</p>
              </div>
              <div className="spec-item">
                <p className="label">成交与纠纷率</p>
                <p className="value">
                  {selectedUser.sellerProfile
                    ? `${selectedUser.sellerProfile.tradeCount} 单 / ${(selectedUser.sellerProfile.disputeRate * 100).toFixed(2)}%`
                    : '暂无'}
                </p>
              </div>
              <div className="spec-item">
                <p className="label">退款率与好评率</p>
                <p className="value">
                  {selectedUser.sellerProfile
                    ? `${((selectedUser.sellerProfile.refundRate || 0) * 100).toFixed(2)}% / ${(selectedUser.sellerProfile.positiveRate * 100).toFixed(2)}%`
                    : '暂无'}
                </p>
              </div>
              <div className="spec-item">
                <p className="label">交付时效</p>
                <p className="value">
                  {selectedUser.sellerProfile
                    ? `${selectedUser.sellerProfile.avgDeliveryMinutes} 分钟`
                    : '暂无'}
                </p>
              </div>
            </div>

            <div className="form">
              <label>操作备注（可选）</label>
              <textarea
                rows={4}
                value={userReasons[selectedUser.id] || ''}
                onChange={(e) =>
                  setUserReasons((prev) => ({
                    ...prev,
                    [selectedUser.id]: e.target.value
                  }))
                }
                placeholder="例如：触发高风险行为，临时封禁待复核"
              />
            </div>

            <div className="actions">
              {selectedUser.status === 'ACTIVE' ? (
                <button
                  onClick={() => updateUserStatus(selectedUser.id, 'BANNED')}
                  disabled={actionLoading || selectedUser.role === 'ADMIN'}
                  className="btn secondary"
                >
                  封禁账号
                </button>
              ) : (
                <button
                  onClick={() => updateUserStatus(selectedUser.id, 'ACTIVE')}
                  disabled={actionLoading}
                  className="btn primary"
                >
                  恢复账号
                </button>
              )}
            </div>

            <div className="form">
              <label>风控备注（加入/解除名单时可填写）</label>
              <textarea
                rows={3}
                value={riskReasons[selectedUser.id] || ''}
                onChange={(e) =>
                  setRiskReasons((prev) => ({
                    ...prev,
                    [selectedUser.id]: e.target.value
                  }))
                }
                placeholder="例如：命中高风险规则，加入观察名单 72 小时"
              />
            </div>

            <div className="actions">
              <button
                onClick={() => toggleRiskMark(selectedUser, 'BLACKLIST', true)}
                disabled={
                  actionLoading || (selectedUser.riskMarks || []).includes('BLACKLIST')
                }
                className="btn secondary"
              >
                加入黑名单
              </button>
              <button
                onClick={() => toggleRiskMark(selectedUser, 'BLACKLIST', false)}
                disabled={
                  actionLoading || !(selectedUser.riskMarks || []).includes('BLACKLIST')
                }
                className="btn secondary"
              >
                解除黑名单
              </button>
              <button
                onClick={() => toggleRiskMark(selectedUser, 'WATCHLIST', true)}
                disabled={
                  actionLoading || (selectedUser.riskMarks || []).includes('WATCHLIST')
                }
                className="btn secondary"
              >
                加入观察名单
              </button>
              <button
                onClick={() => toggleRiskMark(selectedUser, 'WATCHLIST', false)}
                disabled={
                  actionLoading || !(selectedUser.riskMarks || []).includes('WATCHLIST')
                }
                className="btn secondary"
              >
                解除观察名单
              </button>
            </div>
          </>
        )}
      </ConsolePanel>

      <ConsolePanel
        title="实名认证审核筛选区"
        description="支持按实名认证状态筛选并执行通过/驳回。"
        className="stack-12"
      >
        <div className="console-filter-grid">
          <div className="field">
            <label>认证状态</label>
            <select
              value={kycStatusFilter}
              onChange={(e) => setKycStatusFilter(e.target.value)}
            >
              <option value="">全部</option>
              <option value="pending">待审核</option>
              <option value="approved">已通过</option>
              <option value="rejected">已驳回</option>
            </select>
          </div>
          <div className="field">
            <label>本地关键词（邮箱/姓名）</label>
            <input
              value={kycLocalKeyword}
              onChange={(e) => setKycLocalKeyword(e.target.value)}
              placeholder="当前实名认证列表内过滤"
            />
          </div>
        </div>
      </ConsolePanel>

      <ConsolePanel title="表格区 · 实名认证审核列表" className="stack-12">
        {filteredKyc.length === 0 ? (
          <ConsoleEmpty text={loadingKyc ? '加载中...' : '暂无实名认证审核记录'} />
        ) : (
          <div className="console-table-wrap">
            <table className="console-table console-table-mobile">
              <thead>
                <tr>
                  <th>用户</th>
                  <th>实名信息</th>
                  <th>状态</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredKyc.map((item) => (
                  <tr key={item.id}>
                    <td data-label="用户">
                      <div className="console-row-primary">{item.user?.email || '-'}</div>
                      <p className="console-row-sub">{item.userId}</p>
                    </td>
                    <td data-label="实名信息">
                      <div className="console-row-primary">{item.realName || '-'}</div>
                      <p className="console-row-sub">证件号：{maskIdNumber(item.idNumber)}</p>
                    </td>
                    <td data-label="状态">
                      <StatusBadge tone={kycStatusTone(item.status)}>
                        {labelByMap(item.status, KYC_STATUS_LABEL, item.status)}
                      </StatusBadge>
                    </td>
                    <td data-label="更新时间">{formatDateTime(item.updatedAt)}</td>
                    <td data-label="操作">
                      <button
                        type="button"
                        onClick={() => setSelectedKycUserId(item.userId)}
                        className={`btn ${selectedKycUserId === item.userId ? 'primary' : 'secondary'} btn-sm`}
                      >
                        {selectedKycUserId === item.userId ? '已选中' : '选择'}
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
        title="详情操作区 · 实名认证审核"
        className="console-detail stack-12"
      >
        {!selectedKyc ? (
          <ConsoleEmpty text="请选择一条实名认证记录进行审核" />
        ) : (
          <>
            <div className="console-detail-grid">
              <div className="spec-item">
                <p className="label">用户</p>
                <p className="value">{selectedKyc.user?.email || selectedKyc.userId}</p>
              </div>
              <div className="spec-item">
                <p className="label">真实姓名</p>
                <p className="value">{selectedKyc.realName || '-'}</p>
              </div>
              <div className="spec-item">
                <p className="label">证件号</p>
                <p className="value">{maskIdNumber(selectedKyc.idNumber)}</p>
              </div>
              <div className="spec-item">
                <p className="label">当前状态</p>
                <p className="value">
                  {labelByMap(selectedKyc.status, KYC_STATUS_LABEL, selectedKyc.status)}
                </p>
              </div>
            </div>

            {selectedKyc.reason ? (
              <div className="console-alert">历史备注：{selectedKyc.reason}</div>
            ) : null}

            <div className="form">
              <label>审核备注（驳回时必填）</label>
              <textarea
                rows={4}
                value={kycReasons[selectedKyc.userId] || ''}
                onChange={(e) =>
                  setKycReasons((prev) => ({
                    ...prev,
                    [selectedKyc.userId]: e.target.value
                  }))
                }
                placeholder="例如：证件图片模糊、信息不一致"
              />
            </div>

            <div className="actions">
              <button
                onClick={() => reviewKyc(selectedKyc.userId, 'approved')}
                disabled={actionLoading}
                className="btn primary"
              >
                通过实名认证
              </button>
              <button
                onClick={() => reviewKyc(selectedKyc.userId, 'rejected')}
                disabled={actionLoading}
                className="btn secondary"
              >
                驳回实名认证
              </button>
            </div>
          </>
        )}
      </ConsolePanel>

      <ConsolePanel
        title="交易资质审核筛选区"
        description="处理用户交易资质（卖家认证）申请。"
        className="stack-12"
      >
        <div className="console-filter-grid">
          <div className="field">
            <label>申请状态</label>
            <select
              value={sellerStatusFilter}
              onChange={(e) => setSellerStatusFilter(e.target.value)}
            >
              <option value="">全部</option>
              <option value="PENDING">待审核</option>
              <option value="APPROVED">已通过</option>
              <option value="REJECTED">已驳回</option>
            </select>
          </div>
          <div className="field">
            <label>本地关键词（邮箱/用户ID）</label>
            <input
              value={sellerLocalKeyword}
              onChange={(e) => setSellerLocalKeyword(e.target.value)}
              placeholder="当前交易资质列表内过滤"
            />
          </div>
        </div>
      </ConsolePanel>

      <ConsolePanel title="表格区 · 交易资质审核列表" className="stack-12">
        {filteredSellerApplications.length === 0 ? (
          <ConsoleEmpty
            text={loadingSellerApplications ? '加载中...' : '暂无交易资质申请记录'}
          />
        ) : (
          <div className="console-table-wrap">
            <table className="console-table console-table-mobile">
              <thead>
                <tr>
                  <th>用户</th>
                  <th>认证前置条件</th>
                  <th>申请状态</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredSellerApplications.map((item) => (
                  <tr key={item.id}>
                    <td data-label="用户">
                      <div className="console-row-primary">{item.user?.email || '-'}</div>
                      <p className="console-row-sub">{item.userId}</p>
                    </td>
                    <td data-label="认证前置条件">
                      <div className="console-row-primary">
                        实名状态：{item.user?.kyc?.status ? labelByMap(item.user.kyc.status, KYC_STATUS_LABEL, item.user.kyc.status) : '未提交'}
                      </div>
                      <p className="console-row-sub">
                        账号角色：{labelByMap(item.user?.role || 'USER', USER_ROLE_LABEL, item.user?.role || '-')}
                      </p>
                    </td>
                    <td data-label="申请状态">
                      <StatusBadge tone={sellerStatusTone(item.status)}>
                        {labelByMap(item.status, SELLER_APPLICATION_STATUS_LABEL, item.status)}
                      </StatusBadge>
                    </td>
                    <td data-label="更新时间">{formatDateTime(item.updatedAt)}</td>
                    <td data-label="操作">
                      <button
                        type="button"
                        onClick={() => setSelectedSellerUserId(item.userId)}
                        className={`btn ${selectedSellerUserId === item.userId ? 'primary' : 'secondary'} btn-sm`}
                      >
                        {selectedSellerUserId === item.userId ? '已选中' : '选择'}
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
        title="详情操作区 · 交易资质审核"
        className="console-detail stack-12"
      >
        {!selectedSellerApplication ? (
          <ConsoleEmpty text="请选择一条交易资质申请进行审核" />
        ) : (
          <>
            <div className="console-detail-grid">
              <div className="spec-item">
                <p className="label">用户</p>
                <p className="value">
                  {selectedSellerApplication.user?.email || selectedSellerApplication.userId}
                </p>
              </div>
              <div className="spec-item">
                <p className="label">当前状态</p>
                <p className="value">
                  {labelByMap(
                    selectedSellerApplication.status,
                    SELLER_APPLICATION_STATUS_LABEL,
                    selectedSellerApplication.status
                  )}
                </p>
              </div>
              <div className="spec-item">
                <p className="label">实名状态</p>
                <p className="value">
                  {selectedSellerApplication.user?.kyc?.status
                    ? labelByMap(selectedSellerApplication.user.kyc.status, KYC_STATUS_LABEL, selectedSellerApplication.user.kyc.status)
                    : '未提交'}
                </p>
              </div>
              <div className="spec-item">
                <p className="label">申请时间</p>
                <p className="value">
                  {formatDateTime(selectedSellerApplication.createdAt)}
                </p>
              </div>
            </div>

            {selectedSellerApplication.reason ? (
              <div className="console-alert">
                历史备注：{selectedSellerApplication.reason}
              </div>
            ) : null}

            <div className="form">
              <label>审核备注（驳回时必填）</label>
              <textarea
                rows={4}
                value={sellerReasons[selectedSellerApplication.userId] || ''}
                onChange={(e) =>
                  setSellerReasons((prev) => ({
                    ...prev,
                    [selectedSellerApplication.userId]: e.target.value
                  }))
                }
                placeholder="例如：未满足交易资质要求，需补充资料"
              />
            </div>

            <div className="actions">
              <button
                onClick={() =>
                  reviewSellerApplication(selectedSellerApplication.userId, 'APPROVED')
                }
                disabled={actionLoading}
                className="btn primary"
              >
                通过交易资质
              </button>
              <button
                onClick={() =>
                  reviewSellerApplication(selectedSellerApplication.userId, 'REJECTED')
                }
                disabled={actionLoading}
                className="btn secondary"
              >
                驳回交易资质
              </button>
            </div>
          </>
        )}
      </ConsolePanel>
    </main>
  );
}
