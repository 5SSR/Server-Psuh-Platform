import Link from 'next/link';
import { api } from '../../../lib/api';

export const dynamic = 'force-dynamic';

export default async function AnnouncementDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await api.announcementById(id);

  return (
    <main className="page page-shell">
      <div className="actions" style={{ marginTop: 0 }}>
        <Link href="/announcements" className="btn secondary">
          返回公告列表
        </Link>
      </div>

      <article className="card stack-16" style={{ marginTop: 16 }}>
        <header className="stack-8">
          <div className="status-line">
            {data.isPinned ? <span className="status-chip warning">置顶公告</span> : null}
            <span className="status-chip info">
              发布时间：
              {data.publishedAt
                ? new Date(data.publishedAt).toLocaleString('zh-CN')
                : new Date(data.createdAt).toLocaleString('zh-CN')}
            </span>
          </div>
          <h1>{data.title}</h1>
          {data.summary ? <p className="muted">{data.summary}</p> : null}
        </header>

        <div
          className="stack-12"
          style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}
        >
          {data.content}
        </div>
      </article>
    </main>
  );
}
