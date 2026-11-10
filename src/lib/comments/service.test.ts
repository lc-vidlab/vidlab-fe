import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CommentApiError } from './errors';
import { hashIp } from './hash';
import { mockStore } from './mock';
import { postgresStore } from './postgres';
import { createComment, listComments } from './service';
import type { NewCommentRecord } from './store';
import type { CommentItem, CreateCommentRequest } from './types';

// 저장소 선택(COMMENTS_USE_MOCK)과 저장소로 넘기는 값을 확인한다. 실제 DB에는 붙지 않는다.

const REQUEST: CreateCommentRequest = {
  videoId: 'abcdefghijk',
  nickname: ' 테스터 ',
  password: ' pw12 ',
  content: '내용',
};

const SAVED: CommentItem = { id: '1', nickname: '테스터', content: '내용', createdAt: '' };

const SALT = 'f'.repeat(64);

beforeEach(() => {
  vi.stubEnv('MOCK_DELAY_MS', '0');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('저장소 선택', () => {
  it('COMMENTS_USE_MOCK이 없으면 mock 저장소', async () => {
    vi.stubEnv('COMMENTS_USE_MOCK', undefined);
    const mockFind = vi.spyOn(mockStore, 'findPage');
    const dbFind = vi.spyOn(postgresStore, 'findPage');
    await listComments('abcdefghijk');
    expect(mockFind).toHaveBeenCalled();
    expect(dbFind).not.toHaveBeenCalled();
  });

  it("COMMENTS_USE_MOCK='false'면 DB 저장소", async () => {
    vi.stubEnv('COMMENTS_USE_MOCK', 'false');
    const dbFind = vi.spyOn(postgresStore, 'findPage').mockResolvedValue([]);
    vi.spyOn(postgresStore, 'count').mockResolvedValue(0);
    expect(await listComments('abcdefghijk', '10')).toEqual({ items: [], total: 0 });
    // 다음 페이지가 있는지 보려고 한 개 더 읽는다
    expect(dbFind).toHaveBeenCalledWith('abcdefghijk', { beforeId: '10', limit: 21 });
  });
});

describe('createComment (DB 모드)', () => {
  beforeEach(() => {
    vi.stubEnv('COMMENTS_USE_MOCK', 'false');
    vi.stubEnv('IP_HASH_SALT', SALT);
  });

  it('정규화한 값과 해시만 저장소에 넘긴다', async () => {
    const insert = vi.spyOn(postgresStore, 'insert').mockResolvedValue(SAVED);
    await createComment(REQUEST, '203.0.113.7');

    const record = insert.mock.calls[0][0] as NewCommentRecord;
    expect(record).toMatchObject({ videoId: 'abcdefghijk', nickname: '테스터', content: '내용' });
    expect(record.ipHash).toBe(hashIp('203.0.113.7', SALT));
    expect(record.passwordHash).toMatch(/^\$2b\$10\$/);
    expect(JSON.stringify(record)).not.toContain('pw12');
    expect(JSON.stringify(record)).not.toContain('203.0.113.7');
  });

  it('검사에 실패하면 저장소를 부르지 않는다', async () => {
    const insert = vi.spyOn(postgresStore, 'insert');
    await expect(createComment({ ...REQUEST, content: '' }, '1.1.1.1')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it.each([
    ['없음', undefined],
    ['너무 짧음', 'short'],
  ])('IP_HASH_SALT %s: 저장하지 않고 설정 오류', async (_, salt) => {
    vi.stubEnv('IP_HASH_SALT', salt);
    const insert = vi.spyOn(postgresStore, 'insert');
    const error = await createComment(REQUEST, '1.1.1.1').catch((err: unknown) => err);
    expect(error).not.toBeInstanceOf(CommentApiError);
    expect((error as Error).message).toContain('IP_HASH_SALT');
    expect(insert).not.toHaveBeenCalled();
  });
});

describe('DB 저장소 에러', () => {
  it('DATABASE_URL이 없으면 SERVER_ERROR (원인은 로그에만)', async () => {
    vi.stubEnv('COMMENTS_USE_MOCK', 'false');
    vi.stubEnv('DATABASE_URL', '');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(listComments('abcdefghijk')).rejects.toMatchObject({
      code: 'SERVER_ERROR',
      message: '댓글을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
    });
    expect(log).toHaveBeenCalled();
  });
});
