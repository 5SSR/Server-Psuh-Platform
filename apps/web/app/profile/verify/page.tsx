"use client";

import { useCallback, useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type Kyc = {
  status?: string;
  realName?: string;
  idNumber?: string;
  reason?: string | null;
};

export default function VerifyCenterPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [kyc, setKyc] = useState<Kyc | null>(null);

  const [realName, setRealName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [docImages, setDocImages] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null;

  const loadStatus = useCallback(async () => {
    if (!token) {
      setMessage('请先登录后再进入认证中心');
      return;
    }
    const kycRes = await fetch(`${API_BASE}/user/kyc`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const kycData = await kycRes.json();
    if (kycRes.ok) {
      setKyc(kycData);
      if (kycData?.realName) setRealName(kycData.realName);
      if (kycData?.idNumber) setIdNumber(kycData.idNumber);
      if (kycData?.docImages) setDocImages(kycData.docImages);
    }
  }, [token]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const submitKyc = async () => {
    if (!token) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/user/kyc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ realName, idNumber, docImages: docImages || undefined })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '提交失败');
      setMessage(data.message || '实名认证提交成功');
      await loadStatus();
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <header className="section-head">
        <div>
          <p className="eyebrow">认证与安全</p>
          <h1>认证中心</h1>
        </div>
      </header>

      {message && <p className="muted">{message}</p>}

      <section className="card">
        <h3>实名认证</h3>
        <p className="muted">
          当前状态：{kyc?.status || '未提交'}
          {kyc?.reason ? `（原因：${kyc.reason}）` : ''}
        </p>
        <div className="form">
          <label>真实姓名</label>
          <input value={realName} onChange={(e) => setRealName(e.target.value)} />
          <label>证件号</label>
          <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
          <label>凭证链接（可选，多张可逗号分隔）</label>
          <input value={docImages} onChange={(e) => setDocImages(e.target.value)} />
          <button onClick={submitKyc} disabled={loading || !realName || !idNumber}>
            {loading ? '提交中...' : '提交实名认证'}
          </button>
        </div>
      </section>
    </main>
  );
}
