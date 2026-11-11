import 'server-only';

// 비밀번호 · IP 해시. 원래 값은 저장하지 않는다 (CLAUDE.md 규칙).

import { createHmac } from 'node:crypto';

import bcrypt from 'bcryptjs';

/** bcrypt 비용. 10이면 해시 한 번에 수십 ms. 올리면 작성 · 삭제가 그만큼 느려진다 */
const BCRYPT_COST = 10;

/** 비밀번호 bcrypt 해시 ($2b$10$ + 53자) */
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

/** 비밀번호가 해시와 맞는지 (CMT-04 삭제에서 사용) */
export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * IP를 키(salt)로 HMAC-SHA256 해시한 hex 64자.
 * 같은 IP는 같은 값이 나와 횟수 제한(CMT-05)에 쓰고, 키 없이는 원래 IP를 되찾을 수 없다.
 */
export function hashIp(ip: string, salt: string): string {
  return createHmac('sha256', salt).update(ip).digest('hex');
}
