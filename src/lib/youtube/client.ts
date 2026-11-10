import 'server-only';

// YouTube Data API v3 공통 호출 함수.

import { YouTubeApiError } from './errors';
import type { YtErrorResponse } from './types';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

/** 할당량 초과로 보는 YouTube 에러 reason */
const QUOTA_REASONS = new Set([
  'quotaExceeded',
  'dailyLimitExceeded',
  'rateLimitExceeded',
  'userRateLimitExceeded',
]);

/** 요청이 아니라 서버 설정(API 키 등) 문제로 보는 reason. 사용자에게 BAD_REQUEST로 보이면 안 된다 */
const CONFIG_REASONS = new Set(['keyInvalid', 'keyExpired', 'accessNotConfigured', 'forbidden']);

const CONFIG_ERROR_MESSAGE = 'YouTube API 설정에 문제가 있습니다.';

function getReason(body: YtErrorResponse): string {
  return body.error?.errors?.[0]?.reason ?? '';
}

function mapError(status: number, body: YtErrorResponse): YouTubeApiError {
  const reason = getReason(body);

  if (QUOTA_REASONS.has(reason)) return new YouTubeApiError('QUOTA_EXCEEDED');
  if (CONFIG_REASONS.has(reason)) {
    return new YouTubeApiError('UPSTREAM_ERROR', CONFIG_ERROR_MESSAGE);
  }
  if (status === 404) return new YouTubeApiError('NOT_FOUND');
  if (status === 400) return new YouTubeApiError('BAD_REQUEST');
  return new YouTubeApiError('UPSTREAM_ERROR');
}

type Params = Record<string, string | number | undefined>;

/**
 * YouTube Data API v3를 호출한다. API 키를 붙이고, 실패하면 YouTubeApiError를 던진다.
 *
 * @param resource 예: 'videos', 'search', 'channels', 'videoCategories'
 */
export async function ytFetch<T>(resource: string, params: Params): Promise<T> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    console.error('[youtube] YOUTUBE_API_KEY가 설정되지 않았습니다. .env.local을 확인하세요.');
    throw new YouTubeApiError('UPSTREAM_ERROR', CONFIG_ERROR_MESSAGE);
  }

  const url = new URL(`${BASE_URL}/${resource}`);
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') url.searchParams.set(name, String(value));
  }
  url.searchParams.set('key', key);

  let res: Response;
  try {
    res = await fetch(url);
  } catch (err) {
    console.error(`[youtube] ${resource} 네트워크 오류`, err);
    throw new YouTubeApiError('UPSTREAM_ERROR', 'YouTube API에 연결할 수 없습니다.');
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as YtErrorResponse;
    // 로그에는 원인을 남기되, 키가 담긴 URL은 남기지 않는다
    console.error(`[youtube] ${resource} ${res.status}`, getReason(body), body.error?.message);
    throw mapError(res.status, body);
  }

  return (await res.json()) as T;
}
