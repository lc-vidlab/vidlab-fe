import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { getDb } from '@/lib/db/client';

import { postgresStore } from './postgres';
import type { NewCommentRecord } from './store';

// 실제 Postgres에 붙어 SQL을 확인한다. TEST_DATABASE_URL이 있을 때만 실행한다 (평소 npm test에서는 건너뜀).
// 운영 DB(Supabase)가 아니라 로컬 DB에서만 돌린다. 테스트가 끝나면 이 테스트의 영상 id 댓글을 지운다.
//
//   docker run -d --rm --name vidlab-pg-test -e POSTGRES_PASSWORD=test -p 127.0.0.1:55432:5432 postgres:17-alpine
//   sed '/^revoke/d' src/lib/db/schema.sql | docker exec -i vidlab-pg-test psql -U postgres
//   TEST_DATABASE_URL=postgres://postgres:test@localhost:55432/postgres npx vitest run src/lib/comments/postgres.test.ts

const url = process.env.TEST_DATABASE_URL;
const VIDEO_ID = 'pgtest00001';

const RECORD: NewCommentRecord = {
  videoId: VIDEO_ID,
  nickname: '테스터',
  content: '첫 줄\n둘째 줄',
  passwordHash: '$2b$10$' + 'a'.repeat(53),
  ipHash: 'b'.repeat(64),
};

describe.skipIf(!url)('postgresStore (TEST_DATABASE_URL)', () => {
  beforeAll(async () => {
    vi.stubEnv('DATABASE_URL', url);
    await getDb()`delete from comments where video_id = ${VIDEO_ID}`;
  });

  afterAll(async () => {
    await getDb()`delete from comments where video_id = ${VIDEO_ID}`;
    await getDb().end();
    vi.unstubAllEnvs();
  });

  it('저장하고 공개 필드만 돌려준다 (id는 문자열)', async () => {
    const item = await postgresStore.insert(RECORD);
    expect(Object.keys(item).sort()).toEqual(['content', 'createdAt', 'id', 'nickname']);
    expect(item.id).toMatch(/^\d+$/);
    expect(item.content).toBe('첫 줄\n둘째 줄');
    expect(new Date(item.createdAt).toISOString()).toBe(item.createdAt);
  });

  it('최신순으로 limit개, beforeId보다 작은 id만', async () => {
    for (let i = 0; i < 4; i++) await postgresStore.insert({ ...RECORD, content: `댓글 ${i}` });
    const all = await postgresStore.findPage(VIDEO_ID, { limit: 100 });
    const ids = all.map((item) => BigInt(item.id));
    expect(ids).toEqual([...ids].sort((a, b) => (a < b ? 1 : -1)));

    const page = await postgresStore.findPage(VIDEO_ID, { beforeId: all[1].id, limit: 2 });
    expect(page.map((item) => item.id)).toEqual([all[2].id, all[3].id]);
    expect(await postgresStore.count(VIDEO_ID)).toBe(all.length);
  });

  it('CHECK 위반은 VALIDATION_ERROR, 원인은 경고 로그에만', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(postgresStore.insert({ ...RECORD, nickname: '가' })).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
    expect(warn).toHaveBeenCalled();
    // 로그에 쿼리 값(해시)이 실리지 않는다
    expect(JSON.stringify(warn.mock.calls)).not.toContain(RECORD.passwordHash);
    warn.mockRestore();
  });

  describe('삭제 (#21)', () => {
    it('시도를 예약하면 횟수가 오르고 해시를 돌려준다', async () => {
      const { id } = await postgresStore.insert(RECORD);
      expect(await postgresStore.reserveDeleteAttempt(id, 5)).toEqual({
        status: 'ready',
        passwordHash: RECORD.passwordHash,
        attempts: 1,
      });
      expect(await postgresStore.reserveDeleteAttempt(id, 5)).toMatchObject({ attempts: 2 });
    });

    it('동시에 와도 maxAttempts개만 예약된다', async () => {
      const { id } = await postgresStore.insert(RECORD);
      const results = await Promise.all(
        Array.from({ length: 10 }, () => postgresStore.reserveDeleteAttempt(id, 5)),
      );
      const ready = results.filter((r) => r.status === 'ready');
      expect(ready).toHaveLength(5);
      expect(ready.map((r) => (r.status === 'ready' ? r.attempts : 0)).sort()).toEqual([
        1, 2, 3, 4, 5,
      ]);
      // 횟수가 꽉 찼지만 아직 잠그지 않음 → 잠그는 중
      expect(results.filter((r) => r.status === 'locked')).toEqual(
        Array(5).fill({ status: 'locked', lockedUntil: null }),
      );
    });

    it('잠그면 lockedUntil을 돌려주고, 잠금이 풀리면 횟수를 처음부터 센다', async () => {
      const { id } = await postgresStore.insert(RECORD);
      await postgresStore.reserveDeleteAttempt(id, 5);
      await postgresStore.lockDelete(id, 15);

      const locked = await postgresStore.reserveDeleteAttempt(id, 5);
      expect(locked.status).toBe('locked');
      const until = locked.status === 'locked' ? locked.lockedUntil : null;
      expect(until).toBeInstanceOf(Date);
      expect(until!.getTime() - Date.now()).toBeGreaterThan(14 * 60_000);

      // 잠금 시각을 과거로 돌려 풀린 상태를 만든다
      await getDb()`update comments set delete_locked_until = now() - interval '1 second' where id = ${id}`;
      expect(await postgresStore.reserveDeleteAttempt(id, 5)).toMatchObject({
        status: 'ready',
        attempts: 1,
      });
    });

    it('지우면 true, 다시 지우면 false, 없는 댓글은 not_found', async () => {
      const { id } = await postgresStore.insert(RECORD);
      expect(await postgresStore.remove(id)).toBe(true);
      expect(await postgresStore.remove(id)).toBe(false);
      expect(await postgresStore.reserveDeleteAttempt(id, 5)).toEqual({ status: 'not_found' });
    });
  });
});
