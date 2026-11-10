/**
 * YouTube 관련 타입 정의.
 *
 * - 프론트(클라이언트 컴포넌트 포함)는 "정규화 타입"과 "에러 타입"만 사용한다.
 * - "원본 타입"은 서버 코드(src/lib/youtube) 안에서만 쓴다.
 * - 이 파일은 클라이언트에서도 import할 수 있도록 서버 전용 코드를 넣지 않는다.
 *
 * 결정 근거: https://github.com/lc-vidlab/vidlab-fe/issues/1
 */

/* -------------------------------------------------------------------------- */
/* 정규화 타입: 프론트에서 사용                                                 */
/* -------------------------------------------------------------------------- */

export type Channel = {
  id: string;
  title: string;
  /** 채널 정보를 못 가져오면 빈 문자열 */
  avatarUrl: string;
  /** 채널이 구독자 수를 숨기면 없음 */
  subscriberCount?: number;
};

export type Video = {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  /** ISO 8601 (예: 2026-11-10T09:00:00Z) */
  publishedAt: string;
  /** 재생시간(초). 라이브 등 재생시간이 없으면 0 */
  durationSec: number;
  /** 조회수를 숨긴 영상이면 0 */
  viewCount: number;
  categoryId: string;
  /** false면 IFrame 플레이어로 재생할 수 없음 */
  embeddable: boolean;
  channel: Channel;
};

export type VideoCategory = {
  id: string;
  title: string;
};

/** 목록 응답. nextPageToken이 없으면 마지막 페이지 */
export type Page<T> = {
  items: T[];
  nextPageToken?: string;
};

/** 검색 정렬 기준: 관련도 · 최신 · 조회수 */
export type SearchOrder = 'relevance' | 'date' | 'viewCount';

/* -------------------------------------------------------------------------- */
/* 에러 타입                                                                   */
/* -------------------------------------------------------------------------- */

export type ApiErrorCode = 'QUOTA_EXCEEDED' | 'NOT_FOUND' | 'BAD_REQUEST' | 'UPSTREAM_ERROR';

/** Route Handler가 실패할 때 내려주는 응답 본문 */
export type ApiError = {
  error: {
    code: ApiErrorCode;
    message: string;
  };
};

/* -------------------------------------------------------------------------- */
/* 원본 타입: YouTube Data API v3 응답 중 우리가 쓰는 필드만                    */
/* -------------------------------------------------------------------------- */

export type YtThumbnail = { url: string; width?: number; height?: number };

export type YtThumbnails = Partial<
  Record<'default' | 'medium' | 'high' | 'standard' | 'maxres', YtThumbnail>
>;

export type YtListResponse<T> = {
  items?: T[];
  nextPageToken?: string;
};

/** videos.list (part=snippet,contentDetails,statistics,status) */
export type YtVideo = {
  id: string;
  snippet?: {
    title: string;
    description: string;
    publishedAt: string;
    channelId: string;
    channelTitle: string;
    categoryId: string;
    thumbnails: YtThumbnails;
  };
  contentDetails?: {
    /** ISO 8601 기간 (예: PT18M42S) */
    duration: string;
  };
  statistics?: {
    /** 숫자지만 문자열로 옴 */
    viewCount?: string;
  };
  status?: {
    embeddable?: boolean;
  };
};

/** channels.list (part=snippet,statistics) */
export type YtChannel = {
  id: string;
  snippet?: {
    title: string;
    thumbnails: YtThumbnails;
  };
  statistics?: {
    subscriberCount?: string;
    hiddenSubscriberCount?: boolean;
  };
};

/** search.list (type=video) */
export type YtSearchResult = {
  id: { kind: string; videoId?: string };
};

/** videoCategories.list */
export type YtVideoCategory = {
  id: string;
  snippet?: {
    title: string;
    assignable: boolean;
  };
};

/** YouTube 에러 응답 본문 */
export type YtErrorResponse = {
  error?: {
    code: number;
    message: string;
    errors?: { reason?: string; message?: string }[];
  };
};
