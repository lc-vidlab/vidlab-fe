'use client';

import { useSyncExternalStore } from 'react';

// 최근 검색어는 이 브라우저의 localStorage에만 저장한다 (서버로 보내지 않음).
const STORAGE_KEY = 'vidlab:recent-searches';
const MAX_ITEMS = 10;
const CHANGE_EVENT = 'vidlab:recent-searches-change';
const EMPTY: string[] = [];

let cachedRaw: string | null = null;
let cachedList: string[] = EMPTY;

function read(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY;
  }
  // useSyncExternalStore는 같은 값이면 같은 참조를 돌려줘야 하므로 원본 문자열 기준으로 캐시한다
  if (raw === cachedRaw) return cachedList;
  cachedRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cachedList = Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === 'string').slice(0, MAX_ITEMS)
      : EMPTY;
  } catch {
    cachedList = EMPTY;
  }
  return cachedList;
}

function write(list: string[]) {
  try {
    if (list.length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // 시크릿 모드 등 저장소를 못 쓰면 조용히 무시한다
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  // 같은 탭의 변경은 CHANGE_EVENT, 다른 탭의 변경은 storage 이벤트로 받는다
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** 가장 최근 검색어가 맨 앞. 같은 검색어는 맨 앞으로 옮기고 최대 10개만 남긴다. */
export function addRecentSearch(query: string) {
  write([query, ...read().filter((q) => q !== query)].slice(0, MAX_ITEMS));
}

export function removeRecentSearch(query: string) {
  write(read().filter((q) => q !== query));
}

export function clearRecentSearches() {
  write([]);
}

export function useRecentSearches(): string[] {
  // 서버 렌더링에서는 빈 목록 (localStorage 없음)
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
