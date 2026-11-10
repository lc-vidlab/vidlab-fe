import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vidlab',
  description: 'YouTube Data API v3 기반 영상 탐색 웹',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
