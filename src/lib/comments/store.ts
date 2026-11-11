import 'server-only';

// 댓글 저장소 모양. postgres.ts(실제 DB)와 mock.ts(메모리)가 이 모양을 구현하고,
// service.ts는 이 모양에만 기대어 둘 중 하나를 고른다.
// 저장소는 저장 · 조회만 한다. 입력 검사 · 해시 · 페이지 계산은 service.ts가 한다.

import type { CommentItem } from './types';

/** 저장할 댓글. 검사 · 정규화 · 해시를 마친 값만 넣는다 */
export type NewCommentRecord = {
  videoId: string;
  nickname: string;
  content: string;
  passwordHash: string;
  ipHash: string;
};

/** 삭제 비밀번호 잠금 기준 (COMMENT_DELETE_RULES) */
export type DeleteLockRule = { maxAttempts: number; lockMinutes: number };

/**
 * 삭제 시도 예약 결과.
 * - ready: 시도 1회를 차지했다. attempts는 이번 시도를 포함한 횟수.
 *   이번 시도로 maxAttempts에 닿아 잠겼으면 lockedForSeconds에 잠금 시간(초), 아니면 null
 * - locked: 잠겨 있다. retryAfterSeconds 뒤에 풀린다
 * - not_found: 댓글이 없다
 */
export type DeleteAttempt =
  | { status: 'ready'; passwordHash: string; attempts: number; lockedForSeconds: number | null }
  | { status: 'locked'; retryAfterSeconds: number }
  | { status: 'not_found' };

export type CommentStore = {
  /** 영상의 댓글을 최신순(id 큰 순)으로 limit개. beforeId가 있으면 그보다 작은 id만 */
  findPage(videoId: string, options: { beforeId?: string; limit: number }): Promise<CommentItem[]>;
  /** 영상의 전체 댓글 수 */
  count(videoId: string): Promise<number>;
  /** 저장하고 저장된 댓글을 돌려준다 */
  insert(record: NewCommentRecord): Promise<CommentItem>;
  /**
   * 잠겨 있지 않으면 시도 횟수를 1 올리고 비밀번호 해시를 돌려준다.
   * 이번 시도로 maxAttempts에 닿으면 같은 순간에 lockMinutes분 잠근다. 잠금이 풀린 뒤에는 1부터 다시 센다.
   * 확인 · 증가 · 잠금을 한 번에 해서, 동시 요청이나 도중에 끊긴 요청으로 횟수를 넘기거나 갇히지 않는다.
   */
  reserveDeleteAttempt(id: string, rule: DeleteLockRule): Promise<DeleteAttempt>;
  /** 지우고, 지운 행이 있었는지 돌려준다 */
  remove(id: string): Promise<boolean>;
};
