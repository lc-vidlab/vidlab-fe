import type { Metadata } from 'next';

import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Vidlab',
  description: 'YouTube Data API v3 기반 영상 탐색 웹',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // next-themes가 그리기 전에 <html>에 테마 class를 붙이므로 서버 HTML과 달라진다. 그 경고만 끈다
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
