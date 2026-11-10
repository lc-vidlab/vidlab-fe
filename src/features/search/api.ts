import type { Page, SearchVideosParams, Video } from '@/lib/youtube/types';
import { getMockSearchPage } from './mocks/searchMock';

/**
 * 검색 결과 한 페이지를 가져온다. 검색 영역의 데이터 출처는 이 함수 하나뿐이다.
 *
 * TODO(민진): SRV-04 /api/youtube/search가 생기면 아래처럼 교체하고 mocks/searchMock.ts를 지운다.
 *   const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined) as [string, string][]);
 *   const res = await fetch(`/api/youtube/search?${query}`);
 *   if (!res.ok) throw new SearchError(((await res.json()) as ApiError).error.code);
 *   return (await res.json()) as Page<Video>;
 */
export function fetchSearchPage(params: SearchVideosParams): Promise<Page<Video>> {
  return getMockSearchPage(params);
}
