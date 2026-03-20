import Link from 'next/link';

import { api } from '../../../lib/api';

export const dynamic = 'force-dynamic';

function fmtRate(v?: number | null) {
  return `${(((v ?? 0) || 0) * 100).toFixed(2)}%`;
}

export default async function StorePage({ params }: { params: { sellerId: string } }) {
  const data = await api.storeBySeller(params.sellerId);
  const profile = data.store.user.sellerProfile;

  return (
    <main className="page page-shell">
      <header className="section-head">
        <div className="stack-12">
          <p className="eyebrow">商家店铺 / Seller Store</p>
          <h1>{data.store.name}</h1>
          <p className="muted">
            {data.store.intro || '该店铺暂未补充介绍，平台将持续跟踪成交、交付与纠纷数据。'}
          </p>
          {data.store.notice ? (
            <div className="status-chip warning">店铺公告：{data.store.notice}</div>
          ) : null}
        </div>
        <div className="metric-card" style={{ minWidth: 260 }}>
          <p className="metric-label">店铺概览</p>
          <p className="metric-value">{data.stats.onlineProducts}</p>
          <p className="metric-tip">在线商品</p>
          <p className="metric-tip">累计评价 {data.stats.reviewCount} 条 · 访问指数 {data.stats.estimatedVisits}</p>
        </div>
      </header>

      <section className="metric-grid">
        <article className="metric-card">
          <p className="metric-label">信誉等级</p>
          <p className="metric-value">Lv.{profile?.level ?? 1}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">累计成交</p>
          <p className="metric-value">{profile?.tradeCount ?? 0}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">好评率</p>
          <p className="metric-value">{fmtRate(profile?.positiveRate)}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">纠纷率</p>
          <p className="metric-value">{fmtRate(profile?.disputeRate)}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">退款率</p>
          <p className="metric-value">{fmtRate(profile?.refundRate)}</p>
        </article>
      </section>

      <section className="card stack-16">
        <div className="section-head">
          <h2>在售商品</h2>
          <Link href="/products" className="btn secondary">
            返回交易市场
          </Link>
        </div>
        {data.products.length === 0 ? (
          <div className="empty-state">当前店铺暂无在售商品。</div>
        ) : (
          <div className="cards">
            {data.products.map((item) => (
              <article key={item.id} className="card nested stack-8">
                <div className="card-header">
                  <div>
                    <h3 style={{ fontSize: 16 }}>{item.title}</h3>
                    <p className="muted">
                      {item.category} · {item.region} · {item.lineType || '线路待补充'}
                    </p>
                  </div>
                  <p className="price">¥{Number(item.salePrice).toFixed(2)}</p>
                </div>
                <div className="status-line">
                  <span className="status-chip">交付：{item.deliveryType || '未标注'}</span>
                  <span className="status-chip">{item.feePayer || 'SELLER'} 承担服务费</span>
                  {item.negotiable ? <span className="status-chip success">支持议价</span> : null}
                  {item.consignment ? <span className="status-chip info">平台寄售</span> : null}
                </div>
                <Link href={`/products/${item.id}`} className="btn primary">
                  查看详情
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card stack-12">
        <h2>近期评价</h2>
        {data.reviews.length === 0 ? (
          <div className="empty-state">暂无评价记录，首单成交后将自动展示。</div>
        ) : (
          <div className="cards">
            {data.reviews.map((item) => (
              <article key={item.id} className="card nested stack-8">
                <div className="status-line">
                  <span className="status-chip success">评分 {item.rating}/5</span>
                  <span className="status-chip">订单 {item.orderId.slice(0, 8)}</span>
                  <span className="muted">{new Date(item.createdAt).toLocaleString('zh-CN')}</span>
                </div>
                <p className="muted">买家：{item.buyer.email}</p>
                <p>{item.content || '买家未填写文字评价。'}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
