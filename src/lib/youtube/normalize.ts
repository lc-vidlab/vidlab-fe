// YouTube 원본 응답을 정규화 타입으로 바꾸는 순수 함수.
// 서버 전용 코드(API 키, fetch)가 없어서 mock fixture나 테스트에서도 그대로 쓸 수 있다.

import type {
  Channel,
  Video,
  VideoCategory,
  YtChannel,
  YtThumbnails,
  YtVideo,
  YtVideoCategory,
} from './types';

/** ISO 8601 기간(PT1H2M3S, P1DT2H 등)을 초로 바꾼다. 해석할 수 없으면 0 */
export function parseDuration(iso: string | undefined): number {
  if (!iso) return 0;
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso);
  if (!m) return 0;
  const [, d = '0', h = '0', min = '0', s = '0'] = m;
  return Number(d) * 86400 + Number(h) * 3600 + Number(min) * 60 + Number(s);
}

/** 가장 큰 썸네일을 고른다 */
export function pickThumbnail(thumbnails: YtThumbnails | undefined): string {
  if (!thumbnails) return '';
  const best =
    thumbnails.maxres ??
    thumbnails.standard ??
    thumbnails.high ??
    thumbnails.medium ??
    thumbnails.default;
  return best?.url ?? '';
}

function toNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function toChannel(raw: YtChannel): Channel {
  const hidden = raw.statistics?.hiddenSubscriberCount === true;
  return {
    id: raw.id,
    title: raw.snippet?.title ?? '',
    avatarUrl: pickThumbnail(raw.snippet?.thumbnails),
    subscriberCount: hidden ? undefined : toNumber(raw.statistics?.subscriberCount),
  };
}

/**
 * 원본 영상을 정규화한다.
 * channels에 해당 채널이 없으면 영상에 있는 채널 이름만 채운다.
 */
export function toVideo(raw: YtVideo, channels: Map<string, Channel>): Video {
  const snippet = raw.snippet;
  const channelId = snippet?.channelId ?? '';
  return {
    id: raw.id,
    title: snippet?.title ?? '',
    description: snippet?.description ?? '',
    thumbnailUrl: pickThumbnail(snippet?.thumbnails),
    publishedAt: snippet?.publishedAt ?? '',
    durationSec: parseDuration(raw.contentDetails?.duration),
    viewCount: toNumber(raw.statistics?.viewCount) ?? 0,
    categoryId: snippet?.categoryId ?? '',
    // 다른 필드와 달리 "없으면 가능"으로 둔다. 대부분의 영상은 임베드가 가능하고,
    // false로 두면 status 정보가 빠졌을 때 모든 영상이 재생 불가로 표시되기 때문이다.
    embeddable: raw.status?.embeddable ?? true,
    channel: channels.get(channelId) ?? {
      id: channelId,
      title: snippet?.channelTitle ?? '',
      avatarUrl: '',
    },
  };
}

export function toVideoCategory(raw: YtVideoCategory): VideoCategory {
  return { id: raw.id, title: raw.snippet?.title ?? '' };
}
