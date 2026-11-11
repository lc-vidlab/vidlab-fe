// 상세 페이지의 Vidlab 댓글 요청. 화면의 댓글 데이터 출처는 이 파일뿐이다.
// /api/comments(이주혁, CMT-02~04)를 부른다. COMMENTS_USE_MOCK에 따라 서버가 mock 또는 실제 DB를 쓴다.

import type {
  CommentApiErrorBody,
  CommentErrorCode,
  CommentFieldErrors,
  CommentItem,
  CommentPage,
  CreateCommentRequest,
} from '@/lib/comments/types';

const ENDPOINT = '/api/comments';

const FALLBACK_MESSAGE = '댓글을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.';

/** 댓글 API 실패. message는 서버가 준 사용자용 문구라 그대로 보여 줘도 된다 */
export class CommentRequestError extends Error {
  constructor(
    readonly code: CommentErrorCode,
    message: string = FALLBACK_MESSAGE,
    readonly fields?: CommentFieldErrors,
  ) {
    super(message);
    this.name = 'CommentRequestError';
  }
}

async function toRequestError(res: Response): Promise<CommentRequestError> {
  try {
    const body = (await res.json()) as Partial<CommentApiErrorBody>;
    const error = body.error;
    if (error?.code) return new CommentRequestError(error.code, error.message, error.fields);
  } catch {
    // 본문이 JSON이 아니면 아래 기본 에러
  }
  return new CommentRequestError('SERVER_ERROR');
}

async function send(input: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (err) {
    // 영상을 바꿔 이전 요청이 취소된 경우는 TanStack Query가 처리하도록 그대로 던진다
    if (init?.signal?.aborted) throw err;
    throw new CommentRequestError('SERVER_ERROR', '네트워크 연결을 확인해 주세요.');
  }
  if (!res.ok) throw await toRequestError(res);
  return res;
}

/** 최신순 한 페이지. cursor가 없으면 첫 페이지 */
export async function fetchComments(
  videoId: string,
  cursor?: string,
  signal?: AbortSignal,
): Promise<CommentPage> {
  const query = new URLSearchParams({ videoId });
  if (cursor) query.set('cursor', cursor);
  const res = await send(`${ENDPOINT}?${query.toString()}`, { signal });
  return (await res.json()) as CommentPage;
}

export async function createComment(request: CreateCommentRequest): Promise<CommentItem> {
  const res = await send(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return (await res.json()) as CommentItem;
}

export async function deleteComment(id: string, password: string): Promise<void> {
  await send(`${ENDPOINT}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
}
