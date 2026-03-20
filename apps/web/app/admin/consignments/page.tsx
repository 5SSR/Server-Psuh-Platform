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

type ConsignmentItem = {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED';
  sellerNote?: string | null;
  adminRemark?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  seller: {
    id: string;
    email: string;
    role: string;
    sellerProfile?: {
      level: number;
      tradeCount: number;
      disputeRate: number;
      positiveRate: number;
    } | null;
  };
  reviewer?: {
    id: string;
    email: string;
  } | null;
  product: {
    id: string;
    code: string;
    title: string;
    status: string;
    salePrice: number | string;
    region?: string | null;
    lineType?: string | null;
    consignment?: boolean;
    riskLevel?: string;
  };
};

const statusLabel: Record<string, string> = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  CANCELED: '已撤销'
};

function statusTone(status: string) {
  if (status === 'APPROVED') return 'success' as const;
  if (status === 'REJECTED') return 'danger' as const;
  if (status === 'CANCELED') return 'default' as const;
  return 'warning' as const;
}

export default function AdminConsignmentsPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [status, setStatus] = useState('PENDING');
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<ConsignmentItem[]>([]);
  const [selectedId, setSelectedId] = useState('');
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
        `${API_BASE}/admin/consignments?page=1&pageSize=50${status ? `&status=${status}` : ''}${
          keyword ? `&keyword=${encodeURIComponent(keyword)}` : ''
        }`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取寄售审核列表失败');
      setItems((data.list || []) as ConsignmentItem[]);
    } catch (e: any) {
      setError(e.message || '读取失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, status, token]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return items;
  }, [items]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId('');
      return;
    }
    if (!selectedId || !filtered.find((item) => item.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selectedItem = filtered.find((item) => item.id === selectedId) || null;

  const review = async (id: string, action: 'APPROVE' | 'REJECT') => {
    if (!token) return;
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch(`${API_BASE}/admin/consignments/${id}/review`, {
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
      if (!res.ok) throw new Error(data.message || '审核失败');
      setMessage(data.message || '审核完成');
      await load();
    } catch (e: any) {
      setError(e.message || '审核失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page page-shell admin-console-page">
      <ConsolePageHeader
        eyebrow="管理后台 · 寄售审核"
        title="寄售申请审核中心"
        description="审核卖家寄售申请，统一标注商品寄售状态，强化平台交付托管与信任表达。"
        tags={[
          { label: '担保交付', tone: 'info' },
          { label: '风险审查', tone: 'warning' },
          { label: `记录 ${items.length} 条`, tone: 'default' }
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
            <label>审核状态</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="PENDING">待审核</option>
              <option value="APPROVED">已通过</option>
              <option value="REJECTED">已驳回</option>
              <option value="CANCELED">已撤销</option>
              <option value="">全部</option>
            </select>
          </div>
          <div className="field">
            <label>关键词</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="申请ID / 卖家邮箱 / 商品标题 / 商品编号"
            />
          </div>
          <div className="field">
            <label>审核策略</label>
            <input value="先核验商品，再批准寄售" disabled />
          </div>
          <div className="field">
            <label>操作要求</label>
            <input value="必须留痕，备注可追溯" disabled />
          </div>
        </div>
      </ConsolePanel>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <ConsolePanel title="表格区 · 寄售申请" className="stack-12">
        {filtered.length === 0 ? (
          <ConsoleEmpty text={loading ? '加载中...' : '暂无寄售申请'} />
        ) : (
          <div className="console-table-wrap">
            <table className="console-table">
              <thead>
                <tr>
                  <th>申请编号</th>
                  <th>商品</th>
                  <th>卖家</th>
                  <th>价格</th>
                  <th>风控</th>
                  <th>状态</th>
                  <th>时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="console-row-primary">{item.id}</div>
                      <p className="console-row-sub">{item.product?.code || '-'}</p>
                    </td>
                    <td>
                      <div className="console-row-primary">{item.product?.title || '-'}</div>
                      <p className="console-row-sub">
                        {item.product?.region || '-'} · {item.product?.lineType || '-'}
                      </p>
                    </td>
                    <td>
                      <div className="console-row-primary">{item.seller?.email || '-'}</div>
                      <p className="console-row-sub">
                        Lv.{item.seller?.sellerProfile?.level ?? 1} · 成交 {item.seller?.sellerProfile?.tradeCount ?? 0}
                      </p>
                    </td>
                    <td>
                      <div className="console-row-primary">{formatMoney(item.product?.salePrice)}</div>
                    </td>
                    <td>
                      <StatusBadge tone={item.product?.riskLevel === 'HIGH' ? 'danger' : item.product?.riskLevel === 'MEDIUM' ? 'warning' : 'success'}>
                        风险 {item.product?.riskLevel || '-'}
                      </StatusBadge>
                    </td>
                    <td>
                      <StatusBadge tone={statusTone(item.status)}>
                        {statusLabel[item.status] || item.status}
                      </StatusBadge>
                    </td>
                    <td>
                      <div className="console-row-primary">{formatDateTime(item.createdAt)}</div>
                      <p className="console-row-sub">审结：{formatDateTime(item.reviewedAt)}</p>
                    </td>
                    <td>
                      <button
                        className={`btn ${selectedId === item.id ? 'primary' : 'secondary'} btn-sm`}
                        onClick={() => setSelectedId(item.id)}
                        type="button"
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
        description="通过后将自动把商品标记为寄售模式；驳回时请填写具体原因，便于卖家整改后重提。"
        className="console-detail stack-12"
      >
        {!selectedItem ? (
          <ConsoleEmpty text="请选择一条寄售申请进行处理" />
        ) : (
          <>
            <div className="console-detail-grid">
              <div className="spec-item">
                <p className="label">申请编号</p>
                <p className="value">{selectedItem.id}</p>
              </div>
              <div className="spec-item">
                <p className="label">商品编号</p>
                <p className="value">{selectedItem.product?.code || '-'}</p>
              </div>
              <div className="spec-item">
                <p className="label">商品价格</p>
                <p className="value">{formatMoney(selectedItem.product?.salePrice)}</p>
              </div>
              <div className="spec-item">
                <p className="label">当前状态</p>
                <p className="value">{statusLabel[selectedItem.status] || selectedItem.status}</p>
              </div>
            </div>

            <div className="console-alert">
              风控提示：请优先核对商品真实性、到期时间、交付可控性以及卖家历史交易信用，再决定是否批准寄售。
            </div>

            <p className="muted">卖家：{selectedItem.seller?.email || '-'}（Lv.{selectedItem.seller?.sellerProfile?.level ?? 1}）</p>
            {selectedItem.sellerNote ? <p className="muted">申请说明：{selectedItem.sellerNote}</p> : null}
            {selectedItem.adminRemark ? <p className="muted">历史审核备注：{selectedItem.adminRemark}</p> : null}

            <div className="form">
              <label>审核备注（建议填写）</label>
              <textarea
                rows={4}
                value={remarks[selectedItem.id] || ''}
                onChange={(e) =>
                  setRemarks((prev) => ({
                    ...prev,
                    [selectedItem.id]: e.target.value
                  }))
                }
                placeholder="例如：已核验商品与交付凭证，允许平台寄售"
              />
            </div>

            {selectedItem.status === 'PENDING' ? (
              <div className="actions">
                <button className="btn primary" disabled={loading} onClick={() => review(selectedItem.id, 'APPROVE')}>
                  审核通过
                </button>
                <button className="btn secondary" disabled={loading} onClick={() => review(selectedItem.id, 'REJECT')}>
                  驳回申请
                </button>
              </div>
            ) : (
              <StatusBadge tone={statusTone(selectedItem.status)}>
                当前申请已完成处理（{statusLabel[selectedItem.status] || selectedItem.status}）
              </StatusBadge>
            )}
          </>
        )}
      </ConsolePanel>
    </main>
  );
}
