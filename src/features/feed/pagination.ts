import type { FeedPageData, FeedVideo } from './types';

export function nextFeedPageToken(lastPage: FeedPageData, pages: FeedPageData[]) {
  const token = lastPage.nextPageToken;
  if (!token || pages.slice(0, -1).some((page) => page.nextPageToken === token)) return undefined;
  return token;
}

export function uniqueFeedVideos(pages: FeedPageData[]): FeedVideo[] {
  const unique = new Map(pages.flatMap((page) => page.items).map((video) => [video.id, video]));
  return [...unique.values()];
}
