// 검색 전용 임시 fixture. 이주혁 SRV-03 mock과 /api/youtube/search가 생기면 삭제한다.
// 실제 YouTube 데이터가 아닌 가짜 데이터다.
//
// 상태 확인용 검색어:
//   __empty → 결과 없음, __quota → 할당량 초과, __error → 일반 오류
import { SearchError, type SearchPage, type SearchVideo } from '../types';

const PAGE_SIZE = 10;
const TOTAL_PAGES = 3;

const CHANNELS = ['코딩하는 고양이', 'Daily Lo-fi', '여행 기록', '요리 연구소', 'Tech Notes'];
const DURATIONS = ['PT3M25S', 'PT18M42S', 'PT1H2M5S', 'PT45S', 'PT9M3S', null];
const DAY = 24 * 60 * 60 * 1000;
// 렌더마다 날짜가 바뀌지 않도록 고정 기준 시각을 쓴다.
const BASE_TIME = Date.UTC(2026, 10, 10);

function makeVideo(query: string, index: number): SearchVideo {
  const channel = CHANNELS[index % CHANNELS.length];
  return {
    id: `mock-${index}`,
    title: `${query} 관련 영상 #${index + 1} — 목업 데이터로 만든 제목이 길어지면 두 줄에서 말줄임 처리됩니다`,
    description: `"${query}" 검색 결과 예시 설명입니다. 실제 API가 연결되면 영상 설명 일부가 표시됩니다.`,
    channelId: `channel-${index % CHANNELS.length}`,
    channelTitle: channel,
    publishedAt: new Date(BASE_TIME - (index * 3 + 1) * DAY).toISOString(),
    thumbnailUrl: null,
    duration: DURATIONS[index % DURATIONS.length],
    viewCount: index % 7 === 6 ? null : Math.round(1234 * (index + 1) ** 2.3),
  };
}

export async function getMockSearchPage(query: string, pageToken?: string): Promise<SearchPage> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (query === '__quota') throw new SearchError('quotaExceeded');
  if (query === '__error') throw new SearchError('unknown');
  if (query === '__empty') return { items: [], nextPageToken: null };

  const page = pageToken ? Number(pageToken.replace('page-', '')) : 0;
  const start = page * PAGE_SIZE;
  return {
    items: Array.from({ length: PAGE_SIZE }, (_, i) => makeVideo(query, start + i)),
    nextPageToken: page + 1 < TOTAL_PAGES ? `page-${page + 1}` : null,
  };
}
