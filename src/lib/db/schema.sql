-- 익명 댓글 테이블 (CMT-01)
-- 결정 근거: https://github.com/lc-vidlab/vidlab-fe/issues/15
--
-- 실행 방법: Supabase 콘솔 → SQL Editor에 이 파일 전체를 붙여넣고 Run.
--
-- 주의: 테이블이 이미 있으면 create table 전체를 건너뛴다.
-- 이 파일의 컬럼 · 제약을 고친 뒤 다시 실행해도 기존 테이블은 바뀌지 않는다.
-- 기존 테이블을 바꿀 때는 alter table 문을 따로 실행하고, 이 파일은 최종 모습으로 맞춰 둔다.
--
-- CHECK 제약은 API 검사를 빠뜨렸을 때를 대비한 최소 안전망이다. 입력 검사의 책임은 API(CMT-03)에 있다.
-- 예: 한글 채움 문자(U+3164) · 제로폭 공백(U+200B) · NBSP · 방향 바꾸기 문자(U+202E)는 여기서 막지 못한다.
-- API에서는 normalize('NFC') → trim() → 서식 · 제어 문자(\p{Cc} \p{Cf})와 한글 채움 문자 거부 → 글자 수 검사 순서로 한다.
--
-- 글자 수는 char_length(유니코드 문자 단위)로 센다.
-- JS에서 같은 기준으로 검사하려면 먼저 normalize('NFC')를 하고, str.length 대신 [...str].length를 쓴다.
-- (맥에서 입력한 한글은 자모가 분리된 NFD로 올 수 있어 글자 수가 2~3배로 세어진다. 이모지도 str.length는 2로 센다)

create table if not exists public.comments (
  -- 자동 증가라 큰 id가 더 최근 댓글이다. 최신순 정렬 · 커서 페이지네이션에 id만 쓴다.
  -- (created_at은 마이크로초까지 저장되는데 JS Date는 밀리초까지라, 커서로 쓰면 댓글이 빠질 수 있다)
  -- postgres 드라이버는 bigint를 문자열로 돌려준다.
  -- 커서 등 밖에서 받은 id는 /^\d{1,19}$/로 먼저 검사한다. 숫자가 아니면 CHECK 위반(23514)이 아닌 22P02 에러가 난다.
  -- (내용에 NUL 문자(\u0000)가 있어도 22021 에러가 나므로 API에서 먼저 거부한다)
  id           bigint generated always as identity primary key,
  -- YouTube 영상 id (src/lib/youtube/video-id.ts와 같은 규칙)
  video_id      text        not null,
  nickname      text        not null,
  -- bcrypt 해시만 저장한다. 평문 비밀번호가 실수로 들어오면 CHECK에서 막힌다
  password_hash text        not null,
  content       text        not null,
  -- IP_HASH_SALT를 넣은 HMAC-SHA256 hex(64자). 원래 IP가 실수로 들어오면 CHECK에서 막힌다
  ip_hash       text        not null,
  -- 화면 표시용 작성 시각
  created_at    timestamptz not null default now(),
  -- 삭제 비밀번호 시도 횟수 · 잠금 시각 (CMT-04, #21). 5번 틀리면 15분 잠그고 횟수를 0으로 되돌린다
  -- 기존 테이블에는 migrations/2026-11-11-delete-lock.sql로 추가한다
  delete_attempts     integer     not null default 0,
  delete_locked_until timestamptz,

  constraint comments_video_id_format
    check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  -- 2~12자, 앞뒤 공백(줄바꿈 · 탭 포함) 없음, 제어 문자 없음
  constraint comments_nickname_format
    check (
      char_length(nickname) between 2 and 12
      and nickname !~ '^\s|\s$'
      and nickname !~ '[[:cntrl:]]'
    ),
  constraint comments_password_hash_bcrypt
    check (password_hash ~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$'),
  -- 1~500자, 공백(줄바꿈 · 탭 포함)만으로는 안 됨. 내용 안의 줄바꿈은 허용
  constraint comments_content_format
    check (char_length(content) between 1 and 500 and content ~ '\S'),
  constraint comments_ip_hash_format
    check (ip_hash ~ '^[0-9a-f]{64}$'),
  constraint comments_delete_attempts_range
    check (delete_attempts >= 0)
);

-- 영상별 최신순 목록 · 커서 페이지네이션 (where video_id = ? and id < ? order by id desc)
create index if not exists comments_video_id_id_idx
  on public.comments (video_id, id desc);

-- Supabase는 public 스키마 테이블을 공개 Data API(anon 키)로도 노출한다.
-- RLS를 켜고 정책을 만들지 않으면 그 경로로는 아무것도 읽고 쓸 수 없다.
-- 우리 서버는 테이블 소유자(postgres) 계정으로 접속하므로 영향이 없다.
alter table public.comments enable row level security;

-- 아래 두 줄은 Supabase 전용이다. anon · authenticated 역할이 없는 일반 Postgres에서는 지우고 실행한다.
revoke all on public.comments from anon, authenticated;
revoke all on sequence public.comments_id_seq from anon, authenticated;
