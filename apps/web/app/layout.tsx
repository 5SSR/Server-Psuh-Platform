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
            <Link href="/seller/dashboard">卖家看板</Link>
            <Link href="/seller/products">卖家商品</Link>
            <Link href="/seller/orders">卖家订单</Link>
            <Link href="/seller/settlements">卖家结算</Link>
            <Link href="/orders">订单</Link>
            <Link href="/wallet">钱包</Link>
            <Link href="/notices">通知</Link>
            <Link href="/profile/verify">认证中心</Link>
            <Link href="/admin/dashboard">运营看板</Link>
            <Link href="/admin/users">用户管理</Link>
            <Link href="/admin/products">商品审核</Link>
            <Link href="/admin/orders">订单核验</Link>
            <Link href="/admin/settlements">结算放款</Link>
            <Link href="/admin/refunds">退款审核</Link>
            <Link href="/admin/disputes">纠纷仲裁</Link>
            <Link href="/admin/notices">通知管理</Link>
            <Link href="/admin/withdrawals">提现审核</Link>
            <Link href="/auth/login">登录</Link>
            <Link href="/auth/register">注册</Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
