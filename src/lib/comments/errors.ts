import 'server-only';

// 댓글 API 에러. service · postgres · mock · Route Handler가 함께 쓴다.

import type { CommentApiErrorBody, CommentErrorCode, CommentFieldErrors } from './types';

import { COMMENT_DELETE_RULES } from './rules';

const HTTP_STATUS: Record<CommentErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 400,
  WRONG_PASSWORD: 403,
  NOT_FOUND: 404,
  TOO_MANY_ATTEMPTS: 429,
  SERVER_ERROR: 500,
};

const DEFAULT_MESSAGE: Record<CommentErrorCode, string> = {
  BAD_REQUEST: '잘못된 요청입니다.',
  VALIDATION_ERROR: '입력값을 확인해 주세요.',
  WRONG_PASSWORD: '비밀번호가 맞지 않아요.',
  NOT_FOUND: '이미 삭제됐거나 없는 댓글이에요.',
  TOO_MANY_ATTEMPTS: '잠시 후 다시 시도해 주세요.',
  SERVER_ERROR: '댓글을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
};

type CommentApiErrorOptions = {
  fields?: CommentFieldErrors;
  /** 429 응답의 Retry-After 헤더(초). 본문에는 싣지 않는다 */
  retryAfterSeconds?: number;
};

export class CommentApiError extends Error {
  readonly fields?: CommentFieldErrors;
  readonly retryAfterSeconds?: number;

  constructor(
    readonly code: CommentErrorCode,
    message: string = DEFAULT_MESSAGE[code],
    { fields, retryAfterSeconds }: CommentApiErrorOptions = {},
  ) {
    super(message);
    this.name = 'CommentApiError';
    this.fields = fields;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  /** Route Handler에서 응답 상태 코드로 쓴다 */
  get status(): number {
    return HTTP_STATUS[this.code];
  }

  toJSON(): CommentApiErrorBody {
    const { code, message, fields } = this;
    return { error: fields ? { code, message, fields } : { code, message } };
  }
}

export function badRequest(message: string): CommentApiError {
  return new CommentApiError('BAD_REQUEST', message);
}

export function validationError(fields?: CommentFieldErrors): CommentApiError {
  return new CommentApiError('VALIDATION_ERROR', undefined, { fields });
}

export function notFound(): CommentApiError {
  return new CommentApiError('NOT_FOUND');
}

/** @param remaining 잠기기 전까지 더 틀릴 수 있는 횟수 (1 이상) */
export function wrongPassword(remaining: number): CommentApiError {
  return new CommentApiError(
    'WRONG_PASSWORD',
    `비밀번호가 맞지 않아요. ${remaining}번 더 틀리면 ${COMMENT_DELETE_RULES.lockMinutes}분 동안 삭제할 수 없어요.`,
  );
}

/** @param retryAfterSeconds 잠금이 풀릴 때까지 남은 초 */
export function tooManyAttempts(retryAfterSeconds: number): CommentApiError {
  const seconds = Math.max(1, Math.ceil(retryAfterSeconds));
  const minutes = Math.ceil(seconds / 60);
  return new CommentApiError(
    'TOO_MANY_ATTEMPTS',
    `비밀번호를 여러 번 틀려서 삭제가 잠겼어요. ${minutes}분 뒤에 다시 시도해 주세요.`,
    { retryAfterSeconds: seconds },
  );
}

/** 어떤 에러든 응답으로 보낼 수 있는 CommentApiError로 바꾼다. 원인은 응답에 싣지 않는다 */
export function toCommentApiError(err: unknown): CommentApiError {
  return err instanceof CommentApiError ? err : new CommentApiError('SERVER_ERROR');
}
