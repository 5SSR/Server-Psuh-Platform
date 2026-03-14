import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

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
            <Link href="/orders">订单</Link>
            <Link href="/auth/login">登录</Link>
            <Link href="/auth/register">注册</Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
