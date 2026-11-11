// 익명 댓글 API 타입. 화면(클라이언트 컴포넌트 포함)에서도 import한다. 서버 전용 코드를 넣지 않는다.
// 결정 근거: https://github.com/lc-vidlab/vidlab-fe/issues/19

/** 화면에 보여 주는 댓글. 비밀번호 해시 · IP 해시는 담지 않는다 */
export type CommentItem = {
  /** DB bigint라 문자열 (숫자로 바꾸지 않는다) */
  id: string;
  nickname: string;
  /** 줄바꿈(\n)이 들어 있을 수 있다 */
  content: string;
  /** ISO 8601 (예: 2026-11-10T09:00:00.000Z) */
  createdAt: string;
};

/** GET /api/comments 응답. nextCursor가 없으면 마지막 페이지 */
export type CommentPage = {
  items: CommentItem[];
  nextCursor?: string;
  /** 이 영상의 전체 댓글 수 */
  total: number;
};

/** 작성 폼 입력 */
export type CommentInput = {
  nickname: string;
  password: string;
  content: string;
};

/** POST /api/comments 요청 본문 */
export type CreateCommentRequest = CommentInput & { videoId: string };

/** DELETE /api/comments/{id} 요청 본문 */
export type DeleteCommentRequest = { password: string };

export type CommentField = keyof CommentInput;

/** 칸별 에러 메시지 */
export type CommentFieldErrors = Partial<Record<CommentField, string>>;

/**
 * - BAD_REQUEST(400): 영상 id · 댓글 id · 커서 · 요청 형식이 잘못됨
 * - VALIDATION_ERROR(400): 입력값이 규칙에 맞지 않음. fields에 칸별 메시지
 * - WRONG_PASSWORD(403): 삭제 비밀번호가 틀림. message에 남은 횟수
 * - NOT_FOUND(404): 없는 댓글 (이미 지운 댓글 포함)
 * - TOO_MANY_ATTEMPTS(429): 비밀번호를 여러 번 틀려 삭제가 잠김. message에 기다릴 시간, Retry-After 헤더(초)
 * - SERVER_ERROR(500): DB 오류 등
 */
export type CommentErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'WRONG_PASSWORD'
  | 'NOT_FOUND'
  | 'TOO_MANY_ATTEMPTS'
  | 'SERVER_ERROR';

/** 실패 응답 */
export type CommentApiErrorBody = {
  error: {
    code: CommentErrorCode;
    message: string;
    fields?: CommentFieldErrors;
  };
};
