/** 피드 카드 표시용 모델. API 응답과 목업 모두 이 형태로 전달한다. */
export type FeedVideo = {
  id: string;
  title: string;
  category: string;
  duration: string;
  views: string;
  uploaded: string;
  thumbnailUrl?: string;
  channelTitle?: string;
  avatarUrl?: string;
};

export type FeedCategory = { id: string; title: string };

export type FeedPageData = {
  items: FeedVideo[];
  nextPageToken?: string;
  categories: FeedCategory[];
};
