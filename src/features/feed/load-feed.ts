import 'server-only';

import { cacheLife } from 'next/cache';
import { getPopularVideos, getVideoCategories } from '@/lib/youtube/service';
import { formatDuration, formatRelativeTime, formatViewCount } from '@/features/search/lib/format';
import type { FeedPageData } from './types';
import type { Video, VideoCategory } from '@/lib/youtube/types';

export function toFeedVideo(video: Video, categories: VideoCategory[]) {
  const categoryNames = new Map(categories.map((category) => [category.id, category.title]));
  return {
    id: video.id,
    title: video.title,
    category: categoryNames.get(video.categoryId) ?? '기타',
    duration: formatDuration(video.durationSec) ?? '',
    views: (formatViewCount(video.viewCount) ?? '').replace(/^조회수 /, '').replace(/회$/, ''),
    uploaded: video.publishedAt ? formatRelativeTime(video.publishedAt) : '',
    thumbnailUrl: video.thumbnailUrl,
    channelTitle: video.channel.title,
    avatarUrl: video.channel.avatarUrl,
  };
}

// 모드를 캐시 키에 포함해 mock 응답이 실제 데이터로 재사용되지 않도록 한다.
export async function loadFeedPage({
  mock,
  regionCode,
  categoryId,
  pageToken,
}: {
  mock: boolean;
  regionCode: string;
  categoryId?: string;
  pageToken?: string;
}): Promise<FeedPageData> {
  'use cache';
  cacheLife({ stale: 60, revalidate: 300, expire: 3600 });
  // USE_MOCK 변경 전후 응답이 같은 캐시 항목을 공유하지 않도록 인자를 캐시 키에 포함한다.
  void mock;

  const [page, categories] = await Promise.all([
    getPopularVideos({ maxResults: 24, regionCode, categoryId, pageToken }),
    getVideoCategories(),
  ]);
  return {
    items: page.items.map((video) => toFeedVideo(video, categories)),
    nextPageToken: page.nextPageToken,
    categories,
  };
}
