import Link from 'next/link';
import { EscrowFlowCards, EscrowStatusTable } from '../../components/escrow-flow';

export default function EscrowFlowPage() {
  return (
    <main className="page page-shell">
      <section className="hero-card stack-16">
        <p className="eyebrow">担保交易流程</p>
        <h1>平台托管、核验交付、可追溯结算</h1>
        <p className="sub">
          IDC 二手服务器交易不是普通信息撮合，平台围绕资金托管、交付核验、风险处置建立标准化流程，
          让每一笔交易都有记录、有状态、有凭据。
        </p>
        <div className="actions" style={{ marginTop: 0 }}>
          <Link href="/products" className="btn primary">
            进入交易市场
          </Link>
          <Link href="/orders" className="btn secondary">
            查看我的订单
          </Link>
          <Link href="/help" className="btn ghost">
            帮助中心
          </Link>
        </div>
      </section>

      <EscrowFlowCards eyebrow="流程阶段" title="标准担保交易路径" />
      <EscrowStatusTable
        eyebrow="状态字典"
        title="订单状态与含义"
        sideHint={<span className="muted">对齐 API 状态机</span>}
      />

      <section className="grid">
        <article className="card stack-8" style={{ gridColumn: 'span 4' }}>
          <h3 style={{ fontSize: 16 }}>平台担保</h3>
          <p className="muted">支付资金先托管，避免“先款后货”直接风险。</p>
        </article>
        <article className="card stack-8" style={{ gridColumn: 'span 4' }}>
          <h3 style={{ fontSize: 16 }}>审核核验</h3>
          <p className="muted">商品审核 + 订单核验双层机制，减少配置不符与找回风险。</p>
        </article>
        <article className="card stack-8" style={{ gridColumn: 'span 4' }}>
          <h3 style={{ fontSize: 16 }}>纠纷仲裁</h3>
          <p className="muted">纠纷阶段统一收集证据与日志，结果可追溯可复盘。</p>
        </article>
      </section>
    </main>
  );
}
