import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CommentApiError } from './errors';
import { createComment, deleteComment, listComments } from './service';
import { COMMENT_DELETE_RULES } from './rules';

// 댓글 삭제(deleteComment)를 mock 저장소로 확인한다. 실제 DB SQL은 postgres.test.ts에서 본다.
// 결정 근거: https://github.com/lc-vidlab/vidlab-fe/issues/21

const { maxAttempts, lockMinutes } = COMMENT_DELETE_RULES;
const PASSWORD = 'pw1234';

// mock 저장소는 테스트 파일이 도는 동안 남는다. 테스트마다 새 영상에 댓글을 하나 쓴다
let videoSeq = 0;
async function newComment(password = PASSWORD): Promise<{ id: string; videoId: string }> {
  videoSeq += 1;
  const videoId = `del-${String(videoSeq).padStart(7, '0')}`;
  const { id } = await createComment(
    { videoId, nickname: '테스터', password, content: '지울 댓글' },
    '203.0.113.7',
  );
  return { id, videoId };
}

async function errorOf(promise: Promise<unknown>): Promise<CommentApiError> {
  const error = await promise.then(
    () => undefined,
    (err: unknown) => err,
  );
  if (!(error instanceof CommentApiError)) throw new Error(`CommentApiError가 아님: ${error}`);
  return error;
}

beforeEach(() => {
  vi.stubEnv('COMMENTS_USE_MOCK', 'true');
  vi.stubEnv('MOCK_DELAY_MS', '0');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('deleteComment', () => {
  it('비밀번호가 맞으면 지우고 목록에서 사라진다', async () => {
    const { id, videoId } = await newComment();
    await deleteComment(id, { password: PASSWORD });
    expect(await listComments(videoId)).toEqual({ items: [], total: 0 });
  });

  it('작성 때와 같이 정규화한다 (NFD 한글 비밀번호)', async () => {
    const { id } = await newComment('가나다라');
    await deleteComment(id, { password: '가나다라'.normalize('NFD') });
    expect((await errorOf(deleteComment(id, { password: '가나다라' }))).code).toBe('NOT_FOUND');
  });

  it('틀리면 남은 횟수를 알려 주고, 5번째에 잠근다', async () => {
    const { id } = await newComment();
    for (let remaining = maxAttempts - 1; remaining >= 1; remaining--) {
      const error = await errorOf(deleteComment(id, { password: 'wrong' }));
      expect(error.code).toBe('WRONG_PASSWORD');
      expect(error.status).toBe(403);
      expect(error.message).toContain(`${remaining}번 더 틀리면 ${lockMinutes}분`);
    }

    const locked = await errorOf(deleteComment(id, { password: 'wrong' }));
    expect(locked.code).toBe('TOO_MANY_ATTEMPTS');
    expect(locked.status).toBe(429);
    expect(locked.retryAfterSeconds).toBe(lockMinutes * 60);
    expect(locked.message).toContain(`${lockMinutes}분 뒤`);

    // 잠긴 동안은 맞는 비밀번호도 거부한다
    const stillLocked = await errorOf(deleteComment(id, { password: PASSWORD }));
    expect(stillLocked.code).toBe('TOO_MANY_ATTEMPTS');
  });

  it('잠금이 풀리면 횟수를 처음부터 센다', async () => {
    const { id, videoId } = await newComment();
    for (let i = 0; i < maxAttempts; i++) await errorOf(deleteComment(id, { password: 'wrong' }));

    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + lockMinutes * 60_000 + 1);
    const error = await errorOf(deleteComment(id, { password: 'wrong' }));
    expect(error.message).toContain(`${maxAttempts - 1}번 더`);

    await deleteComment(id, { password: PASSWORD });
    expect((await listComments(videoId)).total).toBe(0);
  });

  it('동시에 여러 번 틀려도 비교는 5번까지만 한다', async () => {
    const { id } = await newComment();
    const errors = await Promise.all(
      Array.from({ length: 12 }, () => errorOf(deleteComment(id, { password: 'wrong' }))),
    );
    const codes = errors.map((error) => error.code);
    expect(codes.filter((code) => code === 'WRONG_PASSWORD')).toHaveLength(maxAttempts - 1);
    expect(codes.filter((code) => code === 'TOO_MANY_ATTEMPTS')).toHaveLength(
      12 - (maxAttempts - 1),
    );
  });

  it('없는 댓글은 NOT_FOUND', async () => {
    const error = await errorOf(deleteComment('999999999', { password: PASSWORD }));
    expect(error.code).toBe('NOT_FOUND');
    expect(error.status).toBe(404);
  });

  it.each([
    ['숫자가 아닌 id', 'abc'],
    ['음수', '-1'],
    ['bigint보다 큼', '9223372036854775808'],
  ])('BAD_REQUEST: %s', async (_, id) => {
    expect((await errorOf(deleteComment(id, { password: PASSWORD }))).code).toBe('BAD_REQUEST');
  });

  it('형식이 틀린 비밀번호는 VALIDATION_ERROR이고 횟수에 넣지 않는다', async () => {
    const { id } = await newComment();
    for (let i = 0; i < maxAttempts + 2; i++) {
      const error = await errorOf(deleteComment(id, { password: '1' }));
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.fields?.password).toBe('비밀번호는 4~20자로 입력해 주세요.');
    }
    const error = await errorOf(deleteComment(id, { password: 'wrong' }));
    expect(error.message).toContain(`${maxAttempts - 1}번 더`);
  });
});
