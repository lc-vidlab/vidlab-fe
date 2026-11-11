import 'server-only';

// 익명 댓글 DB(Supabase Postgres) 연결. 서버 코드에서만 쓴다.
// 결정 근거: https://github.com/lc-vidlab/vidlab-fe/issues/15
//
// 쿼리를 쓸 때 지킬 것
// - `select *` 금지. password_hash · ip_hash가 응답에 실리지 않도록 공개할 컬럼만 고른다
//   (서비스 안에서 비교만 하고 응답에 싣지 않는 경우는 예외: comments/postgres.ts의 reserveDeleteAttempt)
// - 값은 sql`... ${value}` 템플릿으로만 넘긴다. sql.unsafe()에 문자열을 이어 붙이면 SQL 인젝션이 된다
// - 연결 설정을 바꾸면 scripts/db-check.mjs도 같이 고친다 (server-only 때문에 그 스크립트가 이 파일을 import할 수 없다)

import postgres from 'postgres';

export type Db = postgres.Sql;

// 개발 서버는 파일을 고칠 때마다 모듈을 다시 읽는다. 그때마다 연결을 새로 만들지 않도록 globalThis에 둔다.
const globalForDb = globalThis as typeof globalThis & { vidlabDb?: Db };

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * 연결 주소를 검사하고 로컬 DB인지 돌려준다.
 *
 * 주소가 잘못되면 Node의 URL 에러는 비밀번호가 든 원래 주소를 에러 객체(input)에 담는다.
 * 이 에러가 로그에 남지 않도록 주소 없이 새 에러를 던진다.
 */
function parseDatabaseUrl(url: string): { isLocal: boolean } {
  let hostname: string;
  try {
    ({ hostname } = new URL(url));
  } catch {
    throw new Error(
      'DATABASE_URL 형식이 잘못됐습니다. 비밀번호에 @ # / ? : 같은 문자가 있으면 퍼센트 인코딩하세요.',
    );
  }
  return { isLocal: LOCAL_HOSTS.has(hostname) };
}

/**
 * DB 연결을 돌려준다. 처음 부를 때 연결을 만든다.
 *
 * 모듈을 읽을 때가 아니라 쓸 때 연결해서, DATABASE_URL이 없어도 빌드 · 다른 페이지 · mock 모드는 동작한다.
 */
export function getDb(): Db {
  if (globalForDb.vidlabDb) return globalForDb.vidlabDb;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL이 없습니다. .env.local에 넣어 주세요. (README의 환경변수 참고)');
  }

  const { isLocal } = parseDatabaseUrl(url);

  globalForDb.vidlabDb = postgres(url, {
    // Supabase 연결 풀러(Transaction 모드, 포트 6543)는 prepared statement를 지원하지 않는다
    prepare: false,
    // 서버리스 함수 하나가 여는 연결 수. 실제 연결 관리는 Supabase 풀러가 한다
    max: 5,
    // 쓰지 않는 연결은 20초 뒤 닫는다
    idle_timeout: 20,
    connect_timeout: 10,
    // 'require'는 통신을 암호화하지만 서버 인증서는 검증하지 않는다 (postgres 드라이버 동작).
    // 이 옵션이 DATABASE_URL의 ?sslmode=보다 우선한다.
    // 로컬(localhost · 127.0.0.1 · [::1])은 SSL 없이. docker compose 서비스 이름 등으로 붙으려면 LOCAL_HOSTS에 추가한다
    ssl: isLocal ? false : 'require',
  });
  return globalForDb.vidlabDb;
}
