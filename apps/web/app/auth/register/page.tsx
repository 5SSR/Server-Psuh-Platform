"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from '../../../lib/use-locale';
import { toLocaleHref, toLocalePath } from '../../../lib/locale';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

export default function RegisterPage() {
  const { t, locale } = useLocale();
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
      setFeedback({
        type: 'success',
        text: t('注册成功，正在进入交易市场...', 'Registration successful, redirecting to marketplace...')
      });
      const redirect = new URLSearchParams(window.location.search).get('redirect');
      const nextPath = redirect && redirect.startsWith('/') ? redirect : toLocalePath('/products', locale);
      window.location.replace(nextPath);
    } catch (e: any) {
      setFeedback({
        type: 'error',
        text: e.message || t('注册失败，请稍后重试', 'Registration failed, please try again')
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page auth-page">
      <section className="auth-layout">
        <aside className="auth-aside">
          <p className="eyebrow">{t('创建账号', 'Create account')}</p>
          <h1>{t('注册并开始担保交易', 'Join and start escrow trading')}</h1>
          <p className="muted">
            {t(
              '新账号可立即浏览和下单，建议完成邮箱验证、实名认证与安全设置后再进行大额交易。',
              'New accounts can browse and place orders immediately. Complete verification and security setup before large transactions.'
            )}
          </p>
          <div className="auth-points">
            <div className="auth-point">
              <span className="status-chip info">{t('发布商品', 'List Products')}</span>
              <p>{t('支持 VPS / 独服 / NAT / GPU 多类型交易', 'Supports VPS / dedicated / NAT / GPU transactions')}</p>
            </div>
            <div className="auth-point">
              <span className="status-chip info">{t('订单履约', 'Order Fulfillment')}</span>
              <p>{t('从支付到交付、核验、确认全流程可见', 'Full flow visibility from payment to delivery and confirmation')}</p>
            </div>
            <div className="auth-point">
              <span className="status-chip info">{t('资金管理', 'Fund Management')}</span>
              <p>{t('钱包、结算、提现记录清晰可查', 'Wallet, settlements and withdrawals are traceable')}</p>
            </div>
          </div>
        </aside>

        <section className="auth-panel">
          <div className="auth-panel-head">
            <h2>{t('用户注册', 'User Registration')}</h2>
            <p className="muted">{t('请使用常用邮箱，后续用于交易通知与安全验证。', 'Use a valid email for transaction notifications and security verification.')}</p>
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
              placeholder={t('至少 8 位，建议包含字母和数字', 'At least 8 characters')}
              autoComplete="new-password"
            />
            <button type="submit" className="btn primary" disabled={loading || !email || !password}>
              {loading ? t('注册中...', 'Signing up...') : t('注册并进入平台', 'Create account')}
            </button>
          </form>

          <div className="auth-links">
            <Link href={toLocaleHref('/auth/login', locale)}>{t('已有账号？去登录', 'Already have an account? Sign in')}</Link>
            <Link href={toLocaleHref('/auth/verify-email', locale)}>{t('注册后去验证邮箱', 'Verify email after registration')}</Link>
          </div>

          {feedback.text ? (
            <p className={feedback.type === 'error' ? 'error' : 'success'}>{feedback.text}</p>
          ) : null}
        </section>
      </section>
    </main>
  );
}
