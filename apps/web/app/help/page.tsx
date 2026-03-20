import Link from 'next/link';
import { api } from '../../lib/api';

export const dynamic = 'force-dynamic';

const FLOW = [
  {
    title: '1. 卖家上架并提交审核',
    desc: '卖家填写配置、价格、交付方式与凭证信息，平台进行基础校验与风控标注。'
  },
  {
    title: '2. 买家下单并支付托管',
    desc: '买家确认商品后发起支付，资金先进入平台托管，不直接打给卖家。'
  },
  {
    title: '3. 卖家交付账号/面板信息',
    desc: '卖家按订单要求交付，并提交交付记录，平台与买家可查看全过程。'
  },
  {
    title: '4. 平台核验 + 买家验机',
    desc: '核验配置、到期、线路、权限一致性，买家在验机窗口内确认或反馈问题。'
  },
  {
    title: '5. 自动结算或进入售后',
    desc: '确认无误后系统结算放款；若异常可发起退款/纠纷并进入仲裁流程。'
  }
];

export default async function HelpPage() {
  let helps: Awaited<ReturnType<typeof api.helpArticles>> = [];
  try {
    helps = await api.helpArticles();
  } catch {
    helps = [];
  }

  return (
    <main className="page page-shell">
      <section className="hero-card stack-16">
        <p className="eyebrow">帮助中心 · 担保交易规则</p>
        <h1>交易流程、规则与常见问题</h1>
        <p className="sub">
          本平台面向二手服务器交易，采用担保托管 + 核验交付 + 仲裁售后的流程机制，
          保证交易信息与资金流转可追踪、可复核。
        </p>
        <div className="actions" style={{ marginTop: 0 }}>
          <Link href="/products" className="btn primary">
            去交易市场
          </Link>
          <Link href="/seller/products" className="btn secondary">
            去发布商品
          </Link>
        </div>
      </section>

      <section className="stack-16">
        <div>
          <p className="eyebrow">担保流程</p>
          <h2>平台标准交易流程</h2>
        </div>
        <div className="cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {FLOW.map((item, idx) => (
            <article className="card stack-8" key={item.title}>
              <span className="status-chip info">阶段 {idx + 1}</span>
              <h3 style={{ fontSize: 16 }}>{item.title}</h3>
              <p className="muted">{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="stack-16">
        <div>
          <p className="eyebrow">规则重点</p>
          <h2>交易双方都应关注的关键规则</h2>
        </div>
        <div className="grid">
          <article className="card stack-8" style={{ gridColumn: 'span 4' }}>
            <h3 style={{ fontSize: 16 }}>信息真实性</h3>
            <p className="muted">配置、到期、线路、可变更项需如实填写，避免描述与交付不一致。</p>
          </article>
          <article className="card stack-8" style={{ gridColumn: 'span 4' }}>
            <h3 style={{ fontSize: 16 }}>验机窗口</h3>
            <p className="muted">买家应在有效窗口内完成验机并确认，逾期可能进入自动结算流程。</p>
          </article>
          <article className="card stack-8" style={{ gridColumn: 'span 4' }}>
            <h3 style={{ fontSize: 16 }}>纠纷证据</h3>
            <p className="muted">纠纷处理以订单记录、交付记录、核验记录和证据链接为依据。</p>
          </article>
        </div>
      </section>

      <section className="stack-16">
        <div className="section-head">
          <div>
            <p className="eyebrow">帮助文档</p>
            <h2>文档与 FAQ</h2>
          </div>
          <span className="muted">共 {helps.length} 条</span>
        </div>

        {helps.length === 0 ? (
          <div className="empty-state">暂无帮助内容，管理员可在“内容运营”中新增文档。</div>
        ) : (
          <div className="cards">
            {helps.map((item) => (
              <article className="card stack-8" key={item.id}>
                <p className="eyebrow" style={{ marginBottom: 0 }}>{item.category || '帮助中心'}</p>
                <h3 style={{ fontSize: 16 }}>{item.title}</h3>
                <p className="muted">{item.content}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
