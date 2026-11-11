'use client';

import { useSyncExternalStore } from 'react';

/**
 * 로고를 누를 때마다 1씩 올라가는 번호.
 * 홈 화면이 이 번호를 key로 써서, 번호가 바뀌면 처음 상태(국가 · 카테고리 선택 등)로 다시 만들어진다.
 */
let resetCount = 0;
const listeners = new Set<() => void>();

export function requestHomeReset() {
  resetCount += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useHomeResetKey() {
  return useSyncExternalStore(
    subscribe,
    () => resetCount,
    () => 0,
  );
}
