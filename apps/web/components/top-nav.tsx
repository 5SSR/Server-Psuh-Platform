"use client";

import Link, { type LinkProps } from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type NavItem = { href: LinkProps<string>['href']; label: string };

type CurrentUser = {
  email: string;
  role: 'USER' | 'ADMIN';
};

const SELLER_LINKS: NavItem[] = [
  { href: '/seller/dashboard', label: '卖家看板' },
  { href: '/seller/products', label: '我的商品' },
  { href: '/seller/orders', label: '我的履约' },
  { href: '/seller/settlements', label: '我的结算' },
];

const BUYER_LINKS: NavItem[] = [
  { href: '/orders', label: '我的订单' },
  { href: '/wallet', label: '钱包' },
  { href: '/notices', label: '通知' },
  { href: '/profile/verify', label: '认证中心' },
];

const ADMIN_LINKS: NavItem[] = [
  { href: '/admin/dashboard', label: '运营看板' },
  { href: '/admin/payments', label: '支付监控' },
  { href: '/admin/reconcile', label: '支付对账' },
  { href: '/admin/risk', label: '风控策略' },
  { href: '/admin/users', label: '用户管理' },
  { href: '/admin/products', label: '商品审核' },
  { href: '/admin/orders', label: '订单核验' },
  { href: '/admin/settlements', label: '结算放款' },
  { href: '/admin/refunds', label: '退款审核' },
  { href: '/admin/disputes', label: '纠纷仲裁' },
  { href: '/admin/notices', label: '通知管理' },
  { href: '/admin/content', label: '内容运营' },
  { href: '/admin/withdrawals', label: '提现审核' },
];

function NavGroup({ label, links }: { label: string; links: NavItem[] }) {
  return (
    <div className="nav-group">
      <button className="nav-group-trigger">{label}</button>
      <div className="nav-dropdown">
        {links.map((item) => (
          <Link key={String(item.href)} href={item.href}>{item.label}</Link>
        ))}
      </div>
    </div>
  );
}

export default function TopNav() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('idc_token');
    if (!token) {
      setCurrentUser(null);
      setReady(true);
      return;
    }

    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/user/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          localStorage.removeItem('idc_token');
          setCurrentUser(null);
          return;
        }
        const data = await res.json();
        setCurrentUser({
          email: data?.email || '',
          role: data?.role === 'ADMIN' ? 'ADMIN' : 'USER'
        });
      } catch {
        setCurrentUser(null);
      } finally {
        setReady(true);
      }
    };

    load();
  }, []);

  const logout = () => {
    localStorage.removeItem('idc_token');
    setCurrentUser(null);
    router.replace('/auth/login');
    router.refresh();
  };

  return (
    <nav className="topbar">
      <Link href="/" className="logo">IDC 交易平台</Link>
      <div className="nav-links">
        <Link href="/products">商品</Link>
        <Link href="/help">帮助</Link>

        {ready && currentUser ? (
          <>
            <NavGroup label="卖家中心" links={SELLER_LINKS} />
            <NavGroup label="买家中心" links={BUYER_LINKS} />
            {currentUser.role === 'ADMIN' && (
              <NavGroup label="管理后台" links={ADMIN_LINKS} />
            )}
            <span className="nav-role">{currentUser.role === 'ADMIN' ? '管理员' : '用户'}</span>
            <button className="nav-btn" onClick={logout}>退出</button>
          </>
        ) : (
          <>
            <Link href="/auth/login">登录</Link>
            <Link href="/auth/register">注册</Link>
          </>
        )}
      </div>
    </nav>
  );
}
