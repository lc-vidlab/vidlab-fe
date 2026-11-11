import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COMMENT_PAGE_SIZE } from '@/lib/comments/rules';
import type {
  CommentApiErrorBody,
  CommentErrorCode,
  CommentItem,
  CommentPage,
  CreateCommentRequest,
} from '@/lib/comments/types';
import {
  MOCK_COMMENTED_VIDEO_ID,
  MOCK_COMMENT_ERROR_CONTENT,
  MOCK_COMMENT_SEEDS,
} from '@/mocks/comments';

import { GET, POST } from './route';

// /api/comments 를 mock 모드에서 호출해 응답 형태 · 상태 코드 · 검사를 확인한다.
// 결정 근거: https://github.com/lc-vidlab/vidlab-fe/issues/19

const EMPTY_VIDEO_ID = 'mock-vid-02';

// mock 저장소는 서버(테스트 파일)가 켜져 있는 동안 남는다. 작성 테스트마다 새 영상 id를 써서 서로 영향을 주지 않게 한다
let videoSeq = 0;
function newVideoId(): string {
  videoSeq += 1;
  return `post-${String(videoSeq).padStart(6, '0')}`;
}

function get(query: string): Promise<Response> {
  return GET(new NextRequest(new URL(`/api/comments?${query}`, 'http://localhost')));
}

const VALID_BODY: CreateCommentRequest = {
  videoId: 'post-000000',
  nickname: '테스터',
  password: '1234',
  content: '처음 남기는 댓글',
};

function post(
  body: unknown,
  {
    contentType = 'application/json',
    headers = {},
  }: { contentType?: string; headers?: Record<string, string> } = {},
): Promise<Response> {
  return POST(
    new NextRequest(new URL('/api/comments', 'http://localhost'), {
      method: 'POST',
      headers: { 'content-type': contentType, ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

async function expectError(response: Response, code: CommentErrorCode, status = 400) {
  expect(response.status).toBe(status);
  const body = await json<CommentApiErrorBody>(response);
  expect(body.error.code).toBe(code);
  return body.error;
}

beforeEach(() => {
  vi.stubEnv('COMMENTS_USE_MOCK', 'true');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('GET /api/comments', () => {
  it('최신순 20개와 nextCursor, total을 돌려주고, 커서로 나머지를 받는다', async () => {
    const first = await get(`videoId=${MOCK_COMMENTED_VIDEO_ID}`);
    expect(first.status).toBe(200);
    const page1 = await json<CommentPage>(first);
    expect(page1.items).toHaveLength(COMMENT_PAGE_SIZE);
    expect(page1.total).toBe(MOCK_COMMENT_SEEDS.length);
    expect(page1.nextCursor).toBe(page1.items.at(-1)?.id);

    const page2 = await json<CommentPage>(
      await get(`videoId=${MOCK_COMMENTED_VIDEO_ID}&cursor=${page1.nextCursor}`),
    );
    expect(page2.items).toHaveLength(MOCK_COMMENT_SEEDS.length - COMMENT_PAGE_SIZE);
    expect(page2.nextCursor).toBeUndefined();

    // 전체가 id 큰 순(최신순)이고 겹치지 않는다
    const ids = [...page1.items, ...page2.items].map((item) => Number(item.id));
    expect(ids).toEqual([...ids].sort((a, b) => b - a));
    expect(new Set(ids).size).toBe(MOCK_COMMENT_SEEDS.length);
  });

  it('댓글은 공개 필드만 담는다', async () => {
    const page = await json<CommentPage>(await get(`videoId=${MOCK_COMMENTED_VIDEO_ID}`));
    expect(Object.keys(page.items[0]).sort()).toEqual(['content', 'createdAt', 'id', 'nickname']);
  });

  it('댓글이 없는 영상은 빈 목록', async () => {
    const page = await json<CommentPage>(await get(`videoId=${EMPTY_VIDEO_ID}`));
    expect(page).toEqual({ items: [], total: 0 });
  });

  it.each([
    ['videoId 없음', ''],
    ['videoId 형식', 'videoId=short'],
    ['숫자가 아닌 커서', `videoId=${EMPTY_VIDEO_ID}&cursor=abc`],
    ['음수 커서', `videoId=${EMPTY_VIDEO_ID}&cursor=-1`],
    ['bigint보다 큰 커서', `videoId=${EMPTY_VIDEO_ID}&cursor=9223372036854775808`],
    ['20자리 커서', `videoId=${EMPTY_VIDEO_ID}&cursor=${'1'.repeat(20)}`],
  ])('400 BAD_REQUEST: %s', async (_, query) => {
    await expectError(await get(query), 'BAD_REQUEST');
  });

  it('bigint 최댓값 커서는 받는다', async () => {
    const response = await get(`videoId=${MOCK_COMMENTED_VIDEO_ID}&cursor=9223372036854775807`);
    expect(response.status).toBe(200);
  });
});

describe('POST /api/comments', () => {
  it('201로 저장된 댓글을 돌려주고, 목록 맨 앞에 나온다', async () => {
    const videoId = newVideoId();
    const response = await post({ ...VALID_BODY, videoId });
    expect(response.status).toBe(201);
    const created = await json<CommentItem>(response);
    expect(created).toMatchObject({ nickname: '테스터', content: '처음 남기는 댓글' });
    expect(Object.keys(created).sort()).toEqual(['content', 'createdAt', 'id', 'nickname']);

    const page = await json<CommentPage>(await get(`videoId=${videoId}`));
    expect(page.items[0]).toEqual(created);
    expect(page.total).toBe(1);
  });

  it('정규화한 값을 저장한다', async () => {
    const created = await json<CommentItem>(
      await post({ ...VALID_BODY, nickname: '  테스터 ', content: '\r\n첫 줄\r\n둘째 줄  ' }),
    );
    expect(created.nickname).toBe('테스터');
    expect(created.content).toBe('첫 줄\n둘째 줄');
  });

  it('400 VALIDATION_ERROR: 칸별 메시지를 담는다', async () => {
    const error = await expectError(
      await post({ ...VALID_BODY, nickname: '\u3164\u3164', password: '1', content: ' ' }),
      'VALIDATION_ERROR',
    );
    expect(error.fields).toEqual({
      nickname: '닉네임에 쓸 수 없는 문자가 있어요.',
      password: '비밀번호는 4~20자로 입력해 주세요.',
      content: '댓글은 1~500자로 입력해 주세요.',
    });
  });

  it.each([
    ['JSON이 아닌 본문', '{nickname'],
    ['배열', [VALID_BODY]],
    ['필드 누락', { ...VALID_BODY, password: undefined }],
    ['문자열이 아닌 필드', { ...VALID_BODY, content: 123 }],
    ['너무 큰 본문', { ...VALID_BODY, content: '가'.repeat(20_000) }],
    ['영상 id 형식', { ...VALID_BODY, videoId: 'short' }],
  ])('400 BAD_REQUEST: %s', async (_, body) => {
    await expectError(await post(body), 'BAD_REQUEST');
  });

  it('400 BAD_REQUEST: JSON이 아닌 Content-Type (폼 전송 차단)', async () => {
    const response = await post('nickname=a', { contentType: 'application/x-www-form-urlencoded' });
    await expectError(response, 'BAD_REQUEST');
  });

  it('charset이 붙은 JSON Content-Type은 받는다', async () => {
    const response = await post(VALID_BODY, { contentType: 'application/json; charset=utf-8' });
    expect(response.status).toBe(201);
  });

  it('500 SERVER_ERROR: mock 오류 재현 내용', async () => {
    await expectError(
      await post({ ...VALID_BODY, content: MOCK_COMMENT_ERROR_CONTENT }),
      'SERVER_ERROR',
      500,
    );
  });
});
