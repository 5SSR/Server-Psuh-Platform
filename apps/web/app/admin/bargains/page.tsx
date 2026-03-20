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

type BargainStatus = 'WAIT_SELLER' | 'WAIT_BUYER' | 'ACCEPTED' | 'REJECTED' | 'CANCELED';

type AdminBargain = {
  id: string;
  status: BargainStatus;
  round: number;
  currentPrice: number | string;
  buyerLastPrice?: number | string | null;
  sellerLastPrice?: number | string | null;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    code?: string;
    title: string;
    status: string;
    salePrice: number | string;
    region?: string | null;
    lineType?: string | null;
    riskLevel?: string;
    riskTags?: string[] | null;
  };
  buyer: {
    id: string;
    email: string;
    status: string;
    sellerProfile?: {
      level: number;
      tradeCount: number;
      positiveRate: number;
      disputeRate: number;
    } | null;
  };
  seller: {
    id: string;
    email: string;
    status: string;
    sellerProfile?: {
      level: number;
      tradeCount: number;
      positiveRate: number;
      disputeRate: number;
    } | null;
  };
  order?: {
    id: string;
    status: string;
    payStatus: string;
    payChannel?: string;
    createdAt: string;
  } | null;
  logs: Array<{
    id: string;
    action: string;
    actor: 'BUYER' | 'SELLER';
    actorId?: string | null;
    price?: number | string | null;
    remark?: string | null;
    createdAt: string;
  }>;
  risk: {
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    reasons: string[];
    ageHours: number;
    driftRate: number;
  };
};

const statusLabel: Record<BargainStatus, string> = {
  WAIT_SELLER: '待卖家响应',
  WAIT_BUYER: '待买家响应',
  ACCEPTED: '已成交',
  REJECTED: '已拒绝',
  CANCELED: '已取消'
};

function statusTone(status: BargainStatus) {
  if (status === 'ACCEPTED') return 'success' as const;
  if (status === 'REJECTED') return 'danger' as const;
  if (status === 'CANCELED') return 'warning' as const;
  return 'info' as const;
}

function riskTone(level?: string) {
  if (level === 'HIGH') return 'danger' as const;
  if (level === 'MEDIUM') return 'warning' as const;
  if (level === 'LOW') return 'success' as const;
  return 'default' as const;
}

function actorLabel(actor: string) {
  return actor === 'BUYER' ? '买家' : actor === 'SELLER' ? '卖家' : actor;
}

export default function AdminBargainsPage() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null;

  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [status, setStatus] = useState('');
  const [hasOrder, setHasOrder] = useState('');
  const [keyword, setKeyword] = useState('');

  const [list, setList] = useState<AdminBargain[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detail, setDetail] = useState<AdminBargain | null>(null);

  const [closeRemark, setCloseRemark] = useState('');
  const [noteRemark, setNoteRemark] = useState('');

  const selectedCount = selectedIds.length;

  const stats = useMemo(() => {
    return list.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.status === 'WAIT_BUYER' || item.status === 'WAIT_SELLER') acc.active += 1;
        if (item.status === 'ACCEPTED') acc.accepted += 1;
        if (item.risk.level === 'HIGH') acc.highRisk += 1;
        return acc;
      },
      { total: 0, active: 0, accepted: 0, highRisk: 0 }
    );
  }, [list]);

  const load = useCallback(async () => {
    if (!token) {
      setError('请先登录管理员账号');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      const query = new URLSearchParams({
        page: '1',
        pageSize: '50'
      });
      if (status) query.set('status', status);
      if (hasOrder === 'yes') query.set('hasOrder', 'true');
      if (hasOrder === 'no') query.set('hasOrder', 'false');
      if (keyword.trim()) query.set('keyword', keyword.trim());

      const res = await fetch(`${API_BASE}/admin/bargains?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || '读取议价列表失败');
      }
      const rows = data.list || [];
      setList(rows);

      if (!rows.length) {
        setSelectedId('');
        setSelectedIds([]);
        setDetail(null);
        return;
      }

      if (!selectedId || !rows.find((item: AdminBargain) => item.id === selectedId)) {
        setSelectedId(rows[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '读取议价列表失败');
    } finally {
      setLoading(false);
    }
  }, [hasOrder, keyword, selectedId, status, token]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => list.some((item) => item.id === id)));
  }, [list]);

  const loadDetail = useCallback(
    async (id: string) => {
      if (!id || !token) return;
      setDetailLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE}/admin/bargains/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || '读取议价详情失败');
        }
        setDetail(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : '读取议价详情失败');
      } finally {
        setDetailLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (selectedId) {
      loadDetail(selectedId);
    }
  }, [loadDetail, selectedId]);

  const review = async (action: 'CLOSE' | 'NOTE' | 'ESCALATE_DISPUTE') => {
    if (!token || !selectedId) return;
    const remarkForClose = closeRemark.trim();
    const remark = noteRemark.trim();

    if (action === 'CLOSE' && !remarkForClose) {
      setError('请先填写关闭原因');
      return;
    }
    if ((action === 'NOTE' || action === 'ESCALATE_DISPUTE') && !remark) {
      setError('请先填写备注内容');
      return;
    }

    setActionLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/bargains/${selectedId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          remarkForClose: action === 'CLOSE' ? remarkForClose : undefined,
          remark:
            action === 'NOTE' || action === 'ESCALATE_DISPUTE'
              ? remark
              : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || '提交管理员处置失败');
      }
      setMessage(data.message || '处置完成');
      if (action === 'CLOSE') {
        setCloseRemark('');
      } else {
        setNoteRemark('');
      }
      await load();
      await loadDetail(selectedId);
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交管理员处置失败');
    } finally {
      setActionLoading(false);
    }
  };

  const reviewBatch = async (action: 'CLOSE' | 'NOTE' | 'ESCALATE_DISPUTE') => {
    if (!token) return;
    if (!selectedIds.length) {
      setError('请先勾选会话');
      return;
    }

    const remarkForClose = closeRemark.trim();
    const remark = noteRemark.trim();

    if (action === 'CLOSE' && !remarkForClose) {
      setError('请先填写关闭原因');
      return;
    }
    if ((action === 'NOTE' || action === 'ESCALATE_DISPUTE') && !remark) {
      setError('请先填写备注内容');
      return;
    }

    setActionLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/bargains/review/batch`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ids: selectedIds,
          action,
          remarkForClose: action === 'CLOSE' ? remarkForClose : undefined,
          remark:
            action === 'NOTE' || action === 'ESCALATE_DISPUTE'
              ? remark
              : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || '批量处置失败');
      }
      const text = `批量完成：成功 ${data.successCount || 0}，失败 ${data.failedCount || 0}`;
      setMessage(text);
      await load();
      if (selectedId) {
        await loadDetail(selectedId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '批量处置失败');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) return Array.from(new Set([...prev, id]));
      return prev.filter((item) => item !== id);
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(list.map((item) => item.id));
      return;
    }
    setSelectedIds([]);
  };

  return (
    <main className="page page-shell admin-console-page">
      <ConsolePageHeader
        eyebrow="管理后台 · 议价管理"
        title="议价流程风控台"
        description="统一监控议价会话状态、风险等级和成交转化，异常会话可由平台进行备注或关闭。"
        tags={[
          { label: `会话 ${stats.total} 条`, tone: 'default' },
          { label: `进行中 ${stats.active}`, tone: 'info' },
          { label: `已成交 ${stats.accepted}`, tone: 'success' },
          { label: `高风险 ${stats.highRisk}`, tone: stats.highRisk > 0 ? 'danger' : 'default' }
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
            <label>议价状态</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">全部</option>
              <option value="WAIT_SELLER">待卖家响应</option>
              <option value="WAIT_BUYER">待买家响应</option>
              <option value="ACCEPTED">已成交</option>
              <option value="REJECTED">已拒绝</option>
              <option value="CANCELED">已取消</option>
            </select>
          </div>
          <div className="field">
            <label>是否已建单</label>
            <select value={hasOrder} onChange={(e) => setHasOrder(e.target.value)}>
              <option value="">全部</option>
              <option value="yes">已建单</option>
              <option value="no">未建单</option>
            </select>
          </div>
          <div className="field" style={{ gridColumn: 'span 6' }}>
            <label>关键词</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="会话 ID / 商品标题 / 商品编号 / 买卖家邮箱"
            />
          </div>
        </div>
      </ConsolePanel>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <ConsolePanel title="表格区 · 议价会话" className="stack-12">
        <div className="toolbar">
          <span className="muted">已勾选 {selectedCount} 条</span>
          <button
            type="button"
            className="btn secondary btn-sm"
            disabled={actionLoading || selectedCount === 0}
            onClick={() => reviewBatch('NOTE')}
          >
            批量备注
          </button>
          <button
            type="button"
            className="btn secondary btn-sm"
            disabled={actionLoading || selectedCount === 0}
            onClick={() => reviewBatch('ESCALATE_DISPUTE')}
          >
            批量转纠纷
          </button>
          <button
            type="button"
            className="btn danger btn-sm"
            disabled={actionLoading || selectedCount === 0}
            onClick={() => reviewBatch('CLOSE')}
          >
            批量关闭
          </button>
        </div>
        {list.length === 0 ? (
          <ConsoleEmpty text={loading ? '加载中...' : '暂无议价会话'} />
        ) : (
          <div className="console-table-wrap">
            <table className="console-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={list.length > 0 && selectedIds.length === list.length}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th>会话 / 商品</th>
                  <th>买家 / 卖家</th>
                  <th>状态与风险</th>
                  <th>议价价格</th>
                  <th>轮次 / 建单</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={(e) => toggleSelect(item.id, e.target.checked)}
                      />
                    </td>
                    <td>
                      <div className="console-row-primary">{item.id}</div>
                      <p className="console-row-sub">{item.product.title}</p>
                      <p className="console-row-sub">
                        {item.product.code || item.product.id} · {item.product.region || '-'} / {item.product.lineType || '-'}
                      </p>
                    </td>
                    <td>
                      <div className="console-row-primary">买家：{item.buyer.email}</div>
                      <p className="console-row-sub">卖家：{item.seller.email}</p>
                    </td>
                    <td>
                      <div className="console-inline-tags">
                        <StatusBadge tone={statusTone(item.status)}>{statusLabel[item.status]}</StatusBadge>
                        <StatusBadge tone={riskTone(item.risk.level)}>风险 {item.risk.level}</StatusBadge>
                        {item.risk.reasons.length > 0 && (
                          <StatusBadge tone="warning">{item.risk.reasons[0]}</StatusBadge>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="console-row-primary">{formatMoney(item.currentPrice)}</div>
                      <p className="console-row-sub">一口价：{formatMoney(item.product.salePrice)}</p>
                    </td>
                    <td>
                      <div className="console-inline-tags">
                        <StatusBadge tone="info">第 {item.round} 轮</StatusBadge>
                        {item.order?.id ? (
                          <StatusBadge tone="success">已建单</StatusBadge>
                        ) : (
                          <StatusBadge tone="default">未建单</StatusBadge>
                        )}
                      </div>
                    </td>
                    <td>{formatDateTime(item.updatedAt)}</td>
                    <td>
                      <button
                        type="button"
                        className={`btn btn-sm ${selectedId === item.id ? 'primary' : 'secondary'}`}
                        onClick={() => setSelectedId(item.id)}
                      >
                        {selectedId === item.id ? '处理中' : '查看'}
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
        description="查看完整时间线与风险因素，并执行管理员备注或关闭操作。"
        className="console-detail stack-12"
      >
        {!selectedId ? (
          <ConsoleEmpty text="请选择一条议价会话" />
        ) : detailLoading ? (
          <ConsoleEmpty text="详情加载中..." />
        ) : !detail ? (
          <ConsoleEmpty text="暂无详情数据" />
        ) : (
          <>
            <div className="console-detail-grid">
              <div className="spec-item">
                <p className="label">会话状态</p>
                <p className="value">{statusLabel[detail.status]}</p>
              </div>
              <div className="spec-item">
                <p className="label">当前成交价</p>
                <p className="value">{formatMoney(detail.currentPrice)}</p>
              </div>
              <div className="spec-item">
                <p className="label">风险等级</p>
                <p className="value">{detail.risk.level}</p>
              </div>
              <div className="spec-item">
                <p className="label">会话时长</p>
                <p className="value">{detail.risk.ageHours} 小时</p>
              </div>
              <div className="spec-item">
                <p className="label">价格偏离率</p>
                <p className="value">{(detail.risk.driftRate * 100).toFixed(2)}%</p>
              </div>
              <div className="spec-item">
                <p className="label">关联订单</p>
                <p className="value">{detail.order?.id || '未生成'}</p>
              </div>
            </div>

            {detail.risk.reasons.length > 0 && (
              <div className="console-inline-tags">
                {detail.risk.reasons.map((reason) => (
                  <StatusBadge key={reason} tone="warning">
                    {reason}
                  </StatusBadge>
                ))}
              </div>
            )}

            <div className="field">
              <label>管理员备注（写入审计日志）</label>
              <textarea
                rows={3}
                value={noteRemark}
                onChange={(e) => setNoteRemark(e.target.value)}
                placeholder="例如：提醒买卖双方补充交付边界，避免后续争议"
              />
            </div>

            <div className="field">
              <label>关闭会话原因（仅当会话未结束且未建单）</label>
              <textarea
                rows={3}
                value={closeRemark}
                onChange={(e) => setCloseRemark(e.target.value)}
                placeholder="例如：会话长期无响应且争议风险高，建议重建会话"
              />
            </div>

            <div className="actions">
              <button
                type="button"
                className="btn secondary"
                disabled={actionLoading}
                onClick={() => review('NOTE')}
              >
                记录备注
              </button>
              <button
                type="button"
                className="btn danger"
                disabled={actionLoading || detail.status === 'ACCEPTED' || Boolean(detail.order?.id)}
                onClick={() => review('CLOSE')}
              >
                强制关闭会话
              </button>
              <button
                type="button"
                className="btn secondary"
                disabled={actionLoading || !detail.order?.id}
                onClick={() => review('ESCALATE_DISPUTE')}
              >
                转入订单纠纷
              </button>
            </div>

            <div className="stack-12">
              <h3 style={{ fontSize: 16 }}>议价时间线</h3>
              {detail.logs.length === 0 ? (
                <ConsoleEmpty text="暂无日志" />
              ) : (
                <div className="timeline">
                  {detail.logs.map((log) => (
                    <article key={log.id} className="timeline-item stack-8">
                      <div className="status-line">
                        <StatusBadge tone="info">{log.action}</StatusBadge>
                        <StatusBadge tone="default">角色：{actorLabel(log.actor)}</StatusBadge>
                        {log.price !== null && log.price !== undefined && (
                          <StatusBadge tone="default">价格：{formatMoney(log.price)}</StatusBadge>
                        )}
                      </div>
                      {log.remark ? <p className="muted">备注：{log.remark}</p> : null}
                      <p className="timeline-meta">{formatDateTime(log.createdAt)}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </ConsolePanel>
    </main>
  );
}
