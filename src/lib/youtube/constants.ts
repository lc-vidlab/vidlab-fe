// 실제 구현(live.ts)과 mock(mock.ts)이 함께 쓰는 값. 두 모드의 동작을 맞추기 위해 한 곳에 둔다.

/** 한 번에 요청할 수 있는 최대 개수 (maxResults, id 목록 모두). YouTube API 상한 */
export const MAX_PER_REQUEST = 50;

/** 함수별 기본 페이지 크기 */
export const PAGE_SIZE = {
  popular: 24,
  search: 20,
  related: 20,
} as const;

/** 요청한 개수를 기본값과 상한에 맞춘다 */
export function pageSize(requested: number | undefined, fallback: number): number {
  return Math.min(requested ?? fallback, MAX_PER_REQUEST);
}
