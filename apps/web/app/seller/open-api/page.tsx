"use client";

import { useCallback, useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type ApiKeyItem = {
  id: string;
  name: string;
  keyPrefix: string;
  scope?: string | null;
  status: string;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
};

export default function SellerOpenApiPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [name, setName] = useState('商品发布机器人');
  const [scope, setScope] = useState('PRODUCT:WRITE');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [createdSecret, setCreatedSecret] = useState('');
  const [signatureExample, setSignatureExample] = useState('');

  const load = useCallback(async () => {
    const token = localStorage.getItem('idc_token');
    if (!token) return;

    const res = await fetch(`${API_BASE}/open/keys`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || '加载密钥失败');
    }

    setKeys(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message || '加载失败'));
  }, [load]);

  const createKey = async () => {
    const token = localStorage.getItem('idc_token');
    if (!token) return;
    if (!name.trim()) {
      setError('请填写密钥名称');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    setCreatedSecret('');

    try {
      const res = await fetch(`${API_BASE}/open/keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          scope: scope.trim() || 'PRODUCT:WRITE',
          expiresAt: expiresAt || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '创建失败');

      setMessage('API Key 创建成功');
      setCreatedSecret(data.apiKey || '');
      setSignatureExample('');
      await load();
    } catch (e: any) {
      setError(e.message || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  const revokeKey = async (id: string) => {
    const token = localStorage.getItem('idc_token');
    if (!token) return;
    if (!window.confirm('确认撤销该密钥？撤销后不可恢复。')) return;

    setError('');
    setMessage('');

    const res = await fetch(`${API_BASE}/open/keys/${id}/revoke`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.message || '撤销失败');
      return;
    }

    setMessage(data.message || '已撤销');
    await load();
  };

  return (
    <main className="page page-shell">
      <header className="section-head">
        <div>
          <p className="eyebrow">卖家中心</p>
          <h1>开放接口 / API Key</h1>
          <p className="muted">用于上游面板、自动化脚本发布商品与拉取配置，避免手工重复录入。</p>
        </div>
      </header>

      {message ? <p className="success">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      <section className="card stack-12">
        <h3>创建 API Key</h3>
        <div className="detail-grid">
          <div className="field">
            <label>密钥名称</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：发布机房脚本" />
          </div>
          <div className="field">
            <label>作用域</label>
            <input value={scope} onChange={(e) => setScope(e.target.value)} placeholder="PRODUCT:WRITE" />
          </div>
          <div className="field">
            <label>过期时间（可选）</label>
            <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
        </div>
        <div className="actions">
          <button className="btn primary" onClick={createKey} disabled={loading}>
            {loading ? '创建中...' : '创建密钥'}
          </button>
        </div>
        {createdSecret ? (
          <div className="card nested stack-8">
            <p className="muted">请立即保存密钥（仅展示一次）</p>
            <code style={{ wordBreak: 'break-all' }}>{createdSecret}</code>
          </div>
        ) : null}
      </section>

      <section className="card stack-12">
        <h3>密钥列表</h3>
        {keys.length === 0 ? (
          <div className="empty-state">暂无密钥，请先创建。</div>
        ) : (
          <div className="cards">
            {keys.map((item) => (
              <article key={item.id} className="card nested stack-8">
                <div className="card-header">
                  <h4>{item.name}</h4>
                  <span className={`status-chip ${item.status === 'ACTIVE' ? 'success' : ''}`}>{item.status}</span>
                </div>
                <p className="muted">前缀：{item.keyPrefix}********</p>
                <p className="muted">作用域：{item.scope || '-'}</p>
                <p className="muted">最后使用：{item.lastUsedAt ? new Date(item.lastUsedAt).toLocaleString('zh-CN') : '未使用'}</p>
                <p className="muted">过期时间：{item.expiresAt ? new Date(item.expiresAt).toLocaleString('zh-CN') : '长期有效'}</p>
                <div className="actions">
                  <button
                    className="btn secondary"
                    onClick={() => revokeKey(item.id)}
                    disabled={item.status !== 'ACTIVE'}
                  >
                    撤销密钥
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card stack-12">
        <h3>调用示例</h3>
        <pre className="card nested" style={{ whiteSpace: 'pre-wrap', overflowX: 'auto' }}>{`API_KEY="idc_sk_xxx"
TS=$(date +%s)
NONCE=$(openssl rand -hex 12)
BODY='{"title":"HK CMI 4C8G","category":"VPS","region":"中国香港","salePrice":180,"negotiable":true,"consignment":false,"deliveryType":"FULL_ACCOUNT","canChangeEmail":true,"canChangeRealname":false}'
BODY_HASH=$(printf '%s' "$BODY" | shasum -a 256 | awk '{print $1}')
SIGN_TEXT="POST\\n/api/v1/open/products\\n\${TS}\\n\${NONCE}\\n\${BODY_HASH}"
SIGN=$(printf '%s' "$SIGN_TEXT" | openssl dgst -sha256 -hmac "$API_KEY" | awk '{print $2}')

curl -X POST '\${API_BASE}/open/products' \\
  -H 'Content-Type: application/json' \\
  -H "x-api-key: $API_KEY" \\
  -H "x-timestamp: $TS" \\
  -H "x-nonce: $NONCE" \\
  -H "x-signature: $SIGN" \\
  -d "$BODY"`}</pre>
        <p className="muted">
          签名串格式：
          <code>{'METHOD + "\\n" + PATH + "\\n" + TIMESTAMP + "\\n" + NONCE + "\\n" + SHA256(BODY)'}</code>
          。
          同样适用于 <code>POST /open/products/provider/sync</code>。
        </p>
        {signatureExample ? <p className="muted">{signatureExample}</p> : null}
      </section>
    </main>
  );
}
