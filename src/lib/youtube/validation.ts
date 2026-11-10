import 'server-only';

// 실제 구현(live.ts)과 mock(mock.ts)이 똑같이 지켜야 하는 입력 검사.

import { YouTubeApiError } from './errors';

/** 검색어 앞뒤 공백을 지우고, 비어 있으면 BAD_REQUEST */
export function requireQuery(q: string): string {
  const trimmed = q.trim();
  if (!trimmed) throw new YouTubeApiError('BAD_REQUEST', '검색어를 입력하세요.');
  return trimmed;
}
