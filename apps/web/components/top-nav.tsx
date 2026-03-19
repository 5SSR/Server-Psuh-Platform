"use client";

import Link, { type LinkProps } from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type NavItem = { href: LinkProps<string>['href']; label: string };

type CurrentUser = {
  email: string;
  role: 'USER' | 'ADMIN';
};

const MAIN_LINKS: NavItem[] = [
  { href: '/', label: '首页' },
  { href: '/products', label: '交易市场' },
  { href: '/help', label: '担保流程' }
];

const SELLER_LINKS: NavItem[] = [
  { href: '/seller/dashboard', label: '卖家看板' },
  { href: '/seller/products', label: '发布/管理商品' },
  { href: '/seller/orders', label: '履约交付' },
  { href: '/seller/settlements', label: '结算放款' }
];

const BUYER_LINKS: NavItem[] = [
  { href: '/orders', label: '我的订单' },
  { href: '/wallet', label: '钱包与结算' },
  { href: '/notices', label: '通知中心' },
  { href: '/profile/verify', label: '认证中心' }
];

const ADMIN_LINKS: NavItem[] = [
  { href: '/admin/dashboard', label: '运营看板' },
  { href: '/admin/users', label: '用户管理' },
  { href: '/admin/products', label: '商品审核' },
  { href: '/admin/orders', label: '订单核验' },
  { href: '/admin/payments', label: '支付监控' },
  { href: '/admin/reconcile', label: '支付对账' },
  { href: '/admin/settlements', label: '结算放款' },
  { href: '/admin/refunds', label: '退款审核' },
  { href: '/admin/disputes', label: '纠纷仲裁' },
  { href: '/admin/withdrawals', label: '提现审核' },
  { href: '/admin/risk', label: '风控策略' },
  { href: '/admin/notices', label: '通知管理' },
  { href: '/admin/content', label: '内容运营' },
  { href: '/admin/logs', label: '操作日志' }
];

function NavGroup({ label, links }: { label: string; links: NavItem[] }) {
  return (
    <div className="nav-group">
      <button className="nav-group-trigger" type="button">
        {label}
      </button>
      <div className="nav-dropdown">
        {links.map((item) => (
          <Link key={String(item.href)} href={item.href}>
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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

  const navRole = useMemo(() => {
    if (!currentUser) return '游客';
    return currentUser.role === 'ADMIN' ? '管理员' : '认证用户';
  }, [currentUser]);

  return (
    <nav className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="logo">
          <span className="logo-mark" aria-hidden="true" />
          IDC 服务器担保交易
        </Link>

        <div className="nav-main">
          {MAIN_LINKS.map((item) => (
            <Link
              key={String(item.href)}
              href={item.href}
              className={`nav-link${pathname === item.href ? ' active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="nav-links">
          {ready && currentUser ? (
            <>
              <NavGroup label="买家中心" links={BUYER_LINKS} />
              <NavGroup label="卖家中心" links={SELLER_LINKS} />
              {currentUser.role === 'ADMIN' && <NavGroup label="管理后台" links={ADMIN_LINKS} />}
              <span className="nav-role">{navRole}</span>
              <button className="nav-btn" onClick={logout} type="button">
                退出
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login">登录</Link>
              <Link href="/auth/register">注册</Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="nav-mobile-toggle"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="切换菜单"
        >
          {mobileOpen ? '×' : '≡'}
        </button>
      </div>

      <div className={`nav-mobile-panel${mobileOpen ? ' open' : ''}`}>
        <div className="nav-mobile-block">
          <p className="nav-mobile-block-title">平台导航</p>
          {MAIN_LINKS.map((item) => (
            <Link key={String(item.href)} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>

        {ready && currentUser ? (
          <>
            <div className="nav-mobile-block">
              <p className="nav-mobile-block-title">买家中心</p>
              {BUYER_LINKS.map((item) => (
                <Link key={String(item.href)} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="nav-mobile-block">
              <p className="nav-mobile-block-title">卖家中心</p>
              {SELLER_LINKS.map((item) => (
                <Link key={String(item.href)} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </div>
            {currentUser.role === 'ADMIN' && (
              <div className="nav-mobile-block">
                <p className="nav-mobile-block-title">管理后台</p>
                {ADMIN_LINKS.map((item) => (
                  <Link key={String(item.href)} href={item.href}>
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
            <div className="nav-mobile-block">
              <p className="nav-mobile-block-title">账户</p>
              <div className="muted">当前身份：{navRole}</div>
              <button type="button" onClick={logout}>
                退出登录
              </button>
            </div>
          </>
        ) : (
          <div className="nav-mobile-block">
            <p className="nav-mobile-block-title">账户</p>
            <Link href="/auth/login">登录</Link>
            <Link href="/auth/register">注册</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
