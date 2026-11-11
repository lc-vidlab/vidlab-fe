-- 댓글 삭제 잠금 컬럼 추가 (CMT-04)
-- 결정 근거: https://github.com/lc-vidlab/vidlab-fe/issues/21
--
-- 실행 방법: 이미 comments 테이블이 있는 DB에서 Supabase 콘솔 → SQL Editor에 붙여넣고 Run.
-- (schema.sql로 새로 만든 DB에는 이미 들어 있어 실행할 필요 없다. 다시 실행해도 안전하다)
--
-- 기존 행은 delete_attempts = 0, delete_locked_until = null이 된다.
-- 기본값이 상수라 테이블을 다시 쓰지 않고 바로 끝난다 (Postgres 11+).

alter table public.comments
  add column if not exists delete_attempts     integer     not null default 0,
  add column if not exists delete_locked_until timestamptz;

alter table public.comments
  drop constraint if exists comments_delete_attempts_range;
alter table public.comments
  add constraint comments_delete_attempts_range check (delete_attempts >= 0);
