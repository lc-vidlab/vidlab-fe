// 댓글 DB 연결 · 스키마 확인 (npm run db:check)
// 결정 근거: https://github.com/lc-vidlab/vidlab-fe/issues/15
//
// 데이터는 바꾸지 않는다. 테스트 행은 트랜잭션 안에서 넣고 되돌린다.
// (되돌려도 자동 증가 id 번호는 하나씩 올라간다. 빈 번호가 생기는 것뿐이라 문제없다)
// 연결 주소(비밀번호 포함)는 출력하지 않는다.

import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('✗ DATABASE_URL이 없습니다. .env.local에 넣어 주세요.');
  process.exit(1);
}

// 주소가 잘못되면 URL 에러에 비밀번호가 든 원래 주소가 담기므로, 에러를 그대로 출력하지 않는다
let hostname, port;
try {
  ({ hostname, port } = new URL(url));
} catch {
  console.error(
    '✗ DATABASE_URL 형식이 잘못됐습니다. 비밀번호에 @ # / ? : 같은 문자가 있으면 퍼센트 인코딩하세요.',
  );
  process.exit(1);
}
// 연결 설정은 src/lib/db/client.ts와 같아야 한다. 바꾸면 둘 다 고친다.
// (client.ts는 server-only를 import해서 node 스크립트에서 가져올 수 없다)
const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
const sql = postgres(url, {
  prepare: false,
  max: 1,
  connect_timeout: 10,
  ssl: isLocal ? false : 'require',
});

// bcrypt · HMAC-SHA256 hex 형식만 맞춘 가짜 값
const VALID = {
  video_id: 'dbcheck0001',
  nickname: '점검용',
  password_hash: '$2b$10$' + 'a'.repeat(53),
  content: '연결 확인용 댓글',
  ip_hash: '0'.repeat(64),
};

// 경계값: 받아야 하는 값
const BOUNDARY = [
  ['닉네임 2자', { nickname: '가나' }],
  ['닉네임 12자', { nickname: '가'.repeat(12) }],
  ['내용 500자', { content: '가'.repeat(500) }],
  ['이모지 내용 (문자 단위로 셈)', { content: '😀'.repeat(500) }],
  ['내용 안 줄바꿈', { content: '첫 줄\n둘째 줄' }],
];

// CHECK 제약이 막아야 하는 값
const INVALID = [
  ['영상 id 형식', { video_id: 'short' }],
  ['닉네임 1자', { nickname: '가' }],
  ['닉네임 13자', { nickname: '가'.repeat(13) }],
  ['닉네임 앞뒤 공백', { nickname: ' 닉네임 ' }],
  ['닉네임 앞 탭', { nickname: '\t닉네임' }],
  ['닉네임 안 줄바꿈', { nickname: '닉\n네임' }],
  ['평문 비밀번호', { password_hash: '1234' }],
  ['내용 공백만', { content: '   ' }],
  ['내용 줄바꿈 · 탭만', { content: '\n\t' }],
  ['내용 501자', { content: '가'.repeat(501) }],
  ['원래 IP', { ip_hash: '127.0.0.1' }],
  ['음수 삭제 시도 횟수', { delete_attempts: -1 }],
];

class Rollback extends Error {}

let failed = 0;
function check(ok, label, detail = '') {
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` (${detail})` : ''}`);
  if (!ok) failed++;
}

/** 트랜잭션 안에서 실행하고 항상 되돌린다 */
async function inRollback(run) {
  try {
    await sql.begin(async (tx) => {
      await run(tx);
      throw new Rollback();
    });
  } catch (err) {
    if (!(err instanceof Rollback)) throw err;
  }
}

try {
  const [{ now }] = await sql`select now()`;
  check(true, '연결', `${hostname}:${port}, DB 시각 ${now.toISOString()}`);

  const [table] = await sql`
    select c.relrowsecurity as rls
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'comments'
  `;
  if (!table) {
    check(false, 'comments 테이블', '없음. src/lib/db/schema.sql을 SQL Editor에서 실행하세요');
  } else {
    check(true, 'comments 테이블');
    check(table.rls, 'RLS 켜짐');

    // Supabase 공개 Data API가 쓰는 역할에 테이블 · 시퀀스 권한이 없는지 (schema.sql 마지막 두 줄).
    // 일반 Postgres처럼 이 역할이 없으면 건너뛴다
    const PUBLIC_ROLES = ['anon', 'authenticated'];
    const roles = await sql`select rolname from pg_roles where rolname in ${sql(PUBLIC_ROLES)}`;
    for (const { rolname } of roles) {
      const [{ table: tablePriv, seq }] = await sql`
        select
          has_table_privilege(${rolname}, 'public.comments',
            'select, insert, update, delete, truncate, references, trigger') as table,
          has_sequence_privilege(${rolname}, 'public.comments_id_seq', 'usage, select, update') as seq
      `;
      check(
        !tablePriv && !seq,
        `외부 권한 없음: ${rolname}`,
        tablePriv || seq ? 'revoke 줄을 실행하세요' : '',
      );
    }
    if (roles.length === 0) console.log('- 외부 권한 점검 건너뜀 (anon · authenticated 역할 없음)');

    const [index] = await sql`
      select 1 from pg_indexes
      where schemaname = 'public' and indexname = 'comments_video_id_id_idx'
    `;
    check(Boolean(index), '영상별 최신순 인덱스');

    // 삭제 잠금 컬럼 (CMT-04). 없으면 마이그레이션을 실행한다
    const DELETE_LOCK_COLUMNS = ['delete_attempts', 'delete_locked_until'];
    const columns = await sql`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'comments'
        and column_name in ${sql(DELETE_LOCK_COLUMNS)}
    `;
    check(
      columns.length === DELETE_LOCK_COLUMNS.length,
      '삭제 잠금 컬럼',
      columns.length === DELETE_LOCK_COLUMNS.length
        ? ''
        : 'src/lib/db/migrations/2026-11-11-delete-lock.sql을 SQL Editor에서 실행하세요',
    );

    await inRollback(async (tx) => {
      const [row] = await tx`insert into comments ${tx(VALID)} returning id, created_at`;
      // bigint는 문자열로 온다
      check(typeof row.id === 'string', '정상 값 저장', `id ${row.id}`);
      const rows = await tx`
        select id from comments where video_id = ${VALID.video_id}
        order by id desc limit 20
      `;
      check(rows.length === 1, '영상 id로 조회');
    });

    for (const [label, patch] of BOUNDARY) {
      let error;
      try {
        await inRollback((tx) => tx`insert into comments ${tx({ ...VALID, ...patch })}`);
      } catch (err) {
        error = err;
      }
      check(!error, `받음: ${label}`, error ? `${error.code} ${error.message}` : '');
    }

    for (const [label, patch] of INVALID) {
      let code;
      try {
        await inRollback((tx) => tx`insert into comments ${tx({ ...VALID, ...patch })}`);
      } catch (err) {
        code = err.code;
      }
      // 23514: check_violation
      check(
        code === '23514',
        `막힘: ${label}`,
        code === '23514' ? '' : `오류 코드 ${code ?? '없음'}`,
      );
    }

    const [{ count }] =
      await sql`select count(*)::int as count from comments where video_id = ${VALID.video_id}`;
    check(count === 0, '테스트 행이 남지 않음');
  }
} catch (err) {
  check(false, 'DB 확인 중 오류', err.code ? `${err.code} ${err.message}` : err.message);
} finally {
  await sql.end({ timeout: 5 });
}

console.log(failed ? `\n${failed}개 실패` : '\n모두 통과');
process.exit(failed ? 1 : 0);
