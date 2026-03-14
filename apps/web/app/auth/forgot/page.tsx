"use client";

import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const sendCode = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/auth/password/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '发送失败');
      setMessage(
        data.devCode
          ? `${data.message}（开发验证码：${data.devCode}）`
          : data.message
      );
      if (data.devCode) setCode(data.devCode);
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/auth/password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '重置失败');
      setMessage(data.message || '重置成功');
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page narrow">
      <h1>找回密码</h1>
      <div className="form">
        <label>邮箱</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <button onClick={sendCode} disabled={loading || !email}>
          {loading ? '发送中...' : '发送重置验证码'}
        </button>

        <label>验证码</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="输入 6 位验证码"
        />

        <label>新密码</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="至少 8 位"
        />
        <button onClick={resetPassword} disabled={loading || !email || !code || !newPassword}>
          {loading ? '提交中...' : '重置密码'}
        </button>
        {message && <p className="muted">{message}</p>}
      </div>
    </main>
  );
}
