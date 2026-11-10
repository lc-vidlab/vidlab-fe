import type { ApiErrorCode } from '@/lib/youtube/types';

/**
 * 클라이언트에서 쓰는 검색 에러. lib/youtube/errors.ts는 server-only라 import할 수 없어서
 * Route Handler 응답(ApiError)의 code만 담아 둔다.
 */
export class SearchError extends Error {
  constructor(readonly code: ApiErrorCode) {
    super(code);
    this.name = 'SearchError';
  }
}

export function isQuotaError(error: unknown): boolean {
  return error instanceof SearchError && error.code === 'QUOTA_EXCEEDED';
}
