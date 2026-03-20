"use client";

import { useCallback, useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type Rule = {
  id: string;
  code: string;
  name: string;
  scene: string;
  action: string;
  priority: number;
  enabled: boolean;
  reason?: string | null;
};

type Hit = {
  id: string;
  scene: string;
  action: string;
  decisionReason?: string | null;
  userId?: string | null;
  ip?: string | null;
  createdAt: string;
};

type Entity = {
  id: string;
  listType: string;
  entityType: string;
  entityValue: string;
  enabled: boolean;
  reason?: string | null;
  expiresAt?: string | null;
};

type RiskOverview = {
  windowDays: number;
  totalHits: number;
  blacklistCount: number;
  watchlistCount: number;
  actionDistribution: Array<{ action: string; count: number }>;
  sceneDistribution: Array<{ scene: string; count: number }>;
  topRiskUsers: Array<{
    userId: string;
    score: number;
    hitCount: number;
    blockCount: number;
    reviewCount: number;
  }>;
};

const sceneLabel: Record<string, string> = {
  WITHDRAW: '提现',
  PAYMENT_CALLBACK: '支付回调',
  LOGIN: '登录',
  CREATE_ORDER: '创建订单',
  CREATE_PRODUCT: '发布商品'
};

const actionLabel: Record<string, string> = {
  REVIEW: '人工复核',
  BLOCK: '拦截',
  ALERT: '告警',
  LIMIT: '限制',
  ALLOW: '放行'
};

const listTypeLabel: Record<string, string> = {
  BLACKLIST: '黑名单',
  WHITELIST: '白名单',
  WATCHLIST: '观察名单'
};

const entityTypeLabel: Record<string, string> = {
  USER_ID: '用户 ID',
  IP: 'IP',
  EMAIL: '邮箱'
};

function label(value: string, map: Record<string, string>) {
  return map[value] || value;
}

export default function AdminRiskPage() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null;
  const [rules, setRules] = useState<Rule[]>([]);
  const [hits, setHits] = useState<Hit[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [overview, setOverview] = useState<RiskOverview | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncingWatchlist, setSyncingWatchlist] = useState(false);
  const [overviewDays, setOverviewDays] = useState('7');
  const [watchlistWindowHours, setWatchlistWindowHours] = useState('24');
  const [watchlistThreshold, setWatchlistThreshold] = useState('12');

  const [ruleForm, setRuleForm] = useState({
    code: '',
    name: '',
    scene: 'WITHDRAW',
    action: 'REVIEW',
    priority: 100,
    amount: 5000,
    reason: ''
  });

  const [entityForm, setEntityForm] = useState({
    listType: 'BLACKLIST',
    entityType: 'USER_ID',
    entityValue: '',
    reason: ''
  });
  const [batchValues, setBatchValues] = useState('');
  const [batchReason, setBatchReason] = useState('');
  const [exportText, setExportText] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    const [rulesRes, hitsRes, entitiesRes, overviewRes] = await Promise.all([
      fetch(`${API_BASE}/admin/risk/rules?page=1&pageSize=30`, { headers }),
      fetch(`${API_BASE}/admin/risk/hits?page=1&pageSize=30`, { headers }),
      fetch(`${API_BASE}/admin/risk/entities?page=1&pageSize=30`, { headers }),
      fetch(`${API_BASE}/admin/risk/overview?days=${Number(overviewDays) || 7}`, { headers })
    ]);

    const [rulesData, hitsData, entitiesData, overviewData] = await Promise.all([
      rulesRes.json(),
      hitsRes.json(),
      entitiesRes.json(),
      overviewRes.json()
    ]);

    if (!rulesRes.ok || !hitsRes.ok || !entitiesRes.ok || !overviewRes.ok) {
      throw new Error('读取风控数据失败');
    }

    setRules(rulesData.list || []);
    setHits(hitsData.list || []);
    setEntities(entitiesData.list || []);
    setOverview(overviewData || null);
  }, [token, overviewDays]);

  useEffect(() => {
    load().catch((e) => setError(e.message || '加载失败'));
  }, [load]);

  const createRule = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/risk/rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          code: ruleForm.code,
          name: ruleForm.name,
          scene: ruleForm.scene,
          action: ruleForm.action,
          priority: Number(ruleForm.priority),
          condition: { field: 'amount', op: 'gt', value: Number(ruleForm.amount) },
          reason: ruleForm.reason || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '创建规则失败');
      setMessage('规则已创建');
      await load();
    } catch (e: any) {
      setError(e.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = async (rule: Rule) => {
    if (!token) return;
    const res = await fetch(`${API_BASE}/admin/risk/rules/${rule.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ enabled: !rule.enabled })
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || '更新失败');
      return;
    }
    setMessage('规则状态已更新');
    await load();
  };

  const addEntity = async () => {
    if (!token) return;
    const res = await fetch(`${API_BASE}/admin/risk/entities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(entityForm)
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || '保存名单失败');
      return;
    }
    setMessage('名单已保存');
    await load();
  };

  const batchImportEntities = async () => {
    if (!token) return;
    const lines = batchValues
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setError('请先填写要导入的名单值（每行一个）');
      return;
    }

    const res = await fetch(`${API_BASE}/admin/risk/entities/batch-upsert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        listType: entityForm.listType,
        entityType: entityForm.entityType,
        entityValues: lines,
        reason: batchReason || undefined
      })
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || '批量导入失败');
      return;
    }
    setMessage(`批量导入成功，共 ${data.count || lines.length} 条`);
    setBatchValues('');
    await load();
  };

  const exportEntities = async () => {
    if (!token) return;
    const params = new URLSearchParams({
      listType: entityForm.listType,
      entityType: entityForm.entityType,
      enabledOnly: 'true'
    });
    const res = await fetch(`${API_BASE}/admin/risk/entities/export?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || '导出失败');
      return;
    }
    const lines = (data.list || []).map((item: { entityValue: string }) => item.entityValue);
    setExportText(lines.join('\n'));
    setMessage(`导出完成，共 ${data.count || lines.length} 条`);
  };

  const syncWatchlist = async () => {
    if (!token) return;
    setSyncingWatchlist(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/admin/risk/watchlist/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          windowHours: Number(watchlistWindowHours) || 24,
          thresholdScore: Number(watchlistThreshold) || 12
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '同步失败');
      setMessage(
        `自动观察名单已同步：新增/刷新 ${data.activated ?? 0} 条，停用 ${data.disabled ?? 0} 条`
      );
      await load();
    } catch (e: any) {
      setError(e.message || '同步失败');
    } finally {
      setSyncingWatchlist(false);
    }
  };

  return (
    <main className="page">
      <header className="section-head">
        <div>
          <p className="eyebrow">管理员中心</p>
          <h1>风控策略</h1>
        </div>
      </header>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <section className="card">
        <h3>风控概览</h3>
        <div className="actions" style={{ marginBottom: 12 }}>
          <label className="muted">
            统计窗口（天）
            <input
              type="number"
              min="1"
              max="90"
              value={overviewDays}
              onChange={(e) => setOverviewDays(e.target.value)}
              style={{ marginLeft: 8, width: 88 }}
            />
          </label>
          <button className="btn secondary" onClick={() => void load()}>
            刷新概览
          </button>
        </div>
        {overview ? (
          <div className="cards">
            <article className="card nested">
              <p className="muted">风险命中总数（{overview.windowDays} 天）</p>
              <h2 style={{ marginTop: 8 }}>{overview.totalHits}</h2>
            </article>
            <article className="card nested">
              <p className="muted">黑名单（启用）</p>
              <h2 style={{ marginTop: 8 }}>{overview.blacklistCount}</h2>
            </article>
            <article className="card nested">
              <p className="muted">自动观察名单（启用）</p>
              <h2 style={{ marginTop: 8 }}>{overview.watchlistCount}</h2>
            </article>
            <article className="card nested stack-8">
              <p className="muted">动作分布</p>
              {(overview.actionDistribution || []).map((item) => (
                <p key={item.action} className="muted">
                  {label(item.action, actionLabel)}: {item.count}
                </p>
              ))}
            </article>
            <article className="card nested stack-8">
              <p className="muted">场景分布</p>
              {(overview.sceneDistribution || []).map((item) => (
                <p key={item.scene} className="muted">
                  {label(item.scene, sceneLabel)}: {item.count}
                </p>
              ))}
            </article>
          </div>
        ) : (
          <p className="muted">暂无概览数据</p>
        )}
      </section>

      <section className="card" style={{ marginTop: '1rem' }}>
        <h3>自动风控评分与观察名单</h3>
        <div className="detail-grid">
          <label>
            窗口（小时）
            <input
              type="number"
              min="1"
              max="336"
              value={watchlistWindowHours}
              onChange={(e) => setWatchlistWindowHours(e.target.value)}
            />
          </label>
          <label>
            触发阈值（分）
            <input
              type="number"
              min="4"
              max="200"
              value={watchlistThreshold}
              onChange={(e) => setWatchlistThreshold(e.target.value)}
            />
          </label>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={syncWatchlist} disabled={syncingWatchlist}>
            {syncingWatchlist ? '同步中...' : '立即同步观察名单'}
          </button>
        </div>
        <p className="muted">
          评分规则：拦截=6，人工复核=4，限制=3，告警=2。超过阈值将自动加入观察名单。
        </p>
        {overview?.topRiskUsers?.length ? (
          <div className="cards">
            {overview.topRiskUsers.map((item) => (
              <article key={item.userId} className="card nested">
                <p>
                  <strong>{item.userId}</strong>
                </p>
                <p className="muted">
                  评分 {item.score} · 命中 {item.hitCount} · 拦截 {item.blockCount} · 人工复核 {item.reviewCount}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">暂无高风险用户</p>
        )}
      </section>

      <section className="card">
        <h3>新增规则</h3>
        <div className="detail-grid">
          <input placeholder="规则编码" value={ruleForm.code} onChange={(e) => setRuleForm({ ...ruleForm, code: e.target.value })} />
          <input placeholder="规则名称" value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} />
          <select value={ruleForm.scene} onChange={(e) => setRuleForm({ ...ruleForm, scene: e.target.value })}>
            <option value="WITHDRAW">提现</option>
            <option value="PAYMENT_CALLBACK">支付回调</option>
            <option value="LOGIN">登录</option>
            <option value="CREATE_ORDER">创建订单</option>
            <option value="CREATE_PRODUCT">发布商品</option>
          </select>
          <select value={ruleForm.action} onChange={(e) => setRuleForm({ ...ruleForm, action: e.target.value })}>
            <option value="REVIEW">人工复核</option>
            <option value="BLOCK">拦截</option>
            <option value="ALERT">告警</option>
            <option value="LIMIT">限制</option>
          </select>
          <input type="number" placeholder="优先级" value={ruleForm.priority} onChange={(e) => setRuleForm({ ...ruleForm, priority: Number(e.target.value) })} />
          <input type="number" placeholder="金额阈值" value={ruleForm.amount} onChange={(e) => setRuleForm({ ...ruleForm, amount: Number(e.target.value) })} />
          <input placeholder="规则说明" value={ruleForm.reason} onChange={(e) => setRuleForm({ ...ruleForm, reason: e.target.value })} />
        </div>
        <div className="actions">
          <button onClick={createRule} disabled={loading}>创建规则</button>
        </div>
      </section>

      <section className="card" style={{ marginTop: '1rem' }}>
        <h3>规则列表</h3>
        <div className="cards">
          {rules.map((rule) => (
            <article key={rule.id} className="card">
              <p><strong>{rule.code}</strong> / {rule.name}</p>
              <p className="muted">场景：{label(rule.scene, sceneLabel)}，动作：{label(rule.action, actionLabel)}</p>
              <p className="muted">优先级：{rule.priority}，状态：{rule.enabled ? '启用' : '停用'}</p>
              <p className="muted">说明：{rule.reason || '-'}</p>
              <button className="secondary" onClick={() => toggleRule(rule)}>
                {rule.enabled ? '停用' : '启用'}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="card" style={{ marginTop: '1rem' }}>
        <h3>黑白名单</h3>
        <div className="detail-grid">
          <select value={entityForm.listType} onChange={(e) => setEntityForm({ ...entityForm, listType: e.target.value })}>
            <option value="BLACKLIST">黑名单</option>
            <option value="WHITELIST">白名单</option>
          </select>
          <select value={entityForm.entityType} onChange={(e) => setEntityForm({ ...entityForm, entityType: e.target.value })}>
            <option value="USER_ID">用户 ID</option>
            <option value="IP">IP</option>
            <option value="EMAIL">邮箱</option>
          </select>
          <input placeholder="值" value={entityForm.entityValue} onChange={(e) => setEntityForm({ ...entityForm, entityValue: e.target.value })} />
          <input placeholder="原因" value={entityForm.reason} onChange={(e) => setEntityForm({ ...entityForm, reason: e.target.value })} />
        </div>
        <div className="actions">
          <button onClick={addEntity}>保存名单</button>
        </div>
        <div className="card nested stack-8">
          <h4 style={{ fontSize: 15, margin: 0 }}>批量导入 / 导出（名单共享）</h4>
          <textarea
            rows={6}
            placeholder="每行一个值，例如用户ID、IP或邮箱"
            value={batchValues}
            onChange={(e) => setBatchValues(e.target.value)}
          />
          <input
            placeholder="批量导入原因（可选）"
            value={batchReason}
            onChange={(e) => setBatchReason(e.target.value)}
          />
          <div className="actions">
            <button className="btn primary" onClick={batchImportEntities}>
              批量导入
            </button>
            <button className="btn secondary" onClick={exportEntities}>
              导出启用名单
            </button>
          </div>
          {exportText ? (
            <textarea
              rows={6}
              value={exportText}
              onChange={(e) => setExportText(e.target.value)}
              placeholder="导出结果（可复制共享）"
            />
          ) : null}
        </div>
        <div className="cards" style={{ marginTop: '1rem' }}>
          {entities.map((entity) => (
            <article key={entity.id} className="card">
              <p><strong>{label(entity.listType, listTypeLabel)}</strong> / {label(entity.entityType, entityTypeLabel)}</p>
              <p className="muted">{entity.entityValue}</p>
              <p className="muted">状态：{entity.enabled ? '启用' : '停用'}，原因：{entity.reason || '-'}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card" style={{ marginTop: '1rem' }}>
        <h3>最近命中</h3>
        {hits.length === 0 ? <p className="muted">暂无命中记录</p> : (
          <div className="cards">
            {hits.map((hit) => (
              <article key={hit.id} className="card">
                <p><strong>{label(hit.scene, sceneLabel)}</strong> / {label(hit.action, actionLabel)}</p>
                <p className="muted">用户：{hit.userId || '-'}</p>
                <p className="muted">IP：{hit.ip || '-'}</p>
                <p className="muted">原因：{hit.decisionReason || '-'}</p>
                <p className="muted">时间：{new Date(hit.createdAt).toLocaleString('zh-CN')}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
