"use client";

import { useState } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: 'USER' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '注册失败');
      localStorage.setItem('idc_token', data.token);
      setMessage('注册成功，Token 已保存到本地');
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page narrow">
      <h1>注册</h1>
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
          {loading ? '注册中...' : '注册'}
        </button>
        <div className="auth-links">
          <Link href="/auth/login">已有账号去登录</Link>
          <Link href="/auth/verify-email">去验证邮箱</Link>
        </div>
        {message && <p className="muted">{message}</p>}
      </div>
    </main>
  );
}
