import { describe, expect, it } from 'vitest';

import { hashIp, hashPassword, verifyPassword } from './hash';

/** DB CHECK와 같은 형식 (src/lib/db/schema.sql) */
const BCRYPT_FORMAT = /^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$/;
const IP_HASH_FORMAT = /^[0-9a-f]{64}$/;

describe('hashPassword', () => {
  it('DB가 받는 bcrypt 형식이고, 원래 비밀번호로만 맞는다', async () => {
    const hash = await hashPassword('가1234');
    expect(hash).toMatch(BCRYPT_FORMAT);
    expect(hash.startsWith('$2b$10$')).toBe(true);
    expect(await verifyPassword('가1234', hash)).toBe(true);
    expect(await verifyPassword('가12345', hash)).toBe(false);
  });
});

describe('hashIp', () => {
  const salt = 'a'.repeat(64);

  it('DB가 받는 hex 64자 (원래 IP의 . 이 남지 않는다)', () => {
    expect(hashIp('203.0.113.7', salt)).toMatch(IP_HASH_FORMAT);
  });

  it('같은 IP · 같은 키면 같은 값, 키가 다르면 다른 값', () => {
    expect(hashIp('203.0.113.7', salt)).toBe(hashIp('203.0.113.7', salt));
    expect(hashIp('203.0.113.7', salt)).not.toBe(hashIp('203.0.113.8', salt));
    expect(hashIp('203.0.113.7', salt)).not.toBe(hashIp('203.0.113.7', 'b'.repeat(64)));
  });
});
