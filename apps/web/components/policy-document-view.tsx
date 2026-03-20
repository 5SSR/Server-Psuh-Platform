import Link from 'next/link';

import type { PolicyDocument } from '../lib/api';

function toParagraphs(content: string) {
  return content
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function PolicyDocumentView({
  eyebrow,
  title,
  description,
  document,
  code
}: {
  eyebrow: string;
  title: string;
  description: string;
  document: PolicyDocument;
  code: 'RULES' | 'AGREEMENT';
}) {
  const paragraphs = toParagraphs(document.content);

  return (
    <main className="page page-shell">
      <header className="section-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{document.title || title}</h1>
          <p className="muted">{description}</p>
        </div>
        <div className="actions" style={{ marginTop: 0 }}>
          <Link href="/help" className="btn secondary">
            返回帮助中心
          </Link>
          {code === 'RULES' ? (
            <Link href="/agreement" className="btn ghost">
              查看服务协议
            </Link>
          ) : (
            <Link href="/rules" className="btn ghost">
              查看交易规则
            </Link>
          )}
        </div>
      </header>

      <section className="card stack-16">
        <div className="status-line">
          <span className="status-chip info">平台担保规则</span>
          <span className="status-chip">文档编码：{document.code || code}</span>
          <span className="status-chip">更新时间：{document.updatedAt ? new Date(document.updatedAt).toLocaleString('zh-CN') : '未知'}</span>
        </div>
        {paragraphs.length === 0 ? (
          <div className="empty-state">当前文档暂无内容，请联系管理员发布版本。</div>
        ) : (
          <div className="stack-12">
            {paragraphs.map((item, index) => (
              <article className="card nested" key={`${document.id}-${index}`}>
                <p className="muted" style={{ whiteSpace: 'pre-wrap' }}>
                  {item}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
