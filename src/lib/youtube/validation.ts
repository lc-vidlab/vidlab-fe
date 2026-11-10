import 'server-only';

// 실제 구현(live.ts) · mock(mock.ts) · API(Route Handler)가 똑같이 지켜야 하는 입력 검사.

import { YouTubeApiError } from './errors';

/** YouTube 영상 id 형식: 영문 · 숫자 · `-` · `_` 11자 */
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function isVideoId(id: string): boolean {
  return VIDEO_ID_PATTERN.test(id);
}

/** 검색어 앞뒤 공백을 지우고, 비어 있으면 BAD_REQUEST */
export function requireQuery(q: string): string {
  const trimmed = q.trim();
  if (!trimmed) throw new YouTubeApiError('BAD_REQUEST', '검색어를 입력하세요.');
  return trimmed;
}
