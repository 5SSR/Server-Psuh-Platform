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
    <main className="page" style={{ maxWidth: 980 }}>
      {/* Hero */}
      <section style={{ textAlign: 'center', paddingTop: 48, paddingBottom: 48 }}>
        <p className="eyebrow">安全 · 担保 · 可信</p>
        <h1 style={{ fontSize: 56, lineHeight: 1.05, letterSpacing: '-0.03em' }}>
          IDC 二手服务器<br />交易平台
        </h1>
        <p className="sub" style={{ maxWidth: 480, margin: '16px auto 36px' }}>
          平台审核担保 · 买家验机确认 · 资金安全托管 · 高效结算放款
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
          <Link className="btn primary" href="/products">浏览商品</Link>
          <Link className="btn ghost" href="/seller/products">发布服务器</Link>
        </div>
      </section>

      {/* Banners */}
      {banners.length > 0 && (
        <section className="grid" style={{ marginTop: 32, marginBottom: 32 }}>
          {banners.map((item) => (
            <div className="card" key={item.id}>
              {item.badge && <p className="eyebrow">{item.badge}</p>}
              <h3>{item.title}</h3>
              <p>{item.subtitle || '平台担保、安全交易、快速交付。'}</p>
              {item.linkUrl && (
                <p style={{ marginTop: 12 }}>
                  <a className="btn ghost" href={item.linkUrl} style={{ padding: '8px 16px', fontSize: 13 }}>
                    了解更多 →
                  </a>
                </p>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Features */}
      <section style={{ marginTop: 48 }}>
        <h2 style={{ textAlign: 'center', marginBottom: 28 }}>平台核心能力</h2>
        <div className="grid">
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🛡</div>
            <h3>商品审核</h3>
            <p>资料完整性校验、价格风控预警、到期与溢价检测。</p>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>💎</div>
            <h3>担保订单</h3>
            <p>支付资金托管、交付记录存证、平台核验后自动确认。</p>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
            <h3>信用体系</h3>
            <p>卖家信用画像、纠纷率追踪、交付速度评估。</p>
          </div>
        </div>
      </section>

      {/* Tags */}
      {tags.length > 0 && (
        <section style={{ marginTop: 48, textAlign: 'center' }}>
          <h2>热门标签</h2>
          <div className="tags" style={{ justifyContent: 'center' }}>
            {tags.map((tag) => (
              <span key={tag.id} className="pill">{tag.name}</span>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      {faqs.length > 0 && (
        <section style={{ marginTop: 48 }}>
          <h2 style={{ textAlign: 'center' }}>常见问题</h2>
          <div className="grid">
            {faqs.slice(0, 6).map((item) => (
              <div className="card" key={item.id}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </div>
            ))}
          </div>
          <p style={{ marginTop: 20, textAlign: 'center' }}>
            <Link href="/help" className="btn ghost">查看全部帮助文档 →</Link>
          </p>
        </section>
      )}
    </main>
  );
}
