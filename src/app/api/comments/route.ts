// GET  /api/comments?videoId=…&cursor=… → CommentPage (최신순 20개, 다음 페이지는 nextCursor)
// POST /api/comments (JSON: videoId, nickname, password, content) → 201 CommentItem
// 결정 근거: https://github.com/lc-vidlab/vidlab-fe/issues/19

import type { NextRequest } from 'next/server';

import { createComment, listComments } from '@/lib/comments/service';

import { clientIp, readCreateCommentRequest, respond } from './_lib/http';

export function GET(request: NextRequest) {
  return respond(() => {
    const { searchParams } = request.nextUrl;
    const videoId = searchParams.get('videoId') ?? '';
    const cursor = searchParams.get('cursor') || undefined;
    return listComments(videoId, cursor);
  });
}

export function POST(request: NextRequest) {
  return respond(async () => {
    const body = await readCreateCommentRequest(request);
    return createComment(body, clientIp(request));
  }, 201);
}
