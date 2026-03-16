"use client";

import { useState } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '登录失败');
      localStorage.setItem('idc_token', data.token);
      setMessage('登录成功，正在跳转...');
      const redirect = new URLSearchParams(window.location.search).get('redirect');
      const nextPath = redirect && redirect.startsWith('/') ? redirect : '/products';
      window.location.replace(nextPath);
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page narrow">
      <h1>登录</h1>
      <div className="form">
        <label>邮箱</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        <label>密码</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="至少 8 位"
        />
        <button onClick={submit} disabled={loading}>
          {loading ? '登录中...' : '登录'}
        </button>
        <div className="auth-links">
          <Link href="/auth/forgot">忘记密码</Link>
          <Link href="/auth/verify-email">邮箱验证</Link>
        </div>
        {message && <p className="muted">{message}</p>}
      </div>
    </main>
  );
}
