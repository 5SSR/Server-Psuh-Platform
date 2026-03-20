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

type AdminLogItem = {
  id: string;
  adminId: string;
  action: string;
  resource?: string | null;
  resourceId?: string | null;
  detail?: Record<string, unknown> | null;
  ip?: string | null;
  createdAt: string;
  admin?: {
    id: string;
    email: string;
    role?: string;
  } | null;
};

const actionTone = (action: string) => {
  if (action.startsWith('PATCH') || action.startsWith('PUT')) return 'warning' as const;
  if (action.startsWith('DELETE')) return 'danger' as const;
  if (action.startsWith('POST')) return 'info' as const;
  return 'default' as const;
};

export default function AdminLogsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [items, setItems] = useState<AdminLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [filterAction, setFilterAction] = useState('');
  const [filterAdminId, setFilterAdminId] = useState('');
  const [filterResource, setFilterResource] = useState('');
  const [keyword, setKeyword] = useState('');
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
      if (filterAction.trim()) params.set('action', filterAction.trim());
      if (filterAdminId.trim()) params.set('adminId', filterAdminId.trim());
      if (filterResource.trim()) params.set('resource', filterResource.trim());
      if (keyword.trim()) params.set('keyword', keyword.trim());

      const res = await fetch(`${API}/admin/logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取操作审计日志失败');
      setItems(Array.isArray(data.list) ? data.list : []);
      setTotal(Number(data.total || 0));
      setMessage(`已加载 ${Number(data.total || 0)} 条日志`);
    } catch (e: any) {
      setError(e.message || '读取操作审计日志失败');
    } finally {
      setLoading(false);
    }
  }, [token, page, pageSize, filterAction, filterAdminId, filterResource, keyword]);

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
        eyebrow="管理后台 · 操作审计"
        title="管理员操作日志"
        description="集中查看后台关键操作、执行人、资源对象与来源 IP，强化风险追溯与合规留痕。"
        tags={[
          { label: '审计留痕', tone: 'info' },
          { label: `总计 ${total} 条`, tone: 'default' },
          { label: loading ? '刷新中' : '已同步', tone: loading ? 'warning' : 'success' }
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
            <label>动作</label>
            <input
              value={filterAction}
              onChange={(e) => {
                setFilterAction(e.target.value);
                setPage(1);
              }}
              placeholder="如 PATCH /admin/orders/:id/verify"
            />
          </div>
          <div className="field">
            <label>管理员 ID</label>
            <input
              value={filterAdminId}
              onChange={(e) => {
                setFilterAdminId(e.target.value);
                setPage(1);
              }}
              placeholder="精确匹配"
            />
          </div>
          <div className="field">
            <label>资源</label>
            <input
              value={filterResource}
              onChange={(e) => {
                setFilterResource(e.target.value);
                setPage(1);
              }}
              placeholder="如 AdminPaymentController"
            />
          </div>
          <div className="field">
            <label>关键词</label>
            <input
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
              placeholder="动作 / 资源 / 资源ID / IP"
            />
          </div>
        </div>
      </ConsolePanel>

      <ConsolePanel title="表格区 · 审计事件" className="stack-12">
        {items.length === 0 ? (
          <ConsoleEmpty text={loading ? '加载中...' : '暂无符合条件的审计日志'} />
        ) : (
          <>
            <div className="console-table-wrap">
              <table className="console-table console-table-mobile">
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>动作</th>
                    <th>管理员</th>
                    <th>目标资源</th>
                    <th>来源 IP</th>
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
                      <td data-label="动作">
                        <StatusBadge tone={actionTone(log.action)}>{log.action}</StatusBadge>
                      </td>
                      <td data-label="管理员">
                        <div className="console-row-primary">{log.admin?.email || '-'}</div>
                        <p className="console-row-sub">{log.adminId}</p>
                      </td>
                      <td data-label="目标资源">
                        <div className="console-row-primary">{log.resource || '-'}</div>
                        <p className="console-row-sub">{log.resourceId || '-'}</p>
                      </td>
                      <td data-label="来源 IP">{log.ip || '-'}</td>
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
        description="用于核查动作上下文并留存审计取证信息。"
        className="console-detail stack-12"
      >
        {!selectedItem ? (
          <ConsoleEmpty text="请选择一条日志查看详情" />
        ) : (
          <>
            <div className="console-detail-grid">
              <div className="spec-item">
                <p className="label">动作</p>
                <p className="value">{selectedItem.action}</p>
              </div>
              <div className="spec-item">
                <p className="label">管理员</p>
                <p className="value">{selectedItem.admin?.email || selectedItem.adminId}</p>
              </div>
              <div className="spec-item">
                <p className="label">资源</p>
                <p className="value">{selectedItem.resource || '-'}</p>
              </div>
              <div className="spec-item">
                <p className="label">资源 ID</p>
                <p className="value">{selectedItem.resourceId || '-'}</p>
              </div>
              <div className="spec-item">
                <p className="label">来源 IP</p>
                <p className="value">{selectedItem.ip || '-'}</p>
              </div>
              <div className="spec-item">
                <p className="label">执行时间</p>
                <p className="value">{formatDateTime(selectedItem.createdAt)}</p>
              </div>
            </div>
            <div className="form">
              <label>细节载荷（detail）</label>
              <pre className="code">
                {selectedItem.detail
                  ? JSON.stringify(selectedItem.detail, null, 2)
                  : '无附加 detail 数据'}
              </pre>
            </div>
          </>
        )}
      </ConsolePanel>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </main>
  );
}
