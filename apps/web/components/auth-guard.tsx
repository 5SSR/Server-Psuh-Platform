"use client";

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toLocalePath, toLocaleRoute } from '../lib/locale';
import { useLocale } from '../lib/use-locale';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';

type Role = 'USER' | 'ADMIN';

export default function AuthGuard({
  children,
  requireRole = 'USER'
}: {
  children: React.ReactNode;
  requireRole?: Role;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [allow, setAllow] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('idc_token');
    if (!token) {
      const loginPath = toLocalePath('/auth/login', locale);
      window.location.replace(`${loginPath}?redirect=${encodeURIComponent(pathname || '/')}`);
      return;
    }

    const check = async () => {
      try {
        const res = await fetch(`${API_BASE}/user/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          localStorage.removeItem('idc_token');
          const loginPath = toLocalePath('/auth/login', locale);
          window.location.replace(`${loginPath}?redirect=${encodeURIComponent(pathname || '/')}`);
          return;
        }
        const data = await res.json();
        if (requireRole === 'ADMIN' && data?.role !== 'ADMIN') {
          router.replace(toLocaleRoute('/products', locale));
          return;
        }
        setAllow(true);
      } catch {
        window.location.replace(toLocalePath('/auth/login', locale));
      } finally {
        setLoading(false);
      }
    };

    check();
  }, [locale, pathname, requireRole, router]);

  if (loading) {
    return (
      <main className="page">
        <p className="muted">{t('正在校验登录状态...', 'Checking authentication...')}</p>
      </main>
    );
  }

  if (!allow) return null;
  return <>{children}</>;
}
