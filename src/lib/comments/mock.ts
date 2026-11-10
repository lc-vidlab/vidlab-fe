import 'server-only';

// 댓글 저장소의 mock 구현 (COMMENTS_USE_MOCK 모드). 메모리에만 저장해 서버를 다시 켜면 처음 상태로 돌아간다.
// postgres.ts와 같은 동작(최신순, id 커서)을 흉내 낸다. 직접 import하지 말고 service.ts를 쓴다.

import { mockDelay } from '@/lib/mock-delay';
import {
  MOCK_COMMENTED_VIDEO_ID,
  MOCK_COMMENT_ERROR_CONTENT,
  MOCK_COMMENT_PASSWORD_HASH,
  MOCK_COMMENT_SEEDS,
} from '@/mocks/comments';

import { CommentApiError } from './errors';
import type { CommentStore, NewCommentRecord } from './store';
import type { CommentItem } from './types';

// id는 실제 DB처럼 1씩 늘어나는 정수. 응답에서는 문자열로 바꾼다
type MockRow = NewCommentRecord & { id: number; createdAt: Date };

type MockDb = { rows: MockRow[]; nextId: number };

// 개발 서버는 파일을 고칠 때마다 모듈을 다시 읽는다. 작성한 댓글이 사라지지 않도록 globalThis에 둔다.
const globalForMock = globalThis as typeof globalThis & { vidlabMockComments?: MockDb };

function seed(): MockDb {
  const db: MockDb = { rows: [], nextId: 1 };
  const now = Date.now();
  for (const { nickname, content, minutesAgo } of MOCK_COMMENT_SEEDS) {
    db.rows.push({
      id: db.nextId++,
      videoId: MOCK_COMMENTED_VIDEO_ID,
      nickname,
      content,
      passwordHash: MOCK_COMMENT_PASSWORD_HASH,
      ipHash: '0'.repeat(64),
      createdAt: new Date(now - minutesAgo * 60_000),
    });
  }
  return db;
}

function db(): MockDb {
  globalForMock.vidlabMockComments ??= seed();
  return globalForMock.vidlabMockComments;
}

function toItem(row: MockRow): CommentItem {
  return {
    id: String(row.id),
    nickname: row.nickname,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  };
}

export const mockStore: CommentStore = {
  async findPage(videoId, { beforeId, limit }) {
    await mockDelay();
    const before = beforeId === undefined ? undefined : Number(beforeId);
    return db()
      .rows.filter((row) => row.videoId === videoId && (before === undefined || row.id < before))
      .sort((a, b) => b.id - a.id)
      .slice(0, limit)
      .map(toItem);
  },

  async count(videoId) {
    await mockDelay();
    return db().rows.filter((row) => row.videoId === videoId).length;
  },

  async insert(record) {
    await mockDelay();
    if (record.content === MOCK_COMMENT_ERROR_CONTENT) throw new CommentApiError('SERVER_ERROR');
    const store = db();
    const row: MockRow = { ...record, id: store.nextId++, createdAt: new Date() };
    store.rows.push(row);
    return toItem(row);
  },
};
