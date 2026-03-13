import { api } from '../../../lib/api';
import Link from 'next/link';

export default async function ProductDetail({ params }: { params: { id: string } }) {
  const detail = await api.productDetail(params.id);

  return (
    <main className="page">
      <Link href="/products" className="muted back-link">
        ← 返回列表
      </Link>
      <header className="section-head">
        <div>
          <p className="eyebrow">{detail.region}</p>
          <h1>{detail.title}</h1>
        </div>
        <div className="price-lg">¥{Number(detail.salePrice).toFixed(2)}</div>
      </header>

      <div className="detail-grid">
        <section className="card">
          <h3>基础信息</h3>
          <p>分类：{detail.category}</p>
          {detail.lineType && <p>线路：{detail.lineType}</p>}
          {detail.expireAt && <p>到期：{new Date(detail.expireAt).toLocaleDateString()}</p>}
        </section>

        <section className="card">
          <h3>风险标签</h3>
          <div className="tags">
            {(detail.riskTags ?? ['暂无']).map((t) => (
              <span key={t} className="pill warning">
                {t}
              </span>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
