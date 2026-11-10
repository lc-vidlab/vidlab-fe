export const SEARCH_PATH = '/results';
export const MAX_QUERY_LENGTH = 100;

/** 앞뒤 공백 제거, 연속 공백을 하나로 합치고 최대 길이로 자른다. */
export function normalizeQuery(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.trim().replace(/\s+/g, ' ').slice(0, MAX_QUERY_LENGTH);
}

export function buildSearchUrl(query: string): string {
  return `${SEARCH_PATH}?q=${encodeURIComponent(query)}`;
}
