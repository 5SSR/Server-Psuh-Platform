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

export default function AdminRiskPage() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null;
  const [rules, setRules] = useState<Rule[]>([]);
  const [hits, setHits] = useState<Hit[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

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

  const load = useCallback(async () => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    const [rulesRes, hitsRes, entitiesRes] = await Promise.all([
      fetch(`${API_BASE}/admin/risk/rules?page=1&pageSize=30`, { headers }),
      fetch(`${API_BASE}/admin/risk/hits?page=1&pageSize=30`, { headers }),
      fetch(`${API_BASE}/admin/risk/entities?page=1&pageSize=30`, { headers })
    ]);

    const [rulesData, hitsData, entitiesData] = await Promise.all([
      rulesRes.json(),
      hitsRes.json(),
      entitiesRes.json()
    ]);

    if (!rulesRes.ok || !hitsRes.ok || !entitiesRes.ok) {
      throw new Error('读取风控数据失败');
    }

    setRules(rulesData.list || []);
    setHits(hitsData.list || []);
    setEntities(entitiesData.list || []);
  }, [token]);

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
        <h3>新增规则</h3>
        <div className="detail-grid">
          <input placeholder="规则编码" value={ruleForm.code} onChange={(e) => setRuleForm({ ...ruleForm, code: e.target.value })} />
          <input placeholder="规则名称" value={ruleForm.name} onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })} />
          <select value={ruleForm.scene} onChange={(e) => setRuleForm({ ...ruleForm, scene: e.target.value })}>
            <option value="WITHDRAW">WITHDRAW</option>
            <option value="PAYMENT_CALLBACK">PAYMENT_CALLBACK</option>
            <option value="LOGIN">LOGIN</option>
            <option value="CREATE_ORDER">CREATE_ORDER</option>
          </select>
          <select value={ruleForm.action} onChange={(e) => setRuleForm({ ...ruleForm, action: e.target.value })}>
            <option value="REVIEW">REVIEW</option>
            <option value="BLOCK">BLOCK</option>
            <option value="ALERT">ALERT</option>
            <option value="LIMIT">LIMIT</option>
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
              <p className="muted">场景：{rule.scene}，动作：{rule.action}</p>
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
            <option value="BLACKLIST">BLACKLIST</option>
            <option value="WHITELIST">WHITELIST</option>
          </select>
          <select value={entityForm.entityType} onChange={(e) => setEntityForm({ ...entityForm, entityType: e.target.value })}>
            <option value="USER_ID">USER_ID</option>
            <option value="IP">IP</option>
            <option value="EMAIL">EMAIL</option>
          </select>
          <input placeholder="值" value={entityForm.entityValue} onChange={(e) => setEntityForm({ ...entityForm, entityValue: e.target.value })} />
          <input placeholder="原因" value={entityForm.reason} onChange={(e) => setEntityForm({ ...entityForm, reason: e.target.value })} />
        </div>
        <div className="actions">
          <button onClick={addEntity}>保存名单</button>
        </div>
        <div className="cards" style={{ marginTop: '1rem' }}>
          {entities.map((entity) => (
            <article key={entity.id} className="card">
              <p><strong>{entity.listType}</strong> / {entity.entityType}</p>
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
                <p><strong>{hit.scene}</strong> / {hit.action}</p>
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
