'use client';

import { useSyncExternalStore } from 'react';
import type { FeedVideo } from '@/features/feed/types';

export const SEARCH_HISTORY_KEY = 'vidlab:search-history:v1';
export const WATCH_HISTORY_KEY = 'vidlab:watch-history:v1';

const SEARCH_EVENT = 'vidlab:search-history-change';
const WATCH_EVENT = 'vidlab:watch-history-change';
const EMPTY_SEARCH: SearchHistoryEntry[] = [];
const EMPTY_WATCH: WatchHistoryEntry[] = [];

export type SearchHistoryEntry = { query: string; searchedAt: number };
export type WatchHistoryEntry = FeedVideo & { watchedAt: number };

let cachedSearchRaw: string | null | undefined;
let cachedSearch: SearchHistoryEntry[] = EMPTY_SEARCH;
let cachedWatchRaw: string | null | undefined;
let cachedWatch: WatchHistoryEntry[] = EMPTY_WATCH;

function safeRead(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parseSearchHistory(raw: string | null): SearchHistoryEntry[] {
  if (!raw) return EMPTY_SEARCH;
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return EMPTY_SEARCH;
    return value
      .filter(
        (entry): entry is SearchHistoryEntry =>
          typeof entry === 'object' &&
          entry !== null &&
          typeof (entry as SearchHistoryEntry).query === 'string' &&
          typeof (entry as SearchHistoryEntry).searchedAt === 'number',
      )
      .filter((entry) => entry.query.trim().length > 0)
      .sort((a, b) => b.searchedAt - a.searchedAt)
      .slice(0, 20);
  } catch {
    return EMPTY_SEARCH;
  }
}

function parseWatchHistory(raw: string | null): WatchHistoryEntry[] {
  if (!raw) return EMPTY_WATCH;
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return EMPTY_WATCH;
    return value
      .filter(
        (entry): entry is WatchHistoryEntry =>
          typeof entry === 'object' &&
          entry !== null &&
          typeof (entry as WatchHistoryEntry).id === 'string' &&
          typeof (entry as WatchHistoryEntry).title === 'string' &&
          typeof (entry as WatchHistoryEntry).category === 'string' &&
          typeof (entry as WatchHistoryEntry).duration === 'string' &&
          typeof (entry as WatchHistoryEntry).views === 'string' &&
          typeof (entry as WatchHistoryEntry).uploaded === 'string' &&
          typeof (entry as WatchHistoryEntry).watchedAt === 'number',
      )
      .sort((a, b) => b.watchedAt - a.watchedAt)
      .slice(0, 100);
  } catch {
    return EMPTY_WATCH;
  }
}

function searchSnapshot(): SearchHistoryEntry[] {
  const raw = safeRead(SEARCH_HISTORY_KEY);
  if (raw !== cachedSearchRaw) {
    cachedSearchRaw = raw;
    cachedSearch = parseSearchHistory(raw);
  }
  return cachedSearch;
}

function watchSnapshot(): WatchHistoryEntry[] {
  const raw = safeRead(WATCH_HISTORY_KEY);
  if (raw !== cachedWatchRaw) {
    cachedWatchRaw = raw;
    cachedWatch = parseWatchHistory(raw);
  }
  return cachedWatch;
}

function writeHistory<T>(key: string, eventName: string, value: T[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    if (key === SEARCH_HISTORY_KEY) {
      cachedSearchRaw = undefined;
      searchSnapshot();
    } else {
      cachedWatchRaw = undefined;
      watchSnapshot();
    }
    window.dispatchEvent(new Event(eventName));
  } catch {
    // 저장 공간이 없거나 비활성화되어도 검색·재생 동작은 계속한다.
  }
}

function subscribe(key: string, eventName: string, callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === key) callback();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(eventName, callback);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(eventName, callback);
  };
}

export function useSearchHistory() {
  return useSyncExternalStore(
    (callback) => subscribe(SEARCH_HISTORY_KEY, SEARCH_EVENT, callback),
    searchSnapshot,
    () => EMPTY_SEARCH,
  );
}

export function addSearchHistory(query: string) {
  const normalized = query.trim();
  if (!normalized) return;
  const next = [
    { query: normalized, searchedAt: Date.now() },
    ...searchSnapshot().filter((entry) => entry.query !== normalized),
  ].slice(0, 20);
  writeHistory(SEARCH_HISTORY_KEY, SEARCH_EVENT, next);
}

export function removeSearchHistory(query: string) {
  writeHistory(
    SEARCH_HISTORY_KEY,
    SEARCH_EVENT,
    searchSnapshot().filter((entry) => entry.query !== query),
  );
}

export function useWatchHistory() {
  return useSyncExternalStore(
    (callback) => subscribe(WATCH_HISTORY_KEY, WATCH_EVENT, callback),
    watchSnapshot,
    () => EMPTY_WATCH,
  );
}

export function addWatchHistory(video: FeedVideo) {
  const next = [
    { ...video, watchedAt: Date.now() },
    ...watchSnapshot().filter((entry) => entry.id !== video.id),
  ].slice(0, 100);
  writeHistory(WATCH_HISTORY_KEY, WATCH_EVENT, next);
}

export function removeWatchHistory(id: string) {
  writeHistory(
    WATCH_HISTORY_KEY,
    WATCH_EVENT,
    watchSnapshot().filter((entry) => entry.id !== id),
  );
}

export function clearWatchHistory() {
  writeHistory(WATCH_HISTORY_KEY, WATCH_EVENT, []);
}
