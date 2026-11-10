import 'server-only';

// 실제 YouTube Data API를 호출하는 서비스 함수 구현.
// 직접 import하지 말고 service.ts를 쓴다. (USE_MOCK에 따라 이 파일 또는 mock.ts를 고른다)
//
// 결정 근거: https://github.com/lc-vidlab/vidlab-fe/issues/1, #4

import { ytFetch } from './client';
import { MAX_PER_REQUEST, PAGE_SIZE, pageSize } from './constants';
import { YouTubeApiError, videoNotFoundError } from './errors';
import { toChannel, toVideo, toVideoCategory } from './normalize';
import type {
  Channel,
  Page,
  PopularVideosParams,
  RelatedVideosParams,
  SearchVideosParams,
  Video,
  VideoCategory,
  YtChannel,
  YtListResponse,
  YtSearchResult,
  YtVideo,
  YtVideoCategory,
} from './types';
import { requireQuery } from './validation';

const REGION_CODE = 'KR';
const LANGUAGE = 'ko';

const VIDEO_PARTS = 'snippet,contentDetails,statistics,status';
const CHANNEL_PARTS = 'snippet,statistics';

/* -------------------------------------------------------------------------- */
/* 내부 함수                                                                   */
/* -------------------------------------------------------------------------- */

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function chunk<T>(list: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < list.length; i += size) result.push(list.slice(i, i + size));
  return result;
}

/**
 * id 목록으로 videos.list · channels.list를 호출한다.
 * 50개씩 나눠 동시에 요청하고 결과를 합친다. 응답 순서는 보장하지 않는다.
 */
async function fetchByIds<T>(
  resource: 'videos' | 'channels',
  part: string,
  ids: string[],
): Promise<T[]> {
  if (ids.length === 0) return [];
  const responses = await Promise.all(
    chunk(ids, MAX_PER_REQUEST).map((group) =>
      ytFetch<YtListResponse<T>>(resource, {
        part,
        id: group.join(','),
        maxResults: MAX_PER_REQUEST,
      }),
    ),
  );
  return responses.flatMap((res) => res.items ?? []);
}

/** id 목록으로 영상을 가져온다. 결과는 ids 순서를 따르고, 없는 영상은 빠진다 */
async function fetchVideosByIds(ids: string[]): Promise<YtVideo[]> {
  const videos = await fetchByIds<YtVideo>('videos', VIDEO_PARTS, ids);
  const byId = new Map(videos.map((v) => [v.id, v]));
  return ids.map((id) => byId.get(id)).filter(isDefined);
}

/**
 * id 목록으로 채널 정보(아바타 · 구독자 수)를 가져온다.
 * 실패해도 영상 목록은 보여줄 수 있도록 빈 결과를 돌려준다.
 *
 * SRV-05 메모: 서비스 함수에 'use cache'를 붙이면 이 실패 결과(아바타 없음)도 캐시된다.
 * 캐시 경계를 정할 때 함께 검토한다.
 */
async function fetchChannelsByIds(ids: string[]): Promise<Map<string, Channel>> {
  try {
    const channels = await fetchByIds<YtChannel>('channels', CHANNEL_PARTS, ids);
    return new Map(channels.map((raw) => [raw.id, toChannel(raw)]));
  } catch (err) {
    console.error('[youtube] 채널 정보 보강 실패. 채널 이름만 표시합니다.', err);
    return new Map();
  }
}

/** 원본 영상 목록에 채널 정보를 붙여 정규화한다 */
async function normalizeVideos(raw: YtVideo[]): Promise<Video[]> {
  const channelIds = [...new Set(raw.map((v) => v.snippet?.channelId).filter(isDefined))];
  const channels = await fetchChannelsByIds(channelIds);
  return raw.map((v) => toVideo(v, channels));
}

/* -------------------------------------------------------------------------- */
/* 서비스 함수                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * 한국 인기 영상 목록 (홈 피드).
 * 할당량: videos.list 1 + channels.list 1
 *
 * @throws YouTubeApiError NOT_FOUND: 인기 차트가 없는 카테고리 (예: 19 여행/이벤트, 27 교육)
 */
export async function getPopularVideos(params: PopularVideosParams = {}): Promise<Page<Video>> {
  const res = await ytFetch<YtListResponse<YtVideo>>('videos', {
    part: VIDEO_PARTS,
    chart: 'mostPopular',
    regionCode: REGION_CODE,
    videoCategoryId: params.categoryId,
    pageToken: params.pageToken,
    maxResults: pageSize(params.maxResults, PAGE_SIZE.popular),
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
 * @throws YouTubeApiError BAD_REQUEST: 검색어가 비어 있음
 */
export async function searchVideos(params: SearchVideosParams): Promise<Page<Video>> {
  const q = requireQuery(params.q);

  const res = await ytFetch<YtListResponse<YtSearchResult>>('search', {
    part: 'snippet',
    type: 'video',
    q,
    order: params.order,
    publishedAfter: params.publishedAfter,
    pageToken: params.pageToken,
    regionCode: REGION_CODE,
    relevanceLanguage: LANGUAGE,
    maxResults: pageSize(params.maxResults, PAGE_SIZE.search),
  });

  const ids = (res.items ?? []).map((item) => item.id.videoId).filter(isDefined);

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
  if (!raw) throw videoNotFoundError();
  const [video] = await normalizeVideos([raw]);
  return video;
}

/**
 * 관련 영상: 같은 카테고리의 인기 영상으로 대체한다.
 * (search.list의 relatedToVideoId 파라미터가 제거되었기 때문)
 * 인기 차트를 지원하지 않는 카테고리면 빈 목록을 돌려준다.
 * 할당량: videos.list 1 + channels.list 1
 */
export async function getRelatedVideos(params: RelatedVideosParams): Promise<Video[]> {
  try {
    const page = await getPopularVideos({
      categoryId: params.categoryId,
      maxResults: params.maxResults ?? PAGE_SIZE.related,
    });
    return page.items.filter((v) => v.id !== params.excludeId);
  } catch (err) {
    if (err instanceof YouTubeApiError && err.code === 'NOT_FOUND') return [];
    throw err;
  }
}
