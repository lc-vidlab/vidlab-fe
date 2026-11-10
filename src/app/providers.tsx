'use client';

// 앱 전체가 공유하는 Provider. 루트 레이아웃(src/app/layout.tsx)에서 한 번만 감싼다.
// 결정 근거: https://github.com/lc-vidlab/vidlab-fe/issues/9

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState, type ReactNode } from 'react';

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

export function Providers({ children }: { children: ReactNode }) {
  // 모듈 최상단에서 만들면 서버에서 여러 사용자가 같은 캐시를 공유하게 되므로 컴포넌트 안에서 만든다
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {/* globals.css의 .dark 토큰과 맞추기 위해 <html>의 class로 테마를 바꾼다 */}
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
