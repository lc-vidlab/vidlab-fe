// GET /api/youtube/related?categoryId=&excludeId=&maxResults= → Video[] (관련 영상)
// 상세 화면이 이미 아는 categoryId를 받아, 영상을 다시 조회하지 않는다 (#11 결정 2)

import type { NextRequest } from 'next/server';

import { getRelatedVideos } from '@/lib/youtube/service';

import { queryParams, respond } from '../_lib/handler';

export function GET(request: NextRequest) {
  return respond(() => {
    const params = queryParams(request.nextUrl.searchParams);
    return getRelatedVideos({
      categoryId: params.required('categoryId'),
      excludeId: params.optional('excludeId'),
      maxResults: params.maxResults(),
    });
  });
}
