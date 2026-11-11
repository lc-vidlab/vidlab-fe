import 'server-only';

// 댓글 저장소의 실제 DB 구현 (COMMENTS_USE_MOCK=false). SQL은 이 파일에만 둔다.
// 직접 import하지 말고 service.ts를 쓴다.
//
// 쿼리 규칙 (src/lib/db/client.ts)
// - 공개 컬럼만 고른다. password_hash · ip_hash는 select하지 않는다
// - 값은 sql`... ${value}` 템플릿으로만 넘긴다

import { getDb } from '@/lib/db/client';

import { CommentApiError, validationError } from './errors';
import type { CommentStore, DeleteAttempt, NewCommentRecord } from './store';
import type { CommentItem } from './types';

type CommentRow = {
  id: string;
  nickname: string;
  content: string;
  created_at: Date;
};

function toItem(row: CommentRow): CommentItem {
  return {
    id: row.id,
    nickname: row.nickname,
    content: row.content,
    createdAt: row.created_at.toISOString(),
  };
}

/** Postgres 에러 코드 */
const CHECK_VIOLATION = '23514';

/** 로그에 남길 에러 요약. 쿼리 값(해시 등)이 로그에 실리지 않도록 코드 · 메시지만 고른다 */
function summarizeDbError(err: unknown): { code?: unknown; message: string } {
  if (!(err instanceof Error)) return { message: String(err) };
  return { code: 'code' in err ? err.code : undefined, message: err.message };
}

/**
 * DB 에러를 응답용 에러로 바꾼다. 원인은 서버 로그에만 남긴다.
 * CHECK 위반은 rules.ts 검사를 빠져나간 입력이라 400으로 응답한다.
 */
function toApiError(err: unknown, action: string): CommentApiError {
  const detail = summarizeDbError(err);
  if (detail.code === CHECK_VIOLATION) {
    console.warn(`[comments] ${action}: DB CHECK 위반. rules.ts 검사를 확인하세요`, detail);
    return validationError();
  }
  console.error(`[comments] ${action} 실패`, detail);
  return new CommentApiError('SERVER_ERROR');
}

/** 쿼리를 실행하고, 실패하면 응답용 에러로 바꿔 던진다 */
async function withDbError<T>(action: string, query: () => Promise<T>): Promise<T> {
  try {
    return await query();
  } catch (err) {
    throw toApiError(err, action);
  }
}

export const postgresStore: CommentStore = {
  findPage(videoId, { beforeId, limit }) {
    return withDbError('목록 조회', async () => {
      const sql = getDb();
      // 인덱스 (video_id, id desc)를 그대로 탄다
      const rows = await sql<CommentRow[]>`
        select id, nickname, content, created_at
        from comments
        where video_id = ${videoId}
          ${beforeId ? sql`and id < ${beforeId}` : sql``}
        order by id desc
        limit ${limit}
      `;
      return rows.map(toItem);
    });
  },

  count(videoId) {
    return withDbError('개수 조회', async () => {
      const sql = getDb();
      const [{ count }] = await sql<{ count: number }[]>`
        select count(*)::int as count from comments where video_id = ${videoId}
      `;
      return count;
    });
  },

  insert(record: NewCommentRecord) {
    return withDbError('작성', async () => {
      const sql = getDb();
      const [row] = await sql<CommentRow[]>`
        insert into comments (video_id, nickname, content, password_hash, ip_hash)
        values (${record.videoId}, ${record.nickname}, ${record.content},
                ${record.passwordHash}, ${record.ipHash})
        returning id, nickname, content, created_at
      `;
      return toItem(row);
    });
  },

  reserveDeleteAttempt(id, maxAttempts) {
    return withDbError('삭제 시도', async (): Promise<DeleteAttempt> => {
      const sql = getDb();
      // 한 문장의 update라 동시에 와도 maxAttempts개까지만 통과한다 (#21)
      const [reserved] = await sql<{ password_hash: string; delete_attempts: number }[]>`
        update comments
        set delete_attempts = delete_attempts + 1
        where id = ${id}
          and delete_attempts < ${maxAttempts}
          and (delete_locked_until is null or delete_locked_until <= now())
        returning password_hash, delete_attempts
      `;
      if (reserved) {
        return {
          status: 'ready',
          passwordHash: reserved.password_hash,
          attempts: reserved.delete_attempts,
        };
      }

      const [row] = await sql<{ locked_until: Date | null }[]>`
        select case when delete_locked_until > now() then delete_locked_until end as locked_until
        from comments
        where id = ${id}
      `;
      return row ? { status: 'locked', lockedUntil: row.locked_until } : { status: 'not_found' };
    });
  },

  lockDelete(id, lockMinutes) {
    return withDbError('삭제 잠금', async () => {
      const sql = getDb();
      await sql`
        update comments
        set delete_attempts = 0,
            delete_locked_until = now() + make_interval(mins => ${lockMinutes})
        where id = ${id}
      `;
    });
  },

  remove(id) {
    return withDbError('삭제', async () => {
      const sql = getDb();
      const result = await sql`delete from comments where id = ${id}`;
      return result.count > 0;
    });
  },
};
