"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import LocaleSwitch from './locale-switch';
import {
  hasEnPrefix,
  toLocaleHref,
  toLocaleRoute
} from '../lib/locale';
import { useLocale } from '../lib/use-locale';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type NavItem = { href: string; label: string };

type CurrentUser = {
  email: string;
  role: 'USER' | 'ADMIN';
};

const MAIN_LINKS: NavItem[] = [
  { href: '/', label: '首页' },
  { href: '/products', label: '交易市场' },
  { href: '/wanted', label: '求购市场' },
  { href: '/bargains', label: '议价中心' },
  { href: '/escrow', label: '担保流程' },
  { href: '/announcements', label: '公告中心' }
];

const SELLER_LINKS: NavItem[] = [
  { href: '/seller/dashboard', label: '卖家看板' },
  { href: '/seller/store', label: '店铺资料' },
  { href: '/seller/open-api', label: '开放接口' },
  { href: '/seller/products', label: '发布/管理商品' },
  { href: '/seller/consignments', label: '寄售申请' },
  { href: '/seller/orders', label: '履约交付' },
  { href: '/bargains', label: '议价会话' },
  { href: '/seller/settlements', label: '结算放款' }
];

const BUYER_LINKS: NavItem[] = [
  { href: '/orders', label: '我的订单' },
  { href: '/wanted/mine', label: '我的求购' },
  { href: '/bargains', label: '我的议价' },
  { href: '/wallet', label: '钱包与结算' },
  { href: '/profile/support', label: '售后工单' },
  { href: '/profile/history', label: '浏览历史' },
  { href: '/profile/alerts', label: '价格提醒' },
  { href: '/notices', label: '通知中心' },
  { href: '/profile/verify', label: '认证中心' }
];

const ADMIN_LINKS: NavItem[] = [
  { href: '/admin/dashboard', label: '运营看板' },
  { href: '/admin/users', label: '用户管理' },
  { href: '/admin/products', label: '商品审核' },
  { href: '/admin/orders', label: '订单核验' },
  { href: '/admin/bargains', label: '议价管理' },
  { href: '/admin/consignments', label: '寄售审核' },
  { href: '/admin/payments', label: '支付监控' },
  { href: '/admin/finance', label: '财务报表' },
  { href: '/admin/reconcile', label: '支付对账' },
  { href: '/admin/settlements', label: '结算放款' },
  { href: '/admin/refunds', label: '退款审核' },
  { href: '/admin/disputes', label: '纠纷仲裁' },
  { href: '/admin/withdrawals', label: '提现审核' },
  { href: '/admin/risk', label: '风控策略' },
  { href: '/admin/security', label: '登录安全' },
  { href: '/admin/support', label: '售后工单' },
  { href: '/admin/policies', label: '规则协议' },
  { href: '/admin/open-api', label: '开放接口监控' },
  { href: '/admin/notices', label: '通知管理' },
  { href: '/admin/content', label: '内容运营' },
  { href: '/admin/logs', label: '操作日志' }
];

function NavGroup({ label, links, locale }: { label: string; links: NavItem[]; locale: string }) {
  return (
    <div className="nav-group">
      <button className="nav-group-trigger" type="button">
        {label}
      </button>
      <div className="nav-dropdown">
        {links.map((item) => (
          <Link key={String(item.href)} href={toLocaleHref(item.href, locale)}>
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
  const { locale } = useLocale();
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
    router.replace(toLocaleRoute('/auth/login', locale));
    router.refresh();
  };

  const navRole = useMemo(() => {
    if (!currentUser) return '游客';
    return currentUser.role === 'ADMIN' ? '管理员' : '认证用户';
  }, [currentUser]);

  const isEn = locale.startsWith('en') || hasEnPrefix(pathname || '');

  const tr = (zh: string, en: string) => (isEn ? en : zh);
  const navRoleLabel = isEn
    ? navRole === '管理员'
      ? 'Admin'
      : navRole === '认证用户'
        ? 'Verified User'
        : 'Guest'
    : navRole;

  const labelMap: Record<string, string> = {
    首页: 'Home',
    交易市场: 'Marketplace',
    求购市场: 'Wanted',
    议价中心: 'Bargain',
    担保流程: 'Escrow',
    公告中心: 'Announcements',
    交易规则: 'Rules',
    卖家看板: 'Seller Dashboard',
    店铺资料: 'Store Profile',
    开放接口: 'Open API',
    '发布/管理商品': 'Products',
    寄售申请: 'Consignment',
    履约交付: 'Delivery',
    议价会话: 'Negotiations',
    结算放款: 'Settlements',
    我的订单: 'My Orders',
    我的求购: 'My Wanted',
    我的议价: 'My Bargains',
    钱包与结算: 'Wallet',
    售后工单: 'Support Tickets',
    浏览历史: 'History',
    价格提醒: 'Price Alerts',
    通知中心: 'Notices',
    认证中心: 'Verification',
    运营看板: 'Ops Dashboard',
    用户管理: 'Users',
    商品审核: 'Products',
    订单核验: 'Orders',
    议价管理: 'Bargains',
    寄售审核: 'Consignment',
    支付监控: 'Payments',
    财务报表: 'Finance',
    支付对账: 'Reconcile',
    退款审核: 'Refunds',
    纠纷仲裁: 'Disputes',
    提现审核: 'Withdrawals',
    风控策略: 'Risk',
    登录安全: 'Login Security',
    规则协议: 'Rules & Agreement',
    开放接口监控: 'Open API Monitor',
    通知管理: 'Notice Admin',
    内容运营: 'Content',
    操作日志: 'Audit Logs'
  };

  const showLabel = (label: string) => (isEn ? (labelMap[label] || label) : label);
  const localize = (href: string) => toLocaleHref(href, locale);
  const isPathActive = (href: string) => {
    const current = pathname || '/';
    const normalizedCurrent = hasEnPrefix(current) ? current.slice(3) || '/' : current;
    return normalizedCurrent === href;
  };

  return (
    <nav className="topbar">
      <div className="topbar-inner">
        <Link href={localize('/')} className="logo">
          <span className="logo-mark" aria-hidden="true" />
          {tr('IDC 服务器担保交易', 'IDC Server Escrow')}
        </Link>

        <div className="nav-main">
          {MAIN_LINKS.map((item) => (
            <Link
              key={String(item.href)}
              href={localize(item.href)}
              className={`nav-link${isPathActive(item.href) ? ' active' : ''}`}
            >
              {showLabel(item.label)}
            </Link>
          ))}
        </div>

        <div className="nav-links">
          {ready && currentUser ? (
            <>
              <NavGroup label={tr('买家中心', 'Buyer')} links={BUYER_LINKS.map((item) => ({ ...item, label: showLabel(item.label) }))} locale={locale} />
              <NavGroup label={tr('卖家中心', 'Seller')} links={SELLER_LINKS.map((item) => ({ ...item, label: showLabel(item.label) }))} locale={locale} />
              {currentUser.role === 'ADMIN' && (
                <NavGroup
                  label={tr('管理后台', 'Admin')}
                  links={ADMIN_LINKS.map((item) => ({ ...item, label: showLabel(item.label) }))}
                  locale={locale}
                />
              )}
              <LocaleSwitch />
              <span className="nav-role">{navRoleLabel}</span>
              <button className="nav-btn" onClick={logout} type="button">
                {tr('退出', 'Logout')}
              </button>
            </>
          ) : (
            <>
              <Link href={localize('/auth/login')}>{tr('登录', 'Login')}</Link>
              <Link href={localize('/auth/register')}>{tr('注册', 'Sign up')}</Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="nav-mobile-toggle"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={tr('切换菜单', 'Toggle Menu')}
        >
          {mobileOpen ? '×' : '≡'}
        </button>
      </div>

      <div className={`nav-mobile-panel${mobileOpen ? ' open' : ''}`}>
        <div className="nav-mobile-block">
          <p className="nav-mobile-block-title">{tr('平台导航', 'Navigation')}</p>
          {MAIN_LINKS.map((item) => (
            <Link key={String(item.href)} href={localize(item.href)}>
              {showLabel(item.label)}
            </Link>
          ))}
        </div>

        {ready && currentUser ? (
          <>
            <div className="nav-mobile-block">
              <p className="nav-mobile-block-title">{tr('买家中心', 'Buyer')}</p>
              {BUYER_LINKS.map((item) => (
                <Link key={String(item.href)} href={localize(item.href)}>
                  {showLabel(item.label)}
                </Link>
              ))}
            </div>
            <div className="nav-mobile-block">
              <p className="nav-mobile-block-title">{tr('卖家中心', 'Seller')}</p>
              {SELLER_LINKS.map((item) => (
                <Link key={String(item.href)} href={localize(item.href)}>
                  {showLabel(item.label)}
                </Link>
              ))}
            </div>
            {currentUser.role === 'ADMIN' && (
              <div className="nav-mobile-block">
                <p className="nav-mobile-block-title">{tr('管理后台', 'Admin')}</p>
                {ADMIN_LINKS.map((item) => (
                  <Link key={String(item.href)} href={localize(item.href)}>
                    {showLabel(item.label)}
                  </Link>
                ))}
              </div>
            )}
            <div className="nav-mobile-block">
              <p className="nav-mobile-block-title">{tr('账户', 'Account')}</p>
              <LocaleSwitch />
              <div className="muted">{tr('当前身份：', 'Role: ')}{navRoleLabel}</div>
              <button type="button" onClick={logout}>
                {tr('退出登录', 'Logout')}
              </button>
            </div>
          </>
        ) : (
          <div className="nav-mobile-block">
            <p className="nav-mobile-block-title">{tr('账户', 'Account')}</p>
            <LocaleSwitch />
            <Link href={localize('/auth/login')}>{tr('登录', 'Login')}</Link>
            <Link href={localize('/auth/register')}>{tr('注册', 'Sign up')}</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
