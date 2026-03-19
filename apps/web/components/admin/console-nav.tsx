"use client";

import Link, { type LinkProps } from 'next/link';
import { usePathname } from 'next/navigation';

type AdminNavItem = {
  href: LinkProps<string>['href'];
  label: string;
};

const ADMIN_CONSOLE_LINKS: AdminNavItem[] = [
  { href: '/admin/dashboard', label: '看板' },
  { href: '/admin/products', label: '商品审核' },
  { href: '/admin/orders', label: '订单核验' },
  { href: '/admin/payments', label: '支付监控' },
  { href: '/admin/refunds', label: '退款审核' },
  { href: '/admin/disputes', label: '纠纷仲裁' },
  { href: '/admin/withdrawals', label: '提现审核' },
  { href: '/admin/users', label: '用户管理' },
  { href: '/admin/notices', label: '通知管理' },
  { href: '/admin/settlements', label: '结算放款' }
];

export default function AdminConsoleNav() {
  const pathname = usePathname();

  return (
    <div className="admin-console-nav">
      <div className="admin-console-nav-inner">
        <div className="admin-console-tabs">
          {ADMIN_CONSOLE_LINKS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={String(item.href)}
                href={item.href}
                className={`admin-console-tab${active ? ' active' : ''}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
