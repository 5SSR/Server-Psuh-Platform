"use client";

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

export default function VerifyEmailPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null;

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/user/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) setEmail(data.email || '');
      } catch (_e) {
        // 忽略展示层异常，用户可手动重试
      }
    };
    loadProfile();
  }, [token]);

  const sendCode = async () => {
    if (!token) {
      setMessage('请先登录');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/auth/email/send-verify-code`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
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

  const verify = async () => {
    if (!token) {
      setMessage('请先登录');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/auth/email/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '验证失败');
      setMessage(data.message || '邮箱验证成功');
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page narrow">
      <h1>邮箱验证</h1>
      <div className="form">
        <label>当前登录邮箱</label>
        <input value={email} readOnly placeholder="登录后自动读取" />
        <button onClick={sendCode} disabled={loading}>
          {loading ? '发送中...' : '发送验证码'}
        </button>

        <label>验证码</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="输入验证码"
        />
        <button onClick={verify} disabled={loading || !code}>
          {loading ? '验证中...' : '提交验证'}
        </button>
        {message && <p className="muted">{message}</p>}
      </div>
    </main>
  );
}
