// 검색 전용 임시 fixture. SRV-04 /api/youtube/search가 생기면 삭제한다.
// 실제 YouTube 데이터가 아닌 가짜 데이터이며, 형태는 lib/youtube/types.ts의 Page<Video>를 따른다.
//
// 상태 확인용 검색어 (SRV-03 mock과 같은 이름):
//   __empty__ → 결과 없음, __quota__ → QUOTA_EXCEEDED, __error__ → UPSTREAM_ERROR
import type { Page, SearchVideosParams, Video } from '@/lib/youtube/types';
import { SearchError } from '../errors';

const PAGE_SIZE = 10;
const TOTAL = 30;

const CHANNELS = ['코딩하는 고양이', 'Daily Lo-fi', '여행 기록', '요리 연구소', 'Tech Notes'];
const DURATIONS_SEC = [205, 1122, 3725, 45, 543, 0];
const HOUR = 60 * 60 * 1000;
// 업로드 시점(몇 시간 전 ~ 몇 달 전). "오늘 · 이번 주 · 이번 달" 필터를 확인할 수 있게 고르게 섞는다.
const AGES_HOURS = [2, 30, 200, 900, 5, 120, 400, 2000, 12, 60];
// 페이지를 오가도 날짜가 바뀌지 않도록 모듈을 처음 불러온 시각을 기준으로 쓴다.
const BASE_TIME = Date.now();

function makeVideo(query: string, index: number): Video {
  const channelIndex = index % CHANNELS.length;
  return {
    id: `mock-${index}`,
    title: `${query} 관련 영상 #${index + 1} — 목업 데이터로 만든 제목이 길어지면 두 줄에서 말줄임 처리됩니다`,
    description: `"${query}" 검색 결과 예시 설명입니다. 실제 API가 연결되면 영상 설명 일부가 표시됩니다.`,
    thumbnailUrl: '',
    publishedAt: new Date(
      BASE_TIME - (AGES_HOURS[index % AGES_HOURS.length] + index) * HOUR,
    ).toISOString(),
    durationSec: DURATIONS_SEC[index % DURATIONS_SEC.length],
    viewCount: index % 7 === 6 ? 0 : Math.round(1234 * (((index * 7) % TOTAL) + 1) ** 2.3),
    categoryId: '10',
    embeddable: true,
    channel: {
      id: `channel-${channelIndex}`,
      title: CHANNELS[channelIndex],
      avatarUrl: '',
    },
  };
}

export async function getMockSearchPage({
  q,
  order = 'relevance',
  publishedAfter,
  pageToken,
}: SearchVideosParams): Promise<Page<Video>> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (q === '__quota__') throw new SearchError('QUOTA_EXCEEDED');
  if (q === '__error__') throw new SearchError('UPSTREAM_ERROR');
  if (q === '__empty__') return { items: [] };

  let videos = Array.from({ length: TOTAL }, (_, i) => makeVideo(q, i));
  if (publishedAfter) {
    const after = new Date(publishedAfter).getTime();
    videos = videos.filter((v) => new Date(v.publishedAt).getTime() >= after);
  }
  if (order === 'date') videos.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  if (order === 'viewCount') videos.sort((a, b) => b.viewCount - a.viewCount);

  const start = pageToken ? Number(pageToken.replace('offset-', '')) : 0;
  const end = start + PAGE_SIZE;
  return {
    items: videos.slice(start, end),
    nextPageToken: end < videos.length ? `offset-${end}` : undefined,
  };
}
