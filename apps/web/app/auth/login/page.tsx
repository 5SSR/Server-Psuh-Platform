"use client";

import { useState } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | '';
    text: string;
  }>({ type: '', text: '' });

  const submit = async () => {
    setLoading(true);
    setFeedback({ type: '', text: '' });
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '登录失败');
      localStorage.setItem('idc_token', data.token);
      setFeedback({ type: 'success', text: '登录成功，正在跳转交易市场...' });
      const redirect = new URLSearchParams(window.location.search).get('redirect');
      const nextPath = redirect && redirect.startsWith('/') ? redirect : '/products';
      window.location.replace(nextPath);
    } catch (e: any) {
      setFeedback({ type: 'error', text: e.message || '登录失败，请检查账号密码' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page auth-page">
      <section className="auth-layout">
        <aside className="auth-aside">
          <p className="eyebrow">账号登录</p>
          <h1>进入 IDC 担保交易平台</h1>
          <p className="muted">
            登录后可查看订单状态、平台核验记录、支付回执、纠纷进度与结算流水。
          </p>
          <div className="auth-points">
            <div className="auth-point">
              <span className="status-chip info">担保支付</span>
              <p>资金托管，交易完成后结算放款</p>
            </div>
            <div className="auth-point">
              <span className="status-chip info">全程留痕</span>
              <p>订单时间线与交付核验记录可追踪</p>
            </div>
            <div className="auth-point">
              <span className="status-chip info">风险可控</span>
              <p>支持退款与纠纷仲裁流程</p>
            </div>
          </div>
        </aside>

        <section className="auth-panel">
          <div className="auth-panel-head">
            <h2>用户登录</h2>
            <p className="muted">使用注册邮箱登录，建议完成邮箱验证和 MFA。</p>
          </div>

          <form
            className="form auth-form"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <label>邮箱地址</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <label>登录密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoComplete="current-password"
            />
            <button type="submit" className="btn primary" disabled={loading || !email || !password}>
              {loading ? '登录中...' : '登录并进入平台'}
            </button>
          </form>

          <div className="auth-links">
            <Link href="/auth/forgot">忘记密码</Link>
            <Link href="/auth/verify-email">邮箱验证</Link>
            <Link href="/auth/register">没有账号？去注册</Link>
          </div>

          {feedback.text ? (
            <p className={feedback.type === 'error' ? 'error' : 'success'}>{feedback.text}</p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
