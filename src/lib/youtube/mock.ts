import 'server-only';

// 서비스 함수의 mock 구현 (USE_MOCK 모드).
// 실제 API의 동작(페이지네이션, 에러)을 그대로 흉내 낸다. 직접 import하지 말고 service.ts를 쓴다.
//
// 결정 근거: https://github.com/lc-vidlab/vidlab-fe/issues/4

import { MOCK_CATEGORIES, MOCK_CATEGORIES_WITHOUT_CHART, MOCK_VIDEOS } from '@/mocks/youtube';

import { PAGE_SIZE, pageSize } from './constants';
import { YouTubeApiError, videoNotFoundError } from './errors';
import type * as live from './live';
import type {
  ApiErrorCode,
  Page,
  PopularVideosParams,
  RelatedVideosParams,
  SearchVideosParams,
  Video,
  VideoCategory,
} from './types';
import { requireQuery } from './validation';

/** 기본 응답 지연(ms). 로딩 스켈레톤을 확인할 수 있게 한다 */
const DEFAULT_DELAY_MS = 300;

/**
 * 이 검색어로 검색하면 해당 에러를 재현한다.
 * 일반 객체로 만들면 'constructor' 같은 기본 속성 이름에도 반응하므로 Map을 쓴다.
 */
const ERROR_QUERIES = new Map<string, ApiErrorCode>([
  ['__quota__', 'QUOTA_EXCEEDED'],
  ['__error__', 'UPSTREAM_ERROR'],
]);

const PAGE_TOKEN_PREFIX = 'mock:';
const PAGE_TOKEN_PATTERN = /^mock:(\d+)$/;

/**
 * 응답 지연(ms). MOCK_DELAY_MS 환경변수로 바꿀 수 있다.
 * 예: 스켈레톤을 오래 보고 싶으면 2000, 테스트에서는 0
 */
function delayMs(): number {
  const raw = process.env.MOCK_DELAY_MS;
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_DELAY_MS;
}

function wait(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs()));
}

/** pageToken을 목록의 시작 위치로 바꾼다. 형식이 틀리면 실제 API처럼 BAD_REQUEST */
function parsePageToken(pageToken: string | undefined): number {
  if (!pageToken) return 0;
  const match = PAGE_TOKEN_PATTERN.exec(pageToken);
  if (!match) throw new YouTubeApiError('BAD_REQUEST', '잘못된 페이지 토큰입니다.');
  return Number(match[1]);
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
  const q = requireQuery(params.q);

  const errorCode = ERROR_QUERIES.get(q);
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
  if (!video) throw videoNotFoundError();
  return video;
}

async function getRelatedVideos(params: RelatedVideosParams): Promise<Video[]> {
  await wait();
  // live.ts와 같은 모양: 같은 카테고리 인기 영상에서 현재 영상을 빼고,
  // 인기 차트가 없는 카테고리(NOT_FOUND)면 빈 목록
  try {
    const size = pageSize(params.maxResults, PAGE_SIZE.related);
    return popularList(params.categoryId)
      .slice(0, size)
      .filter((v) => v.id !== params.excludeId);
  } catch (err) {
    if (err instanceof YouTubeApiError && err.code === 'NOT_FOUND') return [];
    throw err;
  }
}

/** 실제 구현(live.ts)과 시그니처가 다르면 여기서 타입 에러가 난다 */
export const mockService = {
  getPopularVideos,
  getVideoCategories,
  searchVideos,
  getVideo,
  getRelatedVideos,
} satisfies typeof live;
