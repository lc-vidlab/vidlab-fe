import 'server-only';

// 실제 구현(live.ts) · mock(mock.ts)이 똑같이 지켜야 하는 입력 검사.
// 영상 id 형식 검사는 클라이언트에서도 쓰도록 video-id.ts에 있다.

import { YouTubeApiError } from './errors';

/** 검색어 최대 길이. 너무 긴 검색어로 search.list(하루 100회)를 쓰지 않게 한다 */
export const MAX_QUERY_LENGTH = 100;

/** 검색어 앞뒤 공백을 지우고, 비어 있거나 너무 길면 BAD_REQUEST */
export function requireQuery(q: string): string {
  const trimmed = q.trim();
  if (!trimmed) throw new YouTubeApiError('BAD_REQUEST', '검색어를 입력하세요.');
  if (trimmed.length > MAX_QUERY_LENGTH) {
    throw new YouTubeApiError('BAD_REQUEST', `검색어는 ${MAX_QUERY_LENGTH}자 이하로 입력하세요.`);
  }
  return trimmed;
}
