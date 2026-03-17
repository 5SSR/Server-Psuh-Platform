import { api } from '../../../lib/api';
import Link from 'next/link';
import { PurchaseBox } from '../../../components/purchase-box';
import { FavoriteButton, ImageGallery } from '../../../components/product-detail-extras';

export default async function ProductDetail({ params }: { params: { id: string } }) {
  const detail = await api.productDetail(params.id);

  return (
    <main className="page">
      <Link href="/products" className="muted back-link">
        ← 返回列表
      </Link>
      <header className="section-head">
        <div>
          <p className="eyebrow">{detail.region}</p>
          <h1>{detail.title}</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="price-lg">¥{Number(detail.salePrice).toFixed(2)}</div>
          <FavoriteButton productId={detail.id} />
        </div>
      </header>

      {detail.images && detail.images.length > 0 && (
        <ImageGallery images={detail.images} />
      )}

      <div className="detail-grid">
        <section className="card">
          <h3>基础信息</h3>
          <p>分类：{detail.category}</p>
          {detail.lineType && <p>线路：{detail.lineType}</p>}
          {detail.expireAt && <p>到期：{new Date(detail.expireAt).toLocaleDateString()}</p>}
          {detail.description && <p style={{ marginTop: 8, color: 'var(--text-secondary)' }}>{detail.description}</p>}
        </section>

        <section className="card">
          <h3>卖家信誉</h3>
          <p>卖家邮箱：{detail.seller?.email || '未知'}</p>
          <p>信誉等级：Lv.{detail.seller?.sellerProfile?.level ?? 1}</p>
          <p>累计成交：{detail.seller?.sellerProfile?.tradeCount ?? 0} 单</p>
          <p>平均交付：{detail.seller?.sellerProfile?.avgDeliveryMinutes ?? 0} 分钟</p>
          <p>纠纷率：{((detail.seller?.sellerProfile?.disputeRate ?? 0) * 100).toFixed(2)}%</p>
          <p>好评率：{((detail.seller?.sellerProfile?.positiveRate ?? 0) * 100).toFixed(2)}%</p>
        </section>

        <section className="card">
          <h3>风险标签</h3>
          <div className="tags">
            {(detail.riskTags ?? ['暂无']).map((t: string) => (
              <span key={t} className="pill warning">
                {t}
              </span>
            ))}
          </div>
        </section>
      </div>

      <PurchaseBox productId={detail.id} price={Number(detail.salePrice)} />
    </main>
  );
}
