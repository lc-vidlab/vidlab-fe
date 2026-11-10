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
    // YouTube 호출 실패는 client.ts가 원인과 함께 이미 로그를 남긴다.
    // 여기서는 우리 코드 버그처럼 예상하지 못한 에러만 남긴다 (응답은 502로 나가 YouTube 오류처럼 보이므로)
    if (!(err instanceof YouTubeApiError)) console.error('[api/youtube] 예상하지 못한 에러', err);
    const apiError = toYouTubeApiError(err);
    return Response.json(apiError.toJSON(), { status: apiError.status });
  }
}

function badRequest(message: string): YouTubeApiError {
  return new YouTubeApiError('BAD_REQUEST', message);
}

/** YouTube 카테고리 id: 숫자 1~4자리 (예: 10) */
const CATEGORY_ID_PATTERN = /^\d{1,4}$/;
/** 페이지 토큰: YouTube 토큰(예: CAUQAA)과 mock 토큰(예: mock:24)을 허용 */
const PAGE_TOKEN_PATTERN = /^[A-Za-z0-9_:-]{1,200}$/;
/** maxResults: 숫자만 1~2자리. Number()는 0x10 · 1e1도 숫자로 받아들이므로 먼저 거른다 */
const MAX_RESULTS_PATTERN = /^\d{1,2}$/;
/**
 * 시간대가 있는 ISO 8601 시각 (예: 2026-11-03T00:00:00Z, 2026-11-03T09:00:00+09:00).
 * 시간대가 없으면 서버 시간대로 해석돼 배포 환경(UTC)과 로컬(KST)의 결과가 9시간 달라지므로 받지 않는다.
 */
const DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/** 2026-02-31처럼 없는 날짜인지 확인한다 (Date는 3월 3일로 넘겨 버린다) */
function isRealDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** 쿼리 파라미터 읽기 도우미. 형식이 틀리면 BAD_REQUEST를 던진다 (respond가 400으로 바꾼다) */
export function queryParams(searchParams: URLSearchParams) {
  /** 값이 없거나 공백뿐이면 undefined */
  function optional(name: string): string | undefined {
    return searchParams.get(name)?.trim() || undefined;
  }

  function matching(name: string, pattern: RegExp, message: string): string | undefined {
    const value = optional(name);
    if (value !== undefined && !pattern.test(value)) throw badRequest(message);
    return value;
  }

  function categoryId(): string | undefined {
    return matching('categoryId', CATEGORY_ID_PATTERN, 'categoryId는 숫자여야 합니다. (예: 10)');
  }

  return {
    optional,

    categoryId,

    requiredCategoryId(): string {
      const value = categoryId();
      if (value === undefined) throw badRequest('categoryId 파라미터가 필요합니다.');
      return value;
    },

    pageToken(): string | undefined {
      return matching('pageToken', PAGE_TOKEN_PATTERN, '잘못된 페이지 토큰입니다.');
    },

    /** 1 ~ MAX_PER_REQUEST(50) 정수 */
    maxResults(): number | undefined {
      const message = `maxResults는 1~${MAX_PER_REQUEST} 사이 정수여야 합니다.`;
      const value = matching('maxResults', MAX_RESULTS_PATTERN, message);
      if (value === undefined) return undefined;
      const n = Number(value);
      if (n < 1 || n > MAX_PER_REQUEST) throw badRequest(message);
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

    /** 시간대가 있는 ISO 8601 시각. UTC 기준 ISO 문자열로 바꿔 돌려준다 */
    dateTime(name: string): string | undefined {
      const value = optional(name);
      if (value === undefined) return undefined;
      const match = DATETIME_PATTERN.exec(value);
      if (!match || !isRealDate(Number(match[1]), Number(match[2]), Number(match[3]))) {
        throw badRequest(
          `${name}는 시간대가 있는 ISO 8601 시각이어야 합니다. (예: 2026-11-03T00:00:00Z)`,
        );
      }
      return new Date(value).toISOString();
    },
  };
}
