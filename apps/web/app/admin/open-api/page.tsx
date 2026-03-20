"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type LogItem = {
  id: string;
  openApiKeyId?: string | null;
  userId?: string | null;
  keyPrefix?: string | null;
  requestPath: string;
  requestMethod: string;
  nonce?: string | null;
  signatureMode?: string | null;
  ip?: string | null;
  statusCode: number;
  success: boolean;
  errorCode?: string | null;
  errorMessage?: string | null;
  durationMs: number;
  createdAt: string;
  openApiKey?: {
    id: string;
    name: string;
    scope?: string | null;
    status: string;
  } | null;
};

type Metrics = {
  windowMinutes: number;
  total: number;
  success: number;
  failed: number;
  successRate: number;
  avgRpm: number;
  rateLimitPerMinute: number;
  requireSignature: boolean;
  maxSkewSeconds: number;
  topKeys: Array<{ keyPrefix: string; count: number }>;
  topPaths: Array<{ path: string; count: number }>;
  failedCodes: Array<{ code: string; count: number }>;
};

export default function AdminOpenApiPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [windowMinutes, setWindowMinutes] = useState('60');
  const [successFilter, setSuccessFilter] = useState('');
  const [keyPrefix, setKeyPrefix] = useState('');
  const [userId, setUserId] = useState('');
  const [path, setPath] = useState('');

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', '1');
    params.set('pageSize', '30');
    if (successFilter) params.set('success', successFilter);
    if (keyPrefix.trim()) params.set('keyPrefix', keyPrefix.trim());
    if (userId.trim()) params.set('userId', userId.trim());
    if (path.trim()) params.set('path', path.trim());
    return params.toString();
  }, [successFilter, keyPrefix, userId, path]);

  const load = useCallback(async () => {
    const token = localStorage.getItem('idc_token');
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const headers = {
        Authorization: `Bearer ${token}`
      };

      const [logsRes, metricsRes] = await Promise.all([
        fetch(`${API_BASE}/admin/open-api/logs?${query}`, { headers }),
        fetch(`${API_BASE}/admin/open-api/metrics?windowMinutes=${Number(windowMinutes) || 60}`, { headers })
      ]);

      const [logsData, metricsData] = await Promise.all([logsRes.json(), metricsRes.json()]);

      if (!logsRes.ok || !metricsRes.ok) {
        throw new Error(logsData.message || metricsData.message || '加载开放接口监控失败');
      }

      setLogs(logsData.list || []);
      setMetrics(metricsData || null);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [query, windowMinutes]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="page page-shell">
      <header className="section-head">
        <div>
          <p className="eyebrow">管理后台</p>
          <h1>开放接口监控</h1>
          <p className="muted">用于审计 API 调用、定位签名失败和观察调用频率。</p>
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}

      <section className="card stack-12">
        <div className="filter-grid">
          <div className="field">
            <label>统计窗口（分钟）</label>
            <input
              type="number"
              min="5"
              max="1440"
              value={windowMinutes}
              onChange={(e) => setWindowMinutes(e.target.value)}
            />
          </div>
          <div className="field">
            <label>成功状态</label>
            <select value={successFilter} onChange={(e) => setSuccessFilter(e.target.value)}>
              <option value="">全部</option>
              <option value="true">仅成功</option>
              <option value="false">仅失败</option>
            </select>
          </div>
          <div className="field">
            <label>Key 前缀</label>
            <input value={keyPrefix} onChange={(e) => setKeyPrefix(e.target.value)} placeholder="idc_sk_" />
          </div>
          <div className="field">
            <label>用户 ID</label>
            <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="用户 UUID" />
          </div>
          <div className="field">
            <label>路径包含</label>
            <input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/api/v1/open/products" />
          </div>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={() => void load()} disabled={loading}>
            {loading ? '加载中...' : '刷新数据'}
          </button>
        </div>
      </section>

      {metrics ? (
        <section className="metrics-grid" style={{ marginTop: 12 }}>
          <article className="metric-card">
            <p className="metric-label">总调用</p>
            <p className="metric-value">{metrics.total}</p>
            <p className="metric-tip">窗口 {metrics.windowMinutes} 分钟</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">成功率</p>
            <p className="metric-value">{(metrics.successRate * 100).toFixed(2)}%</p>
            <p className="metric-tip">成功 {metrics.success} / 失败 {metrics.failed}</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">平均 RPM</p>
            <p className="metric-value">{metrics.avgRpm}</p>
            <p className="metric-tip">限流阈值 {metrics.rateLimitPerMinute} / min</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">签名策略</p>
            <p className="metric-value">{metrics.requireSignature ? '已开启' : '关闭'}</p>
            <p className="metric-tip">最大时钟偏差 {metrics.maxSkewSeconds}s</p>
          </article>
        </section>
      ) : null}

      {metrics ? (
        <section className="grid" style={{ marginTop: 12 }}>
          <article className="card stack-8" style={{ gridColumn: 'span 4' }}>
            <h3>高频 Key</h3>
            {(metrics.topKeys || []).length === 0 ? (
              <p className="muted">暂无数据</p>
            ) : (
              (metrics.topKeys || []).map((item) => (
                <p className="muted" key={item.keyPrefix}>{item.keyPrefix} · {item.count}</p>
              ))
            )}
          </article>
          <article className="card stack-8" style={{ gridColumn: 'span 4' }}>
            <h3>热门路径</h3>
            {(metrics.topPaths || []).length === 0 ? (
              <p className="muted">暂无数据</p>
            ) : (
              (metrics.topPaths || []).map((item) => (
                <p className="muted" key={item.path}>{item.path} · {item.count}</p>
              ))
            )}
          </article>
          <article className="card stack-8" style={{ gridColumn: 'span 4' }}>
            <h3>失败类型</h3>
            {(metrics.failedCodes || []).length === 0 ? (
              <p className="muted">暂无失败记录</p>
            ) : (
              (metrics.failedCodes || []).map((item) => (
                <p className="muted" key={item.code}>{item.code} · {item.count}</p>
              ))
            )}
          </article>
        </section>
      ) : null}

      <section className="card" style={{ marginTop: 12 }}>
        <h3>调用日志</h3>
        {logs.length === 0 ? (
          <div className="empty-state">暂无日志</div>
        ) : (
          <div className="table-wrap">
            <table className="console-table console-table-mobile">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>状态</th>
                  <th>Key</th>
                  <th>用户</th>
                  <th>方法</th>
                  <th>路径</th>
                  <th>响应</th>
                  <th>耗时</th>
                  <th>错误</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((item) => (
                  <tr key={item.id}>
                    <td data-label="时间">{new Date(item.createdAt).toLocaleString('zh-CN')}</td>
                    <td data-label="状态">
                      <span className={`status-chip ${item.success ? 'success' : 'danger'}`}>
                        {item.success ? 'SUCCESS' : 'FAILED'}
                      </span>
                    </td>
                    <td data-label="Key">{item.keyPrefix || '-'}</td>
                    <td data-label="用户">{item.userId || '-'}</td>
                    <td data-label="方法">{item.requestMethod}</td>
                    <td data-label="路径">{item.requestPath}</td>
                    <td data-label="响应">{item.statusCode}</td>
                    <td data-label="耗时">{item.durationMs} ms</td>
                    <td data-label="错误">
                      {item.errorCode ? `${item.errorCode}: ${item.errorMessage || ''}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
