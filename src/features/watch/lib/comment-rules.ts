/**
 * Vidlab 익명 댓글 입력 규칙 (기획서 CMT-03 기준)
 * 서버(이주혁, CMT-03)도 같은 규칙으로 검사하므로 바꿀 때는 서로 맞춰야 한다.
 */
export const COMMENT_RULES = {
  nickname: { min: 2, max: 12 },
  password: { min: 4, max: 20 },
  content: { min: 1, max: 500 },
} as const;

export type CommentInput = {
  nickname: string;
  password: string;
  content: string;
};

export type CommentErrors = Partial<Record<keyof CommentInput, string>>;

function outOfRange(length: number, { min, max }: { min: number; max: number }) {
  return length < min || length > max;
}

export function validateComment(input: CommentInput): CommentErrors {
  const errors: CommentErrors = {};
  const { nickname, password, content } = COMMENT_RULES;

  if (outOfRange(input.nickname.trim().length, nickname)) {
    errors.nickname = `닉네임은 ${nickname.min}~${nickname.max}자로 입력해 주세요.`;
  }
  // 비밀번호는 공백도 그대로 비밀번호로 취급하므로 trim하지 않는다
  if (outOfRange(input.password.length, password)) {
    errors.password = `비밀번호는 ${password.min}~${password.max}자로 입력해 주세요.`;
  }
  if (outOfRange(input.content.trim().length, content)) {
    errors.content = `댓글은 ${content.min}~${content.max}자로 입력해 주세요.`;
  }
  return errors;
}
