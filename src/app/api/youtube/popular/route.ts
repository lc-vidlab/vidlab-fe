// GET /api/youtube/popular?categoryId=&pageToken=&maxResults= → Page<Video> (홈 피드)
// 인기 차트가 없는 카테고리(19, 27)는 404 NOT_FOUND

import type { NextRequest } from 'next/server';

import { getPopularVideos } from '@/lib/youtube/service';

import { queryParams, respond } from '../_lib/handler';

export function GET(request: NextRequest) {
  return respond(() => {
    const params = queryParams(request.nextUrl.searchParams);
    return getPopularVideos({
      categoryId: params.optional('categoryId'),
      pageToken: params.optional('pageToken'),
      maxResults: params.maxResults(),
    });
  });
}
