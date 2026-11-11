import { describe, expect, it } from 'vitest';

import { MAX_PER_REQUEST, PAGE_SIZE, pageSize } from './constants';

describe('pageSize', () => {
  it('요청한 개수가 없으면 기본값을 쓴다', () => {
    expect(pageSize(undefined, PAGE_SIZE.popular)).toBe(PAGE_SIZE.popular);
  });

  it('요청한 개수를 그대로 쓴다', () => {
    expect(pageSize(5, PAGE_SIZE.popular)).toBe(5);
  });

  it('YouTube 상한(MAX_PER_REQUEST)을 넘지 않는다', () => {
    expect(pageSize(MAX_PER_REQUEST + 30, PAGE_SIZE.popular)).toBe(MAX_PER_REQUEST);
  });
});
