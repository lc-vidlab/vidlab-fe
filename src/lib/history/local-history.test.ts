import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FeedVideo } from '@/features/feed/types';
import {
  addSearchHistory,
  addWatchHistory,
  clearWatchHistory,
  removeSearchHistory,
  removeWatchHistory,
  SEARCH_HISTORY_KEY,
  WATCH_HISTORY_KEY,
} from './local-history';

describe('localStorage 기록', () => {
  const values = new Map<string, string>();

  beforeEach(() => {
    values.clear();
    const browser = new EventTarget() as EventTarget & { localStorage: Storage };
    browser.localStorage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
      clear: () => values.clear(),
      key: (index) => [...values.keys()][index] ?? null,
      get length() {
        return values.size;
      },
    };
    vi.stubGlobal('window', browser);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('검색어 중복을 최상단으로 옮기고 최대 20개만 저장한다', () => {
    for (let i = 0; i < 21; i += 1) {
      vi.spyOn(Date, 'now').mockReturnValueOnce(i);
      addSearchHistory(`검색 ${i}`);
    }
    addSearchHistory('검색 10');
    const saved = JSON.parse(values.get(SEARCH_HISTORY_KEY)!) as { query: string }[];
    expect(saved).toHaveLength(20);
    expect(saved[0].query).toBe('검색 10');
    expect(new Set(saved.map((entry) => entry.query)).size).toBe(20);

    removeSearchHistory('검색 10');
    expect(JSON.parse(values.get(SEARCH_HISTORY_KEY)!)[0].query).not.toBe('검색 10');
  });

  it('시청 영상을 중복 없이 최신순으로 저장하고 삭제한다', () => {
    const video = (id: string): FeedVideo => ({
      id,
      title: id,
      category: '음악',
      duration: '1:00',
      views: '1천',
      uploaded: '1일 전',
    });
    vi.spyOn(Date, 'now').mockReturnValueOnce(1).mockReturnValueOnce(2).mockReturnValueOnce(3);
    addWatchHistory(video('a'));
    addWatchHistory(video('b'));
    addWatchHistory(video('a'));
    expect(JSON.parse(values.get(WATCH_HISTORY_KEY)!).map((entry: FeedVideo) => entry.id)).toEqual([
      'a',
      'b',
    ]);

    removeWatchHistory('a');
    expect(JSON.parse(values.get(WATCH_HISTORY_KEY)!).map((entry: FeedVideo) => entry.id)).toEqual([
      'b',
    ]);
    clearWatchHistory();
    expect(JSON.parse(values.get(WATCH_HISTORY_KEY)!)).toEqual([]);
  });

  it('시청 기록은 최근 100개만 보관한다', () => {
    for (let i = 0; i < 101; i += 1) {
      addWatchHistory({
        id: `video-${i}`,
        title: `영상 ${i}`,
        category: '음악',
        duration: '1:00',
        views: '1천',
        uploaded: '1일 전',
      });
    }
    const saved = JSON.parse(values.get(WATCH_HISTORY_KEY)!) as FeedVideo[];
    expect(saved).toHaveLength(100);
    expect(saved[0].id).toBe('video-100');
  });
});
