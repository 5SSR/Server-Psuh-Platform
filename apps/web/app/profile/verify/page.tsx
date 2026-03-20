"use client";

import { useCallback, useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type Kyc = {
  status?: string;
  realName?: string;
  idNumber?: string;
  reason?: string | null;
};

type SellerApplication = {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string | null;
};

const SELLER_STATUS_LABEL: Record<string, string> = {
  PENDING: '审核中',
  APPROVED: '已通过',
  REJECTED: '已驳回'
};

export default function VerifyCenterPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [kyc, setKyc] = useState<Kyc | null>(null);
  const [sellerApplication, setSellerApplication] = useState<SellerApplication | null>(null);

  const [realName, setRealName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [docImages, setDocImages] = useState('');
  const [sellerReason, setSellerReason] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null;

  const loadStatus = useCallback(async () => {
    if (!token) {
      setMessage('请先登录后再进入认证中心');
      return;
    }
    const [kycRes, sellerRes] = await Promise.all([
      fetch(`${API_BASE}/user/kyc`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      fetch(`${API_BASE}/user/seller-application`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    ]);

    const kycData = await kycRes.json();
    if (kycRes.ok && kycData) {
      setKyc(kycData || null);
      if (kycData.realName) setRealName(kycData.realName);
      if (kycData.idNumber) setIdNumber(kycData.idNumber);
      if (kycData.docImages) setDocImages(kycData.docImages);
    } else {
      setKyc(null);
    }

    const sellerData = await sellerRes.json();
    if (sellerRes.ok && sellerData) {
      setSellerApplication(sellerData || null);
      if (sellerData?.reason) setSellerReason(sellerData.reason);
    } else {
      setSellerApplication(null);
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

  const submitSellerApplication = async () => {
    if (!token) return;
    if (kyc?.status !== 'approved') {
      setMessage('请先完成并通过实名认证，再申请交易资质');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/user/seller-application`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: sellerReason || undefined })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '提交交易资质申请失败');
      setMessage(data.message || '交易资质申请已提交');
      await loadStatus();
    } catch (e: any) {
      setMessage(e.message || '提交失败');
    } finally {
      setLoading(false);
    }
  };

  const sellerStatusLabel = sellerApplication?.status
    ? SELLER_STATUS_LABEL[sellerApplication.status] || sellerApplication.status
    : '未提交';

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

      <section className="card" style={{ marginTop: 12 }}>
        <h3>交易资质认证（卖家认证）</h3>
        <p className="muted">
          当前状态：{sellerStatusLabel}
          {sellerApplication?.reason ? `（备注：${sellerApplication.reason}）` : ''}
        </p>
        <div className="form">
          <label>申请说明（可选）</label>
          <textarea
            value={sellerReason}
            onChange={(e) => setSellerReason(e.target.value)}
            rows={4}
            placeholder="例如：主营地区、机器类型、交付能力说明"
          />
          <button
            onClick={submitSellerApplication}
            disabled={
              loading ||
              kyc?.status !== 'approved' ||
              sellerApplication?.status === 'PENDING' ||
              sellerApplication?.status === 'APPROVED'
            }
          >
            {loading ? '提交中...' : '提交交易资质申请'}
          </button>
          {kyc?.status !== 'approved' ? (
            <p className="muted">请先完成实名认证并通过审核后再申请交易资质。</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
