import 'server-only';

// 서비스 함수의 mock 구현 (USE_MOCK 모드).
// 실제 API의 동작(페이지네이션, 에러)을 그대로 흉내 낸다. 직접 import하지 말고 service.ts를 쓴다.
//
// 결정 근거: https://github.com/lc-vidlab/vidlab-fe/issues/4

import { MOCK_CATEGORIES, MOCK_CATEGORIES_WITHOUT_CHART, MOCK_VIDEOS } from '@/mocks/youtube';

import { PAGE_SIZE, pageSize } from './constants';
import { YouTubeApiError } from './errors';
import type * as live from './live';
import type {
  Page,
  PopularVideosParams,
  RelatedVideosParams,
  SearchVideosParams,
  Video,
  VideoCategory,
} from './types';

/** 응답 지연. 로딩 스켈레톤을 확인할 수 있게 한다 */
const DELAY_MS = 300;

/** 이 검색어로 검색하면 해당 에러를 재현한다 */
const ERROR_QUERIES: Record<string, YouTubeApiError['code']> = {
  __quota__: 'QUOTA_EXCEEDED',
  __error__: 'UPSTREAM_ERROR',
};

const PAGE_TOKEN_PREFIX = 'mock:';

function wait(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, DELAY_MS));
}

/** pageToken을 목록의 시작 위치로 바꾼다. 형식이 틀리면 실제 API처럼 BAD_REQUEST */
function parsePageToken(pageToken: string | undefined): number {
  if (!pageToken) return 0;
  const offset = Number(pageToken.slice(PAGE_TOKEN_PREFIX.length));
  if (!pageToken.startsWith(PAGE_TOKEN_PREFIX) || !Number.isInteger(offset) || offset < 0) {
    throw new YouTubeApiError('BAD_REQUEST', '잘못된 페이지 토큰입니다.');
  }
  return offset;
}

function paginate(list: Video[], pageToken: string | undefined, size: number): Page<Video> {
  const offset = parsePageToken(pageToken);
  const end = offset + size;
  return {
    items: list.slice(offset, end),
    nextPageToken: end < list.length ? `${PAGE_TOKEN_PREFIX}${end}` : undefined,
  };
}

function byViewCountDesc(a: Video, b: Video): number {
  return b.viewCount - a.viewCount;
}

function byPublishedAtDesc(a: Video, b: Video): number {
  return b.publishedAt.localeCompare(a.publishedAt);
}

/** 인기 순서로 정렬한 목록. 인기 차트가 없는 카테고리면 실제 API처럼 NOT_FOUND */
function popularList(categoryId: string | undefined): Video[] {
  if (categoryId && MOCK_CATEGORIES_WITHOUT_CHART.has(categoryId)) {
    throw new YouTubeApiError('NOT_FOUND');
  }
  const list = categoryId ? MOCK_VIDEOS.filter((v) => v.categoryId === categoryId) : MOCK_VIDEOS;
  return [...list].sort(byViewCountDesc);
}

async function getPopularVideos(params: PopularVideosParams = {}): Promise<Page<Video>> {
  await wait();
  const size = pageSize(params.maxResults, PAGE_SIZE.popular);
  return paginate(popularList(params.categoryId), params.pageToken, size);
}

async function getVideoCategories(): Promise<VideoCategory[]> {
  await wait();
  return MOCK_CATEGORIES;
}

async function searchVideos(params: SearchVideosParams): Promise<Page<Video>> {
  await wait();
  const q = params.q.trim();
  if (!q) throw new YouTubeApiError('BAD_REQUEST', '검색어를 입력하세요.');

  const errorCode = ERROR_QUERIES[q];
  if (errorCode) throw new YouTubeApiError(errorCode);

  const after = params.publishedAfter ? Date.parse(params.publishedAfter) : undefined;
  if (Number.isNaN(after)) throw new YouTubeApiError('BAD_REQUEST');

  const keyword = q.toLowerCase();
  let list = MOCK_VIDEOS.filter(
    (v) =>
      (v.title.toLowerCase().includes(keyword) ||
        v.channel.title.toLowerCase().includes(keyword)) &&
      (after === undefined || Date.parse(v.publishedAt) >= after),
  );
  // 'relevance'(기본)는 데이터 순서를 그대로 쓴다
  if (params.order === 'date') list = [...list].sort(byPublishedAtDesc);
  if (params.order === 'viewCount') list = [...list].sort(byViewCountDesc);

  return paginate(list, params.pageToken, pageSize(params.maxResults, PAGE_SIZE.search));
}

async function getVideo(id: string): Promise<Video> {
  await wait();
  const video = MOCK_VIDEOS.find((v) => v.id === id);
  if (!video) throw new YouTubeApiError('NOT_FOUND', '영상을 찾을 수 없습니다.');
  return video;
}

async function getRelatedVideos(params: RelatedVideosParams): Promise<Video[]> {
  await wait();
  // 실제 구현과 같이: 같은 카테고리 인기 영상을 가져온 뒤 현재 영상을 뺀다
  if (MOCK_CATEGORIES_WITHOUT_CHART.has(params.categoryId)) return [];
  const size = pageSize(params.maxResults, PAGE_SIZE.related);
  return popularList(params.categoryId)
    .slice(0, size)
    .filter((v) => v.id !== params.excludeId);
}

/** 실제 구현(live.ts)과 시그니처가 다르면 여기서 타입 에러가 난다 */
export const mockService = {
  getPopularVideos,
  getVideoCategories,
  searchVideos,
  getVideo,
  getRelatedVideos,
} satisfies typeof live;
