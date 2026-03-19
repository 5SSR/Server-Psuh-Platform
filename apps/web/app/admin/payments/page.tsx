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

type PaymentItem = {
  id: string;
  orderId: string;
  channel: string;
  tradeNo?: string | null;
  amount: number | string;
  payStatus: 'UNPAID' | 'PAID' | 'REFUNDED';
  paidAt?: string | null;
  createdAt: string;
  notifyPayload?: {
    adminReview?: {
      status?: 'NORMAL' | 'SUSPICIOUS' | 'FRAUD';
      remark?: string | null;
      reviewedBy?: string;
      reviewedAt?: string;
    };
    [key: string]: unknown;
  } | null;
  order?: {
    id: string;
    status: string;
    payStatus: string;
    payChannel: string;
    price: number | string;
    fee: number | string;
    buyer?: { id: string; email: string };
    seller?: { id: string; email: string };
    product?: { id: string; title: string; code: string };
  } | null;
};

type ReviewStatus = 'NORMAL' | 'SUSPICIOUS' | 'FRAUD';

const payStatusLabel: Record<string, string> = {
  UNPAID: '待支付',
  PAID: '已支付',
  REFUNDED: '已退款'
};

const reviewStatusLabel: Record<ReviewStatus, string> = {
  NORMAL: '正常',
  SUSPICIOUS: '可疑',
  FRAUD: '风险'
};

function payTone(status: string) {
  if (status === 'PAID') return 'success' as const;
  if (status === 'REFUNDED') return 'warning' as const;
  return 'info' as const;
}

function reviewTone(status?: ReviewStatus) {
  if (status === 'FRAUD') return 'danger' as const;
  if (status === 'SUSPICIOUS') return 'warning' as const;
  if (status === 'NORMAL') return 'success' as const;
  return 'default' as const;
}

export default function AdminPaymentsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [items, setItems] = useState<PaymentItem[]>([]);

  const [payStatus, setPayStatus] = useState('');
  const [channel, setChannel] = useState('');
  const [orderId, setOrderId] = useState('');
  const [tradeNo, setTradeNo] = useState('');
  const [userId, setUserId] = useState('');
  const [keyword, setKeyword] = useState('');
  const [selectedId, setSelectedId] = useState('');

  const [reviewForms, setReviewForms] = useState<Record<string, { status: ReviewStatus; remark: string }>>({});

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
      if (payStatus) params.set('payStatus', payStatus);
      if (channel) params.set('channel', channel);
      if (orderId.trim()) params.set('orderId', orderId.trim());
      if (tradeNo.trim()) params.set('tradeNo', tradeNo.trim());
      if (userId.trim()) params.set('userId', userId.trim());

      const res = await fetch(`${API_BASE}/admin/payments?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取支付记录失败');
      setItems(data.list || []);
      setMessage(`已加载 ${data.total ?? 0} 条支付记录`);
    } catch (e: any) {
      setError(e.message || '读取失败');
    } finally {
      setLoading(false);
    }
  }, [channel, orderId, payStatus, token, tradeNo, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredItems = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    if (!key) return items;
    return items.filter((item) => {
      return (
        item.orderId.toLowerCase().includes(key) ||
        (item.tradeNo || '').toLowerCase().includes(key) ||
        (item.order?.product?.title || '').toLowerCase().includes(key) ||
        (item.order?.buyer?.email || '').toLowerCase().includes(key) ||
        (item.order?.seller?.email || '').toLowerCase().includes(key)
      );
    });
  }, [items, keyword]);

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedId('');
      return;
    }
    if (!selectedId || !filteredItems.find((item) => item.id === selectedId)) {
      setSelectedId(filteredItems[0].id);
    }
  }, [filteredItems, selectedId]);

  const selectedItem = filteredItems.find((item) => item.id === selectedId) || null;

  const getReviewForm = (orderIdValue: string, item: PaymentItem) => {
    return (
      reviewForms[orderIdValue] || {
        status: (item.notifyPayload?.adminReview?.status as ReviewStatus) || 'NORMAL',
        remark: item.notifyPayload?.adminReview?.remark || ''
      }
    );
  };

  const review = async (item: PaymentItem) => {
    if (!token) return;
    const form = getReviewForm(item.orderId, item);
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/payments/${item.orderId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: form.status,
          remark: form.remark || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '保存排查结果失败');
      setMessage(data.message || '支付排查结果已保存');
      await load();
    } catch (e: any) {
      setError(e.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page page-shell admin-console-page">
      <ConsolePageHeader
        eyebrow="管理后台 · 支付监控"
        title="支付流水与风控排查"
        description="统一查看支付状态、交易号与关联订单，标记可疑交易并留存排查结论。"
        tags={[
          { label: '资金托管', tone: 'info' },
          { label: '支付风控', tone: 'warning' },
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
            <label>支付状态</label>
            <select value={payStatus} onChange={(e) => setPayStatus(e.target.value)}>
              <option value="">全部</option>
              <option value="UNPAID">UNPAID</option>
              <option value="PAID">PAID</option>
              <option value="REFUNDED">REFUNDED</option>
            </select>
          </div>
          <div className="field">
            <label>支付渠道</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="">全部</option>
              <option value="BALANCE">BALANCE</option>
              <option value="ALIPAY">ALIPAY</option>
              <option value="WECHAT">WECHAT</option>
              <option value="MANUAL">MANUAL</option>
            </select>
          </div>
          <div className="field">
            <label>订单号</label>
            <input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="精确匹配" />
          </div>
          <div className="field">
            <label>交易号</label>
            <input value={tradeNo} onChange={(e) => setTradeNo(e.target.value)} placeholder="模糊匹配" />
          </div>
          <div className="field">
            <label>用户 ID</label>
            <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="买方或卖方" />
          </div>
          <div className="field">
            <label>关键词</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="订单 / 商品 / 邮箱 / 交易号"
            />
          </div>
        </div>
      </ConsolePanel>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <ConsolePanel title="表格区 · 支付记录" className="stack-12">
        {filteredItems.length === 0 ? (
          <ConsoleEmpty text={loading ? '加载中...' : '暂无支付记录'} />
        ) : (
          <div className="console-table-wrap">
            <table className="console-table">
              <thead>
                <tr>
                  <th>支付 / 订单</th>
                  <th>买家 / 卖家</th>
                  <th>渠道 / 交易号</th>
                  <th>金额</th>
                  <th>支付状态</th>
                  <th>排查标记</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const reviewStatus = item.notifyPayload?.adminReview?.status as ReviewStatus | undefined;
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="console-row-primary">{item.id}</div>
                        <p className="console-row-sub">订单：{item.orderId}</p>
                      </td>
                      <td>
                        <div className="console-row-primary">买家：{item.order?.buyer?.email || '-'}</div>
                        <p className="console-row-sub">卖家：{item.order?.seller?.email || '-'}</p>
                      </td>
                      <td>
                        <div className="console-row-primary">{item.channel}</div>
                        <p className="console-row-sub">{item.tradeNo || '无交易号'}</p>
                      </td>
                      <td>
                        <div className="console-row-primary">{formatMoney(item.amount)}</div>
                        <p className="console-row-sub">创建：{formatDateTime(item.createdAt)}</p>
                      </td>
                      <td>
                        <div className="console-inline-tags">
                          <StatusBadge tone={payTone(item.payStatus)}>{payStatusLabel[item.payStatus] || item.payStatus}</StatusBadge>
                          {item.paidAt ? <span className="console-row-sub">{formatDateTime(item.paidAt)}</span> : null}
                        </div>
                      </td>
                      <td>
                        {reviewStatus ? (
                          <div className="console-inline-tags">
                            <StatusBadge tone={reviewTone(reviewStatus)}>{reviewStatusLabel[reviewStatus]}</StatusBadge>
                            {item.notifyPayload?.adminReview?.reviewedAt ? (
                              <span className="console-row-sub">{formatDateTime(item.notifyPayload.adminReview.reviewedAt)}</span>
                            ) : null}
                          </div>
                        ) : (
                          <StatusBadge>未标注</StatusBadge>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`btn ${selectedId === item.id ? 'primary' : 'secondary'} btn-sm`}
                          onClick={() => setSelectedId(item.id)}
                        >
                          {selectedId === item.id ? '处理中' : '处理'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ConsolePanel>

      <ConsolePanel
        title="详情操作区"
        description="对支付记录进行人工排查标记，可用于后续风控审计与纠纷处理追溯。"
        className="console-detail stack-12"
      >
        {!selectedItem ? (
          <ConsoleEmpty text="请选择一条支付记录进行处理" />
        ) : (
          <>
            <div className="console-detail-grid">
              <div className="spec-item">
                <p className="label">支付编号</p>
                <p className="value">{selectedItem.id}</p>
              </div>
              <div className="spec-item">
                <p className="label">关联订单</p>
                <p className="value">{selectedItem.orderId}</p>
              </div>
              <div className="spec-item">
                <p className="label">商品</p>
                <p className="value">{selectedItem.order?.product?.title || '未知商品'}</p>
              </div>
              <div className="spec-item">
                <p className="label">金额</p>
                <p className="value">{formatMoney(selectedItem.amount)}</p>
              </div>
            </div>

            <div className="console-alert">
              排查建议：重点核对交易号唯一性、买卖双方资金流向与订单状态是否一致，异常应标记为「可疑/风险」。
            </div>

            <div className="form stack-12">
              <div className="console-filter-grid">
                <div className="field">
                  <label>排查标记</label>
                  <select
                    value={getReviewForm(selectedItem.orderId, selectedItem).status}
                    onChange={(e) =>
                      setReviewForms((prev) => ({
                        ...prev,
                        [selectedItem.orderId]: {
                          ...getReviewForm(selectedItem.orderId, selectedItem),
                          status: e.target.value as ReviewStatus
                        }
                      }))
                    }
                  >
                    <option value="NORMAL">NORMAL（正常）</option>
                    <option value="SUSPICIOUS">SUSPICIOUS（可疑）</option>
                    <option value="FRAUD">FRAUD（风险）</option>
                  </select>
                </div>
                <div className="field">
                  <label>支付状态</label>
                  <input value={payStatusLabel[selectedItem.payStatus] || selectedItem.payStatus} disabled />
                </div>
              </div>

              <div className="form">
                <label>排查备注（可选）</label>
                <textarea
                  value={getReviewForm(selectedItem.orderId, selectedItem).remark}
                  onChange={(e) =>
                    setReviewForms((prev) => ({
                      ...prev,
                      [selectedItem.orderId]: {
                        ...getReviewForm(selectedItem.orderId, selectedItem),
                        remark: e.target.value
                      }
                    }))
                  }
                  rows={4}
                  placeholder="例如：交易号重复，已通知财务核对上游账单"
                />
              </div>

              <div className="actions">
                <button className="btn primary" onClick={() => review(selectedItem)} disabled={loading}>
                  保存排查结果
                </button>
              </div>
            </div>
          </>
        )}
      </ConsolePanel>
    </main>
  );
}
