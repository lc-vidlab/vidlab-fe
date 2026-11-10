import 'server-only';

// YouTube 조회 서비스의 진입점. Route Handler와 Server Component는 여기서만 import한다.
// 호출할 때마다 USE_MOCK을 보고 실제 API(live.ts) 또는 mock(mock.ts)을 고른다.
//
// 결정 근거: https://github.com/lc-vidlab/vidlab-fe/issues/4

import * as live from './live';
import { mockService } from './mock';

type YouTubeService = typeof live;

/**
 * mock 모드인지 확인한다.
 * 실수로 할당량을 쓰지 않도록, USE_MOCK=false로 명시했을 때만 실제 API를 쓴다.
 */
export function isMockMode(): boolean {
  return process.env.USE_MOCK !== 'false';
}

function current(): YouTubeService {
  return isMockMode() ? mockService : live;
}

/** 한국 인기 영상 목록 (홈 피드). 인기 차트가 없는 카테고리(19, 27)는 NOT_FOUND */
export const getPopularVideos: YouTubeService['getPopularVideos'] = (params) =>
  current().getPopularVideos(params);

/** 영상에 지정할 수 있는 카테고리 목록 (카테고리 칩) */
export const getVideoCategories: YouTubeService['getVideoCategories'] = () =>
  current().getVideoCategories();

/** 키워드 검색. 빈 검색어는 BAD_REQUEST. search.list 하루 100회 한도에 주의 */
export const searchVideos: YouTubeService['searchVideos'] = (params) =>
  current().searchVideos(params);

/** 영상 상세. 없는 영상이면 NOT_FOUND */
export const getVideo: YouTubeService['getVideo'] = (id) => current().getVideo(id);

/** 관련 영상 (같은 카테고리 인기 영상). 인기 차트가 없는 카테고리면 빈 목록 */
export const getRelatedVideos: YouTubeService['getRelatedVideos'] = (params) =>
  current().getRelatedVideos(params);
