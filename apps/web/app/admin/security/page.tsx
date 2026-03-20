'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ConsoleEmpty,
  ConsolePageHeader,
  ConsolePanel,
  StatusBadge,
  formatDateTime
} from '../../../components/admin/console-primitives';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type LoginSecurityItem = {
  id: string;
  userId?: string | null;
  email: string;
  ip?: string | null;
  userAgent?: string | null;
  success: boolean;
  reason?: string | null;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    role: string;
    status: string;
  } | null;
};

type Summary = {
  success24h: number;
  failed24h: number;
};

const reasonMap: Record<string, string> = {
  USER_NOT_FOUND: '账号不存在',
  USER_BANNED: '账号被封禁',
  BAD_PASSWORD: '密码错误',
  RISK_BLOCKED: '风控拦截'
};

function renderReason(reason?: string | null) {
  if (!reason) return '-';
  return reasonMap[reason] || reason;
}

function reasonTone(reason?: string | null) {
  if (!reason) return 'default' as const;
  if (reason === 'RISK_BLOCKED') return 'warning' as const;
  if (reason === 'USER_BANNED') return 'danger' as const;
  return 'info' as const;
}

export default function AdminSecurityPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [items, setItems] = useState<LoginSecurityItem[]>([]);
  const [summary, setSummary] = useState<Summary>({ success24h: 0, failed24h: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [filterSuccess, setFilterSuccess] = useState('');
  const [filterReason, setFilterReason] = useState('');
  const [filterEmail, setFilterEmail] = useState('');
  const [filterIp, setFilterIp] = useState('');
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

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
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (filterSuccess) params.set('success', filterSuccess);
      if (filterReason.trim()) params.set('reason', filterReason.trim());
      if (filterEmail.trim()) params.set('email', filterEmail.trim());
      if (filterIp.trim()) params.set('ip', filterIp.trim());
      if (filterKeyword.trim()) params.set('keyword', filterKeyword.trim());
      if (filterFrom) params.set('from', `${filterFrom}T00:00:00.000Z`);
      if (filterTo) params.set('to', `${filterTo}T23:59:59.999Z`);

      const res = await fetch(`${API}/admin/security/logins?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取登录安全日志失败');

      setItems(Array.isArray(data.list) ? data.list : []);
      setSummary({
        success24h: Number(data?.summary?.success24h || 0),
        failed24h: Number(data?.summary?.failed24h || 0)
      });
      setTotal(Number(data.total || 0));
      setMessage(`已加载 ${Number(data.total || 0)} 条登录日志`);
    } catch (e: any) {
      setError(e.message || '读取登录安全日志失败');
    } finally {
      setLoading(false);
    }
  }, [
    token,
    page,
    pageSize,
    filterSuccess,
    filterReason,
    filterEmail,
    filterIp,
    filterKeyword,
    filterFrom,
    filterTo
  ]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!items.length) {
      setSelectedId('');
      return;
    }
    if (!selectedId || !items.find((item) => item.id === selectedId)) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedId) || null,
    [items, selectedId]
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="page page-shell admin-console-page">
      <ConsolePageHeader
        eyebrow="管理后台 · 登录安全"
        title="登录安全监控"
        description="统一跟踪登录成功/失败、失败原因、IP 与设备指纹，提升风控响应和审计可追溯性。"
        tags={[
          { label: `24小时成功 ${summary.success24h}`, tone: 'success' },
          { label: `24小时失败 ${summary.failed24h}`, tone: summary.failed24h > 0 ? 'warning' : 'default' },
          { label: `总计 ${total} 条`, tone: 'default' }
        ]}
        actions={
          <button className="btn secondary" type="button" onClick={load} disabled={loading}>
            {loading ? '刷新中...' : '刷新日志'}
          </button>
        }
      />

      <ConsolePanel title="筛选区" className="stack-12">
        <div className="console-filter-grid">
          <div className="field">
            <label>登录结果</label>
            <select
              value={filterSuccess}
              onChange={(e) => {
                setFilterSuccess(e.target.value);
                setPage(1);
              }}
            >
              <option value="">全部</option>
              <option value="true">成功</option>
              <option value="false">失败</option>
            </select>
          </div>
          <div className="field">
            <label>失败原因</label>
            <input
              value={filterReason}
              onChange={(e) => {
                setFilterReason(e.target.value);
                setPage(1);
              }}
              placeholder="如 BAD_PASSWORD / RISK_BLOCKED"
            />
          </div>
          <div className="field">
            <label>邮箱</label>
            <input
              value={filterEmail}
              onChange={(e) => {
                setFilterEmail(e.target.value);
                setPage(1);
              }}
              placeholder="按邮箱模糊查询"
            />
          </div>
          <div className="field">
            <label>IP</label>
            <input
              value={filterIp}
              onChange={(e) => {
                setFilterIp(e.target.value);
                setPage(1);
              }}
              placeholder="按 IP 模糊查询"
            />
          </div>
          <div className="field">
            <label>关键词</label>
            <input
              value={filterKeyword}
              onChange={(e) => {
                setFilterKeyword(e.target.value);
                setPage(1);
              }}
              placeholder="邮箱 / userId / reason / IP"
            />
          </div>
          <div className="field">
            <label>开始日期</label>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => {
                setFilterFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="field">
            <label>结束日期</label>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => {
                setFilterTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
      </ConsolePanel>

      <ConsolePanel title="表格区 · 登录事件" className="stack-12">
        {items.length === 0 ? (
          <ConsoleEmpty text={loading ? '加载中...' : '暂无符合条件的登录日志'} />
        ) : (
          <>
            <div className="console-table-wrap">
              <table className="console-table console-table-mobile">
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>账号</th>
                    <th>结果</th>
                    <th>失败原因</th>
                    <th>来源</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((log) => (
                    <tr key={log.id}>
                      <td data-label="时间">
                        <div className="console-row-primary">{formatDateTime(log.createdAt)}</div>
                        <p className="console-row-sub">{log.id}</p>
                      </td>
                      <td data-label="账号">
                        <div className="console-row-primary">{log.email}</div>
                        <p className="console-row-sub">{log.userId || '-'}</p>
                      </td>
                      <td data-label="结果">
                        <StatusBadge tone={log.success ? 'success' : 'danger'}>
                          {log.success ? '成功' : '失败'}
                        </StatusBadge>
                      </td>
                      <td data-label="失败原因">
                        {log.success ? (
                          <span className="muted">-</span>
                        ) : (
                          <StatusBadge tone={reasonTone(log.reason)}>
                            {renderReason(log.reason)}
                          </StatusBadge>
                        )}
                      </td>
                      <td data-label="来源">
                        <div className="console-row-primary">{log.ip || '-'}</div>
                        <p className="console-row-sub">{log.userAgent || '-'}</p>
                      </td>
                      <td data-label="操作">
                        <button
                          type="button"
                          className={`btn ${selectedId === log.id ? 'primary' : 'secondary'} btn-sm`}
                          onClick={() => setSelectedId(log.id)}
                        >
                          {selectedId === log.id ? '已选中' : '查看详情'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="actions" style={{ justifyContent: 'space-between' }}>
              <p className="muted">
                第 {page} / {totalPages} 页，共 {total} 条
              </p>
              <div className="actions" style={{ marginTop: 0 }}>
                <button
                  className="btn secondary btn-sm"
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1 || loading}
                >
                  上一页
                </button>
                <button
                  className="btn secondary btn-sm"
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page >= totalPages || loading}
                >
                  下一页
                </button>
              </div>
            </div>
          </>
        )}
      </ConsolePanel>

      <ConsolePanel
        title="详情操作区"
        description="核查登录设备、风险原因与账号状态，支持安全追溯和风控联动。"
        className="console-detail stack-12"
      >
        {!selectedItem ? (
          <ConsoleEmpty text="请选择一条登录日志查看详情" />
        ) : (
          <>
            <div className="console-detail-grid">
              <div className="spec-item">
                <p className="label">邮箱</p>
                <p className="value">{selectedItem.email}</p>
              </div>
              <div className="spec-item">
                <p className="label">用户 ID</p>
                <p className="value">{selectedItem.userId || '-'}</p>
              </div>
              <div className="spec-item">
                <p className="label">结果</p>
                <p className="value">{selectedItem.success ? '成功' : '失败'}</p>
              </div>
              <div className="spec-item">
                <p className="label">失败原因</p>
                <p className="value">{renderReason(selectedItem.reason)}</p>
              </div>
              <div className="spec-item">
                <p className="label">来源 IP</p>
                <p className="value">{selectedItem.ip || '-'}</p>
              </div>
              <div className="spec-item">
                <p className="label">时间</p>
                <p className="value">{formatDateTime(selectedItem.createdAt)}</p>
              </div>
              <div className="spec-item">
                <p className="label">账号角色</p>
                <p className="value">{selectedItem.user?.role || '-'}</p>
              </div>
              <div className="spec-item">
                <p className="label">账号状态</p>
                <p className="value">{selectedItem.user?.status || '-'}</p>
              </div>
            </div>

            <div className="form">
              <label>设备 User-Agent</label>
              <pre className="code">{selectedItem.userAgent || '未记录'}</pre>
            </div>
          </>
        )}
      </ConsolePanel>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </main>
  );
}
