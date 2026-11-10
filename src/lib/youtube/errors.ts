import 'server-only';

// YouTube 조회에서 쓰는 에러 정의.
// 서비스 함수, mock(SRV-03), Route Handler(SRV-04)가 함께 쓴다.

import type { ApiError, ApiErrorCode } from './types';

/** Route Handler 응답 상태 코드 */
const HTTP_STATUS: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  QUOTA_EXCEEDED: 429,
  UPSTREAM_ERROR: 502,
};

/** 코드별 기본 메시지. 상황에 맞는 문구가 따로 있으면 생성자에 넘긴다 */
const DEFAULT_MESSAGE: Record<ApiErrorCode, string> = {
  BAD_REQUEST: '잘못된 요청입니다.',
  NOT_FOUND: '요청한 데이터를 찾을 수 없습니다.',
  QUOTA_EXCEEDED: 'YouTube API 할당량을 초과했습니다.',
  UPSTREAM_ERROR: 'YouTube API 호출 중 오류가 발생했습니다.',
};

export class YouTubeApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string = DEFAULT_MESSAGE[code],
  ) {
    super(message);
    this.name = 'YouTubeApiError';
  }

  /** Route Handler에서 응답 상태 코드로 쓴다 */
  get status(): number {
    return HTTP_STATUS[this.code];
  }

  toJSON(): ApiError {
    return { error: { code: this.code, message: this.message } };
  }
}

/** 어떤 에러든 프론트로 보낼 수 있는 YouTubeApiError로 바꾼다 */
export function toYouTubeApiError(err: unknown): YouTubeApiError {
  if (err instanceof YouTubeApiError) return err;
  return new YouTubeApiError('UPSTREAM_ERROR');
}
