import Link from 'next/link';

import { api } from '../../lib/api';

export const dynamic = 'force-dynamic';

const CATEGORY_LABEL: Record<string, string> = {
  VPS: 'VPS',
  DEDICATED: '独立服务器',
  CLOUD: '云服务器',
  NAT: 'NAT',
  LINE: '线路机'
};

type Props = {
  searchParams: {
    category?: string;
    region?: string;
    lineType?: string;
    keyword?: string;
    page?: string;
  };
};

function parsePage(value?: string) {
  const n = Number(value || 1);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

export default async function WantedPage({ searchParams }: Props) {
  const page = parsePage(searchParams.page);
  const query = new URLSearchParams();
  query.set('page', String(page));
  query.set('pageSize', '20');
  if (searchParams.category) query.set('category', searchParams.category);
  if (searchParams.region) query.set('region', searchParams.region);
  if (searchParams.lineType) query.set('lineType', searchParams.lineType);
  if (searchParams.keyword) query.set('keyword', searchParams.keyword);

  const [summary, wanted] = await Promise.all([
    api.wantedSummary(),
    api.wantedList(query.toString())
  ]);

  const totalPages = Math.max(1, Math.ceil((wanted.total || 0) / 20));

  return (
    <main className="page page-shell">
      <header className="section-head">
        <div>
          <p className="eyebrow">求购市场</p>
          <h1>买家求购需求大厅</h1>
          <p className="sub">按地区、线路和预算快速匹配可交付服务器，平台保留担保交易能力。</p>
        </div>
        <div className="toolbar" style={{ alignItems: 'flex-start' }}>
          <Link href="/wanted/new" className="btn primary">发布求购</Link>
          <Link href="/wanted/mine" className="btn secondary">我的求购</Link>
        </div>
      </header>

      <section className="metrics-grid">
        <article className="metric-card">
          <p className="metric-label">开放求购</p>
          <p className="metric-value">{summary.openCount}</p>
          <p className="metric-tip">当前可响应需求</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">已关闭求购</p>
          <p className="metric-value">{summary.closedCount}</p>
          <p className="metric-tip">已完成匹配或主动关闭</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">分类覆盖</p>
          <p className="metric-value">{summary.categories.length}</p>
          <p className="metric-tip">活跃需求品类数</p>
        </article>
      </section>

      <form className="filter-bar" method="get">
        <div className="filter-grid">
          <div className="field">
            <label>关键词</label>
            <input name="keyword" defaultValue={searchParams.keyword || ''} placeholder="标题/描述" />
          </div>
          <div className="field">
            <label>分类</label>
            <select name="category" defaultValue={searchParams.category || ''}>
              <option value="">全部</option>
              <option value="VPS">VPS</option>
              <option value="DEDICATED">独立服务器</option>
              <option value="CLOUD">云服务器</option>
              <option value="NAT">NAT</option>
              <option value="LINE">线路机</option>
            </select>
          </div>
          <div className="field">
            <label>地区</label>
            <input name="region" defaultValue={searchParams.region || ''} placeholder="香港/东京/洛杉矶" />
          </div>
          <div className="field">
            <label>线路</label>
            <input name="lineType" defaultValue={searchParams.lineType || ''} placeholder="CN2 / CMI / 4837" />
          </div>
        </div>
        <div className="toolbar">
          <button type="submit" className="btn primary">筛选求购</button>
          <Link href="/wanted" className="btn secondary">重置</Link>
          <span className="muted">共 {wanted.total} 条需求 · 第 {page}/{totalPages} 页</span>
        </div>
      </form>

      {wanted.list.length === 0 ? (
        <div className="empty-state">暂无符合条件的求购需求</div>
      ) : (
        <div className="cards">
          {wanted.list.map((item) => (
            <article key={item.id} className="card stack-12">
              <div className="card-header">
                <div className="stack-8">
                  <h3>{item.title}</h3>
                  <div className="status-line">
                    <span className="status-chip info">{CATEGORY_LABEL[item.category || ''] || item.category || '未指定'}</span>
                    <span className="status-chip">{item.region}</span>
                    <span className="status-chip">{item.lineType || '线路不限'}</span>
                    <span className="status-chip success">担保交易可用</span>
                  </div>
                </div>
                <div className="price-area">
                  <p className="price-main">
                    ¥{item.budgetMin ? Number(item.budgetMin).toFixed(0) : '0'} - ¥{item.budgetMax ? Number(item.budgetMax).toFixed(0) : '不限'}
                  </p>
                  <p className="price-sub">预算区间</p>
                </div>
              </div>

              <div className="spec-grid">
                <div><span>CPU</span><strong>{item.cpuCores ? `${item.cpuCores} 核+` : '不限'}</strong></div>
                <div><span>内存</span><strong>{item.memoryGb ? `${item.memoryGb} GB+` : '不限'}</strong></div>
                <div><span>硬盘</span><strong>{item.diskGb ? `${item.diskGb} GB+` : '不限'}</strong></div>
                <div><span>带宽</span><strong>{item.bandwidthMbps ? `${item.bandwidthMbps} Mbps+` : '不限'}</strong></div>
              </div>

              {item.description ? <p className="muted">{item.description}</p> : null}

              <div className="toolbar">
                <span className="muted">已收到 {item._count?.offers || 0} 份报价</span>
                <span className="muted">发布时间：{new Date(item.createdAt).toLocaleString()}</span>
                <Link href={`/wanted/${item.id}`} className="btn secondary">查看并报价</Link>
              </div>
            </article>
          ))}
        </div>
      )}

      <section className="toolbar" style={{ justifyContent: 'space-between' }}>
        <Link
          className={`btn secondary${page <= 1 ? ' disabled' : ''}`}
          href={page <= 1 ? '/wanted' : `/wanted?${new URLSearchParams({ ...Object.fromEntries(Object.entries(searchParams).filter(([, v]) => Boolean(v))), page: String(page - 1) }).toString()}`}
        >
          上一页
        </Link>
        <span className="muted">第 {page} / {totalPages} 页</span>
        <Link
          className={`btn secondary${page >= totalPages ? ' disabled' : ''}`}
          href={page >= totalPages ? `/wanted?page=${page}` : `/wanted?${new URLSearchParams({ ...Object.fromEntries(Object.entries(searchParams).filter(([, v]) => Boolean(v))), page: String(page + 1) }).toString()}`}
        >
          下一页
        </Link>
      </section>
    </main>
  );
}
