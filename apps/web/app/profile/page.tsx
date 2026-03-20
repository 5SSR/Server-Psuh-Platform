'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

interface UserProfile {
  id: string;
  email: string;
  nickname?: string;
  avatar?: string;
  role: string;
  status: string;
  mfaEnabled: boolean;
  emailVerifiedAt?: string;
  createdAt: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('idc_token');
    if (!token) return;
    fetch(`${API}/user/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        setUser(data);
        setNickname(data.nickname || '');
      });
  }, []);

  const handleSave = async () => {
    const token = localStorage.getItem('idc_token');
    if (!token) return;
    setSaving(true);
    await fetch(`${API}/user/profile`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname })
    });
    setUser((prev) => (prev ? { ...prev, nickname } : prev));
    setEditing(false);
    setSaving(false);
  };

  if (!user) return <main className="container"><p>加载中...</p></main>;

  return (
    <main className="container" style={{ maxWidth: 640, paddingTop: '2rem' }}>
      <h1>个人资料</h1>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <table className="table">
          <tbody>
            <tr><td style={{ color: 'var(--text-secondary)', width: 120 }}>邮箱</td><td>{user.email}</td></tr>
            <tr>
              <td style={{ color: 'var(--text-secondary)' }}>昵称</td>
              <td>
                {editing ? (
                  <span style={{ display: 'flex', gap: 8 }}>
                    <input value={nickname} onChange={(e) => setNickname(e.target.value)} style={{ flex: 1 }} />
                    <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>保存</button>
                    <button className="btn btn-sm" onClick={() => setEditing(false)}>取消</button>
                  </span>
                ) : (
                  <span>
                    {user.nickname || '未设置'}{' '}
                    <button className="btn btn-sm" onClick={() => setEditing(true)}>编辑</button>
                  </span>
                )}
              </td>
            </tr>
            <tr><td style={{ color: 'var(--text-secondary)' }}>角色</td><td>{user.role}</td></tr>
            <tr><td style={{ color: 'var(--text-secondary)' }}>状态</td><td>{user.status}</td></tr>
            <tr>
              <td style={{ color: 'var(--text-secondary)' }}>邮箱验证</td>
              <td>
                {user.emailVerifiedAt
                  ? <span className="badge success">已验证</span>
                  : <span className="badge">未验证</span>}
              </td>
            </tr>
            <tr>
              <td style={{ color: 'var(--text-secondary)' }}>MFA</td>
              <td>
                {user.mfaEnabled
                  ? <span className="badge success">已启用</span>
                  : <span className="badge">未启用</span>}
              </td>
            </tr>
            <tr><td style={{ color: 'var(--text-secondary)' }}>注册时间</td><td>{new Date(user.createdAt).toLocaleString()}</td></tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: 12 }}>
        <Link href="/profile/security" className="btn">安全设置</Link>
        <Link href="/profile/verify" className="btn">实名认证</Link>
        <Link href="/profile/favorites" className="btn">我的收藏</Link>
        <Link href="/profile/history" className="btn">浏览历史</Link>
        <Link href="/profile/alerts" className="btn">价格提醒</Link>
        <Link href="/profile/support" className="btn">售后工单</Link>
      </div>
    </main>
  );
}
