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
});
