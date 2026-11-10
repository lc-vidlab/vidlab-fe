import { getMockSearchPage } from './mocks/searchMock';
import type { SearchPage } from './types';

/**
 * 검색 결과 한 페이지를 가져온다. 검색 영역의 데이터 출처는 이 함수 하나뿐이다.
 *
 * TODO(민진): 이주혁 SRV-04 /api/youtube/search가 생기면 아래처럼 교체한다.
 *   fetch(`/api/youtube/search?q=...&pageToken=...`) → 응답의 error.code가
 *   quotaExceeded면 SearchError('quotaExceeded')를 던진다.
 *   (search.list → videos.list 보강과 1시간 캐싱은 서버에서 처리)
 */
export function fetchSearchPage(query: string, pageToken?: string): Promise<SearchPage> {
  return getMockSearchPage(query, pageToken);
}
