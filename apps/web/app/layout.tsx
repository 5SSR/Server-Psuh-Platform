import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'IDC 二手服务器交易平台',
  description: '担保交易 · 交付核验 · 风险可控'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
