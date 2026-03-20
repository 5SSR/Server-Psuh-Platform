"use client";

import { useEffect, useMemo, useState } from 'react';

const LOCALE_KEY = 'idc_locale';

export function useLocale() {
  const [locale, setLocale] = useState('zh-CN');

  useEffect(() => {
    const saved = localStorage.getItem(LOCALE_KEY) || 'zh-CN';
    setLocale(saved);
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
  }, []);

  const isEn = locale.startsWith('en');

  const t = useMemo(
    () => (zh: string, en: string) => (isEn ? en : zh),
    [isEn]
  );

  return { locale, isEn, t };
}
