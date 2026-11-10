import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MOCK_CATEGORIES_WITHOUT_CHART, MOCK_IDS, MOCK_VIDEOS } from '@/mocks/youtube';
import type { ApiError, Page, Video, VideoCategory } from '@/lib/youtube/types';

import { GET as getCategories } from '../categories/route';
import { GET as getPopular } from '../popular/route';
import { GET as getRelated } from '../related/route';
import { GET as getSearch } from '../search/route';
import { GET as getVideo } from '../videos/[id]/route';

// /api/youtube/* 를 mock 모드에서 호출해 응답 형태 · 상태 코드 · 파라미터 검증을 확인한다.
// 결정 근거: https://github.com/lc-vidlab/vidlab-fe/issues/11

// connection()은 Next 요청 안에서만 동작하므로 테스트에서는 바로 끝나게 한다
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  connection: async () => {},
}));

function request(path: string): NextRequest {
  return new NextRequest(new URL(path, 'http://localhost'));
}

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function expectError(response: Response, status: number, code: ApiError['error']['code']) {
  expect(response.status).toBe(status);
  expect((await json<ApiError>(response)).error.code).toBe(code);
}

beforeEach(() => {
  vi.stubEnv('USE_MOCK', 'true');
  // mock 모드에서는 YouTube를 부르지 않아야 한다
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new Error('fetch는 호출되면 안 됩니다'))),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  // console.error를 숨기는 spy 등을 되돌린다
  vi.restoreAllMocks();
});

describe('GET /api/youtube/popular', () => {
  it('Page<Video>를 돌려주고, nextPageToken으로 다음 페이지를 받는다', async () => {
    const first = await getPopular(request('/api/youtube/popular?maxResults=5'));
    expect(first.status).toBe(200);
    const page = await json<Page<Video>>(first);
    expect(page.items).toHaveLength(5);
    expect(page.nextPageToken).toBeDefined();

    const second = await json<Page<Video>>(
      await getPopular(
        request(`/api/youtube/popular?maxResults=5&pageToken=${page.nextPageToken}`),
      ),
    );
    expect(second.items[0].id).not.toBe(page.items[0].id);
  });

  it('카테고리를 주면 그 카테고리 영상만 준다', async () => {
    const page = await json<Page<Video>>(
      await getPopular(request('/api/youtube/popular?categoryId=10')),
    );
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((v) => v.categoryId === '10')).toBe(true);
  });

  it.each([...MOCK_CATEGORIES_WITHOUT_CHART])('인기 차트가 없는 카테고리(%s)는 404', async (id) => {
    await expectError(
      await getPopular(request(`/api/youtube/popular?categoryId=${id}`)),
      404,
      'NOT_FOUND',
    );
  });

  it.each([['0'], ['51'], ['abc'], ['1.5'], ['0x10'], ['1e1']])(
    'maxResults=%s 는 400',
    async (value) => {
      await expectError(
        await getPopular(request(`/api/youtube/popular?maxResults=${value}`)),
        400,
        'BAD_REQUEST',
      );
    },
  );

  it.each([
    ['형식은 맞지만 mock에 없는 토큰', 'abc'],
    ['허용하지 않는 문자', encodeURIComponent('<script>')],
    ['너무 긴 토큰', 'a'.repeat(201)],
  ])('잘못된 pageToken(%s)은 400', async (_, token) => {
    await expectError(
      await getPopular(request(`/api/youtube/popular?pageToken=${token}`)),
      400,
      'BAD_REQUEST',
    );
  });

  it('숫자가 아닌 categoryId는 YouTube를 부르기 전에 400', async () => {
    await expectError(
      await getPopular(request('/api/youtube/popular?categoryId=abc')),
      400,
      'BAD_REQUEST',
    );
  });
});

describe('GET /api/youtube/categories', () => {
  it('카테고리 목록을 준다', async () => {
    const response = await getCategories();
    expect(response.status).toBe(200);
    expect(await json<VideoCategory[]>(response)).toContainEqual({ id: '10', title: '음악' });
  });
});

describe('GET /api/youtube/search', () => {
  it('검색 결과를 Page<Video>로 준다', async () => {
    const channel = MOCK_VIDEOS[0].channel.title;
    const response = await getSearch(
      request(`/api/youtube/search?q=${encodeURIComponent(channel)}`),
    );
    expect(response.status).toBe(200);
    const page = await json<Page<Video>>(response);
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.every((v) => v.channel.title === channel)).toBe(true);
  });

  it('order=date면 최신순으로 준다', async () => {
    // 데이터 순서(관련도)와 최신순이 다른 채널을 골라, order가 실제로 전달됐는지 확인한다
    const channel = MOCK_VIDEOS.find((v) => {
      const ids = MOCK_VIDEOS.filter((w) => w.channel.title === v.channel.title).map(
        (w) => w.publishedAt,
      );
      return ids.length >= 2 && ids.join() !== [...ids].sort().reverse().join();
    })!.channel.title;
    const page = await json<Page<Video>>(
      await getSearch(request(`/api/youtube/search?q=${encodeURIComponent(channel)}&order=date`)),
    );
    const times = page.items.map((v) => v.publishedAt);
    expect(times.length).toBeGreaterThanOrEqual(2);
    expect(times).toEqual([...times].sort().reverse());
  });

  it('publishedAfter 이후 영상만 준다', async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recent = MOCK_VIDEOS.find((v) => v.publishedAt >= since)!;
    const page = await json<Page<Video>>(
      await getSearch(
        request(
          `/api/youtube/search?q=${encodeURIComponent(recent.channel.title)}&publishedAfter=${since}`,
        ),
      ),
    );
    expect(page.items.map((v) => v.id)).toContain(recent.id);
    expect(page.items.every((v) => v.publishedAt >= since)).toBe(true);
  });

  it.each([
    ['q 없음', '/api/youtube/search'],
    ['빈 q', '/api/youtube/search?q=%20%20'],
    ['잘못된 order', '/api/youtube/search?q=a&order=popular'],
    ['100자 넘는 q', `/api/youtube/search?q=${'a'.repeat(101)}`],
    ['잘못된 publishedAfter', '/api/youtube/search?q=a&publishedAfter=yesterday'],
    ['시간대 없는 publishedAfter', '/api/youtube/search?q=a&publishedAfter=2026-11-03T00:00:00'],
    ['날짜만 있는 publishedAfter', '/api/youtube/search?q=a&publishedAfter=2026-11-03'],
    ['없는 날짜', '/api/youtube/search?q=a&publishedAfter=2026-02-31T00:00:00Z'],
  ])('%s → 400', async (_, path) => {
    await expectError(await getSearch(request(path)), 400, 'BAD_REQUEST');
  });

  it('시간대가 있는 publishedAfter(+09:00)는 받는다', async () => {
    const response = await getSearch(
      request(
        `/api/youtube/search?q=a&publishedAfter=${encodeURIComponent('2026-11-03T09:00:00+09:00')}`,
      ),
    );
    expect(response.status).toBe(200);
  });

  it.each([
    ['__quota__', 429, 'QUOTA_EXCEEDED'],
    ['__error__', 502, 'UPSTREAM_ERROR'],
  ] as const)('mock 에러 검색어 %s → %i', async (q, status, code) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expectError(await getSearch(request(`/api/youtube/search?q=${q}`)), status, code);
  });
});

describe('GET /api/youtube/videos/[id]', () => {
  const context = (id: string) => ({ params: Promise.resolve({ id }) });

  it('영상을 준다', async () => {
    const response = await getVideo(request('/'), context(MOCK_IDS.notEmbeddable));
    expect(response.status).toBe(200);
    const video = await json<Video>(response);
    expect(video.id).toBe(MOCK_IDS.notEmbeddable);
    expect(video.embeddable).toBe(false);
  });

  it('형식은 맞지만 없는 id는 404', async () => {
    await expectError(await getVideo(request('/'), context('AAAAAAAAAAA')), 404, 'NOT_FOUND');
  });

  it.each([['short'], ['mock-video-01'], ['has space!!']])(
    'YouTube id 형식이 아니면(%s) 400',
    async (id) => {
      await expectError(await getVideo(request('/'), context(id)), 400, 'BAD_REQUEST');
    },
  );
});

describe('GET /api/youtube/related', () => {
  it('같은 카테고리 영상을 주고, excludeId는 뺀다', async () => {
    const current = MOCK_VIDEOS.find((v) => !MOCK_CATEGORIES_WITHOUT_CHART.has(v.categoryId))!;
    const videos = await json<Video[]>(
      await getRelated(
        request(`/api/youtube/related?categoryId=${current.categoryId}&excludeId=${current.id}`),
      ),
    );
    expect(videos.length).toBeGreaterThan(0);
    expect(videos.every((v) => v.categoryId === current.categoryId)).toBe(true);
    expect(videos.map((v) => v.id)).not.toContain(current.id);
  });

  it.each([...MOCK_CATEGORIES_WITHOUT_CHART])(
    '인기 차트가 없는 카테고리(%s)는 빈 목록',
    async (id) => {
      const response = await getRelated(request(`/api/youtube/related?categoryId=${id}`));
      expect(response.status).toBe(200);
      expect(await json<Video[]>(response)).toEqual([]);
    },
  );

  it.each([
    ['categoryId 없음', '/api/youtube/related'],
    ['숫자가 아닌 categoryId', '/api/youtube/related?categoryId=abc'],
  ])('%s → 400', async (_, path) => {
    await expectError(await getRelated(request(path)), 400, 'BAD_REQUEST');
  });
});
