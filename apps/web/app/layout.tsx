import './globals.css';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import TopNav from '../components/top-nav';
import AutoI18n from '../components/auto-i18n';

export const metadata: Metadata = {
  title: 'IDC 二手服务器交易平台',
  description: '担保交易 · 交付核验 · 风险可控'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const localeHeader = headers().get('x-idc-locale');
  const htmlLang = localeHeader?.toLowerCase().startsWith('en') ? 'en-US' : 'zh-CN';

  return (
    <html lang={htmlLang}>
      <body>
        <TopNav />
        <AutoI18n />
        {children}
      </body>
    </html>
  );
}
