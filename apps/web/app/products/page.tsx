import Link from 'next/link';
import { api } from '../../lib/api';

export default async function ProductsPage() {
  const data = await api.products();
  return (
    <main className="page">
      <header className="section-head">
        <div>
          <p className="eyebrow">服务器交易</p>
          <h1>在售商品</h1>
        </div>
        <div className="muted">共 {data.total} 条</div>
      </header>

      <div className="cards">
        {data.list.map((item) => (
          <Link key={item.id} href={`/products/${item.id}`} className="card link">
            <div className="card-header">
              <h3>{item.title}</h3>
              <span className="price">¥{Number(item.salePrice).toFixed(2)}</span>
            </div>
            <div className="card-meta">
              <span>{item.category}</span>
              <span>{item.region}</span>
              {item.lineType && <span>{item.lineType}</span>}
            </div>
            <div className="card-meta">
              <span>卖家：{item.seller?.email || '未知'}</span>
              <span>等级：Lv.{item.seller?.sellerProfile?.level ?? 1}</span>
              <span>成交：{item.seller?.sellerProfile?.tradeCount ?? 0}</span>
            </div>
            {item.riskTags && item.riskTags.length > 0 && (
              <div className="tags">
                {item.riskTags.slice(0, 3).map((tag) => (
                  <span key={tag} className="pill warning">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>
    </main>
  );
}
