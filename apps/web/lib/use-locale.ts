"use client";

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

import {
  hasEnPrefix,
  LOCALE_KEY,
  readLocaleFromCookie,
  resolveClientLocale
} from './locale';

export function useLocale() {
  const pathname = usePathname();
  const [locale, setLocale] = useState('zh-CN');

  useEffect(() => {
    const nextLocale = resolveClientLocale(pathname);
    setLocale(nextLocale);
    localStorage.setItem(LOCALE_KEY, nextLocale);
    document.documentElement.lang = nextLocale;

    const handler = (event: Event) => {
      const next = (event as CustomEvent<string>).detail;
      if (next) {
        setLocale(next);
      }
    };
    window.addEventListener('locale-change', handler as EventListener);
    return () => {
      window.removeEventListener('locale-change', handler as EventListener);
    };
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (pathname && hasEnPrefix(pathname)) {
      if (locale !== 'en-US') {
        setLocale('en-US');
      }
      return;
    }

    const cookieLocale = readLocaleFromCookie(document.cookie);
    if (cookieLocale && cookieLocale !== locale) {
      setLocale(cookieLocale);
    }
  }, [pathname, locale]);

  const isEn = locale.startsWith('en');

  const t = useMemo(
    () => (zh: string, en: string) => (isEn ? en : zh),
    [isEn]
  );

  return { locale, isEn, t };
}
