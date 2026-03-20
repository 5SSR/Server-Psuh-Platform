'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toLocaleHref } from '../lib/locale';
import { useLocale } from '../lib/use-locale';

const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type BargainStartResponse = {
  message?: string;
  reused?: boolean;
  bargain?: {
    id: string;
    status: string;
    currentPrice: number | string;
  };
};

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('idc_token');
}

export function BargainBox({
  productId,
  listPrice,
  negotiable
}: {
  productId: string;
  listPrice: number;
  negotiable?: boolean;
}) {
  const { locale } = useLocale();
  const defaultPrice = useMemo(() => {
    const base = Number.isFinite(listPrice) && listPrice > 0 ? listPrice : 0;
    return Math.max(0.01, base * 0.9).toFixed(2);
  }, [listPrice]);

  const [offerPrice, setOfferPrice] = useState(defaultPrice);
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [bargainId, setBargainId] = useState('');

  const startBargain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!negotiable) {
      setError('该商品未开启议价，请直接走担保下单流程');
      return;
    }

    const token = getToken();
    if (!token) {
      setError('请先登录后发起议价');
      return;
    }

    const price = Number(offerPrice);
    if (!Number.isFinite(price) || price <= 0) {
      setError('请输入有效议价金额');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`${API}/bargains/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          productId,
          offerPrice: price,
          remark: remark.trim() || undefined
        })
      });

      const data = (await res.json()) as BargainStartResponse;
      if (!res.ok) {
        throw new Error((data as { message?: string }).message || '发起议价失败');
      }

      if (data.bargain?.id) {
        setBargainId(data.bargain.id);
      }

      setMessage(data.message || (data.reused ? '已进入原有议价会话' : '议价请求已提交'));
    } catch (err) {
      setError(err instanceof Error ? err.message : '发起议价失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stack-12">
      <div className="status-line">
        <span className="status-chip info">一口价：¥{Number(listPrice || 0).toFixed(2)}</span>
        <span className={`status-chip ${negotiable ? 'success' : 'warning'}`}>
          {negotiable ? '支持议价' : '不支持议价'}
        </span>
        <span className="status-chip">担保流程自动衔接</span>
      </div>

      <form className="stack-12" onSubmit={startBargain}>
        <div className="field">
          <label>你的目标成交价（元）</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={offerPrice}
            onChange={(event) => setOfferPrice(event.target.value)}
            placeholder="请输入你的目标成交价"
          />
        </div>

        <div className="field">
          <label>议价备注（可选）</label>
          <textarea
            rows={3}
            value={remark}
            onChange={(event) => setRemark(event.target.value)}
            placeholder="可说明预算范围、到期要求、可接受交付方式等"
          />
        </div>

        {error ? <p className="error">{error}</p> : null}
        {message ? <p className="success">{message}</p> : null}

        <div className="actions">
          <button type="submit" className="btn primary" disabled={loading || !negotiable}>
            {loading ? '提交中...' : '发起议价'}
          </button>
          <Link className="btn secondary" href={toLocaleHref(bargainId ? `/bargains?id=${bargainId}` : '/bargains', locale)}>
            打开议价中心
          </Link>
        </div>
      </form>

      <div className="stack-8 muted">
        <p>1. 议价达成后系统会自动生成担保订单，并锁定成交价格。</p>
        <p>2. 订单仍走支付托管、交付核验、确认结算的标准流程。</p>
      </div>
    </div>
  );
}
