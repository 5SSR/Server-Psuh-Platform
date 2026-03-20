import Link from 'next/link';
import { api } from '../../lib/api';

export const dynamic = 'force-dynamic';

export default async function AnnouncementsPage() {
  const list = await api.announcements(50);

  return (
    <main className="page page-shell">
      <header className="section-head">
        <div>
          <p className="eyebrow">平台公告中心</p>
          <h1>公告与运营通知</h1>
          <p className="muted">面向全部访客开放，包含规则更新、维护通知与运营提醒。</p>
        </div>
        <div className="metric-card" style={{ minWidth: 220 }}>
          <p className="metric-label">当前公告</p>
          <p className="metric-value" style={{ fontSize: 26 }}>{list.length}</p>
          <p className="metric-tip">按置顶与发布时间排序</p>
        </div>
      </header>

      {list.length === 0 ? (
        <section className="empty-state">暂无公告，平台发布后将在此处展示。</section>
      ) : (
        <section className="cards">
          {list.map((item) => (
            <article key={item.id} className="card stack-12">
              <div className="card-header">
                <h2 style={{ fontSize: 18, margin: 0 }}>{item.title}</h2>
                <div className="status-line">
                  {item.isPinned ? <span className="status-chip warning">置顶</span> : null}
                  <span className="status-chip info">
                    {item.publishedAt
                      ? new Date(item.publishedAt).toLocaleString('zh-CN')
                      : new Date(item.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
              </div>
              <p className="muted">{item.summary || item.content.slice(0, 160)}</p>
              <div className="actions">
                <Link href={`/announcements/${item.id}`} className="btn secondary">
                  查看详情
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
