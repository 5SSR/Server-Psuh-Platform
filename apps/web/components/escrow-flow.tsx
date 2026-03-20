import type { ReactNode } from 'react';

export type EscrowFlowStep = {
  title: string;
  desc: string;
};

export type EscrowStatusItem = {
  code: string;
  name: string;
  description: string;
};

export const ESCROW_FLOW_STEPS: EscrowFlowStep[] = [
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

export const ESCROW_STATUS_MAP: EscrowStatusItem[] = [
  {
    code: 'PENDING_PAYMENT',
    name: '待支付',
    description: '交易主流程状态。'
  },
  {
    code: 'PAID_WAITING_DELIVERY',
    name: '已支付待交付',
    description: '交易主流程状态。'
  },
  {
    code: 'VERIFYING',
    name: '平台核验中',
    description: '交易主流程状态。'
  },
  {
    code: 'BUYER_CHECKING',
    name: '买家验机中',
    description: '交易主流程状态。'
  },
  {
    code: 'COMPLETED_PENDING_SETTLEMENT',
    name: '已完成待结算',
    description: '交易主流程状态。'
  },
  {
    code: 'COMPLETED',
    name: '已完成',
    description: '交易主流程状态。'
  },
  {
    code: 'REFUNDING',
    name: '退款中',
    description: '售后流程状态，平台将冻结资金并按证据处理。'
  },
  {
    code: 'DISPUTING',
    name: '纠纷中',
    description: '售后流程状态，平台将冻结资金并按证据处理。'
  },
  {
    code: 'CANCELED',
    name: '已取消',
    description: '交易主流程状态。'
  }
];

export function EscrowFlowCards({
  title,
  eyebrow,
  steps = ESCROW_FLOW_STEPS
}: {
  title: string;
  eyebrow: string;
  steps?: EscrowFlowStep[];
}) {
  return (
    <section className="stack-16">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <div className="cards" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {steps.map((item, idx) => (
          <article className="card stack-8" key={item.title}>
            <span className="status-chip info">阶段 {idx + 1}</span>
            <h3 style={{ fontSize: 16 }}>{item.title}</h3>
            <p className="muted">{item.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function EscrowStatusTable({
  title,
  eyebrow,
  sideHint
}: {
  title: string;
  eyebrow: string;
  sideHint?: ReactNode;
}) {
  return (
    <section className="stack-16">
      <div className="section-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        {sideHint ? sideHint : null}
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
            {ESCROW_STATUS_MAP.map((item) => (
              <tr key={item.code}>
                <td>
                  <code>{item.code}</code>
                </td>
                <td>{item.name}</td>
                <td className="muted">{item.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
