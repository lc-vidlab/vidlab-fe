import type { ApiError, ApiErrorCode, Page, SearchVideosParams, Video } from '@/lib/youtube/types';
import { SearchError } from './errors';

const SEARCH_ENDPOINT = '/api/youtube/search';

const ERROR_CODES: readonly ApiErrorCode[] = [
  'QUOTA_EXCEEDED',
  'NOT_FOUND',
  'BAD_REQUEST',
  'UPSTREAM_ERROR',
];

/** 실패 응답 본문(ApiError)에서 code를 꺼낸다. 형식이 다르면 UPSTREAM_ERROR로 본다 */
async function readErrorCode(res: Response): Promise<ApiErrorCode> {
  try {
    const body = (await res.json()) as Partial<ApiError>;
    const code = body.error?.code;
    return code && ERROR_CODES.includes(code) ? code : 'UPSTREAM_ERROR';
  } catch {
    return 'UPSTREAM_ERROR';
  }
}

/**
 * 검색 결과 한 페이지를 가져온다. 검색 영역의 데이터 출처는 이 함수 하나뿐이다.
 * Route Handler(SRV-04)를 거치므로 API 키는 브라우저에 노출되지 않고,
 * USE_MOCK에 따라 서버에서 mock 또는 실제 YouTube API를 쓴다.
 */
export async function fetchSearchPage(
  { q, order, publishedAfter, pageToken, maxResults }: SearchVideosParams,
  signal?: AbortSignal,
): Promise<Page<Video>> {
  const query = new URLSearchParams({ q });
  if (order) query.set('order', order);
  if (publishedAfter) query.set('publishedAfter', publishedAfter);
  if (pageToken) query.set('pageToken', pageToken);
  if (maxResults) query.set('maxResults', String(maxResults));

  let res: Response;
  try {
    res = await fetch(`${SEARCH_ENDPOINT}?${query.toString()}`, { signal });
  } catch (err) {
    // 검색어를 바꿔 이전 요청이 취소된 경우는 TanStack Query가 처리하도록 그대로 던진다
    if (signal?.aborted) throw err;
    throw new SearchError('UPSTREAM_ERROR');
  }

  if (!res.ok) throw new SearchError(await readErrorCode(res));
  return (await res.json()) as Page<Video>;
}
