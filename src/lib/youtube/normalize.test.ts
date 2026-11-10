import { describe, expect, it } from 'vitest';

import { parseDuration, pickThumbnail, toChannel, toVideo, toVideoCategory } from './normalize';
import type { Channel, YtVideo } from './types';

describe('parseDuration', () => {
  it.each([
    ['PT18M42S', 1122],
    ['PT1H2M3S', 3723],
    ['PT45S', 45],
    ['PT3M', 180],
    ['P1DT2H', 93600],
  ])('%s → %i초', (iso, seconds) => {
    expect(parseDuration(iso)).toBe(seconds);
  });

  it.each([['P0D'], [''], [undefined], ['18:42']])(
    '재생시간이 없거나 해석할 수 없으면 0 (%s)',
    (iso) => {
      expect(parseDuration(iso)).toBe(0);
    },
  );
});

describe('pickThumbnail', () => {
  it('가장 큰 썸네일을 고른다', () => {
    expect(pickThumbnail({ default: { url: 'd' }, high: { url: 'h' }, maxres: { url: 'm' } })).toBe(
      'm',
    );
    expect(pickThumbnail({ default: { url: 'd' }, medium: { url: 'md' } })).toBe('md');
  });

  it('썸네일이 없으면 빈 문자열', () => {
    expect(pickThumbnail(undefined)).toBe('');
    expect(pickThumbnail({})).toBe('');
  });
});

describe('toChannel', () => {
  it('구독자 수를 숫자로 바꾼다', () => {
    const channel = toChannel({
      id: 'c1',
      snippet: { title: '채널', thumbnails: { high: { url: 'avatar' } } },
      statistics: { subscriberCount: '1200', hiddenSubscriberCount: false },
    });
    expect(channel).toEqual({
      id: 'c1',
      title: '채널',
      avatarUrl: 'avatar',
      subscriberCount: 1200,
    });
  });

  it('구독자 수를 숨긴 채널은 subscriberCount가 없다', () => {
    const channel = toChannel({
      id: 'c2',
      statistics: { subscriberCount: '0', hiddenSubscriberCount: true },
    });
    expect(channel.subscriberCount).toBeUndefined();
  });
});

describe('toVideo', () => {
  const raw: YtVideo = {
    id: 'v1',
    snippet: {
      title: '제목',
      description: '설명',
      publishedAt: '2026-11-10T00:00:00Z',
      channelId: 'c1',
      channelTitle: '영상에 있는 채널 이름',
      categoryId: '10',
      thumbnails: { medium: { url: 'thumb' } },
    },
    contentDetails: { duration: 'PT3M' },
    statistics: { viewCount: '12345' },
    status: { embeddable: false },
  };

  it('원본 영상을 정규화하고 채널 정보를 붙인다', () => {
    const channel: Channel = { id: 'c1', title: '채널', avatarUrl: 'avatar', subscriberCount: 10 };
    expect(toVideo(raw, new Map([['c1', channel]]))).toEqual({
      id: 'v1',
      title: '제목',
      description: '설명',
      thumbnailUrl: 'thumb',
      publishedAt: '2026-11-10T00:00:00Z',
      durationSec: 180,
      viewCount: 12345,
      categoryId: '10',
      embeddable: false,
      channel,
    });
  });

  it('채널 정보가 없으면 영상에 있는 채널 이름만 채운다', () => {
    expect(toVideo(raw, new Map()).channel).toEqual({
      id: 'c1',
      title: '영상에 있는 채널 이름',
      avatarUrl: '',
    });
  });

  it('조회수를 숨긴 영상은 0, status가 없으면 임베드 가능으로 본다', () => {
    const video = toVideo({ ...raw, statistics: {}, status: undefined }, new Map());
    expect(video.viewCount).toBe(0);
    expect(video.embeddable).toBe(true);
  });
});

describe('toVideoCategory', () => {
  it('id와 이름만 남긴다', () => {
    expect(toVideoCategory({ id: '10', snippet: { title: '음악', assignable: true } })).toEqual({
      id: '10',
      title: '음악',
    });
  });
});
