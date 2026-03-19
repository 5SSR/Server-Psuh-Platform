"use client";

import { useState } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

export default function RegisterPage() {
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
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: 'USER' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '注册失败');
      localStorage.setItem('idc_token', data.token);
      setFeedback({ type: 'success', text: '注册成功，正在进入交易市场...' });
      const redirect = new URLSearchParams(window.location.search).get('redirect');
      const nextPath = redirect && redirect.startsWith('/') ? redirect : '/products';
      window.location.replace(nextPath);
    } catch (e: any) {
      setFeedback({ type: 'error', text: e.message || '注册失败，请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page auth-page">
      <section className="auth-layout">
        <aside className="auth-aside">
          <p className="eyebrow">创建账号</p>
          <h1>注册并开始担保交易</h1>
          <p className="muted">
            新账号可立即浏览和下单，建议完成邮箱验证、实名认证与安全设置后再进行大额交易。
          </p>
          <div className="auth-points">
            <div className="auth-point">
              <span className="status-chip info">发布商品</span>
              <p>支持 VPS / 独服 / NAT / GPU 多类型交易</p>
            </div>
            <div className="auth-point">
              <span className="status-chip info">订单履约</span>
              <p>从支付到交付、核验、确认全流程可见</p>
            </div>
            <div className="auth-point">
              <span className="status-chip info">资金管理</span>
              <p>钱包、结算、提现记录清晰可查</p>
            </div>
          </div>
        </aside>

        <section className="auth-panel">
          <div className="auth-panel-head">
            <h2>用户注册</h2>
            <p className="muted">请使用常用邮箱，后续用于交易通知与安全验证。</p>
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
              placeholder="至少 8 位，建议包含字母和数字"
              autoComplete="new-password"
            />
            <button type="submit" className="btn primary" disabled={loading || !email || !password}>
              {loading ? '注册中...' : '注册并进入平台'}
            </button>
          </form>

          <div className="auth-links">
            <Link href="/auth/login">已有账号？去登录</Link>
            <Link href="/auth/verify-email">注册后去验证邮箱</Link>
          </div>

          {feedback.text ? (
            <p className={feedback.type === 'error' ? 'error' : 'success'}>{feedback.text}</p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
