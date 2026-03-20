"use client";

import { useEffect, useState } from 'react';

const LOCALE_KEY = 'idc_locale';

export default function LocaleSwitch() {
  const [locale, setLocale] = useState('zh-CN');

  useEffect(() => {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (saved) {
      setLocale(saved);
      document.documentElement.lang = saved;
    }
  }, []);

  const changeLocale = (value: string) => {
    setLocale(value);
    localStorage.setItem(LOCALE_KEY, value);
    document.documentElement.lang = value;
    window.dispatchEvent(new CustomEvent('locale-change', { detail: value }));
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
