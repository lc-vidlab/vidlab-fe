'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

/**
 * 검색 페이지 전용 QueryClient.
 * TODO(민진): 이주혁이 layout에 전역 QueryClientProvider를 두면 이 컴포넌트를 제거한다.
 */
export default function SearchQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 같은 검색어는 1시간 동안 다시 요청하지 않는다 (search.list 할당량 보호)
            staleTime: 60 * 60 * 1000,
            gcTime: 60 * 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
