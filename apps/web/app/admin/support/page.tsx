"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ConsoleEmpty,
  ConsolePageHeader,
  ConsolePanel,
  StatusBadge,
  formatDateTime
} from '../../../components/admin/console-primitives';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type TicketItem = {
  id: string;
  type: 'AFTER_SALE' | 'APPEAL' | 'OTHER' | string;
  status: 'OPEN' | 'PROCESSING' | 'RESOLVED' | 'CLOSED' | 'REJECTED' | string;
  subject: string;
  content: string;
  orderId?: string | null;
  productId?: string | null;
  reviewRemark?: string | null;
  evidence?: string[];
  resolverId?: string | null;
  resolver?: {
    id: string;
    email: string;
  } | null;
  user?: {
    id: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
};

const typeLabel: Record<string, string> = {
  AFTER_SALE: '售后问题',
  APPEAL: '申诉仲裁',
  OTHER: '其他问题'
};

const statusLabel: Record<string, string> = {
  OPEN: '待处理',
  PROCESSING: '处理中',
  RESOLVED: '已处理',
  CLOSED: '已关闭',
  REJECTED: '已驳回'
};

function statusTone(status: string) {
  if (status === 'RESOLVED') return 'success' as const;
  if (status === 'OPEN' || status === 'PROCESSING') return 'warning' as const;
  if (status === 'REJECTED') return 'danger' as const;
  return 'default' as const;
}

export default function AdminSupportPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('OPEN');
  const [type, setType] = useState('');
  const [keyword, setKeyword] = useState('');
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [reviewForm, setReviewForm] = useState({
    status: 'PROCESSING',
    reviewRemark: ''
  });

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
      const query = new URLSearchParams();
      query.set('page', '1');
      query.set('pageSize', '50');
      if (status) query.set('status', status);
      if (type) query.set('type', type);
      if (keyword.trim()) query.set('keyword', keyword.trim());
      const res = await fetch(`${API_BASE}/admin/support/tickets?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取工单失败');
      setTickets(data.list || []);
    } catch (e: any) {
      setError(e.message || '读取工单失败');
    } finally {
      setLoading(false);
    }
  }, [status, type, keyword, token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!tickets.length) {
      setSelectedId('');
      return;
    }
    if (!selectedId || !tickets.find((item) => item.id === selectedId)) {
      setSelectedId(tickets[0].id);
    }
  }, [tickets, selectedId]);

  const selectedTicket = useMemo(
    () => tickets.find((item) => item.id === selectedId) || null,
    [tickets, selectedId]
  );

  useEffect(() => {
    if (!selectedTicket) return;
    setReviewForm({
      status: selectedTicket.status === 'OPEN' ? 'PROCESSING' : selectedTicket.status,
      reviewRemark: selectedTicket.reviewRemark || ''
    });
  }, [selectedTicket]);

  const reviewTicket = async () => {
    if (!token || !selectedTicket) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/support/tickets/${selectedTicket.id}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: reviewForm.status,
          reviewRemark: reviewForm.reviewRemark || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '处理工单失败');
      setMessage('工单状态已更新');
      await load();
    } catch (e: any) {
      setError(e.message || '处理工单失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page page-shell admin-console-page">
      <ConsolePageHeader
        eyebrow="管理后台 · 售后工单"
        title="售后申诉处理中心"
        description="统一处理售后问题、申诉仲裁与证据复核，确保担保交易售后链路可追踪。"
        tags={[
          { label: `工单 ${tickets.length} 条`, tone: 'default' },
          { label: '担保售后', tone: 'info' },
          { label: '证据留痕', tone: 'warning' }
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
            <label>状态</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="OPEN">待处理</option>
              <option value="PROCESSING">处理中</option>
              <option value="RESOLVED">已处理</option>
              <option value="REJECTED">已驳回</option>
              <option value="CLOSED">已关闭</option>
              <option value="">全部</option>
            </select>
          </div>
          <div className="field">
            <label>类型</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">全部类型</option>
              <option value="AFTER_SALE">售后问题</option>
              <option value="APPEAL">申诉仲裁</option>
              <option value="OTHER">其他问题</option>
            </select>
          </div>
          <div className="field" style={{ gridColumn: 'span 2' }}>
            <label>关键词</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="工单标题 / 描述 / 用户邮箱 / 订单号"
            />
          </div>
        </div>
      </ConsolePanel>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <ConsolePanel title="表格区 · 工单列表" className="stack-12">
        {tickets.length === 0 ? (
          <ConsoleEmpty text={loading ? '加载中...' : '暂无工单数据'} />
        ) : (
          <div className="console-table-wrap">
            <table className="console-table console-table-mobile">
              <thead>
                <tr>
                  <th>工单信息</th>
                  <th>用户</th>
                  <th>类型</th>
                  <th>状态</th>
                  <th>关联对象</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((item) => (
                  <tr key={item.id}>
                    <td data-label="工单信息">
                      <div className="console-row-primary">{item.subject}</div>
                      <p className="console-row-sub">{item.id}</p>
                    </td>
                    <td data-label="用户">{item.user?.email || '-'}</td>
                    <td data-label="类型">
                      <StatusBadge tone="info">{typeLabel[item.type] || item.type}</StatusBadge>
                    </td>
                    <td data-label="状态">
                      <StatusBadge tone={statusTone(item.status)}>{statusLabel[item.status] || item.status}</StatusBadge>
                    </td>
                    <td data-label="关联对象">
                      <div className="console-inline-tags">
                        {item.orderId ? <StatusBadge tone="default">订单：{item.orderId}</StatusBadge> : null}
                        {item.productId ? <StatusBadge tone="default">商品：{item.productId}</StatusBadge> : null}
                      </div>
                    </td>
                    <td data-label="更新时间">{formatDateTime(item.updatedAt)}</td>
                    <td data-label="操作">
                      <button
                        type="button"
                        className={`btn ${selectedId === item.id ? 'primary' : 'secondary'} btn-sm`}
                        onClick={() => setSelectedId(item.id)}
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
        description="核对工单描述与证据后，更新处理状态并填写备注。"
        className="stack-12"
      >
        {!selectedTicket ? (
          <ConsoleEmpty text="请选择一条工单记录进行处理" />
        ) : (
          <>
            <div className="console-detail-grid">
              <div className="spec-item">
                <p className="label">工单号</p>
                <p className="value">{selectedTicket.id}</p>
              </div>
              <div className="spec-item">
                <p className="label">提交用户</p>
                <p className="value">{selectedTicket.user?.email || '-'}</p>
              </div>
              <div className="spec-item">
                <p className="label">工单类型</p>
                <p className="value">{typeLabel[selectedTicket.type] || selectedTicket.type}</p>
              </div>
              <div className="spec-item">
                <p className="label">当前状态</p>
                <p className="value">{statusLabel[selectedTicket.status] || selectedTicket.status}</p>
              </div>
            </div>

            <article className="card nested stack-8">
              <h4 style={{ fontSize: 16 }}>{selectedTicket.subject}</h4>
              <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>{selectedTicket.content}</p>
              {selectedTicket.reviewRemark ? (
                <p className="muted">历史备注：{selectedTicket.reviewRemark}</p>
              ) : null}
              {selectedTicket.resolver?.email ? (
                <p className="muted">处理人：{selectedTicket.resolver.email}</p>
              ) : null}
              {selectedTicket.evidence && selectedTicket.evidence.length > 0 ? (
                <div className="status-line">
                  {selectedTicket.evidence.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="status-chip info">
                      证据链接
                    </a>
                  ))}
                </div>
              ) : null}
            </article>

            <div className="form-row">
              <div className="field third">
                <label>处理状态</label>
                <select
                  value={reviewForm.status}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="PROCESSING">处理中</option>
                  <option value="RESOLVED">处理完成</option>
                  <option value="REJECTED">驳回</option>
                  <option value="CLOSED">关闭</option>
                </select>
              </div>
              <div className="field full">
                <label>处理备注</label>
                <textarea
                  rows={4}
                  value={reviewForm.reviewRemark}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, reviewRemark: e.target.value }))}
                  placeholder="填写核验结论、证据依据与处理说明"
                />
              </div>
            </div>

            <div className="actions">
              <button className="btn primary" onClick={reviewTicket} disabled={loading}>
                保存处理结果
              </button>
            </div>
          </>
        )}
      </ConsolePanel>
    </main>
  );
}
