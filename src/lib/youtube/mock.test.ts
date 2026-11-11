import { describe, expect, it } from 'vitest';

import {
  MOCK_CATEGORIES,
  MOCK_CATEGORIES_WITHOUT_CHART,
  MOCK_IDS,
  MOCK_VIDEOS,
} from '@/mocks/youtube';

import { PAGE_SIZE } from './constants';
import { YouTubeApiError } from './errors';
import { mockService as mock } from './mock';
import { MAX_QUERY_LENGTH } from './validation';
import { isVideoId } from './video-id';

// mock 데이터를 고치다가 팀원이 쓰는 상태(페이지네이션, 에러 재현 등)를 깨뜨리지 않았는지 확인한다.
// 결정 근거: https://github.com/lc-vidlab/vidlab-fe/issues/4

const HOUR = 60 * 60 * 1000;

async function expectApiError(promise: Promise<unknown>, code: YouTubeApiError['code']) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(YouTubeApiError);
  expect((error as YouTubeApiError).code).toBe(code);
}

describe('mock 데이터', () => {
  it('영상 id가 겹치지 않는다', () => {
    const ids = MOCK_VIDEOS.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('영상 id가 YouTube 형식(11자)이다. 상세 페이지 · API의 id 검사를 통과해야 한다', () => {
    for (const video of MOCK_VIDEOS) expect(isVideoId(video.id), video.id).toBe(true);
  });

  it('모든 영상의 카테고리가 카테고리 목록에 있다', () => {
    const categoryIds = new Set(MOCK_CATEGORIES.map((c) => c.id));
    for (const video of MOCK_VIDEOS) expect(categoryIds).toContain(video.categoryId);
  });

  it('인기 영상이 두 페이지 이상이라 무한 스크롤을 확인할 수 있다', () => {
    expect(MOCK_VIDEOS.length).toBeGreaterThan(PAGE_SIZE.popular);
  });

  it('MOCK_IDS가 가리키는 영상이 안내한 상태를 갖고 있다', () => {
    const byId = (id: string) => MOCK_VIDEOS.find((v) => v.id === id)!;
    expect(byId(MOCK_IDS.notEmbeddable).embeddable).toBe(false);
    expect(byId(MOCK_IDS.live).durationSec).toBe(0);
    expect(byId(MOCK_IDS.hiddenViewCount).viewCount).toBe(0);
    expect(byId(MOCK_IDS.longTitle).title.length).toBeGreaterThan(40);
    expect(MOCK_CATEGORIES_WITHOUT_CHART.has(byId(MOCK_IDS.noRelated).categoryId)).toBe(true);
  });

  it('채널 예외 상태(구독자 수 숨김, 아바타 없음)를 확인할 데이터가 들어 있다', () => {
    expect(MOCK_VIDEOS.some((v) => v.channel.subscriberCount === undefined)).toBe(true);
    expect(MOCK_VIDEOS.some((v) => v.channel.avatarUrl === '')).toBe(true);
  });
});

describe('getPopularVideos', () => {
  it('조회수 순으로 기본 24개와 다음 페이지 토큰을 준다', async () => {
    const page = await mock.getPopularVideos();
    expect(page.items).toHaveLength(PAGE_SIZE.popular);
    expect(page.nextPageToken).toBeDefined();
    const views = page.items.map((v) => v.viewCount);
    expect(views).toEqual([...views].sort((a, b) => b - a));
  });

  it('토큰으로 끝까지 넘기면 모든 영상을 한 번씩 받고, 마지막 페이지에는 토큰이 없다', async () => {
    const seen: string[] = [];
    let pageToken: string | undefined;
    do {
      const page = await mock.getPopularVideos({ pageToken });
      seen.push(...page.items.map((v) => v.id));
      pageToken = page.nextPageToken;
    } while (pageToken);

    // 카테고리를 지정하지 않은 전체 차트에는 19 · 27 카테고리 영상도 들어간다 (실제 API와 같음)
    expect(seen).toHaveLength(MOCK_VIDEOS.length);
    expect(new Set(seen).size).toBe(seen.length);
  });

  it('maxResults만큼 준다', async () => {
    expect((await mock.getPopularVideos({ maxResults: 5 })).items).toHaveLength(5);
  });

  it('카테고리를 주면 그 카테고리 영상만 준다', async () => {
    const page = await mock.getPopularVideos({ categoryId: '10' });
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((v) => v.categoryId === '10')).toBe(true);
  });

  it.each([...MOCK_CATEGORIES_WITHOUT_CHART])(
    '인기 차트가 없는 카테고리(%s)는 NOT_FOUND',
    async (categoryId) => {
      await expectApiError(mock.getPopularVideos({ categoryId }), 'NOT_FOUND');
    },
  );

  it.each([['abc'], ['mock:'], ['mock:-1'], ['mock:1.5']])(
    '잘못된 페이지 토큰(%s)은 BAD_REQUEST',
    async (pageToken) => {
      await expectApiError(mock.getPopularVideos({ pageToken }), 'BAD_REQUEST');
    },
  );
});

describe('getVideoCategories', () => {
  it('실제 API와 같은 14개 카테고리를 준다', async () => {
    const categories = await mock.getVideoCategories();
    expect(categories).toHaveLength(14);
    expect(categories).toContainEqual({ id: '10', title: '음악' });
  });
});

describe('searchVideos', () => {
  it('제목에 검색어가 들어간 영상을 찾는다 (대소문자 무시)', async () => {
    // 제목에 대문자 단어가 있는 영상을, 그 단어의 소문자로 검색한다
    const target = MOCK_VIDEOS.find((v) => /[A-Z]/.test(v.title))!;
    const word = target.title.split(' ').find((w) => /[A-Z]/.test(w))!;
    const page = await mock.searchVideos({ q: word.toLowerCase() });
    expect(page.items.map((v) => v.id)).toContain(target.id);
  });

  it('채널 이름으로도 찾는다', async () => {
    const page = await mock.searchVideos({ q: '튠박스' });
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((v) => v.channel.title === '튠박스')).toBe(true);
  });

  it('결과가 없으면 빈 목록이고 다음 페이지 토큰이 없다', async () => {
    const page = await mock.searchVideos({ q: '절대없는검색어' });
    expect(page).toEqual({ items: [], nextPageToken: undefined });
  });

  it('order=date는 최신순, order=viewCount는 조회수순', async () => {
    const byDate = (await mock.searchVideos({ q: '튠박스', order: 'date' })).items;
    const dates = byDate.map((v) => v.publishedAt);
    expect(dates).toEqual([...dates].sort().reverse());

    const byViews = (await mock.searchVideos({ q: '튠박스', order: 'viewCount' })).items;
    const views = byViews.map((v) => v.viewCount);
    expect(views).toEqual([...views].sort((a, b) => b - a));
  });

  it('publishedAfter 이후에 올라온 영상만 준다', async () => {
    // 24시간 안에 올라온 영상이 있는 채널로 검색해, 그 채널의 오래된 영상이 빠지는지 본다
    const since = new Date(Date.now() - 24 * HOUR);
    const recent = MOCK_VIDEOS.find((v) => new Date(v.publishedAt) >= since)!;
    const page = await mock.searchVideos({
      q: recent.channel.title,
      publishedAfter: since.toISOString(),
    });
    expect(page.items.map((v) => v.id)).toContain(recent.id);
    expect(page.items.every((v) => new Date(v.publishedAt) >= since)).toBe(true);
  });

  it.each([
    ['', 'BAD_REQUEST'],
    ['   ', 'BAD_REQUEST'],
    ['__quota__', 'QUOTA_EXCEEDED'],
    ['__error__', 'UPSTREAM_ERROR'],
  ] as const)('검색어 "%s" → %s', async (q, code) => {
    await expectApiError(mock.searchVideos({ q }), code);
  });

  it.each([['constructor'], ['toString'], ['__proto__']])(
    '객체 기본 속성 이름(%s)도 일반 검색어로 처리한다',
    async (q) => {
      await expect(mock.searchVideos({ q })).resolves.toEqual({
        items: [],
        nextPageToken: undefined,
      });
    },
  );

  it('잘못된 publishedAfter는 BAD_REQUEST', async () => {
    await expectApiError(mock.searchVideos({ q: '뉴스', publishedAfter: '어제' }), 'BAD_REQUEST');
  });
});

describe('getVideo', () => {
  it('id로 영상을 찾는다', async () => {
    const video = await mock.getVideo(MOCK_IDS.live);
    expect(video.id).toBe(MOCK_IDS.live);
  });

  it('없는 id는 NOT_FOUND', async () => {
    await expectApiError(mock.getVideo('nope'), 'NOT_FOUND');
  });
});

describe('getRelatedVideos', () => {
  it('같은 카테고리 영상을 주고, 지금 보는 영상은 뺀다', async () => {
    const current = MOCK_VIDEOS.find((v) => !MOCK_CATEGORIES_WITHOUT_CHART.has(v.categoryId))!;
    const related = await mock.getRelatedVideos({
      categoryId: current.categoryId,
      excludeId: current.id,
    });
    expect(related.length).toBeGreaterThan(0);
    expect(related.every((v) => v.categoryId === current.categoryId)).toBe(true);
    expect(related.map((v) => v.id)).not.toContain(current.id);
  });

  it.each([...MOCK_CATEGORIES_WITHOUT_CHART])(
    '인기 차트가 없는 카테고리(%s)는 빈 목록',
    async (categoryId) => {
      await expect(mock.getRelatedVideos({ categoryId })).resolves.toEqual([]);
    },
  );
});

describe('검색어 길이', () => {
  it(`${MAX_QUERY_LENGTH}자까지는 받고, 넘으면 BAD_REQUEST`, async () => {
    await expect(mock.searchVideos({ q: 'a'.repeat(MAX_QUERY_LENGTH) })).resolves.toBeDefined();
    await expectApiError(mock.searchVideos({ q: 'a'.repeat(MAX_QUERY_LENGTH + 1) }), 'BAD_REQUEST');
  });
});
