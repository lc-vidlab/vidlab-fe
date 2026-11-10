import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ytFetch } from './client';
import { YouTubeApiError } from './errors';

// 실제 네트워크 대신 가짜 fetch로 YouTube 응답을 흉내 낸다.

function youtubeError(status: number, reason: string): Response {
  return Response.json(
    { error: { code: status, message: reason, errors: [{ reason }] } },
    { status },
  );
}

async function expectApiError(promise: Promise<unknown>, code: YouTubeApiError['code']) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(YouTubeApiError);
  expect((error as YouTubeApiError).code).toBe(code);
}

describe('ytFetch', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv('YOUTUBE_API_KEY', 'test-key');
    vi.stubGlobal('fetch', fetchMock);
    // 실패 로그가 테스트 출력에 섞이지 않게 한다
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  it('API 키와 파라미터를 붙여 호출하고, 빈 값은 빼고 보낸다', async () => {
    fetchMock.mockResolvedValue(Response.json({ items: [] }));

    await expect(
      ytFetch('videos', { part: 'snippet', pageToken: undefined, q: '' }),
    ).resolves.toEqual({ items: [] });

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe('https://www.googleapis.com/youtube/v3/videos');
    expect(url.searchParams.get('part')).toBe('snippet');
    expect(url.searchParams.get('key')).toBe('test-key');
    expect(url.searchParams.has('pageToken')).toBe(false);
    expect(url.searchParams.has('q')).toBe(false);
  });

  it.each([
    [403, 'quotaExceeded', 'QUOTA_EXCEEDED'],
    [403, 'rateLimitExceeded', 'QUOTA_EXCEEDED'],
    [400, 'keyInvalid', 'UPSTREAM_ERROR'],
    [403, 'accessNotConfigured', 'UPSTREAM_ERROR'],
    [404, 'videoChartNotFound', 'NOT_FOUND'],
    [400, 'invalidPageToken', 'BAD_REQUEST'],
    [500, 'backendError', 'UPSTREAM_ERROR'],
  ] as const)('%i %s → %s', async (status, reason, code) => {
    fetchMock.mockResolvedValue(youtubeError(status, reason));
    await expectApiError(ytFetch('videos', {}), code);
  });

  it('API 키가 없으면 호출하지 않고 UPSTREAM_ERROR', async () => {
    vi.stubEnv('YOUTUBE_API_KEY', '');
    await expectApiError(ytFetch('videos', {}), 'UPSTREAM_ERROR');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('네트워크 오류는 UPSTREAM_ERROR', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expectApiError(ytFetch('videos', {}), 'UPSTREAM_ERROR');
  });

  it('로그에 API 키를 남기지 않는다', async () => {
    fetchMock.mockResolvedValue(youtubeError(400, 'keyInvalid'));
    await ytFetch('videos', {}).catch(() => {});
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).not.toContain('test-key');
  });
});
