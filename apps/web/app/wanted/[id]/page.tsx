'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type WantedDetail = {
  id: string;
  title: string;
  category?: string | null;
  region: string;
  lineType?: string | null;
  cpuCores?: number | null;
  memoryGb?: number | null;
  diskGb?: number | null;
  bandwidthMbps?: number | null;
  budgetMin?: number | string | null;
  budgetMax?: number | string | null;
  acceptPremium?: boolean;
  description?: string | null;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  _count?: { offers: number };
};

export default function WantedDetailPage() {
  const params = useParams<{ id: string }>();
  const wantedId = params?.id as string;

  const [detail, setDetail] = useState<WantedDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [offerPrice, setOfferPrice] = useState('');
  const [productId, setProductId] = useState('');
  const [offerMessage, setOfferMessage] = useState('');

  const load = useCallback(async () => {
    if (!wantedId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/wanted/${wantedId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取求购详情失败');
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '读取求购详情失败');
    } finally {
      setLoading(false);
    }
  }, [wantedId]);

  useEffect(() => {
    load();
  }, [load]);

  const submitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('idc_token');
    if (!token) {
      setError('请先登录后提交报价');
      return;
    }
    if (!offerPrice || Number(offerPrice) <= 0) {
      setError('请输入有效报价金额');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API}/wanted/${wantedId}/offers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          offerPrice: Number(offerPrice),
          productId: productId.trim() || undefined,
          message: offerMessage.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '提交报价失败');
      setMessage('报价已提交，买家可在我的求购中处理');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交报价失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !detail) {
    return <main className="page"><div className="empty-state">加载中...</div></main>;
  }

  if (error && !detail) {
    return <main className="page"><div className="empty-state">{error}</div></main>;
  }

  if (!detail) {
    return <main className="page"><div className="empty-state">求购需求不存在</div></main>;
  }

  return (
    <main className="page page-shell">
      <header className="section-head">
        <div>
          <p className="eyebrow">求购详情</p>
          <h1>{detail.title}</h1>
          <p className="sub">买家需求已结构化展示，卖家可直接提交匹配报价。</p>
        </div>
        <div className="toolbar" style={{ alignItems: 'flex-start' }}>
          <Link href="/wanted" className="btn secondary">返回求购市场</Link>
          <Link href="/wanted/mine" className="btn secondary">我的求购</Link>
        </div>
      </header>

      <section className="card stack-12">
        <div className="status-line">
          <span className="status-chip info">{detail.category || '未指定分类'}</span>
          <span className="status-chip">{detail.region}</span>
          <span className="status-chip">{detail.lineType || '线路不限'}</span>
          <span className={`status-chip ${detail.status === 'OPEN' ? 'success' : ''}`}>
            {detail.status === 'OPEN' ? '进行中' : '已关闭'}
          </span>
        </div>

        <div className="spec-grid">
          <div><span>CPU</span><strong>{detail.cpuCores ? `${detail.cpuCores} 核+` : '不限'}</strong></div>
          <div><span>内存</span><strong>{detail.memoryGb ? `${detail.memoryGb} GB+` : '不限'}</strong></div>
          <div><span>硬盘</span><strong>{detail.diskGb ? `${detail.diskGb} GB+` : '不限'}</strong></div>
          <div><span>带宽</span><strong>{detail.bandwidthMbps ? `${detail.bandwidthMbps} Mbps+` : '不限'}</strong></div>
        </div>

        <div className="toolbar">
          <span className="muted">预算：¥{detail.budgetMin ? Number(detail.budgetMin).toFixed(0) : '0'} - ¥{detail.budgetMax ? Number(detail.budgetMax).toFixed(0) : '不限'}</span>
          <span className="muted">已收到报价：{detail._count?.offers || 0}</span>
          <span className="muted">发布时间：{new Date(detail.createdAt).toLocaleString()}</span>
        </div>

        {detail.description ? <p className="muted">{detail.description}</p> : null}
      </section>

      {detail.status === 'OPEN' ? (
        <form className="card stack-16" onSubmit={submitOffer}>
          <h3>提交报价</h3>
          <div className="spec-grid">
            <div className="field">
              <label>报价金额（元）</label>
              <input type="number" min="0.01" step="0.01" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} placeholder="如 188.00" />
            </div>
            <div className="field">
              <label>关联商品 ID（可选）</label>
              <input value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="填写你已上架商品 ID" />
            </div>
          </div>
          <div className="field">
            <label>报价说明（可选）</label>
            <textarea rows={4} value={offerMessage} onChange={(e) => setOfferMessage(e.target.value)} placeholder="说明配置匹配度、可交付方式、可改绑能力等" />
          </div>

          {error ? <p className="error">{error}</p> : null}
          {message ? <p className="success">{message}</p> : null}

          <div className="toolbar">
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? '提交中...' : '提交报价'}
            </button>
            <span className="muted">买家接受后，建议进入担保订单流程完成交付。</span>
          </div>
        </form>
      ) : (
        <div className="empty-state">该求购需求已关闭，当前不可再提交报价。</div>
      )}
    </main>
  );
}
