import 'server-only';

// /api/comments의 HTTP 처리: 요청 본문 · IP 읽기, 결과 · 에러를 JSON 응답으로 바꾸기.
// HTTP 형식만 다루고, 입력 규칙 검사는 service.ts가 한다.
// 결정 근거: https://github.com/lc-vidlab/vidlab-fe/issues/19

import { badRequest, toCommentApiError, CommentApiError } from '@/lib/comments/errors';
import type { CreateCommentRequest } from '@/lib/comments/types';

/** 요청을 처리하고 JSON으로 응답한다. 실패하면 CommentApiError 형식과 상태 코드로 응답한다 */
export async function respond(run: () => Promise<unknown>, status = 200): Promise<Response> {
  try {
    return Response.json(await run(), { status });
  } catch (err) {
    // 저장소 에러는 postgres.ts가 원인과 함께 이미 남긴다. 여기서는 예상하지 못한 에러(설정 누락 · 버그)만 남긴다
    if (!(err instanceof CommentApiError)) console.error('[api/comments] 예상하지 못한 에러', err);
    const apiError = toCommentApiError(err);
    return Response.json(apiError.toJSON(), { status: apiError.status });
  }
}

/**
 * 본문 최대 크기(문자 수). 정상 입력은 1KB 남짓이다 (내용 500자 + 닉네임 · 비밀번호).
 * 이모지 500자를 JSON 이스케이프(이모지 1자 = 12자)로 보내도 6000자 정도라 여유를 둔다.
 */
const MAX_BODY_LENGTH = 16_000;

function bodyTooLarge() {
  return badRequest('요청 본문이 너무 큽니다.');
}

const BODY_FIELDS = ['videoId', 'nickname', 'password', 'content'] as const;

function isCreateCommentRequest(body: unknown): body is CreateCommentRequest {
  if (typeof body !== 'object' || body === null) return false;
  const record = body as Record<string, unknown>;
  return BODY_FIELDS.every((field) => typeof record[field] === 'string');
}

/**
 * POST 본문을 읽는다. JSON이 아니면 BAD_REQUEST.
 *
 * Content-Type: application/json만 받는다. 다른 사이트의 폼 전송은 이 형식을 쓸 수 없고,
 * fetch로 보내려면 브라우저가 사전 확인(CORS preflight)을 해서 막힌다 (CSRF 방지).
 */
export async function readCreateCommentRequest(request: Request): Promise<CreateCommentRequest> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!/^application\/json\s*(;|$)/i.test(contentType)) {
    throw badRequest('Content-Type은 application/json이어야 합니다.');
  }

  // 큰 본문을 메모리에 다 올리기 전에 헤더로 먼저 거른다 (UTF-8 한 글자는 최대 4바이트)
  const declaredBytes = Number(request.headers.get('content-length'));
  if (declaredBytes > MAX_BODY_LENGTH * 4) throw bodyTooLarge();

  const text = await request.text();
  if (text.length > MAX_BODY_LENGTH) throw bodyTooLarge();

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw badRequest('요청 본문이 올바른 JSON이 아닙니다.');
  }
  if (!isCreateCommentRequest(body)) {
    throw badRequest(`요청 본문에 ${BODY_FIELDS.join(', ')} 문자열이 필요합니다.`);
  }
  const { videoId, nickname, password, content } = body;
  return { videoId, nickname, password, content };
}

/**
 * 작성자 IP. 배포 환경(Vercel)이 넣어 주는 x-forwarded-for의 첫 값(실제 접속 IP)을 쓴다.
 * 로컬 개발처럼 헤더가 없으면 'unknown' (모두 같은 IP로 취급).
 *
 * Vercel은 이 헤더를 직접 채우므로 사용자가 위조할 수 없다. Vercel 밖에 배포하거나 앞에 다른 프록시를 두면
 * 사용자가 보낸 값이 첫 값이 될 수 있으니, 횟수 제한(CMT-05)을 만들 때 그 환경에 맞게 다시 정한다.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || 'unknown';
}
