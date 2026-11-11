import 'server-only';

// 댓글 API 환경변수 읽기. 값은 호출할 때마다 읽는다 (테스트에서 바꿀 수 있게).

/**
 * mock 모드인지 확인한다. COMMENTS_USE_MOCK=false일 때만 실제 DB를 쓴다.
 * (유튜브 USE_MOCK과 같은 규칙. 팀원은 DB 주소 없이 개발한다)
 */
export function isCommentsMockMode(): boolean {
  return process.env.COMMENTS_USE_MOCK !== 'false';
}

/** HMAC 키로 쓰기에 너무 짧은 값을 막는다 (openssl rand -hex 32 → 64자) */
const MIN_SALT_LENGTH = 32;

/** mock 모드용 고정 키. mock 저장소는 메모리에만 있어 실제 IP 해시가 남지 않는다 */
const MOCK_IP_HASH_SALT = 'vidlab-mock-ip-hash-salt-not-for-production';

/** IP 해시 키. 실제 DB 모드에서 없거나 짧으면 에러 (값은 에러 메시지에 넣지 않는다) */
export function ipHashSalt(): string {
  if (isCommentsMockMode()) return MOCK_IP_HASH_SALT;
  const salt = process.env.IP_HASH_SALT;
  if (!salt || salt.length < MIN_SALT_LENGTH) {
    throw new Error(
      `IP_HASH_SALT가 없거나 ${MIN_SALT_LENGTH}자보다 짧습니다. openssl rand -hex 32로 만들어 .env.local에 넣어 주세요.`,
    );
  }
  return salt;
}
