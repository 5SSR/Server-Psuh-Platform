import { api } from '../../lib/api';
import { PolicyDocumentView } from '../../components/policy-document-view';

export const dynamic = 'force-dynamic';

export default async function AgreementPage() {
  const policy = await api.policyByCode('AGREEMENT');

  return (
    <PolicyDocumentView
      eyebrow="服务条款 · 平台协议"
      title="平台服务协议"
      description="用于明确平台、买家、卖家的权责边界，作为担保交易与争议处理的基础依据。"
      document={policy}
      code="AGREEMENT"
    />
  );
}
