import Link from 'next/link';
import { api } from '../lib/api';

export default async function Home() {
  let content: Awaited<ReturnType<typeof api.homeContent>> | null = null;
  try {
    content = await api.homeContent();
  } catch {
    content = null;
  }

  const banners = content?.banners ?? [];
  const faqs = content?.faqs ?? [];
  const tags = content?.tags ?? [];

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">一期聚焦 · 担保交易闭环</p>
        <h1>IDC 二手服务器交易平台</h1>
        <p className="sub">
          卖家安全发布 · 平台审核担保 · 买家验机确认 · 平台放款结算
        </p>
        <div className="actions">
          <Link className="btn primary" href="/products">
            浏览商品
          </Link>
          <Link className="btn ghost" href="/seller/products">
            发布服务器
          </Link>
        </div>
      </section>

      {banners.length > 0 && (
        <section className="grid" style={{ marginBottom: 24 }}>
          {banners.map((item) => (
            <div className="card" key={item.id}>
              {item.badge ? <p className="eyebrow">{item.badge}</p> : null}
              <h3>{item.title}</h3>
              <p>{item.subtitle || '平台担保、安全交易、快速交付。'}</p>
              {item.linkUrl ? (
                <p style={{ marginTop: 10 }}>
                  <a className="btn ghost" href={item.linkUrl}>
                    查看详情
                  </a>
                </p>
              ) : null}
            </div>
          ))}
        </section>
      )}

      <section className="grid">
        <div className="card">
          <h3>商品审核</h3>
          <p>资料完整性、风险校验、到期与溢价预警。</p>
        </div>
        <div className="card">
          <h3>担保订单</h3>
          <p>支付托管、交付记录、平台核验、验机自动确认。</p>
        </div>
        <div className="card">
          <h3>风控与信用</h3>
          <p>低价/溢价规则、黑名单、纠纷率与交付速度画像。</p>
        </div>
      </section>

      {tags.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <h2>热门标签</h2>
          <div className="tags">
            {tags.map((tag) => (
              <span key={tag.id} className="pill">
                {tag.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {faqs.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <h2>常见问题</h2>
          <div className="grid">
            {faqs.slice(0, 6).map((item) => (
              <div className="card" key={item.id}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 12 }}>
            <Link href="/help" className="btn ghost">
              查看全部帮助文档
            </Link>
          </p>
        </section>
      )}
    </main>
  );
}
