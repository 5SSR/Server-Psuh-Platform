'use client';

import { useEffect, useState, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

interface AdminLogItem {
  id: string;
  action: string;
  target?: string;
  targetId?: string;
  ip?: string;
  admin: { id: string; email: string };
  createdAt: string;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState('');
  const pageSize = 20;

  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null;

  const load = useCallback(async () => {
    if (!token) return;
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (filterAction) params.set('action', filterAction);

    const res = await fetch(`${API}/admin/logs?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setLogs(data.list || []);
    setTotal(data.total || 0);
  }, [token, page, filterAction]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <main className="container" style={{ paddingTop: '2rem' }}>
      <h1>操作审计日志</h1>

      <div style={{ display: 'flex', gap: 12, margin: '1.5rem 0' }}>
        <input placeholder="按操作筛选" value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(1); }} style={{ flex: 1 }} />
      </div>

      <p className="muted">共 {total} 条记录</p>

      <table className="table" style={{ marginTop: '1rem' }}>
        <thead>
          <tr>
            <th>时间</th>
            <th>管理员</th>
            <th>操作</th>
            <th>目标</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{new Date(log.createdAt).toLocaleString()}</td>
              <td>{log.admin?.email || '-'}</td>
              <td><code className="code">{log.action}</code></td>
              <td>{log.target ? `${log.target} / ${log.targetId || '-'}` : '-'}</td>
              <td>{log.ip || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: '1.5rem' }}>
          <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</button>
          <span style={{ lineHeight: '32px' }}>{page} / {totalPages}</span>
          <button className="btn btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</button>
        </div>
      )}
    </main>
  );
}
