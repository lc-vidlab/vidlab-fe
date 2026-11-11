'use client';

import { Fragment, type ReactNode } from 'react';
import { useHomeResetKey } from './home-reset';

/** 로고를 누르면 안쪽 화면을 처음 상태로 다시 만든다 */
export function HomeResetBoundary({ children }: { children: ReactNode }) {
  const resetKey = useHomeResetKey();
  return <Fragment key={resetKey}>{children}</Fragment>;
}
