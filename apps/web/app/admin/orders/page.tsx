"use client";

import { useCallback, useEffect, useState } from 'react';

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

type VerifyForm = {
  result: 'PASS' | 'FAIL' | 'NEED_MORE';
  cpu: string;
  memory: string;
  disk: string;
  bandwidth: string;
  expireAt: string;
  risk: string;
};

export default function AdminOrdersPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('VERIFYING');
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [forms, setForms] = useState<Record<string, VerifyForm>>({});

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
    <main className="page">
      <header className="section-head">
        <div>
          <p className="eyebrow">管理员中心</p>
          <h1>订单核验</h1>
        </div>
        <button onClick={load} className="secondary" disabled={loading}>
          {loading ? '刷新中...' : '刷新'}
        </button>
      </header>

      <div className="actions">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="VERIFYING">平台核验中</option>
          <option value="PAID_WAITING_DELIVERY">待交付</option>
          <option value="BUYER_CHECKING">买家验机中</option>
          <option value="DISPUTING">纠纷中</option>
          <option value="REFUNDING">退款中</option>
          <option value="">全部状态</option>
        </select>
      </div>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      {orders.length === 0 ? (
        <p className="muted">暂无订单</p>
      ) : (
        <div className="cards">
          {orders.map((order) => {
            const form = getForm(order.id);
            const canVerify = order.status === 'VERIFYING' || order.status === 'BUYER_CHECKING';
            return (
              <article className="card" key={order.id}>
                <div className="card-header">
                  <div>
                    <h3>{order.product?.title || '未知商品'}</h3>
                    <p className="muted">订单号：{order.id}</p>
                  </div>
                  <span className="pill">{statusLabel[order.status] || order.status}</span>
                </div>

                <p className="muted">
                  买家：{order.buyer?.email || '-'} · 卖家：{order.seller?.email || '-'}
                </p>
                <p className="muted">支付状态：{order.payStatus}</p>
                <p className="price">¥{Number(order.price).toFixed(2)}</p>
                {order.verifyRecords?.[0] && (
                  <p className="muted">
                    最近核验：{order.verifyRecords[0].result}（
                    {new Date(order.verifyRecords[0].createdAt).toLocaleString('zh-CN')}）
                  </p>
                )}

                {canVerify && (
                  <div className="form">
                    <label>核验结果</label>
                    <select
                      value={form.result}
                      onChange={(e) =>
                        updateForm(order.id, {
                          result: e.target.value as 'PASS' | 'FAIL' | 'NEED_MORE'
                        })
                      }
                    >
                      <option value="PASS">PASS（通过）</option>
                      <option value="FAIL">FAIL（驳回重交付）</option>
                      <option value="NEED_MORE">NEED_MORE（需补充）</option>
                    </select>

                    <label>CPU核验</label>
                    <input value={form.cpu} onChange={(e) => updateForm(order.id, { cpu: e.target.value })} />
                    <label>内存核验</label>
                    <input
                      value={form.memory}
                      onChange={(e) => updateForm(order.id, { memory: e.target.value })}
                    />
                    <label>磁盘核验</label>
                    <input value={form.disk} onChange={(e) => updateForm(order.id, { disk: e.target.value })} />
                    <label>带宽核验</label>
                    <input
                      value={form.bandwidth}
                      onChange={(e) => updateForm(order.id, { bandwidth: e.target.value })}
                    />
                    <label>到期时间核验</label>
                    <input
                      value={form.expireAt}
                      onChange={(e) => updateForm(order.id, { expireAt: e.target.value })}
                    />
                    <label>风控说明</label>
                    <input value={form.risk} onChange={(e) => updateForm(order.id, { risk: e.target.value })} />

                    <button onClick={() => verify(order.id)} disabled={loading}>
                      提交核验结果
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
