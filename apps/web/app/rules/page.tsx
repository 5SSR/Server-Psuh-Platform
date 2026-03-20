import { api } from '../../lib/api';
import { PolicyDocumentView } from '../../components/policy-document-view';

export const dynamic = 'force-dynamic';

export default async function RulesPage() {
  const policy = await api.policyByCode('RULES');

  return (
    <PolicyDocumentView
      eyebrow="交易规范 · 平台规则"
      title="平台交易规则"
      description="用于约束上架、下单、支付、交付、核验、结算与售后流程，保障担保交易可追溯。"
      document={policy}
      code="RULES"
    />
  );
}
