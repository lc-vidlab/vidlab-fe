// TODO(민진): 이주혁 SRV-02의 lib/youtube/types.ts가 확정되면 그 타입으로 교체한다.

/** search.list 결과를 videos.list로 보강한 검색 결과 한 건 */
export type SearchVideo = {
  id: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string | null;
  /** ISO 8601 재생시간 (예: PT18M42S). 라이브 등은 null */
  duration: string | null;
  viewCount: number | null;
};

export type SearchPage = {
  items: SearchVideo[];
  nextPageToken: string | null;
};

export type SearchErrorCode = 'quotaExceeded' | 'unknown';

export class SearchError extends Error {
  constructor(public code: SearchErrorCode) {
    super(code);
    this.name = 'SearchError';
  }
}
