import { api } from '../../lib/api';

export default async function HelpPage() {
  let helps: Awaited<ReturnType<typeof api.helpArticles>> = [];
  try {
    helps = await api.helpArticles();
  } catch {
    helps = [];
  }

  return (
    <main className="page" style={{ maxWidth: 860 }}>
      <section style={{ textAlign: 'center', paddingBottom: 32 }}>
        <p className="eyebrow">帮助中心</p>
        <h1>交易规则与常见问题</h1>
        <p className="sub" style={{ maxWidth: 480, margin: '12px auto 0' }}>
          平台公告、FAQ 与交易流程说明，帮助买卖双方快速完成交易。
        </p>
      </section>

      <section className="grid">
        {helps.length === 0 ? (
          <div className="card">
            <h3>暂无帮助内容</h3>
            <p>管理员可在后台“内容运营”中新增帮助文档。</p>
          </div>
        ) : (
          helps.map((item) => (
            <article className="card" key={item.id}>
              <p className="eyebrow">{item.category || '帮助中心'}</p>
              <h3>{item.title}</h3>
              <p>{item.content}</p>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
