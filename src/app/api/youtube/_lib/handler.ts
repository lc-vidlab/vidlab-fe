import 'server-only';

// /api/youtube/* Route Handler 공통 처리: 요청 시점 실행, 쿼리 파라미터 검증, 에러 응답 변환.
// 결정 근거: https://github.com/lc-vidlab/vidlab-fe/issues/11

import { connection } from 'next/server';

import { MAX_PER_REQUEST } from '@/lib/youtube/constants';
import { YouTubeApiError, toYouTubeApiError } from '@/lib/youtube/errors';

/**
 * 요청을 처리하고 결과를 JSON으로 돌려준다. 실패하면 ApiError와 상태 코드(400/404/429/502)를 돌려준다.
 *
 * connection(): Cache Components에서는 요청 정보 · 네트워크를 쓰지 않는 GET이 빌드 때 실행돼
 * 결과가 고정된다(mock 모드의 /categories 등). 캐싱은 SRV-05에서 의도해서 넣으므로, 지금은 항상 요청 시점에 실행한다.
 */
export async function respond(run: () => Promise<unknown>): Promise<Response> {
  await connection();
  try {
    return Response.json(await run());
  } catch (err) {
    const apiError = toYouTubeApiError(err);
    if (apiError.code === 'UPSTREAM_ERROR') console.error('[api/youtube]', err);
    return Response.json(apiError.toJSON(), { status: apiError.status });
  }
}

function badRequest(message: string): YouTubeApiError {
  return new YouTubeApiError('BAD_REQUEST', message);
}

/** 쿼리 파라미터 읽기 도우미. 형식이 틀리면 BAD_REQUEST를 던진다 (respond가 400으로 바꾼다) */
export function queryParams(searchParams: URLSearchParams) {
  /** 값이 없거나 공백뿐이면 undefined */
  function optional(name: string): string | undefined {
    return searchParams.get(name)?.trim() || undefined;
  }

  return {
    optional,

    required(name: string): string {
      const value = optional(name);
      if (value === undefined) throw badRequest(`${name} 파라미터가 필요합니다.`);
      return value;
    },

    /** 1 ~ MAX_PER_REQUEST(50) 정수 */
    maxResults(): number | undefined {
      const value = optional('maxResults');
      if (value === undefined) return undefined;
      const n = Number(value);
      if (!Number.isInteger(n) || n < 1 || n > MAX_PER_REQUEST) {
        throw badRequest(`maxResults는 1~${MAX_PER_REQUEST} 사이 정수여야 합니다.`);
      }
      return n;
    },

    /** 허용된 값 중 하나 */
    oneOf<const T extends string>(name: string, allowed: readonly T[]): T | undefined {
      const value = optional(name);
      if (value === undefined) return undefined;
      if (!(allowed as readonly string[]).includes(value)) {
        throw badRequest(`${name}는 ${allowed.join(', ')} 중 하나여야 합니다.`);
      }
      return value as T;
    },

    /** ISO 8601 날짜 · 시각 (예: 2026-11-03T00:00:00Z) */
    isoDate(name: string): string | undefined {
      const value = optional(name);
      if (value === undefined) return undefined;
      if (!/^\d{4}-\d{2}-\d{2}/.test(value) || Number.isNaN(Date.parse(value))) {
        throw badRequest(`${name}는 ISO 8601 날짜여야 합니다. (예: 2026-11-03T00:00:00Z)`);
      }
      return new Date(value).toISOString();
    },
  };
}
