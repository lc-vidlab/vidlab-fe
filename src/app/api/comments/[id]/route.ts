// DELETE /api/comments/{id} (JSON: password) → 204
// 비밀번호를 5번 틀리면 그 댓글의 삭제가 15분 동안 잠긴다 (429)
// 결정 근거: https://github.com/lc-vidlab/vidlab-fe/issues/21

import type { NextRequest } from 'next/server';

import { deleteComment } from '@/lib/comments/service';

import { readDeleteCommentRequest, respond } from '../_lib/http';

export function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return respond(async () => {
    const { id } = await params;
    const body = await readDeleteCommentRequest(request);
    await deleteComment(id, body);
  }, 204);
}
