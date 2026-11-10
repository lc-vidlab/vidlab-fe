// 검색 전용 임시 fixture. SRV-03 mock(#4)과 SRV-04 /api/youtube/search가 생기면 삭제한다.
// 실제 YouTube 데이터가 아닌 가짜 데이터이며, 형태는 lib/youtube/types.ts의 Page<Video>를 따른다.
//
// 상태 확인용 검색어 (SRV-03 mock과 같은 이름):
//   __empty__ → 결과 없음, __quota__ → QUOTA_EXCEEDED, __error__ → UPSTREAM_ERROR
import type { Page, Video } from '@/lib/youtube/types';
import { SearchError } from '../errors';

const PAGE_SIZE = 10;
const TOTAL_PAGES = 3;

const CHANNELS = ['코딩하는 고양이', 'Daily Lo-fi', '여행 기록', '요리 연구소', 'Tech Notes'];
const DURATIONS_SEC = [205, 1122, 3725, 45, 543, 0];
const DAY = 24 * 60 * 60 * 1000;
// 렌더마다 날짜가 바뀌지 않도록 고정 기준 시각을 쓴다.
const BASE_TIME = Date.UTC(2026, 10, 10);

function makeVideo(query: string, index: number): Video {
  const channelIndex = index % CHANNELS.length;
  return {
    id: `mock-${index}`,
    title: `${query} 관련 영상 #${index + 1} — 목업 데이터로 만든 제목이 길어지면 두 줄에서 말줄임 처리됩니다`,
    description: `"${query}" 검색 결과 예시 설명입니다. 실제 API가 연결되면 영상 설명 일부가 표시됩니다.`,
    thumbnailUrl: '',
    publishedAt: new Date(BASE_TIME - (index * 3 + 1) * DAY).toISOString(),
    durationSec: DURATIONS_SEC[index % DURATIONS_SEC.length],
    viewCount: index % 7 === 6 ? 0 : Math.round(1234 * (index + 1) ** 2.3),
    categoryId: '10',
    embeddable: true,
    channel: {
      id: `channel-${channelIndex}`,
      title: CHANNELS[channelIndex],
      avatarUrl: '',
    },
  };
}

export async function getMockSearchPage(query: string, pageToken?: string): Promise<Page<Video>> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (query === '__quota__') throw new SearchError('QUOTA_EXCEEDED');
  if (query === '__error__') throw new SearchError('UPSTREAM_ERROR');
  if (query === '__empty__') return { items: [] };

  const page = pageToken ? Number(pageToken.replace('page-', '')) : 0;
  const start = page * PAGE_SIZE;
  return {
    items: Array.from({ length: PAGE_SIZE }, (_, i) => makeVideo(query, start + i)),
    nextPageToken: page + 1 < TOTAL_PAGES ? `page-${page + 1}` : undefined,
  };
}
