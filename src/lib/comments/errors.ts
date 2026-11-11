import 'server-only';

// 댓글 API 에러. service · postgres · mock · Route Handler가 함께 쓴다.

import type { CommentApiErrorBody, CommentErrorCode, CommentFieldErrors } from './types';

const HTTP_STATUS: Record<CommentErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 400,
  SERVER_ERROR: 500,
};

const DEFAULT_MESSAGE: Record<CommentErrorCode, string> = {
  BAD_REQUEST: '잘못된 요청입니다.',
  VALIDATION_ERROR: '입력값을 확인해 주세요.',
  SERVER_ERROR: '댓글을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
};

export class CommentApiError extends Error {
  constructor(
    readonly code: CommentErrorCode,
    message: string = DEFAULT_MESSAGE[code],
    readonly fields?: CommentFieldErrors,
  ) {
    super(message);
    this.name = 'CommentApiError';
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
  return new CommentApiError('VALIDATION_ERROR', undefined, fields);
}

/** 어떤 에러든 응답으로 보낼 수 있는 CommentApiError로 바꾼다. 원인은 응답에 싣지 않는다 */
export function toCommentApiError(err: unknown): CommentApiError {
  return err instanceof CommentApiError ? err : new CommentApiError('SERVER_ERROR');
}
