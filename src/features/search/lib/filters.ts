import type { SearchOrder } from '@/lib/youtube/types';

export type SearchPeriod = 'all' | 'today' | 'week' | 'month';

export type SearchFilters = {
  order: SearchOrder;
  period: SearchPeriod;
};

export const DEFAULT_FILTERS: SearchFilters = { order: 'relevance', period: 'all' };

export const ORDER_OPTIONS: { value: SearchOrder; label: string }[] = [
  { value: 'relevance', label: '관련도순' },
  { value: 'date', label: '최신순' },
  { value: 'viewCount', label: '조회수순' },
];

export const PERIOD_OPTIONS: { value: SearchPeriod; label: string }[] = [
  { value: 'all', label: '전체 기간' },
  { value: 'today', label: '오늘' },
  { value: 'week', label: '이번 주' },
  { value: 'month', label: '이번 달' },
];

function pickFirst(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** URL 값이 잘못되면 기본값으로 돌린다 */
export function parseFilters(params: {
  order?: string | string[];
  period?: string | string[];
}): SearchFilters {
  const order = pickFirst(params.order);
  const period = pickFirst(params.period);
  return {
    order: ORDER_OPTIONS.some((o) => o.value === order)
      ? (order as SearchOrder)
      : DEFAULT_FILTERS.order,
    period: PERIOD_OPTIONS.some((p) => p.value === period)
      ? (period as SearchPeriod)
      : DEFAULT_FILTERS.period,
  };
}

const HOUR = 60 * 60 * 1000;
const PERIOD_HOURS: Record<Exclude<SearchPeriod, 'all'>, number> = {
  today: 24,
  week: 24 * 7,
  month: 24 * 30,
};

/**
 * 기간 필터 → publishedAfter(ISO 8601).
 * 최근 24시간 · 7일 · 30일 기준이며, 같은 시간대 요청이 서버 캐시를 함께 쓰도록 정시 단위로 내린다.
 */
export function toPublishedAfter(
  period: SearchPeriod,
  now: number = Date.now(),
): string | undefined {
  if (period === 'all') return undefined;
  const flooredNow = Math.floor(now / HOUR) * HOUR;
  return new Date(flooredNow - PERIOD_HOURS[period] * HOUR).toISOString();
}
