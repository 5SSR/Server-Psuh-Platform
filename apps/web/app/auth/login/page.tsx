"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from '../../../lib/use-locale';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

export default function LoginPage() {
  const { t } = useLocale();
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
      setFeedback({
        type: 'success',
        text: t('登录成功，正在跳转交易市场...', 'Login successful, redirecting to marketplace...')
      });
      const redirect = new URLSearchParams(window.location.search).get('redirect');
      const nextPath = redirect && redirect.startsWith('/') ? redirect : '/products';
      window.location.replace(nextPath);
    } catch (e: any) {
      setFeedback({
        type: 'error',
        text: e.message || t('登录失败，请检查账号密码', 'Login failed, please check email and password')
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page auth-page">
      <section className="auth-layout">
        <aside className="auth-aside">
          <p className="eyebrow">{t('账号登录', 'Sign in')}</p>
          <h1>{t('进入 IDC 担保交易平台', 'Access IDC Escrow Marketplace')}</h1>
          <p className="muted">
            {t(
              '登录后可查看订单状态、平台核验记录、支付回执、纠纷进度与结算流水。',
              'After login, you can track orders, platform verification logs, payment receipts, disputes and settlements.'
            )}
          </p>
          <div className="auth-points">
            <div className="auth-point">
              <span className="status-chip info">{t('担保支付', 'Escrow Payment')}</span>
              <p>{t('资金托管，交易完成后结算放款', 'Funds are escrowed and released after completion')}</p>
            </div>
            <div className="auth-point">
              <span className="status-chip info">{t('全程留痕', 'Full Traceability')}</span>
              <p>{t('订单时间线与交付核验记录可追踪', 'Order timeline and delivery verification are traceable')}</p>
            </div>
            <div className="auth-point">
              <span className="status-chip info">{t('风险可控', 'Risk Control')}</span>
              <p>{t('支持退款与纠纷仲裁流程', 'Refund and dispute arbitration are supported')}</p>
            </div>
          </div>
        </aside>

        <section className="auth-panel">
          <div className="auth-panel-head">
            <h2>{t('用户登录', 'User Login')}</h2>
            <p className="muted">{t('使用注册邮箱登录，建议完成邮箱验证和 MFA。', 'Sign in with your email. Email verification and MFA are recommended.')}</p>
          </div>

          <form
            className="form auth-form"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <label>{t('邮箱地址', 'Email')}</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <label>{t('登录密码', 'Password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('请输入密码', 'Enter your password')}
              autoComplete="current-password"
            />
            <button type="submit" className="btn primary" disabled={loading || !email || !password}>
              {loading ? t('登录中...', 'Signing in...') : t('登录并进入平台', 'Sign in')}
            </button>
          </form>

          <div className="auth-links">
            <Link href="/auth/forgot">{t('忘记密码', 'Forgot password')}</Link>
            <Link href="/auth/verify-email">{t('邮箱验证', 'Verify email')}</Link>
            <Link href="/auth/register">{t('没有账号？去注册', "Don't have an account? Sign up")}</Link>
          </div>

          {feedback.text ? (
            <p className={feedback.type === 'error' ? 'error' : 'success'}>{feedback.text}</p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
