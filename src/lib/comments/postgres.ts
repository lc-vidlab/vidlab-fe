import 'server-only';

// 댓글 저장소의 실제 DB 구현 (COMMENTS_USE_MOCK=false). SQL은 이 파일에만 둔다.
// 직접 import하지 말고 service.ts를 쓴다.
//
// 쿼리 규칙 (src/lib/db/client.ts)
// - 응답에 실릴 쿼리는 공개 컬럼만 고른다. password_hash · ip_hash는 응답 쿼리에 넣지 않는다
//   (예외: reserveDeleteAttempt는 서비스 안에서 비밀번호를 비교하려고 password_hash를 돌려준다. 응답에는 싣지 않는다)
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

  reserveDeleteAttempt(id, { maxAttempts, lockMinutes }) {
    return withDbError('삭제 시도', async (): Promise<DeleteAttempt> => {
      const sql = getDb();
      // 예약이 안 됐는데 막상 보니 잠겨 있지 않으면(그사이 잠금이 풀렸거나 다른 요청이 풀린 잠금을 지움)
      // 한 번 더 예약해 본다. 실제로 안 잠긴 댓글에 429를 보내지 않기 위해서다 (리뷰 R4)
      for (let round = 0; round < 2; round++) {
        // 한 문장의 update라 동시에 와도 행 잠금으로 하나씩 처리된다. 잠금도 여기서 같이 건다 (#21)
        // 남은 초는 DB 시계(now())로 계산해 앱 서버와의 시계 차이를 타지 않는다
        const [reserved] = await sql<
          { password_hash: string; delete_attempts: number; locked_for_seconds: number | null }[]
        >`
          update comments
          set delete_attempts = case
                when delete_locked_until <= now() then 1
                else delete_attempts + 1
              end,
              delete_locked_until = case
                when (case when delete_locked_until <= now() then 1 else delete_attempts + 1 end)
                     >= ${maxAttempts}
                then now() + make_interval(mins => ${lockMinutes})
              end
          where id = ${id}
            and (delete_locked_until is null or delete_locked_until <= now())
          returning password_hash, delete_attempts,
            ceil(extract(epoch from delete_locked_until - now()))::int as locked_for_seconds
        `;
        if (reserved) {
          return {
            status: 'ready',
            passwordHash: reserved.password_hash,
            attempts: reserved.delete_attempts,
            lockedForSeconds: reserved.locked_for_seconds,
          };
        }

        // 잠겨 있지 않으면 0 (null · 지난 시각)
        const [row] = await sql<{ retry_after_seconds: number }[]>`
          select coalesce(ceil(extract(epoch from delete_locked_until - now())), 0)::int
            as retry_after_seconds
          from comments
          where id = ${id}
        `;
        if (!row) return { status: 'not_found' };
        if (row.retry_after_seconds > 0) {
          return { status: 'locked', retryAfterSeconds: row.retry_after_seconds };
        }
      }
      // 두 번 모두 경합에 진 아주 드문 경우. 곧 다시 시도하게 한다
      return { status: 'locked', retryAfterSeconds: 1 };
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
