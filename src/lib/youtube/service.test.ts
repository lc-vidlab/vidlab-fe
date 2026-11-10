import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MOCK_VIDEOS } from '@/mocks/youtube';

import { isMockMode } from './mode';
import { getPopularVideos, getVideo } from './service';

describe('USE_MOCK 전환', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it.each([
    [undefined, true],
    ['', true],
    ['true', true],
    ['TRUE', true],
    ['false', false],
  ])('USE_MOCK=%s → mock 모드 %s', (value, expected) => {
    vi.stubEnv('USE_MOCK', value);
    expect(isMockMode()).toBe(expected);
  });

  it('mock 모드에서는 YouTube API를 호출하지 않는다', async () => {
    vi.stubEnv('USE_MOCK', 'true');
    const video = await getVideo(MOCK_VIDEOS[0].id);
    expect(video).toEqual(MOCK_VIDEOS[0]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('USE_MOCK=false면 실제 API를 호출한다', async () => {
    vi.stubEnv('USE_MOCK', 'false');
    vi.stubEnv('YOUTUBE_API_KEY', 'test-key');
    fetchMock.mockResolvedValue(Response.json({ items: [] }));

    await expect(getPopularVideos()).resolves.toEqual({ items: [], nextPageToken: undefined });
    expect(String(fetchMock.mock.calls[0][0])).toContain('googleapis.com/youtube/v3/videos');
  });

  it('실제 인기 영상은 status를 요청하고 embeddable=false를 제외하면서 토큰은 유지한다', async () => {
    vi.stubEnv('USE_MOCK', 'false');
    vi.stubEnv('YOUTUBE_API_KEY', 'test-key');
    fetchMock.mockResolvedValueOnce(
      Response.json({
        items: [
          { id: 'blocked', snippet: { channelId: 'channel' }, status: { embeddable: false } },
          { id: 'allowed-without-status' },
        ],
        nextPageToken: 'next-page',
      }),
    );
    const page = await getPopularVideos({ regionCode: 'US' });
    expect(page.items.map((video) => video.id)).toEqual(['allowed-without-status']);
    expect(page.nextPageToken).toBe('next-page');
    const requestUrl = String(fetchMock.mock.calls[0][0]);
    expect(requestUrl).toContain('part=snippet%2CcontentDetails%2Cstatistics%2Cstatus');
    expect(requestUrl).toContain('regionCode=US');
  });
});
