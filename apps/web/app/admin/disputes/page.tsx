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

type DisputeEvidence = {
  id: string;
  userId: string;
  url: string;
  note?: string | null;
  createdAt: string;
};

type DisputeRecord = {
  id: string;
  orderId: string;
  initiator: string;
  status: 'OPEN' | 'PROCESSING' | 'RESOLVED' | 'REJECTED';
  result?: string | null;
  resolution?: string | null;
  evidences?: DisputeEvidence[];
  createdAt: string;
  updatedAt: string;
};

const statusLabel: Record<string, string> = {
  OPEN: '待处理',
  PROCESSING: '处理中',
  RESOLVED: '已解决',
  REJECTED: '已驳回'
};

type DecisionForm = {
  action: 'REFUND' | 'RELEASE';
  status: 'RESOLVED' | 'REJECTED';
  result: string;
  resolution: string;
};

function statusTone(status: string) {
  if (status === 'RESOLVED') return 'success' as const;
  if (status === 'REJECTED') return 'danger' as const;
  if (status === 'PROCESSING') return 'warning' as const;
  return 'info' as const;
}

export default function AdminDisputesPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('OPEN');
  const [keyword, setKeyword] = useState('');
  const [items, setItems] = useState<DisputeRecord[]>([]);
  const [forms, setForms] = useState<Record<string, DecisionForm>>({});
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
        `${API_BASE}/admin/disputes?page=1&pageSize=30${status ? `&status=${status}` : ''}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取纠纷列表失败');
      setItems(data.list || []);
    } catch (e: any) {
      setError(e.message || '读取失败');
    } finally {
      setLoading(false);
    }
  }, [status, token]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredItems = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    if (!key) return items;
    return items.filter((item) => {
      return (
        item.orderId.toLowerCase().includes(key) ||
        item.initiator.toLowerCase().includes(key) ||
        (item.result || '').toLowerCase().includes(key) ||
        (item.resolution || '').toLowerCase().includes(key)
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

  const getForm = (orderId: string): DecisionForm => {
    return (
      forms[orderId] || {
        action: 'REFUND',
        status: 'RESOLVED',
        result: '',
        resolution: ''
      }
    );
  };

  const updateForm = (orderId: string, patch: Partial<DecisionForm>) => {
    setForms((prev) => ({
      ...prev,
      [orderId]: {
        ...getForm(orderId),
        ...patch
      }
    }));
  };

  const decide = async (orderId: string) => {
    if (!token) return;
    const form = getForm(orderId);
    if (!form.result.trim()) {
      setError('请填写裁决结论');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/disputes/${orderId}/decision`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: form.status,
          action: form.action,
          result: form.result.trim(),
          resolution: form.resolution.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '裁决失败');
      setMessage('纠纷裁决已处理');
      await load();
    } catch (e: any) {
      setError(e.message || '裁决失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page page-shell admin-console-page">
      <ConsolePageHeader
        eyebrow="管理后台 · 纠纷仲裁"
        title="纠纷处理与裁决"
        description="集中处理担保交易中的争议订单，基于证据与核验记录执行标准化裁决。"
        tags={[
          { label: '争议仲裁', tone: 'warning' },
          { label: '证据留痕', tone: 'info' },
          { label: `记录 ${items.length} 条`, tone: 'default' }
        ]}
        actions={
          <button className="btn secondary" onClick={load} disabled={loading}>
            {loading ? '刷新中...' : '刷新列表'}
          </button>
        }
      />

      <ConsolePanel title="筛选区" className="stack-12">
        <div className="console-filter-grid">
          <div className="field">
            <label>纠纷状态</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="OPEN">待处理</option>
              <option value="PROCESSING">处理中</option>
              <option value="RESOLVED">已解决</option>
              <option value="REJECTED">已驳回</option>
              <option value="">全部</option>
            </select>
          </div>
          <div className="field">
            <label>关键词</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="订单号 / 发起方 / 结论"
            />
          </div>
          <div className="field">
            <label>裁决动作</label>
            <input value="REFUND / RELEASE" disabled />
          </div>
          <div className="field">
            <label>处理原则</label>
            <input value="证据 + 交付记录 + 核验记录" disabled />
          </div>
        </div>
      </ConsolePanel>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <ConsolePanel title="表格区 · 纠纷工单" className="stack-12">
        {filteredItems.length === 0 ? (
          <ConsoleEmpty text={loading ? '加载中...' : '暂无纠纷记录'} />
        ) : (
          <div className="console-table-wrap">
            <table className="console-table console-table-mobile">
              <thead>
                <tr>
                  <th>工单 / 订单</th>
                  <th>发起方</th>
                  <th>状态</th>
                  <th>当前结论</th>
                  <th>证据数</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td data-label="工单 / 订单">
                      <div className="console-row-primary">{item.id}</div>
                      <p className="console-row-sub">订单：{item.orderId}</p>
                    </td>
                    <td data-label="发起方">
                      <div className="console-row-primary">{item.initiator}</div>
                    </td>
                    <td data-label="状态">
                      <StatusBadge tone={statusTone(item.status)}>{statusLabel[item.status] || item.status}</StatusBadge>
                    </td>
                    <td data-label="当前结论">
                      <div className="console-row-primary">{item.result || '-'}</div>
                      <p className="console-row-sub">{item.resolution || '暂无处理说明'}</p>
                    </td>
                    <td data-label="证据数">
                      <div className="console-row-primary">{item.evidences?.length || 0}</div>
                    </td>
                    <td data-label="创建时间">{formatDateTime(item.createdAt)}</td>
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
        description="先审查证据，再给出裁决状态、执行动作与结论，结果将影响退款或放款走向。"
        className="console-detail stack-12"
      >
        {!selectedItem ? (
          <ConsoleEmpty text="请选择一条纠纷工单进行处理" />
        ) : (
          <>
            <div className="console-detail-grid">
              <div className="spec-item">
                <p className="label">纠纷工单</p>
                <p className="value">{selectedItem.id}</p>
              </div>
              <div className="spec-item">
                <p className="label">关联订单</p>
                <p className="value">{selectedItem.orderId}</p>
              </div>
              <div className="spec-item">
                <p className="label">当前状态</p>
                <p className="value">{statusLabel[selectedItem.status] || selectedItem.status}</p>
              </div>
              <div className="spec-item">
                <p className="label">最近更新时间</p>
                <p className="value">{formatDateTime(selectedItem.updatedAt)}</p>
              </div>
            </div>

            <div className="console-alert">
              仲裁建议：优先核验双方证据时间线与内容一致性，再决定退款买家或放款卖家。
            </div>

            <div className="stack-12">
              <h3>证据列表</h3>
              {!selectedItem.evidences || selectedItem.evidences.length === 0 ? (
                <p className="muted">暂无证据</p>
              ) : (
                <div className="console-table-wrap">
                  <table className="console-table console-table-mobile">
                    <thead>
                      <tr>
                        <th>证据 ID</th>
                        <th>提交用户</th>
                        <th>备注</th>
                        <th>提交时间</th>
                        <th>链接</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedItem.evidences.map((ev) => (
                        <tr key={ev.id}>
                          <td data-label="证据 ID">{ev.id}</td>
                          <td data-label="提交用户">{ev.userId}</td>
                          <td data-label="备注">{ev.note || '-'}</td>
                          <td data-label="提交时间">{formatDateTime(ev.createdAt)}</td>
                          <td data-label="链接">
                            <a href={ev.url} target="_blank" rel="noreferrer">
                              查看证据
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {selectedItem.status === 'OPEN' || selectedItem.status === 'PROCESSING' ? (
              <div className="form stack-12">
                <div className="console-filter-grid">
                  <div className="field">
                    <label>裁决状态</label>
                    <select
                      value={getForm(selectedItem.orderId).status}
                      onChange={(e) =>
                        updateForm(selectedItem.orderId, {
                          status: e.target.value as 'RESOLVED' | 'REJECTED'
                        })
                      }
                    >
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>执行动作</label>
                    <select
                      value={getForm(selectedItem.orderId).action}
                      onChange={(e) =>
                        updateForm(selectedItem.orderId, {
                          action: e.target.value as 'REFUND' | 'RELEASE'
                        })
                      }
                    >
                      <option value="REFUND">REFUND（退款买家）</option>
                      <option value="RELEASE">RELEASE（放款卖家）</option>
                    </select>
                  </div>
                </div>

                <div className="form">
                  <label>裁决结论（必填）</label>
                  <textarea
                    value={getForm(selectedItem.orderId).result}
                    onChange={(e) => updateForm(selectedItem.orderId, { result: e.target.value })}
                    rows={4}
                    placeholder="例如：卖家交付信息与商品描述不一致，支持退款"
                  />
                </div>

                <div className="form">
                  <label>处理说明（可选）</label>
                  <textarea
                    value={getForm(selectedItem.orderId).resolution}
                    onChange={(e) => updateForm(selectedItem.orderId, { resolution: e.target.value })}
                    rows={3}
                    placeholder="补充处理细节"
                  />
                </div>

                <div className="actions">
                  <button className="btn primary" onClick={() => decide(selectedItem.orderId)} disabled={loading}>
                    提交裁决
                  </button>
                </div>
              </div>
            ) : (
              <p className="muted">该纠纷已完成处理，无需重复裁决。</p>
            )}
          </>
        )}
      </ConsolePanel>
    </main>
  );
}
