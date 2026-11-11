import { describe, expect, it } from 'vitest';

import { clientIp, readCreateCommentRequest, readDeleteCommentRequest, respond } from './http';
import { CommentApiError } from '@/lib/comments/errors';

function withHeaders(headers: Record<string, string>, body?: string): Request {
  return new Request('http://localhost/api/comments', { method: 'POST', headers, body });
}

describe('clientIp', () => {
  it.each([
    ['프록시를 거친 여러 값이면 첫 값', '203.0.113.7, 10.0.0.1', '203.0.113.7'],
    ['앞뒤 공백', '  203.0.113.7  ', '203.0.113.7'],
    ['IPv6', '2001:db8::1', '2001:db8::1'],
    ['빈 값', '', 'unknown'],
  ])('%s', (_, header, expected) => {
    expect(clientIp(withHeaders({ 'x-forwarded-for': header }))).toBe(expected);
  });

  it('헤더가 없으면 unknown', () => {
    expect(clientIp(withHeaders({}))).toBe('unknown');
  });
});

describe('readCreateCommentRequest', () => {
  it('content-length가 너무 크면 본문을 읽지 않고 거부한다', async () => {
    const request = withHeaders(
      { 'content-type': 'application/json', 'content-length': '10000000' },
      '{}',
    );
    await expect(readCreateCommentRequest(request)).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: '요청 본문이 너무 큽니다.',
    });
    expect(request.bodyUsed).toBe(false);
  });

  it('필요한 필드만 골라 돌려준다', async () => {
    const body = JSON.stringify({
      videoId: 'v',
      nickname: 'n',
      password: 'p',
      content: 'c',
      extra: 1,
    });
    const result = await readCreateCommentRequest(
      withHeaders({ 'content-type': 'application/json' }, body),
    );
    expect(result).toEqual({ videoId: 'v', nickname: 'n', password: 'p', content: 'c' });
  });
});

describe('readDeleteCommentRequest', () => {
  it('password만 골라 돌려준다', async () => {
    const result = await readDeleteCommentRequest(
      withHeaders({ 'content-type': 'application/json' }, '{"password":"1234","id":"9"}'),
    );
    expect(result).toEqual({ password: '1234' });
  });

  it.each([
    ['null', 'null'],
    ['배열', '["1234"]'],
    ['숫자 password', '{"password":1234}'],
  ])('BAD_REQUEST: %s', async (_, body) => {
    await expect(
      readDeleteCommentRequest(withHeaders({ 'content-type': 'application/json' }, body)),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});

describe('respond', () => {
  it('204면 본문 없이 응답한다', async () => {
    const response = await respond(async () => undefined, 204);
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });

  it('retryAfterSeconds가 있으면 Retry-After 헤더를 단다', async () => {
    const response = await respond(async () => {
      throw new CommentApiError('TOO_MANY_ATTEMPTS', '잠김', { retryAfterSeconds: 90 });
    });
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('90');
  });
});
