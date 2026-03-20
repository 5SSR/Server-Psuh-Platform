import Link from 'next/link';
import { api } from '../lib/api';

export const dynamic = 'force-dynamic';

const CATEGORIES = [
  { label: 'VPS', value: 'VPS' },
  { label: '独立服务器', value: 'DEDICATED' },
  { label: '云服务器', value: 'CLOUD' },
  { label: 'NAT 转发', value: 'NAT' },
  { label: '线路机', value: 'LINE' }
];

const REGIONS = ['中国香港', '日本东京', '新加坡', '美国西海岸', '德国', '英国'];
const LINES = ['CN2', 'BGP', 'AS9929', '原生 IP', '优化线路'];

const CONSIGNMENT_STATUS_LABEL: Record<'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED', string> = {
  PENDING: '寄售待审核',
  APPROVED: '寄售已通过',
  REJECTED: '寄售已驳回',
  CANCELED: '寄售已撤销'
};

function consignmentTone(status?: string) {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'danger';
  if (status === 'CANCELED') return '';
  return 'warning';
}

export default async function Home() {
  let content: Awaited<ReturnType<typeof api.homeContent>> | null = null;
  let latest: Awaited<ReturnType<typeof api.products>>['list'] = [];
  let featured: Awaited<ReturnType<typeof api.products>>['list'] = [];

  try {
    content = await api.homeContent();
  } catch {
    content = null;
  }

  try {
    const latestRes = await api.products('page=1&pageSize=6');
    latest = latestRes.list || [];
  } catch {
    latest = [];
  }

  try {
    const featuredRes = await api.products('page=1&pageSize=4&urgentOnly=true');
    featured = featuredRes.list || [];
  } catch {
    featured = [];
  }

  const faqs = content?.faqs ?? [];
  const tags = content?.tags ?? [];

  return (
    <main className="page page-shell">
      <section className="hero-card">
        <p className="eyebrow">二手服务器交易平台 · 担保交易</p>
        <div className="grid">
          <div style={{ gridColumn: 'span 8' }} className="stack-20">
            <h1>IDC / VPS / 独服 / NAT 的专业担保交易市场</h1>
            <p className="sub">
              平台审核上架、资金托管支付、交付核验、纠纷仲裁、结算放款全流程在线完成。
              让服务器交易从“私下沟通”升级为“可核验、可追溯、可担保”的规范化流程。
            </p>
            <div className="actions" style={{ marginTop: 0 }}>
              <Link href="/products" className="btn primary">
                浏览在售商品
              </Link>
              <Link href="/seller/products" className="btn secondary">
                发布我的服务器
              </Link>
              <Link href="/help" className="btn ghost">
                查看担保交易流程
              </Link>
            </div>
          </div>

          <div style={{ gridColumn: 'span 4' }} className="stack-12">
            <div className="card nested">
              <p className="metric-label">平台定位</p>
              <p className="metric-value" style={{ fontSize: 22 }}>担保交易 + 核验交付</p>
              <p className="metric-tip">覆盖下单、支付、交付、核验、确认、结算、售后</p>
            </div>
            <div className="hero-kpis">
              <div className="hero-kpi">
                <strong>7x24</strong>
                <span>订单状态可追踪</span>
              </div>
              <div className="hero-kpi">
                <strong>100%</strong>
                <span>托管资金流转</span>
              </div>
              <div className="hero-kpi">
                <strong>多维</strong>
                <span>卖家信誉评分</span>
              </div>
              <div className="hero-kpi">
                <strong>可仲裁</strong>
                <span>纠纷标准化处理</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="stack-16">
        {featured.length > 0 && (
          <>
            <div className="section-head">
              <div>
                <p className="eyebrow">平台推荐</p>
                <h2>重点推荐交易标的</h2>
              </div>
              <Link href="/products?urgentOnly=true" className="btn secondary">
                查看推荐列表
              </Link>
            </div>
            <div className="cards">
              {featured.map((item) => (
                <Link key={`featured-${item.id}`} href={`/products/${item.id}`} className="card link stack-12">
                  <div className="card-header">
                    <h3 style={{ fontSize: 16 }}>{item.title}</h3>
                    <span className="price">¥{Number(item.salePrice).toFixed(2)}</span>
                  </div>
                  <div className="spec-grid">
                    <div className="spec-item">
                      <p className="label">类型</p>
                      <p className="value">{item.category}</p>
                    </div>
                    <div className="spec-item">
                      <p className="label">地区</p>
                      <p className="value">{item.region || '-'}</p>
                    </div>
                    <div className="spec-item">
                      <p className="label">线路</p>
                      <p className="value">{item.lineType || '-'}</p>
                    </div>
                    <div className="spec-item">
                      <p className="label">风险</p>
                      <p className="value">{item.riskLevel || 'MEDIUM'}</p>
                    </div>
                  </div>
                  <div className="status-line">
                    <span className="status-chip info">平台推荐</span>
                    <span className="status-chip success">担保交易</span>
                    <span className="status-chip">
                      卖家 Lv.{item.seller?.sellerProfile?.level ?? 1}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="stack-16">
        <div className="section-head">
          <div>
            <p className="eyebrow">在售市场</p>
            <h2>最新上架与热门交易</h2>
          </div>
          <Link href="/products" className="btn secondary">
            查看全部商品
          </Link>
        </div>

        {latest.length === 0 ? (
          <div className="empty-state">暂无在售商品，卖家可先进入发布页提交审核。</div>
        ) : (
          <div className="cards">
            {latest.map((item) => {
              const latestConsignment = item.consignmentApplications?.[0];
              return (
                <Link key={item.id} href={`/products/${item.id}`} className="card link stack-12">
                  <div className="card-header">
                    <h3 style={{ fontSize: 16 }}>{item.title}</h3>
                    <span className="price">¥{Number(item.salePrice).toFixed(2)}</span>
                  </div>
                  <div className="spec-grid">
                    <div className="spec-item">
                      <p className="label">类型</p>
                      <p className="value">{item.category}</p>
                    </div>
                    <div className="spec-item">
                      <p className="label">地区</p>
                      <p className="value">{item.region || '-'}</p>
                    </div>
                    <div className="spec-item">
                      <p className="label">线路</p>
                      <p className="value">{item.lineType || '-'}</p>
                    </div>
                    <div className="spec-item">
                      <p className="label">到期</p>
                      <p className="value">
                        {item.expireAt ? new Date(item.expireAt).toLocaleDateString('zh-CN') : '长期/未知'}
                      </p>
                    </div>
                  </div>
                  <div className="status-line">
                    <span className="status-chip info">平台担保</span>
                    {item.consignment ? (
                      <span className="status-chip success">平台寄售</span>
                    ) : latestConsignment?.status ? (
                      <span className={`status-chip ${consignmentTone(latestConsignment.status)}`}>
                        {CONSIGNMENT_STATUS_LABEL[latestConsignment.status] || latestConsignment.status}
                      </span>
                    ) : (
                      <span className="status-chip">未启用寄售</span>
                    )}
                    <span className="status-chip success">
                      卖家 Lv.{item.seller?.sellerProfile?.level ?? 1}
                    </span>
                    {!!item.riskTags?.length && <span className="status-chip warning">含风险标签</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="stack-16">
        <div>
          <p className="eyebrow">平台保障</p>
          <h2>真实交易平台所需的风控与保障机制</h2>
        </div>
        <div className="metric-grid">
          <article className="metric-card">
            <p className="metric-label">担保支付</p>
            <p className="metric-value" style={{ fontSize: 20 }}>资金先托管后放款</p>
            <p className="metric-tip">买家支付后先进入平台托管，确认交付与核验后再结算给卖家。</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">平台核验</p>
            <p className="metric-value" style={{ fontSize: 20 }}>配置与交付双重检查</p>
            <p className="metric-tip">订单支持交付记录、核验记录与操作日志，减少描述不一致风险。</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">卖家信誉</p>
            <p className="metric-value" style={{ fontSize: 20 }}>等级、成交、纠纷率可见</p>
            <p className="metric-tip">下单前可查看卖家历史履约表现，提升交易决策效率与安全性。</p>
          </article>
          <article className="metric-card">
            <p className="metric-label">纠纷仲裁</p>
            <p className="metric-value" style={{ fontSize: 20 }}>证据化、流程化处理</p>
            <p className="metric-tip">买卖双方可提交证据，平台按规则裁决退款或放款。</p>
          </article>
        </div>
      </section>

      <section className="stack-16">
        <div>
          <p className="eyebrow">交易流程</p>
          <h2>标准担保交易 7 步闭环</h2>
        </div>
        <div className="cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
          {[
            '卖家上架并提交审核',
            '买家下单并完成支付',
            '卖家提交交付信息',
            '平台核验配置与交付',
            '买家验机确认',
            '系统自动结算放款',
            '售后/纠纷按规则处理'
          ].map((step, idx) => (
            <article key={step} className="card nested stack-8">
              <span className="status-chip info">步骤 {idx + 1}</span>
              <p>{step}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="stack-16">
        <div>
          <p className="eyebrow">热门检索</p>
          <h2>按类型、地区、线路快速进入市场</h2>
        </div>
        <div className="grid">
          <article className="card stack-12" style={{ gridColumn: 'span 4' }}>
            <h3>热门类型</h3>
            <div className="tags">
              {CATEGORIES.map((item) => (
                <Link key={item.value} href={`/products?category=${item.value}`} className="status-chip">
                  {item.label}
                </Link>
              ))}
            </div>
          </article>
          <article className="card stack-12" style={{ gridColumn: 'span 4' }}>
            <h3>热门地区</h3>
            <div className="tags">
              {REGIONS.map((item) => (
                <Link key={item} href={`/products?region=${encodeURIComponent(item)}`} className="status-chip">
                  {item}
                </Link>
              ))}
            </div>
          </article>
          <article className="card stack-12" style={{ gridColumn: 'span 4' }}>
            <h3>热门线路</h3>
            <div className="tags">
              {LINES.map((item) => (
                <span key={item} className="status-chip info">
                  {item}
                </span>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="stack-16">
        <div className="section-head">
          <div>
            <p className="eyebrow">帮助中心</p>
            <h2>交易规则与常见问题</h2>
          </div>
          <Link href="/help" className="btn secondary">
            查看全部帮助
          </Link>
        </div>

        {faqs.length > 0 ? (
          <div className="cards">
            {faqs.slice(0, 6).map((item) => (
              <article className="card stack-8" key={item.id}>
                <h3 style={{ fontSize: 16 }}>{item.question}</h3>
                <p className="muted">{item.answer}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">暂无 FAQ，管理员可在后台内容运营中补充。</div>
        )}

        {tags.length > 0 && (
          <div className="tags">
            {tags.map((tag) => (
              <span key={tag.id} className="status-chip">
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
