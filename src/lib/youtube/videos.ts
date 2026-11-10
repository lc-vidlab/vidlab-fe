import 'server-only';

import { YouTubeApiError, ytFetch } from './client';
import { toChannel, toVideo, toVideoCategory } from './normalize';
import type {
  Channel,
  Page,
  SearchOrder,
  Video,
  VideoCategory,
  YtChannel,
  YtListResponse,
  YtSearchResult,
  YtVideo,
  YtVideoCategory,
} from './types';

/**
 * YouTube 조회 서비스 함수.
 * Route Handler와 Server Component가 공통으로 호출한다. 클라이언트에서는 import할 수 없다.
 *
 * 결정 근거: https://github.com/lc-vidlab/vidlab-fe/issues/1
 */

const REGION_CODE = 'KR';
const LANGUAGE = 'ko';
/** videos.list · channels.list의 id 최대 개수 */
const MAX_IDS = 50;
const VIDEO_PARTS = 'snippet,contentDetails,statistics,status';

/* -------------------------------------------------------------------------- */
/* 내부 함수                                                                   */
/* -------------------------------------------------------------------------- */

function chunk<T>(list: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < list.length; i += size) result.push(list.slice(i, i + size));
  return result;
}

/**
 * 영상들의 채널 정보(아바타 · 구독자 수)를 channels.list로 가져온다.
 * 실패해도 영상 목록은 보여줄 수 있도록 빈 결과를 돌려준다.
 */
async function fetchChannels(videos: YtVideo[]): Promise<Map<string, Channel>> {
  const ids = [...new Set(videos.map((v) => v.snippet?.channelId).filter(Boolean))] as string[];
  const map = new Map<string, Channel>();
  if (ids.length === 0) return map;

  try {
    const responses = await Promise.all(
      chunk(ids, MAX_IDS).map((group) =>
        ytFetch<YtListResponse<YtChannel>>('channels', {
          part: 'snippet,statistics',
          id: group.join(','),
          maxResults: MAX_IDS,
        }),
      ),
    );
    for (const res of responses) {
      for (const raw of res.items ?? []) map.set(raw.id, toChannel(raw));
    }
  } catch (err) {
    console.error('[youtube] 채널 정보 보강 실패. 채널 이름만 표시합니다.', err);
  }
  return map;
}

/** 원본 영상 목록에 채널 정보를 붙여 정규화한다 */
async function normalizeVideos(raw: YtVideo[]): Promise<Video[]> {
  const channels = await fetchChannels(raw);
  return raw.map((v) => toVideo(v, channels));
}

/** id 목록으로 영상 상세를 가져온다. 순서는 ids 순서를 따르고, 없는 영상은 빠진다 */
async function fetchVideosByIds(ids: string[]): Promise<YtVideo[]> {
  if (ids.length === 0) return [];
  const responses = await Promise.all(
    chunk(ids, MAX_IDS).map((group) =>
      ytFetch<YtListResponse<YtVideo>>('videos', {
        part: VIDEO_PARTS,
        id: group.join(','),
        maxResults: MAX_IDS,
      }),
    ),
  );
  const byId = new Map(responses.flatMap((r) => r.items ?? []).map((v) => [v.id, v]));
  return ids.map((id) => byId.get(id)).filter((v): v is YtVideo => v !== undefined);
}

/* -------------------------------------------------------------------------- */
/* 서비스 함수                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * 한국 인기 영상 목록 (홈 피드).
 * 할당량: videos.list 1 + channels.list 1
 */
export async function getPopularVideos(
  params: {
    categoryId?: string;
    pageToken?: string;
    maxResults?: number;
  } = {},
): Promise<Page<Video>> {
  const res = await ytFetch<YtListResponse<YtVideo>>('videos', {
    part: VIDEO_PARTS,
    chart: 'mostPopular',
    regionCode: REGION_CODE,
    videoCategoryId: params.categoryId,
    pageToken: params.pageToken,
    maxResults: params.maxResults ?? 24,
  });
  return {
    items: await normalizeVideos(res.items ?? []),
    nextPageToken: res.nextPageToken,
  };
}

/**
 * 영상에 지정할 수 있는 카테고리 목록 (카테고리 칩).
 * 할당량: videoCategories.list 1
 */
export async function getVideoCategories(): Promise<VideoCategory[]> {
  const res = await ytFetch<YtListResponse<YtVideoCategory>>('videoCategories', {
    part: 'snippet',
    regionCode: REGION_CODE,
    hl: LANGUAGE,
  });
  return (res.items ?? []).filter((c) => c.snippet?.assignable).map(toVideoCategory);
}

/**
 * 키워드 검색 (검색 결과).
 * search.list로 id를 찾고, videos.list로 재생시간 · 조회수를 보강한다.
 * 할당량: search.list 1회(하루 100회 한도) + videos.list 1 + channels.list 1
 *
 * @param publishedAfter ISO 8601 (예: 2026-11-03T00:00:00Z)
 */
export async function searchVideos(params: {
  q: string;
  order?: SearchOrder;
  publishedAfter?: string;
  pageToken?: string;
  maxResults?: number;
}): Promise<Page<Video>> {
  const q = params.q.trim();
  if (!q) throw new YouTubeApiError('BAD_REQUEST', '검색어를 입력하세요.');

  const res = await ytFetch<YtListResponse<YtSearchResult>>('search', {
    part: 'snippet',
    type: 'video',
    q,
    order: params.order,
    publishedAfter: params.publishedAfter,
    pageToken: params.pageToken,
    regionCode: REGION_CODE,
    relevanceLanguage: LANGUAGE,
    maxResults: params.maxResults ?? 20,
  });

  const ids = (res.items ?? [])
    .map((item) => item.id.videoId)
    .filter((id): id is string => Boolean(id));

  return {
    items: await normalizeVideos(await fetchVideosByIds(ids)),
    nextPageToken: res.nextPageToken,
  };
}

/**
 * 영상 상세.
 * 할당량: videos.list 1 + channels.list 1
 *
 * @throws YouTubeApiError NOT_FOUND: 없는 영상이거나 비공개 영상
 */
export async function getVideo(id: string): Promise<Video> {
  const [raw] = await fetchVideosByIds([id]);
  if (!raw) throw new YouTubeApiError('NOT_FOUND', '영상을 찾을 수 없습니다.');
  const [video] = await normalizeVideos([raw]);
  return video;
}

/**
 * 관련 영상: 같은 카테고리의 인기 영상으로 대체한다.
 * (search.list의 relatedToVideoId 파라미터가 제거되었기 때문)
 * 인기 차트를 지원하지 않는 카테고리면 빈 목록을 돌려준다.
 * 할당량: videos.list 1 + channels.list 1
 */
export async function getRelatedVideos(params: {
  categoryId: string;
  excludeId?: string;
  maxResults?: number;
}): Promise<Video[]> {
  try {
    const page = await getPopularVideos({
      categoryId: params.categoryId,
      maxResults: params.maxResults ?? 20,
    });
    return page.items.filter((v) => v.id !== params.excludeId);
  } catch (err) {
    if (err instanceof YouTubeApiError && err.code === 'NOT_FOUND') return [];
    throw err;
  }
}
