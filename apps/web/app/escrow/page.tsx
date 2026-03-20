import Link from 'next/link';

const FLOW = [
  {
    title: '1. 下单支付（平台托管）',
    desc: '买家发起订单并支付，资金先托管到平台，不直接进入卖家账户。'
  },
  {
    title: '2. 卖家交付',
    desc: '卖家提交账号、面板、改绑能力等交付信息，进入平台核验阶段。'
  },
  {
    title: '3. 平台核验',
    desc: '平台核验配置一致性、到期时间、权限可控性和风险项，保障可交易。'
  },
  {
    title: '4. 买家验机确认',
    desc: '买家在验机窗口内确认配置与线路表现，异常可申请退款或发起纠纷。'
  },
  {
    title: '5. 结算放款',
    desc: '确认无误后平台按规则扣费并放款给卖家，交易进入完成状态。'
  }
];

const STATUS_MAP = [
  ['PENDING_PAYMENT', '待支付'],
  ['PAID_WAITING_DELIVERY', '已支付待交付'],
  ['VERIFYING', '平台核验中'],
  ['BUYER_CHECKING', '买家验机中'],
  ['COMPLETED_PENDING_SETTLEMENT', '已完成待结算'],
  ['COMPLETED', '已完成'],
  ['REFUNDING', '退款中'],
  ['DISPUTING', '纠纷中'],
  ['CANCELED', '已取消']
];

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

      <section className="stack-16">
        <div>
          <p className="eyebrow">流程阶段</p>
          <h2>标准担保交易路径</h2>
        </div>
        <div className="cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {FLOW.map((item, index) => (
            <article className="card stack-8" key={item.title}>
              <span className="status-chip info">阶段 {index + 1}</span>
              <h3 style={{ fontSize: 16 }}>{item.title}</h3>
              <p className="muted">{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="stack-16">
        <div className="section-head">
          <div>
            <p className="eyebrow">状态字典</p>
            <h2>订单状态与含义</h2>
          </div>
          <span className="muted">对齐 API 状态机</span>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>状态码</th>
                <th>中文说明</th>
                <th>阶段说明</th>
              </tr>
            </thead>
            <tbody>
              {STATUS_MAP.map(([code, name]) => (
                <tr key={code}>
                  <td>
                    <code>{code}</code>
                  </td>
                  <td>{name}</td>
                  <td className="muted">
                    {code === 'REFUNDING' || code === 'DISPUTING'
                      ? '售后流程状态，平台将冻结资金并按证据处理。'
                      : '交易主流程状态。'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

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
