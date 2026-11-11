import 'server-only';

// 익명 댓글 서비스의 진입점. Route Handler는 여기서만 import한다.
// (eslint no-restricted-imports 규칙이 postgres.ts · mock.ts 직접 import를 막는다)
// 호출할 때마다 COMMENTS_USE_MOCK을 보고 실제 DB(postgres.ts) 또는 메모리(mock.ts) 저장소를 고른다.
//
// 결정 근거: https://github.com/lc-vidlab/vidlab-fe/issues/19

import { isVideoId } from '@/lib/youtube/video-id';

import { ipHashSalt, isCommentsMockMode } from './config';
import { badRequest, notFound, tooManyAttempts, validationError, wrongPassword } from './errors';
import { hashIp, hashPassword, verifyPassword } from './hash';
import { mockStore } from './mock';
import { postgresStore } from './postgres';
import {
  COMMENT_DELETE_RULES,
  COMMENT_PAGE_SIZE,
  validateCommentInput,
  validateDeletePassword,
} from './rules';
import type { CommentStore } from './store';
import type { CommentItem, CommentPage, CreateCommentRequest, DeleteCommentRequest } from './types';

function store(): CommentStore {
  return isCommentsMockMode() ? mockStore : postgresStore;
}

/** DB bigint 최댓값. 이보다 큰 숫자를 넘기면 DB가 범위 오류를 낸다 */
const BIGINT_MAX = '9223372036854775807';
const COMMENT_ID_PATTERN = /^\d{1,19}$/;

/** 댓글 id(커서 포함)가 DB bigint 범위의 양의 정수인지. 숫자가 아니면 DB가 형식 오류(22P02)를 낸다 */
function isCommentId(id: string): boolean {
  if (!COMMENT_ID_PATTERN.test(id)) return false;
  // 같은 자릿수끼리는 문자열 비교가 숫자 비교와 같다
  return id.length < BIGINT_MAX.length || id <= BIGINT_MAX;
}

function requireVideoId(videoId: string): void {
  if (!isVideoId(videoId)) throw badRequest('영상 id 형식이 아닙니다.');
}

/**
 * 영상의 댓글 목록 (최신순, 한 페이지 20개).
 * cursor는 앞 페이지 응답의 nextCursor. 없으면 첫 페이지.
 */
export async function listComments(videoId: string, cursor?: string): Promise<CommentPage> {
  requireVideoId(videoId);
  if (cursor !== undefined && !isCommentId(cursor)) throw badRequest('잘못된 커서입니다.');

  // 한 개 더 읽어서 다음 페이지가 있는지 판단한다
  const comments = store();
  const [rows, total] = await Promise.all([
    comments.findPage(videoId, { beforeId: cursor, limit: COMMENT_PAGE_SIZE + 1 }),
    comments.count(videoId),
  ]);
  const items = rows.slice(0, COMMENT_PAGE_SIZE);
  const hasNext = rows.length > COMMENT_PAGE_SIZE;

  return hasNext ? { items, nextCursor: items[items.length - 1].id, total } : { items, total };
}

/**
 * 댓글을 검사 · 정규화하고 비밀번호 · IP를 해시해 저장한다.
 * @param ip 작성자 IP. 해시만 저장한다
 */
export async function createComment(
  request: CreateCommentRequest,
  ip: string,
): Promise<CommentItem> {
  requireVideoId(request.videoId);
  const result = validateCommentInput(request);
  if (!result.ok) throw validationError(result.errors);

  const { nickname, password, content } = result.value;
  // 키 설정이 빠졌으면 느린 bcrypt 전에 실패한다
  const ipHash = hashIp(ip, ipHashSalt());
  return store().insert({
    videoId: request.videoId,
    nickname,
    content,
    passwordHash: await hashPassword(password),
    ipHash,
  });
}

/**
 * 비밀번호가 맞으면 댓글을 지운다. 틀리면 남은 횟수를 알려 주고,
 * maxAttempts번 틀리면 lockMinutes분 동안 그 댓글의 삭제를 잠근다 (#21).
 */
export async function deleteComment(id: string, request: DeleteCommentRequest): Promise<void> {
  if (!isCommentId(id)) throw badRequest('잘못된 댓글 id입니다.');
  // 저장할 때 통과한 규칙에 안 맞으면 맞을 수 없는 비밀번호라 횟수에 넣지 않는다
  const password = validateDeletePassword(request.password);
  if (!password.ok) throw validationError({ password: password.error });

  const comments = store();
  // 비교하기 전에 시도 1회를 먼저 차지한다. 동시 요청으로 횟수 제한을 넘지 못하게 한다
  const attempt = await comments.reserveDeleteAttempt(id, COMMENT_DELETE_RULES);
  if (attempt.status === 'not_found') throw notFound();
  if (attempt.status === 'locked') throw tooManyAttempts(attempt.retryAfterSeconds);

  if (await verifyPassword(password.value, attempt.passwordHash)) {
    // 그사이 다른 요청이 먼저 지웠으면 없는 댓글
    if (!(await comments.remove(id))) throw notFound();
    return;
  }
  // 이번 시도로 잠겼으면 429, 아니면 남은 횟수와 함께 403
  if (attempt.lockedForSeconds !== null) throw tooManyAttempts(attempt.lockedForSeconds);
  throw wrongPassword(COMMENT_DELETE_RULES.maxAttempts - attempt.attempts);
}
