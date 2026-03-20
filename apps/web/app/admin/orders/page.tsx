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

type OrderItem = {
  id: string;
  status: string;
  payStatus: string;
  price: number | string;
  product?: {
    id: string;
    title: string;
    code: string;
  };
  buyer?: {
    email: string;
  };
  seller?: {
    email: string;
  };
  verifyRecords?: Array<{
    id: string;
    result: string;
    createdAt: string;
  }>;
  createdAt: string;
};

const statusLabel: Record<string, string> = {
  PENDING_PAYMENT: '待支付',
  PAID_WAITING_DELIVERY: '待交付',
  VERIFYING: '平台核验中',
  BUYER_CHECKING: '买家验机中',
  COMPLETED_PENDING_SETTLEMENT: '待结算',
  COMPLETED: '已完成',
  REFUNDING: '退款中',
  DISPUTING: '纠纷中',
  CANCELED: '已取消'
};

const payStatusLabel: Record<string, string> = {
  UNPAID: '未支付',
  PAID: '已支付',
  REFUNDED: '已退款'
};

type VerifyForm = {
  result: 'PASS' | 'FAIL' | 'NEED_MORE';
  cpu: string;
  memory: string;
  disk: string;
  bandwidth: string;
  expireAt: string;
  risk: string;
};

function statusTone(status: string) {
  if (status === 'COMPLETED') return 'success' as const;
  if (status === 'REFUNDING' || status === 'DISPUTING' || status === 'CANCELED') return 'danger' as const;
  if (status === 'VERIFYING' || status === 'BUYER_CHECKING') return 'warning' as const;
  return 'info' as const;
}

function verifyTone(result?: string) {
  if (!result) return 'default' as const;
  if (result === 'PASS') return 'success' as const;
  if (result === 'FAIL') return 'danger' as const;
  return 'warning' as const;
}

export default function AdminOrdersPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('VERIFYING');
  const [keyword, setKeyword] = useState('');
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [forms, setForms] = useState<Record<string, VerifyForm>>({});
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
      const res = await fetch(
        `${API_BASE}/admin/orders?page=1&pageSize=30${status ? `&status=${status}` : ''}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取订单失败');
      setOrders(data.list || []);
    } catch (e: any) {
      setError(e.message || '读取失败');
    } finally {
      setLoading(false);
    }
  }, [status, token]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredOrders = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    if (!key) return orders;
    return orders.filter((item) => {
      return (
        item.id.toLowerCase().includes(key) ||
        (item.product?.title || '').toLowerCase().includes(key) ||
        (item.product?.code || '').toLowerCase().includes(key) ||
        (item.buyer?.email || '').toLowerCase().includes(key) ||
        (item.seller?.email || '').toLowerCase().includes(key)
      );
    });
  }, [orders, keyword]);

  useEffect(() => {
    if (!filteredOrders.length) {
      setSelectedId('');
      return;
    }
    if (!selectedId || !filteredOrders.find((item) => item.id === selectedId)) {
      setSelectedId(filteredOrders[0].id);
    }
  }, [filteredOrders, selectedId]);

  const selectedOrder = filteredOrders.find((item) => item.id === selectedId) || null;

  const getForm = (orderId: string): VerifyForm => {
    return (
      forms[orderId] || {
        result: 'PASS',
        cpu: '',
        memory: '',
        disk: '',
        bandwidth: '',
        expireAt: '',
        risk: ''
      }
    );
  };

  const updateForm = (orderId: string, patch: Partial<VerifyForm>) => {
    setForms((prev) => ({
      ...prev,
      [orderId]: {
        ...getForm(orderId),
        ...patch
      }
    }));
  };

  const verify = async (orderId: string) => {
    if (!token) return;
    const form = getForm(orderId);
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          result: form.result,
          checklist: {
            cpu: form.cpu || undefined,
            memory: form.memory || undefined,
            disk: form.disk || undefined,
            bandwidth: form.bandwidth || undefined,
            expireAt: form.expireAt || undefined,
            risk: form.risk || undefined
          }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '核验失败');
      setMessage(`核验完成，下一状态：${data.nextStatus || '已更新'}`);
      await load();
    } catch (e: any) {
      setError(e.message || '核验失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page page-shell admin-console-page">
      <ConsolePageHeader
        eyebrow="管理后台 · 订单核验"
        title="订单履约核验中心"
        description="聚焦担保交易中的交付核验环节，规范记录核验结论，降低错配与争议风险。"
        tags={[
          { label: '担保交易流程', tone: 'info' },
          { label: '平台核验', tone: 'warning' },
          { label: `订单 ${orders.length} 条`, tone: 'default' }
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
            <label>订单状态</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="VERIFYING">平台核验中</option>
              <option value="PAID_WAITING_DELIVERY">待交付</option>
              <option value="BUYER_CHECKING">买家验机中</option>
              <option value="DISPUTING">纠纷中</option>
              <option value="REFUNDING">退款中</option>
              <option value="">全部状态</option>
            </select>
          </div>
          <div className="field">
            <label>关键词</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="订单号 / 商品 / 买卖家邮箱"
            />
          </div>
          <div className="field">
            <label>支付状态</label>
            <input value="自动读取" disabled />
          </div>
          <div className="field">
            <label>交易模式</label>
            <input value="担保托管" disabled />
          </div>
        </div>
      </ConsolePanel>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <ConsolePanel
        title="表格区 · 订单列表"
        description="按状态筛选订单，先选中记录，再在详情区提交核验结果。"
        className="stack-12"
      >
        {filteredOrders.length === 0 ? (
          <ConsoleEmpty text={loading ? '加载中...' : '暂无匹配订单'} />
        ) : (
          <div className="console-table-wrap">
            <table className="console-table console-table-mobile">
              <thead>
                <tr>
                  <th>订单 / 商品</th>
                  <th>买家 / 卖家</th>
                  <th>流程状态</th>
                  <th>金额</th>
                  <th>最近核验</th>
                  <th>担保提示</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const latestVerify = order.verifyRecords?.[0];
                  return (
                    <tr key={order.id}>
                      <td data-label="订单 / 商品">
                        <div className="console-row-primary">{order.id}</div>
                        <p className="console-row-sub">{order.product?.title || '未知商品'}</p>
                      </td>
                      <td data-label="买家 / 卖家">
                        <div className="console-row-primary">买家：{order.buyer?.email || '-'}</div>
                        <p className="console-row-sub">卖家：{order.seller?.email || '-'}</p>
                      </td>
                      <td data-label="流程状态">
                        <div className="console-inline-tags">
                          <StatusBadge tone={statusTone(order.status)}>{statusLabel[order.status] || order.status}</StatusBadge>
                          <StatusBadge tone={order.payStatus === 'PAID' ? 'success' : 'warning'}>
                            {payStatusLabel[order.payStatus] || order.payStatus}
                          </StatusBadge>
                        </div>
                      </td>
                      <td data-label="金额">
                        <div className="console-row-primary">{formatMoney(order.price)}</div>
                        <p className="console-row-sub">托管资金</p>
                      </td>
                      <td data-label="最近核验">
                        {latestVerify ? (
                          <div className="console-inline-tags">
                            <StatusBadge tone={verifyTone(latestVerify.result)}>{latestVerify.result}</StatusBadge>
                            <span className="console-row-sub">{formatDateTime(latestVerify.createdAt)}</span>
                          </div>
                        ) : (
                          <span className="muted">暂无</span>
                        )}
                      </td>
                      <td data-label="担保提示">
                        <div className="console-inline-tags">
                          <StatusBadge tone="info">平台担保</StatusBadge>
                          {(order.status === 'DISPUTING' || order.status === 'REFUNDING') && (
                            <StatusBadge tone="danger">风险阶段</StatusBadge>
                          )}
                        </div>
                      </td>
                      <td data-label="操作">
                        <button
                          type="button"
                          onClick={() => setSelectedId(order.id)}
                          className={`btn ${selectedId === order.id ? 'primary' : 'secondary'} btn-sm`}
                        >
                          {selectedId === order.id ? '处理中' : '处理'}
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
        description="填写核验清单并提交结果，核验记录将进入订单审计链路。"
        className="console-detail stack-12"
      >
        {!selectedOrder ? (
          <ConsoleEmpty text="请选择一条订单记录进行处理" />
        ) : (
          <>
            <div className="console-detail-grid">
              <div className="spec-item">
                <p className="label">订单号</p>
                <p className="value">{selectedOrder.id}</p>
              </div>
              <div className="spec-item">
                <p className="label">商品</p>
                <p className="value">{selectedOrder.product?.title || '未知商品'}</p>
              </div>
              <div className="spec-item">
                <p className="label">订单状态</p>
                <p className="value">{statusLabel[selectedOrder.status] || selectedOrder.status}</p>
              </div>
              <div className="spec-item">
                <p className="label">创建时间</p>
                <p className="value">{formatDateTime(selectedOrder.createdAt)}</p>
              </div>
            </div>

            <div className="console-alert">
              核验重点：CPU / 内存 / 磁盘 / 带宽 / 到期时间与商品描述一致性，异常需标注风险说明，供纠纷与风控追溯。
            </div>

            {selectedOrder.status === 'VERIFYING' || selectedOrder.status === 'BUYER_CHECKING' ? (
              <div className="form stack-12">
                <div className="console-filter-grid">
                  <div className="field">
                    <label>核验结果</label>
                    <select
                      value={getForm(selectedOrder.id).result}
                      onChange={(e) =>
                        updateForm(selectedOrder.id, {
                          result: e.target.value as 'PASS' | 'FAIL' | 'NEED_MORE'
                        })
                      }
                    >
                      <option value="PASS">PASS（通过）</option>
                      <option value="FAIL">FAIL（驳回重交付）</option>
                      <option value="NEED_MORE">NEED_MORE（需补充）</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>CPU核验</label>
                    <input
                      value={getForm(selectedOrder.id).cpu}
                      onChange={(e) => updateForm(selectedOrder.id, { cpu: e.target.value })}
                      placeholder="如：E5-2680v4*2"
                    />
                  </div>
                  <div className="field">
                    <label>内存核验</label>
                    <input
                      value={getForm(selectedOrder.id).memory}
                      onChange={(e) => updateForm(selectedOrder.id, { memory: e.target.value })}
                      placeholder="如：64GB"
                    />
                  </div>
                  <div className="field">
                    <label>磁盘核验</label>
                    <input
                      value={getForm(selectedOrder.id).disk}
                      onChange={(e) => updateForm(selectedOrder.id, { disk: e.target.value })}
                      placeholder="如：1TB NVMe"
                    />
                  </div>
                  <div className="field">
                    <label>带宽核验</label>
                    <input
                      value={getForm(selectedOrder.id).bandwidth}
                      onChange={(e) => updateForm(selectedOrder.id, { bandwidth: e.target.value })}
                      placeholder="如：100Mbps"
                    />
                  </div>
                  <div className="field">
                    <label>到期时间核验</label>
                    <input
                      value={getForm(selectedOrder.id).expireAt}
                      onChange={(e) => updateForm(selectedOrder.id, { expireAt: e.target.value })}
                      placeholder="如：2026-12-31"
                    />
                  </div>
                </div>

                <div className="form">
                  <label>风控说明</label>
                  <textarea
                    value={getForm(selectedOrder.id).risk}
                    onChange={(e) => updateForm(selectedOrder.id, { risk: e.target.value })}
                    rows={4}
                    placeholder="如：配置一致，但交付渠道延迟，已提醒卖家修复"
                  />
                </div>

                <div className="actions">
                  <button className="btn primary" onClick={() => verify(selectedOrder.id)} disabled={loading}>
                    提交核验结果
                  </button>
                </div>
              </div>
            ) : (
              <p className="muted">当前订单状态无需平台核验，可在上方列表继续处理其他订单。</p>
            )}
          </>
        )}
      </ConsolePanel>
    </main>
  );
}
