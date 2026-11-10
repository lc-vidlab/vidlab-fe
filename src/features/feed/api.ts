import type { ApiError } from '@/lib/youtube/types';
import type { FeedPageData } from './types';

export class FeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeedError';
  }
}

export async function fetchFeedPage({
  regionCode,
  categoryId,
  pageToken,
}: {
  regionCode: string;
  categoryId?: string;
  pageToken?: string;
}): Promise<FeedPageData> {
  const params = new URLSearchParams({ regionCode });
  if (categoryId) params.set('categoryId', categoryId);
  if (pageToken) params.set('pageToken', pageToken);

  const response = await fetch(`/api/youtube/popular?${params}`);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiError | null;
    throw new FeedError(body?.error.message ?? '인기 영상을 불러오지 못했습니다.');
  }
  return (await response.json()) as FeedPageData;
}
