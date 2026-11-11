import { DEFAULT_FILTERS, type SearchFilters } from './filters';

export const SEARCH_PATH = '/results';
export const MAX_QUERY_LENGTH = 100;

/** 앞뒤 공백 제거, 연속 공백을 하나로 합치고 최대 길이로 자른다. */
export function normalizeQuery(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.trim().replace(/\s+/g, ' ').slice(0, MAX_QUERY_LENGTH);
}

/** 기본값인 필터는 URL에 넣지 않는다 (/results?q=lofi 와 같은 검색이 같은 URL이 되도록) */
export function buildSearchUrl(query: string, filters: Partial<SearchFilters> = {}): string {
  const params = new URLSearchParams({ q: query });
  if (filters.order && filters.order !== DEFAULT_FILTERS.order) params.set('order', filters.order);
  if (filters.period && filters.period !== DEFAULT_FILTERS.period) {
    params.set('period', filters.period);
  }
  return `${SEARCH_PATH}?${params.toString()}`;
}
