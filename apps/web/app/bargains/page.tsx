'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type RoleView = 'buyer' | 'seller';
type BargainStatus = 'WAIT_SELLER' | 'WAIT_BUYER' | 'ACCEPTED' | 'REJECTED' | 'CANCELED';
type BargainActor = 'BUYER' | 'SELLER';
type BargainAction = 'COUNTER' | 'ACCEPT' | 'REJECT' | 'CANCEL';

type BargainItem = {
  id: string;
  status: BargainStatus;
  round: number;
  lastActor: BargainActor;
  currentPrice: number | string;
  buyerLastPrice?: number | string | null;
  sellerLastPrice?: number | string | null;
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    code?: string;
    title: string;
    salePrice: number | string;
    region?: string | null;
    lineType?: string | null;
    status: string;
    negotiable?: boolean;
  };
  buyer: {
    id: string;
    email: string;
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
    createdAt: string;
  } | null;
  _count?: {
    logs: number;
  };
};

type BargainLog = {
  id: string;
  action: string;
  actor: BargainActor;
  actorId?: string | null;
  price?: number | string | null;
  remark?: string | null;
  createdAt: string;
};

type BargainDetail = BargainItem & {
  remark?: string | null;
  myActor: BargainActor;
  expectedActor?: BargainActor | null;
  myTurn: boolean;
  allowedActions: BargainAction[];
  logs: BargainLog[];
};

type BargainListResponse = {
  total: number;
  list: BargainItem[];
  page: number;
  pageSize: number;
  as: RoleView;
};

const STATUS_LABEL: Record<BargainStatus, string> = {
  WAIT_SELLER: '待卖家响应',
  WAIT_BUYER: '待买家响应',
  ACCEPTED: '已成交建单',
  REJECTED: '已拒绝',
  CANCELED: '已取消'
};

const STATUS_TONE: Record<BargainStatus, 'info' | 'success' | 'warning' | 'danger'> = {
  WAIT_SELLER: 'info',
  WAIT_BUYER: 'info',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  CANCELED: 'warning'
};

const ACTION_LABEL: Record<string, string> = {
  START: '发起议价',
  COUNTER: '提交还价',
  ACCEPT: '接受报价',
  REJECT: '拒绝报价',
  CANCEL: '取消会话'
};

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('idc_token');
}

function formatMoney(value: number | string | null | undefined) {
  return `¥${Number(value || 0).toFixed(2)}`;
}

function formatTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('zh-CN');
}

export default function BargainsPage() {
  const [roleView, setRoleView] = useState<RoleView>('buyer');
  const [statusFilter, setStatusFilter] = useState('');
  const [initialQueryId, setInitialQueryId] = useState('');

  const [listLoading, setListLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [acting, setActing] = useState(false);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [list, setList] = useState<BargainItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<BargainDetail | null>(null);

  const [counterPrice, setCounterPrice] = useState('');
  const [remark, setRemark] = useState('');

  const stats = useMemo(() => {
    return list.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.status === 'WAIT_SELLER' || item.status === 'WAIT_BUYER') acc.waiting += 1;
        if (item.status === 'ACCEPTED') acc.accepted += 1;
        if (item.status === 'REJECTED' || item.status === 'CANCELED') acc.closed += 1;
        return acc;
      },
      { total: 0, waiting: 0, accepted: 0, closed: 0 }
    );
  }, [list]);

  const loadList = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setError('请先登录后查看议价中心');
      setList([]);
      setTotal(0);
      return;
    }

    setListLoading(true);
    setError('');

    try {
      const query = new URLSearchParams({
        as: roleView,
        page: '1',
        pageSize: '50'
      });
      if (statusFilter) {
        query.set('status', statusFilter);
      }

      const res = await fetch(`${API}/bargains/mine?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = (await res.json()) as BargainListResponse;
      if (!res.ok) {
        throw new Error((data as { message?: string }).message || '读取议价列表失败');
      }

      setList(data.list || []);
      setTotal(Number(data.total || 0));

      const queryId = initialQueryId;
      const nextSelected =
        (queryId && data.list?.some((item) => item.id === queryId) ? queryId : '') ||
        (selectedId && data.list?.some((item) => item.id === selectedId) ? selectedId : '') ||
        data.list?.[0]?.id ||
        '';

      setSelectedId(nextSelected);
    } catch (err) {
      setError(err instanceof Error ? err.message : '读取议价列表失败');
      setList([]);
      setTotal(0);
      setSelectedId('');
    } finally {
      setListLoading(false);
    }
  }, [initialQueryId, roleView, selectedId, statusFilter]);

  const loadDetail = useCallback(async (bargainId: string) => {
    if (!bargainId) {
      setDetail(null);
      return;
    }

    const token = getToken();
    if (!token) return;

    setDetailLoading(true);
    setError('');

    try {
      const res = await fetch(`${API}/bargains/${bargainId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = (await res.json()) as BargainDetail;
      if (!res.ok) {
        throw new Error((data as { message?: string }).message || '读取议价详情失败');
      }
      setDetail(data);
      if (data.currentPrice !== undefined && data.currentPrice !== null) {
        setCounterPrice(Number(data.currentPrice).toFixed(2));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '读取议价详情失败');
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = new URLSearchParams(window.location.search).get('id');
    if (id) {
      setInitialQueryId(id);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const executeAction = async (action: BargainAction) => {
    if (!selectedId) {
      setError('请先选择一条议价记录');
      return;
    }

    const token = getToken();
    if (!token) {
      setError('请先登录后操作');
      return;
    }

    if (action === 'COUNTER') {
      const price = Number(counterPrice);
      if (!Number.isFinite(price) || price <= 0) {
        setError('请输入有效还价金额');
        return;
      }
    }

    setActing(true);
    setError('');
    setMessage('');

    try {
      const body: Record<string, unknown> = {
        action,
        remark: remark.trim() || undefined
      };

      if (action === 'COUNTER') {
        body.price = Number(counterPrice);
      }

      const res = await fetch(`${API}/bargains/${selectedId}/action`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = (await res.json()) as { message?: string; order?: { id: string } };
      if (!res.ok) {
        throw new Error(data.message || '提交议价操作失败');
      }

      const orderTip = data.order?.id ? `，订单号：${data.order.id}` : '';
      setMessage((data.message || '操作成功') + orderTip);

      await loadList();
      await loadDetail(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交议价操作失败');
    } finally {
      setActing(false);
    }
  };

  const renderParty = (item: BargainItem) => {
    const party = roleView === 'buyer' ? item.seller : item.buyer;
    return `${party.email} · Lv.${party.sellerProfile?.level ?? 1}`;
  };

  return (
    <main className="page page-shell">
      <header className="section-head">
        <div>
          <p className="eyebrow">议价中心</p>
          <h1>多轮议价与担保成交</h1>
          <p className="sub">支持买卖双方多轮协商，成交后自动生成担保订单，交易流程持续可追溯。</p>
        </div>
        <div className="toolbar" style={{ alignItems: 'flex-start' }}>
          <Link href="/products" className="btn secondary">返回交易市场</Link>
          <Link href="/orders" className="btn secondary">我的订单</Link>
        </div>
      </header>

      <section className="metric-grid">
        <article className="metric-card">
          <p className="metric-label">当前视角</p>
          <p className="metric-value">{roleView === 'buyer' ? '买家' : '卖家'}</p>
          <p className="metric-tip">议价会话总数 {stats.total}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">等待响应</p>
          <p className="metric-value">{stats.waiting}</p>
          <p className="metric-tip">待你或对方处理</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">达成成交</p>
          <p className="metric-value">{stats.accepted}</p>
          <p className="metric-tip">已自动创建订单</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">已结束</p>
          <p className="metric-value">{stats.closed}</p>
          <p className="metric-tip">拒绝或取消会话</p>
        </article>
      </section>

      <section className="filter-bar">
        <div className="toolbar">
          <button
            type="button"
            className={`btn ${roleView === 'buyer' ? 'primary' : 'secondary'}`}
            onClick={() => setRoleView('buyer')}
          >
            买家视角
          </button>
          <button
            type="button"
            className={`btn ${roleView === 'seller' ? 'primary' : 'secondary'}`}
            onClick={() => setRoleView('seller')}
          >
            卖家视角
          </button>
        </div>
        <div className="filter-grid">
          <div className="field">
            <label>状态筛选</label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">全部状态</option>
              {Object.entries(STATUS_LABEL).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="toolbar">
          <button type="button" className="btn secondary" onClick={() => loadList()} disabled={listLoading}>
            {listLoading ? '刷新中...' : '刷新列表'}
          </button>
          <span className="muted">共 {total} 条议价会话</span>
        </div>
      </section>

      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="success">{message}</p> : null}

      <div className="grid" style={{ alignItems: 'start' }}>
        <section style={{ gridColumn: 'span 5' }} className="card stack-12">
          <h3>议价会话列表</h3>
          {listLoading ? <div className="empty-state">加载中...</div> : null}
          {!listLoading && list.length === 0 ? <div className="empty-state">当前筛选暂无会话</div> : null}
          {!listLoading && list.length > 0 ? (
            <div className="stack-12">
              {list.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="card nested stack-8"
                  style={{ textAlign: 'left', borderColor: selectedId === item.id ? 'var(--color-primary)' : undefined }}
                  onClick={() => setSelectedId(item.id)}
                >
                  <div className="card-header">
                    <div className="stack-8">
                      <h3 style={{ fontSize: 15 }}>{item.product.title}</h3>
                      <p className="muted">对手方：{renderParty(item)}</p>
                    </div>
                    <p className="price" style={{ fontSize: 16 }}>{formatMoney(item.currentPrice)}</p>
                  </div>
                  <div className="status-line">
                    <span className={`status-chip ${STATUS_TONE[item.status]}`}>{STATUS_LABEL[item.status]}</span>
                    <span className="status-chip">第 {item.round} 轮</span>
                    <span className="status-chip">日志 {item._count?.logs || 0} 条</span>
                    {item.order?.id ? <span className="status-chip success">已生成订单</span> : null}
                  </div>
                  <p className="muted">更新于：{formatTime(item.updatedAt)}</p>
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section style={{ gridColumn: 'span 7' }} className="card stack-16">
          <h3>议价详情</h3>

          {!selectedId ? <div className="empty-state">请选择一条议价会话</div> : null}
          {selectedId && detailLoading ? <div className="empty-state">正在加载详情...</div> : null}

          {selectedId && !detailLoading && detail ? (
            <>
              <section className="card nested stack-12">
                <div className="card-header">
                  <div className="stack-8">
                    <h3>{detail.product.title}</h3>
                    <p className="muted">商品编号：{detail.product.code || detail.product.id}</p>
                  </div>
                  <p className="price">{formatMoney(detail.currentPrice)}</p>
                </div>
                <div className="status-line">
                  <span className={`status-chip ${STATUS_TONE[detail.status]}`}>{STATUS_LABEL[detail.status]}</span>
                  <span className="status-chip">当前轮次：第 {detail.round} 轮</span>
                  <span className="status-chip">我的角色：{detail.myActor === 'BUYER' ? '买家' : '卖家'}</span>
                  <span className={`status-chip ${detail.myTurn ? 'success' : 'warning'}`}>
                    {detail.myTurn ? '轮到你响应' : '等待对方响应'}
                  </span>
                </div>
                <div className="spec-grid">
                  <div className="spec-item">
                    <p className="label">商品一口价</p>
                    <p className="value">{formatMoney(detail.product.salePrice)}</p>
                  </div>
                  <div className="spec-item">
                    <p className="label">买家最近报价</p>
                    <p className="value">{formatMoney(detail.buyerLastPrice)}</p>
                  </div>
                  <div className="spec-item">
                    <p className="label">卖家最近报价</p>
                    <p className="value">{formatMoney(detail.sellerLastPrice)}</p>
                  </div>
                  <div className="spec-item">
                    <p className="label">地区 / 线路</p>
                    <p className="value">{detail.product.region || '-'} / {detail.product.lineType || '-'}</p>
                  </div>
                </div>

                {detail.order?.id ? (
                  <div className="console-alert">
                    该议价已达成并生成担保订单：{detail.order.id}，订单状态 {detail.order.status}。
                    <div className="mt-16">
                      <Link href="/orders" className="btn secondary btn-sm">前往我的订单</Link>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="card nested stack-12">
                <h3 style={{ fontSize: 16 }}>会话操作</h3>
                <div className="status-line">
                  {detail.allowedActions.length === 0 ? (
                    <span className="status-chip">当前无可执行操作</span>
                  ) : (
                    detail.allowedActions.map((action) => (
                      <span key={action} className="status-chip info">可执行：{action}</span>
                    ))
                  )}
                </div>

                {detail.allowedActions.includes('COUNTER') ? (
                  <div className="field">
                    <label>还价金额（元）</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={counterPrice}
                      onChange={(event) => setCounterPrice(event.target.value)}
                    />
                  </div>
                ) : null}

                <div className="field">
                  <label>备注（可选）</label>
                  <textarea
                    rows={3}
                    value={remark}
                    onChange={(event) => setRemark(event.target.value)}
                    placeholder="可补充议价原因、交付条件或风控说明"
                  />
                </div>

                <div className="actions">
                  {detail.allowedActions.includes('COUNTER') ? (
                    <button type="button" className="btn primary" onClick={() => executeAction('COUNTER')} disabled={acting}>
                      {acting ? '处理中...' : '提交还价'}
                    </button>
                  ) : null}
                  {detail.allowedActions.includes('ACCEPT') ? (
                    <button type="button" className="btn primary" onClick={() => executeAction('ACCEPT')} disabled={acting}>
                      {acting ? '处理中...' : '接受并建单'}
                    </button>
                  ) : null}
                  {detail.allowedActions.includes('REJECT') ? (
                    <button type="button" className="btn secondary" onClick={() => executeAction('REJECT')} disabled={acting}>
                      拒绝本轮报价
                    </button>
                  ) : null}
                  {detail.allowedActions.includes('CANCEL') ? (
                    <button type="button" className="btn danger" onClick={() => executeAction('CANCEL')} disabled={acting}>
                      取消会话
                    </button>
                  ) : null}
                </div>
              </section>

              <section className="card nested stack-12">
                <h3 style={{ fontSize: 16 }}>议价时间线</h3>
                {detail.logs.length === 0 ? (
                  <div className="empty-state">暂无日志</div>
                ) : (
                  <div className="timeline">
                    {detail.logs.map((log) => (
                      <article key={log.id} className="timeline-item stack-8">
                        <div className="status-line">
                          <span className="status-chip info">{ACTION_LABEL[log.action] || log.action}</span>
                          <span className="status-chip">操作方：{log.actor === 'BUYER' ? '买家' : '卖家'}</span>
                          {log.price !== null && log.price !== undefined ? (
                            <span className="status-chip">价格：{formatMoney(log.price)}</span>
                          ) : null}
                        </div>
                        {log.remark ? <p className="muted">备注：{log.remark}</p> : null}
                        <p className="timeline-meta">{formatTime(log.createdAt)}</p>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}
