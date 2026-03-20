"use client";

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  LOCALE_KEY,
  persistLocale,
  resolveClientLocale,
  toLocalePath
} from '../lib/locale';

export default function LocaleSwitch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [locale, setLocale] = useState('zh-CN');

  useEffect(() => {
    setLocale(resolveClientLocale(pathname));
  }, [pathname]);

  const changeLocale = (value: string) => {
    const normalized = value.startsWith('en') ? 'en-US' : 'zh-CN';
    setLocale(normalized);
    persistLocale(normalized);
    localStorage.setItem(LOCALE_KEY, normalized);

    const currentPath = pathname || '/';
    const localizedPath = toLocalePath(currentPath, normalized);
    const query = searchParams?.toString();
    const target = query ? `${localizedPath}?${query}` : localizedPath;
    router.push(target as any);
    router.refresh();
  };

  return (
    <select
      value={locale}
      onChange={(e) => changeLocale(e.target.value)}
      className="nav-locale-select"
      aria-label="选择语言"
    >
      <option value="zh-CN">中文</option>
      <option value="en-US">English</option>
    </select>
  );
}
