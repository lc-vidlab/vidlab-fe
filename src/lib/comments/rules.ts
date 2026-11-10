// 익명 댓글 입력 규칙 · 검사. 서버(service.ts)와 화면(작성 폼)이 같이 쓴다.
// 서버 전용 코드를 넣지 않는다 (클라이언트 컴포넌트에서도 import).
//
// 결정 근거: https://github.com/lc-vidlab/vidlab-fe/issues/19
//
// 검사 순서: NFC 정규화 → 앞뒤 공백 제거 → 쓸 수 없는 문자 거부 → 글자 수
// - 글자 수는 [...s].length(유니코드 문자 단위)로 센다. DB의 char_length와 같은 기준이다.
//   (str.length는 이모지를 2자로 센다. 맥에서 입력한 한글은 NFD로 와서 자모 단위로 세어진다)
// - DB CHECK(src/lib/db/schema.sql)는 최소 안전망이라 보이지 않는 문자를 막지 못한다. 여기서 막는다.

import type { CommentFieldErrors, CommentInput } from './types';

export const COMMENT_RULES = {
  nickname: { min: 2, max: 12 },
  password: { min: 4, max: 20 },
  content: { min: 1, max: 500 },
} as const;

/** 한 페이지 댓글 수 */
export const COMMENT_PAGE_SIZE = 20;

/** bcrypt는 72바이트 뒤를 버린다. 이보다 길면 뒷부분이 달라도 같은 비밀번호로 취급된다 */
const PASSWORD_MAX_BYTES = 72;

// 문자 종류 (유니코드 속성)
// - Cc: 제어 문자 (NUL · 탭 · 줄바꿈 등)
// - Cf: 서식 문자 (제로폭 공백 U+200B, 방향 바꾸기 U+202E 등). 화면에 안 보이거나 글을 뒤집는다
// - Cs: 짝이 없는 서로게이트. 올바른 UTF-8이 아니라 DB에 저장할 수 없다
// - 한글 채움 문자 (U+115F, U+1160, U+3164, U+FFA0): 공백처럼 보이지만 공백으로 취급되지 않는다

/** 닉네임: 제어 · 서식 문자와 한글 채움 문자를 모두 거부 */
const NICKNAME_FORBIDDEN = /[\p{Cc}\p{Cf}\p{Cs}ᅟᅠㅤﾠ]/u;

/**
 * 내용: 줄바꿈(\n) · 탭(\t)과 ZWJ(U+200D, 가족 이모지처럼 이모지 여러 개를 한 글자로 잇는 문자)는 허용.
 * 그 밖의 제어 · 서식 문자는 거부한다.
 */
const CONTENT_FORBIDDEN = /(?![\t\n\u200D])[\p{Cc}\p{Cf}\p{Cs}]/u;

/** 보이는 글자: 공백 · 서식 문자 · 한글 채움 문자가 아닌 것. 내용에 하나는 있어야 한다 */
const VISIBLE_CHAR = /[^\s\p{Cf}ᅟᅠㅤﾠ]/u;

/** 비밀번호: 제어 문자 · 짝 없는 서로게이트 거부. 공백 · 서식 문자는 그대로 비밀번호로 취급 */
const PASSWORD_FORBIDDEN = /[\p{Cc}\p{Cs}]/u;

/** 유니코드 문자 단위 글자 수 (이모지 1개 = 1자) */
export function countChars(text: string): number {
  return [...text].length;
}

function outOfRange(length: number, { min, max }: { readonly min: number; readonly max: number }) {
  return length < min || length > max;
}

function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** 닉네임 정규화: NFC → 앞뒤 공백 제거 */
function normalizeNickname(nickname: string): string {
  return nickname.normalize('NFC').trim();
}

/** 내용 정규화: NFC → 줄바꿈을 \n으로 통일 → 앞뒤 공백 제거 */
function normalizeContent(content: string): string {
  return content.normalize('NFC').replace(/\r\n?/g, '\n').trim();
}

/**
 * 비밀번호 정규화: NFC만. 앞뒤 공백도 비밀번호의 일부라 지우지 않는다.
 * 맥(NFD) · 윈도(NFC)에서 같은 한글 비밀번호를 입력해도 같게 해시되도록 NFC로 맞춘다.
 */
function normalizePassword(password: string): string {
  return password.normalize('NFC');
}

function nicknameError(nickname: string): string | undefined {
  const { min, max } = COMMENT_RULES.nickname;
  if (NICKNAME_FORBIDDEN.test(nickname)) return '닉네임에 쓸 수 없는 문자가 있어요.';
  if (outOfRange(countChars(nickname), COMMENT_RULES.nickname)) {
    return `닉네임은 ${min}~${max}자로 입력해 주세요.`;
  }
  return undefined;
}

function passwordError(password: string): string | undefined {
  const { min, max } = COMMENT_RULES.password;
  if (PASSWORD_FORBIDDEN.test(password)) return '비밀번호에 쓸 수 없는 문자가 있어요.';
  if (outOfRange(countChars(password), COMMENT_RULES.password)) {
    return `비밀번호는 ${min}~${max}자로 입력해 주세요.`;
  }
  // 이모지만 20자처럼 아주 드문 경우
  if (utf8Bytes(password) > PASSWORD_MAX_BYTES) return '비밀번호가 너무 길어요.';
  return undefined;
}

function contentError(content: string): string | undefined {
  const { min, max } = COMMENT_RULES.content;
  if (CONTENT_FORBIDDEN.test(content)) return '댓글에 쓸 수 없는 문자가 있어요.';
  if (!VISIBLE_CHAR.test(content) || outOfRange(countChars(content), COMMENT_RULES.content)) {
    return `댓글은 ${min}~${max}자로 입력해 주세요.`;
  }
  return undefined;
}

export type CommentValidationResult =
  { ok: true; value: CommentInput } | { ok: false; errors: CommentFieldErrors };

/**
 * 댓글 입력을 정규화하고 검사한다.
 * 통과하면 정규화된 값(저장할 값)을, 아니면 칸별 메시지를 돌려준다.
 */
export function validateCommentInput(input: CommentInput): CommentValidationResult {
  const value: CommentInput = {
    nickname: normalizeNickname(input.nickname),
    password: normalizePassword(input.password),
    content: normalizeContent(input.content),
  };

  const errors: CommentFieldErrors = {};
  const nickname = nicknameError(value.nickname);
  const password = passwordError(value.password);
  const content = contentError(value.content);
  if (nickname) errors.nickname = nickname;
  if (password) errors.password = password;
  if (content) errors.content = content;

  return Object.keys(errors).length === 0 ? { ok: true, value } : { ok: false, errors };
}
