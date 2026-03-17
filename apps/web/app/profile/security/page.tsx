'use client';

import { useEffect, useState, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

interface LoginLog {
  id: string;
  ip?: string;
  userAgent?: string;
  success: boolean;
  reason?: string;
  createdAt: string;
}

export default function SecurityPage() {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [changingPwd, setChangingPwd] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');

  // MFA state
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaSetup, setMfaSetup] = useState<{ secret: string; otpauth: string } | null>(null);
  const [mfaToken, setMfaToken] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null;

  const loadLogs = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${API}/auth/security/logs?page=${page}&pageSize=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setLogs(data.list || []);
    setTotal(data.total || 0);
  }, [token, page]);

  useEffect(() => {
    loadLogs();
    // Load MFA status
    if (token) {
      fetch(`${API}/user/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((u) => setMfaEnabled(u?.mfaEnabled || false));
    }
  }, [loadLogs, token]);

  const handleChangePassword = async () => {
    if (!token) return;
    setMsg('');
    const res = await fetch(`${API}/auth/password/change`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword, newPassword })
    });
    const data = await res.json();
    setMsg(data.message || data.error || '操作完成');
    if (res.ok) {
      setChangingPwd(false);
      setOldPassword('');
      setNewPassword('');
    }
  };

  const handleSetupMfa = async () => {
    if (!token) return;
    const res = await fetch(`${API}/auth/mfa/setup`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setMfaSetup(data);
  };

  const handleEnableMfa = async () => {
    if (!token) return;
    const res = await fetch(`${API}/auth/mfa/enable`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: mfaToken })
    });
    const data = await res.json();
    if (res.ok) {
      setMfaEnabled(true);
      setMfaSetup(null);
      setMfaToken('');
      setMsg('MFA 启用成功');
    } else {
      setMsg(data.message || '验证失败');
    }
  };

  const handleDisableMfa = async () => {
    if (!token) return;
    const code = prompt('请输入当前 MFA 验证码');
    if (!code) return;
    const res = await fetch(`${API}/auth/mfa/disable`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: code })
    });
    const data = await res.json();
    if (res.ok) {
      setMfaEnabled(false);
      setMsg('MFA 已关闭');
    } else {
      setMsg(data.message || '操作失败');
    }
  };

  const totalPages = Math.ceil(total / 10);

  return (
    <main className="container" style={{ maxWidth: 720, paddingTop: '2rem' }}>
      <h1>安全设置</h1>

      {msg && <div className="card" style={{ marginTop: '1rem', padding: '0.75rem 1rem' }}>{msg}</div>}

      {/* 修改密码 */}
      <section className="card" style={{ marginTop: '1.5rem' }}>
        <h3>修改密码</h3>
        {changingPwd ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            <input type="password" placeholder="原密码" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
            <input type="password" placeholder="新密码（至少8位）" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleChangePassword}>确认修改</button>
              <button className="btn" onClick={() => setChangingPwd(false)}>取消</button>
            </div>
          </div>
        ) : (
          <button className="btn" style={{ marginTop: 12 }} onClick={() => setChangingPwd(true)}>修改密码</button>
        )}
      </section>

      {/* MFA */}
      <section className="card" style={{ marginTop: '1.5rem' }}>
        <h3>两步验证 (MFA)</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
          状态：{mfaEnabled ? <span className="badge success">已启用</span> : <span className="badge">未启用</span>}
        </p>

        {mfaEnabled ? (
          <button className="btn" style={{ marginTop: 12 }} onClick={handleDisableMfa}>关闭 MFA</button>
        ) : mfaSetup ? (
          <div style={{ marginTop: 12 }}>
            <p>请使用 Authenticator 应用扫描以下密钥：</p>
            <code className="code" style={{ display: 'block', margin: '8px 0', wordBreak: 'break-all' }}>{mfaSetup.secret}</code>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>或将此 URI 复制到 Authenticator：</p>
            <code className="code" style={{ display: 'block', margin: '8px 0', wordBreak: 'break-all', fontSize: '0.75rem' }}>{mfaSetup.otpauth}</code>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <input placeholder="输入6位验证码" value={mfaToken} onChange={(e) => setMfaToken(e.target.value)} />
              <button className="btn btn-primary" onClick={handleEnableMfa}>验证并启用</button>
            </div>
          </div>
        ) : (
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={handleSetupMfa}>设置 MFA</button>
        )}
      </section>

      {/* 登录日志 */}
      <section className="card" style={{ marginTop: '1.5rem' }}>
        <h3>登录记录</h3>
        <table className="table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>时间</th>
              <th>IP</th>
              <th>结果</th>
              <th>原因</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.createdAt).toLocaleString()}</td>
                <td>{log.ip || '-'}</td>
                <td>{log.success ? <span className="badge success">成功</span> : <span className="badge error">失败</span>}</td>
                <td>{log.reason || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</button>
            <span style={{ lineHeight: '32px' }}>{page} / {totalPages}</span>
            <button className="btn btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</button>
          </div>
        )}
      </section>
    </main>
  );
}
