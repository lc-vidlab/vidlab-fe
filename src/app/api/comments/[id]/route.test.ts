import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COMMENT_DELETE_RULES } from '@/lib/comments/rules';
import type { CommentApiErrorBody, CommentErrorCode, CommentItem } from '@/lib/comments/types';

import { GET, POST } from '../route';
import { DELETE } from './route';

// DELETE /api/comments/{id}를 mock 모드에서 호출해 상태 코드 · 헤더 · 본문을 확인한다.
// 결정 근거: https://github.com/lc-vidlab/vidlab-fe/issues/21

const PASSWORD = '1234';

let videoSeq = 0;
async function newComment(): Promise<{ id: string; videoId: string }> {
  videoSeq += 1;
  const videoId = `rdel-${String(videoSeq).padStart(6, '0')}`;
  const response = await POST(
    new NextRequest(new URL('/api/comments', 'http://localhost'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ videoId, nickname: '테스터', password: PASSWORD, content: '내용' }),
    }),
  );
  const { id } = (await response.json()) as CommentItem;
  return { id, videoId };
}

function del(id: string, body: unknown, contentType = 'application/json'): Promise<Response> {
  return DELETE(
    new NextRequest(new URL(`/api/comments/${id}`, 'http://localhost'), {
      method: 'DELETE',
      headers: { 'content-type': contentType },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

async function expectError(response: Response, code: CommentErrorCode, status: number) {
  expect(response.status).toBe(status);
  const { error } = (await response.json()) as CommentApiErrorBody;
  expect(error.code).toBe(code);
  return error;
}

beforeEach(() => {
  vi.stubEnv('COMMENTS_USE_MOCK', 'true');
  vi.stubEnv('MOCK_DELAY_MS', '0');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('DELETE /api/comments/{id}', () => {
  it('204 본문 없이 지우고, 목록에서 사라진다', async () => {
    const { id, videoId } = await newComment();
    const response = await del(id, { password: PASSWORD });
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');

    const list = await GET(
      new NextRequest(new URL(`/api/comments?videoId=${videoId}`, 'http://localhost')),
    );
    expect(await list.json()).toEqual({ items: [], total: 0 });
  });

  it('403 → 429 (Retry-After 헤더), 응답에 해시가 실리지 않는다', async () => {
    const { id } = await newComment();
    for (let i = 1; i < COMMENT_DELETE_RULES.maxAttempts; i++) {
      const response = await del(id, { password: 'wrong' });
      const error = await expectError(response, 'WRONG_PASSWORD', 403);
      expect(JSON.stringify(error)).not.toContain('$2');
    }
    const locked = await del(id, { password: 'wrong' });
    expect(locked.headers.get('retry-after')).toBe(String(COMMENT_DELETE_RULES.lockMinutes * 60));
    const error = await expectError(locked, 'TOO_MANY_ATTEMPTS', 429);
    // Retry-After 초는 헤더에만 싣는다
    expect(Object.keys(error).sort()).toEqual(['code', 'message']);
  });

  it('404 없는 댓글', async () => {
    await expectError(await del('999999999', { password: PASSWORD }), 'NOT_FOUND', 404);
  });

  it('400 VALIDATION_ERROR: 비밀번호 형식', async () => {
    const { id } = await newComment();
    const error = await expectError(await del(id, { password: '' }), 'VALIDATION_ERROR', 400);
    expect(error.fields).toEqual({ password: '비밀번호는 4~20자로 입력해 주세요.' });
    // 화면은 message만 보여 줘도 이유가 보인다
    expect(error.message).toBe('비밀번호는 4~20자로 입력해 주세요.');
  });

  it.each([
    ['잘못된 id', 'abc', { password: PASSWORD }, 'application/json'],
    ['password 없음', '1', {}, 'application/json'],
    ['JSON이 아닌 Content-Type', '1', 'password=1234', 'application/x-www-form-urlencoded'],
  ])('400 BAD_REQUEST: %s', async (_, id, body, contentType) => {
    await expectError(await del(id, body, contentType), 'BAD_REQUEST', 400);
  });
});
