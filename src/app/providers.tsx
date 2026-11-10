'use client';

// 앱 전체가 공유하는 Provider. 루트 레이아웃(src/app/layout.tsx)에서 한 번만 감싼다.
// 결정 근거: https://github.com/lc-vidlab/vidlab-fe/issues/9

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 같은 데이터는 1분 안에 다시 요청하지 않는다. 더 길게 둘 쿼리는 useQuery 옵션으로 늘린다
        staleTime: 60 * 1000,
        // 탭을 오갈 때마다 다시 요청하지 않는다 (YouTube 할당량 보호)
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * Next 공식 가이드(node_modules/next/dist/docs/01-app/02-guides/client-side-data-fetching/tanstack-query.md) 방식.
 * - 서버: 요청마다 새로 만든다. 여러 사용자가 같은 캐시를 공유하지 않게 한다.
 * - 브라우저: 하나를 만들어 계속 쓴다. useState로 만들면 첫 렌더 중 suspend될 때
 *   React가 상태를 버리면서 캐시가 통째로 다시 만들어질 수 있다.
 */
function getQueryClient() {
  if (typeof window === 'undefined') return createQueryClient();
  browserQueryClient ??= createQueryClient();
  return browserQueryClient;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      {/* globals.css의 .dark 토큰과 맞추기 위해 <html>의 class로 테마를 바꾼다 */}
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
