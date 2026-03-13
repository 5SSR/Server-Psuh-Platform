import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'IDC 二手服务器交易平台',
  description: '担保交易 · 交付核验 · 风险可控'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <nav className="topbar">
          <div className="logo">IDC 二手交易</div>
          <div className="nav-links">
            <Link href="/products">商品</Link>
            <Link href="#">订单（占位）</Link>
            <Link href="#">后台（占位）</Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
