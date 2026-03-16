"use client";

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

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
  const [loading, setLoading] = useState(true);
  const [allow, setAllow] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('idc_token');
    if (!token) {
      window.location.replace(`/auth/login?redirect=${encodeURIComponent(pathname || '/')}`);
      return;
    }

    const check = async () => {
      try {
        const res = await fetch(`${API_BASE}/user/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          localStorage.removeItem('idc_token');
          window.location.replace(`/auth/login?redirect=${encodeURIComponent(pathname || '/')}`);
          return;
        }
        const data = await res.json();
        if (requireRole === 'ADMIN' && data?.role !== 'ADMIN') {
          router.replace('/products');
          return;
        }
        setAllow(true);
      } catch {
        window.location.replace('/auth/login');
      } finally {
        setLoading(false);
      }
    };

    check();
  }, [pathname, requireRole, router]);

  if (loading) {
    return (
      <main className="page">
        <p className="muted">正在校验登录状态...</p>
      </main>
    );
  }

  if (!allow) return null;
  return <>{children}</>;
}
