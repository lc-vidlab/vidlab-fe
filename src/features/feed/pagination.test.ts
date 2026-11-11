import { describe, expect, it } from 'vitest';
import { nextFeedPageToken, uniqueFeedVideos } from './pagination';
import type { FeedPageData, FeedVideo } from './types';

const category = { id: '10', title: '음악' };
const video = (id: string): FeedVideo => ({
  id,
  title: id,
  category: '음악',
  duration: '1:00',
  views: '1천',
  uploaded: '1일 전',
});
const page = (ids: string[], nextPageToken?: string): FeedPageData => ({
  items: ids.map(video),
  nextPageToken,
  categories: [category],
});

describe('피드 페이지네이션', () => {
  it('현재 페이지가 비어 있어도 다음 토큰을 반환한다', () => {
    const empty = page([], 'next');
    expect(nextFeedPageToken(empty, [empty])).toBe('next');
  });

  it('서버가 같은 토큰을 반복하면 추가 요청을 중단한다', () => {
    const pages = [page(['a'], 'same'), page([], 'same')];
    expect(nextFeedPageToken(pages[1], pages)).toBeUndefined();
  });

  it('여러 페이지의 동일한 영상 ID를 한 번만 표시한다', () => {
    expect(uniqueFeedVideos([page(['a', 'b'], 'next'), page(['b', 'c'])]).map((v) => v.id)).toEqual(
      ['a', 'b', 'c'],
    );
  });
});
