import Link from 'next/link';

export default function Home() {
  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">一期聚焦 · 担保交易闭环</p>
        <h1>IDC 二手服务器交易平台</h1>
        <p className="sub">
          卖家安全发布 · 平台审核担保 · 买家验机确认 · 平台放款结算
        </p>
        <div className="actions">
          <Link className="btn primary" href="#">
            浏览商品（占位）
          </Link>
          <Link className="btn ghost" href="#">
            发布服务器（占位）
          </Link>
        </div>
      </section>
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
    </main>
  );
}
