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

export type CommentStore = {
  /** 영상의 댓글을 최신순(id 큰 순)으로 limit개. beforeId가 있으면 그보다 작은 id만 */
  findPage(videoId: string, options: { beforeId?: string; limit: number }): Promise<CommentItem[]>;
  /** 영상의 전체 댓글 수 */
  count(videoId: string): Promise<number>;
  /** 저장하고 저장된 댓글을 돌려준다 */
  insert(record: NewCommentRecord): Promise<CommentItem>;
};
