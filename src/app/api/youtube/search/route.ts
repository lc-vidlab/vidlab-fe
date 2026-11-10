// GET /api/youtube/search?q=&order=&publishedAfter=&pageToken=&maxResults= → Page<Video> (검색)
// search.list는 하루 100회 한도. 클라이언트는 입력 중이 아니라 제출할 때만 호출한다.

import type { NextRequest } from 'next/server';

import { searchVideos } from '@/lib/youtube/service';
import type { SearchOrder } from '@/lib/youtube/types';

import { queryParams, respond } from '../_lib/handler';

const ORDERS = ['relevance', 'date', 'viewCount'] as const satisfies readonly SearchOrder[];

export function GET(request: NextRequest) {
  return respond(() => {
    const params = queryParams(request.nextUrl.searchParams);
    return searchVideos({
      // 빈 검색어 검사는 서비스(requireQuery)에서 한다
      q: params.optional('q') ?? '',
      order: params.oneOf('order', ORDERS),
      publishedAfter: params.dateTime('publishedAfter'),
      pageToken: params.pageToken(),
      maxResults: params.maxResults(),
    });
  });
}
