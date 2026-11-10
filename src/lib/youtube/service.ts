import 'server-only';

// YouTube 조회 서비스의 진입점. Route Handler와 Server Component는 여기서만 import한다.
// (eslint no-restricted-imports 규칙이 live.ts · mock.ts 직접 import를 막는다)
// 호출할 때마다 USE_MOCK을 보고 실제 API(live.ts) 또는 mock(mock.ts)을 고른다.
//
// 결정 근거: https://github.com/lc-vidlab/vidlab-fe/issues/4

import * as live from './live';
import { mockService } from './mock';
import { isMockMode } from './mode';
import type {
  Page,
  PopularVideosParams,
  RelatedVideosParams,
  SearchVideosParams,
  Video,
  VideoCategory,
} from './types';

function current(): typeof live {
  return isMockMode() ? mockService : live;
}

// SRV-05: 캐싱은 각 함수 첫 줄(또는 파일 맨 위)에 'use cache'를 붙인다.
// 'use cache' 함수는 async여야 해서 모두 async function으로 둔다.

/** 한국 인기 영상 목록 (홈 피드). 인기 차트가 없는 카테고리(19, 27)는 NOT_FOUND */
export async function getPopularVideos(params?: PopularVideosParams): Promise<Page<Video>> {
  return current().getPopularVideos(params);
}

/** 영상에 지정할 수 있는 카테고리 목록 (카테고리 칩) */
export async function getVideoCategories(): Promise<VideoCategory[]> {
  return current().getVideoCategories();
}

/** 키워드 검색. 빈 검색어는 BAD_REQUEST. search.list 하루 100회 한도에 주의 */
export async function searchVideos(params: SearchVideosParams): Promise<Page<Video>> {
  return current().searchVideos(params);
}

/** 영상 상세. 없는 영상이면 NOT_FOUND */
export async function getVideo(id: string): Promise<Video> {
  return current().getVideo(id);
}

/** 관련 영상 (같은 카테고리 인기 영상). 인기 차트가 없는 카테고리면 빈 목록 */
export async function getRelatedVideos(params: RelatedVideosParams): Promise<Video[]> {
  return current().getRelatedVideos(params);
}
