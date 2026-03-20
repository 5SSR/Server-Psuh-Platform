'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type WantedItem = {
  id: string;
  title: string;
  category?: string | null;
  region: string;
  lineType?: string | null;
  budgetMin?: number | string | null;
  budgetMax?: number | string | null;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  _count?: { offers: number };
};

type WantedOffer = {
  id: string;
  offerPrice: number | string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  message?: string | null;
  seller: {
    id: string;
    email: string;
    sellerProfile?: {
      level: number;
      tradeCount: number;
      positiveRate: number;
      disputeRate: number;
      avgDeliveryMinutes: number;
    } | null;
  };
  product?: {
    id: string;
    title: string;
    code?: string;
    salePrice: number | string;
    status: string;
  } | null;
};

type SellerOffer = {
  id: string;
  offerPrice: number | string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  wanted: {
    id: string;
    title: string;
    category?: string | null;
    region: string;
    lineType?: string | null;
    status: 'OPEN' | 'CLOSED';
    budgetMin?: number | string | null;
    budgetMax?: number | string | null;
  };
  product?: {
    id: string;
    title: string;
    code?: string;
    salePrice: number | string;
    status: string;
  } | null;
};

export default function WantedMinePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [wantedList, setWantedList] = useState<WantedItem[]>([]);
  const [offersMap, setOffersMap] = useState<Record<string, WantedOffer[]>>({});
  const [sellerOffers, setSellerOffers] = useState<SellerOffer[]>([]);

  const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('idc_token') : null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setError('请先登录后查看我的求购');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const [mineRes, sellerRes] = await Promise.all([
        fetch(`${API}/wanted/mine/list?page=1&pageSize=50`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API}/wanted/offers/mine?page=1&pageSize=50`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const mineData = await mineRes.json();
      if (!mineRes.ok) throw new Error(mineData.message || '读取我的求购失败');
      setWantedList(mineData.list || []);

      const sellerData = await sellerRes.json();
      if (sellerRes.ok) {
        setSellerOffers(sellerData.list || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '读取数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadOffers = async (wantedId: string) => {
    const token = getToken();
    if (!token) return;
    setError('');
    try {
      const res = await fetch(`${API}/wanted/${wantedId}/offers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '读取报价失败');
      setOffersMap((prev) => ({ ...prev, [wantedId]: data }));
    } catch (err) {
      setError(err instanceof Error ? err.message : '读取报价失败');
    }
  };

  const closeWanted = async (wantedId: string) => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API}/wanted/${wantedId}/close`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '关闭求购失败');
      setMessage('求购需求已关闭');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '关闭求购失败');
    } finally {
      setLoading(false);
    }
  };

  const reviewOffer = async (
    wantedId: string,
    offerId: string,
    action: 'ACCEPT' | 'REJECT'
  ) => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch(`${API}/wanted/${wantedId}/offers/${offerId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '处理报价失败');
      setMessage(action === 'ACCEPT' ? '报价已接受，求购单已关闭' : '报价已驳回');
      await Promise.all([load(), loadOffers(wantedId)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理报价失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page page-shell">
      <header className="section-head">
        <div>
          <p className="eyebrow">我的求购</p>
          <h1>求购管理与报价处理</h1>
          <p className="sub">你可以关闭求购需求，或对卖家报价执行接受/拒绝，形成可追溯流程。</p>
        </div>
        <div className="toolbar" style={{ alignItems: 'flex-start' }}>
          <Link href="/wanted/new" className="btn primary">新建求购</Link>
          <Link href="/wanted" className="btn secondary">返回求购市场</Link>
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="success">{message}</p> : null}
      {loading ? <div className="empty-state">加载中...</div> : null}

      <section className="stack-16">
        <h3>我发布的求购</h3>
        {wantedList.length === 0 ? (
          <div className="empty-state">你还没有发布求购需求</div>
        ) : (
          <div className="cards">
            {wantedList.map((item) => (
              <article key={item.id} className="card stack-12">
                <div className="card-header">
                  <div className="stack-8">
                    <h3>{item.title}</h3>
                    <div className="status-line">
                      <span className="status-chip info">{item.category || '未指定分类'}</span>
                      <span className="status-chip">{item.region}</span>
                      <span className="status-chip">{item.lineType || '线路不限'}</span>
                      <span className={`status-chip ${item.status === 'OPEN' ? 'success' : ''}`}>
                        {item.status === 'OPEN' ? '进行中' : '已关闭'}
                      </span>
                    </div>
                  </div>
                  <div className="price-area">
                    <p className="price-main">
                      ¥{item.budgetMin ? Number(item.budgetMin).toFixed(0) : '0'} - ¥{item.budgetMax ? Number(item.budgetMax).toFixed(0) : '不限'}
                    </p>
                    <p className="price-sub">预算</p>
                  </div>
                </div>

                <div className="toolbar">
                  <span className="muted">已收到 {item._count?.offers || 0} 份报价</span>
                  <span className="muted">创建于 {new Date(item.createdAt).toLocaleString()}</span>
                </div>

                <div className="toolbar">
                  <button type="button" className="btn secondary" onClick={() => loadOffers(item.id)}>
                    查看报价
                  </button>
                  {item.status === 'OPEN' ? (
                    <button type="button" className="btn danger" onClick={() => closeWanted(item.id)}>
                      关闭求购
                    </button>
                  ) : null}
                </div>

                {(offersMap[item.id] || []).length > 0 ? (
                  <div className="stack-12">
                    {(offersMap[item.id] || []).map((offer) => (
                      <article key={offer.id} className="card nested stack-8">
                        <div className="status-line">
                          <span className="status-chip">卖家：{offer.seller.email}</span>
                          <span className="status-chip info">报价：¥{Number(offer.offerPrice).toFixed(2)}</span>
                          <span className={`status-chip ${offer.status === 'ACCEPTED' ? 'success' : offer.status === 'REJECTED' ? 'danger' : ''}`}>
                            {offer.status}
                          </span>
                        </div>
                        {offer.product ? (
                          <p className="muted">
                            关联商品：{offer.product.title}（{offer.product.code || offer.product.id}）
                          </p>
                        ) : null}
                        {offer.message ? <p className="muted">卖家留言：{offer.message}</p> : null}

                        {item.status === 'OPEN' && offer.status === 'PENDING' ? (
                          <div className="toolbar">
                            <button type="button" className="btn primary" onClick={() => reviewOffer(item.id, offer.id, 'ACCEPT')}>
                              接受报价
                            </button>
                            <button type="button" className="btn secondary" onClick={() => reviewOffer(item.id, offer.id, 'REJECT')}>
                              拒绝报价
                            </button>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="stack-16">
        <h3>我提交的卖家报价</h3>
        {sellerOffers.length === 0 ? (
          <div className="empty-state">你还没有向求购单提交报价</div>
        ) : (
          <div className="cards">
            {sellerOffers.map((offer) => (
              <article key={offer.id} className="card stack-8">
                <div className="status-line">
                  <span className="status-chip info">{offer.wanted.category || '未指定分类'}</span>
                  <span className="status-chip">{offer.wanted.region}</span>
                  <span className="status-chip">{offer.wanted.lineType || '线路不限'}</span>
                  <span className={`status-chip ${offer.status === 'ACCEPTED' ? 'success' : offer.status === 'REJECTED' ? 'danger' : ''}`}>
                    报价状态：{offer.status}
                  </span>
                </div>
                <h3>{offer.wanted.title}</h3>
                <p className="muted">
                  我的报价：¥{Number(offer.offerPrice).toFixed(2)} / 预算：¥{offer.wanted.budgetMin ? Number(offer.wanted.budgetMin).toFixed(0) : '0'} - ¥{offer.wanted.budgetMax ? Number(offer.wanted.budgetMax).toFixed(0) : '不限'}
                </p>
                {offer.product ? <p className="muted">关联商品：{offer.product.title}</p> : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
