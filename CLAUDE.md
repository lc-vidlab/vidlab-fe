# Vidlab

YouTube Data API v3 기반 영상 탐색 웹 (토이 프로젝트, 4인 팀)

## 스택

Next.js App Router · React · TypeScript · Tailwind CSS v4 · TanStack Query · next-themes · 댓글 DB는 Supabase(Postgres), `src/lib/db`

## 구조

- 소스는 모두 `src/` 아래. alias `@/*` → `src/*`
- 페이지: `src/app`, 공용 UI: `src/components`, 영역별 훅·컴포넌트: `src/features/{feed,search,watch}`, API 클라이언트·DB: `src/lib`, mock 데이터: `src/mocks`

## 담당

- 세팅 · 서버 · 익명 댓글 API: 이주혁
- 홈 피드(`/`): 주훈
- 검색(`/results`): 민진
- 영상 상세(`/watch/[id]`): 수현

## 반드시 지킬 규칙

- YouTube API 키는 서버(Route Handler, Server Component)에서만 사용. `NEXT_PUBLIC_`으로 노출 금지
- 개발 기본값은 `USE_MOCK=true`. 실제 API는 개인 GCP 키로만 테스트
- `search.list`는 하루 100회 한도. 입력 중 호출 금지, 제출 시에만 호출하고 서버에서 캐싱
- 영상 재생은 IFrame 임베드 플레이어만 사용
- 로그인 · 좋아요 기능 없음
- 댓글 작성은 닉네임 · 비밀번호 · 내용 방식의 익명 댓글이고 자체 DB에만 저장 (YouTube에 등록되지 않음)
- 댓글 비밀번호는 bcrypt 해시, IP는 솔트 해시로만 저장. API 응답에 포함 금지
- 색상은 테마 토큰 클래스만 사용: bg-bg, bg-surface, text-text, text-sub, border-border, text-accent. `bg-[#...]` 같은 임의 색상값과 기본 팔레트(bg-gray-800 등) 사용 금지
- 서비스명에 YouTube 이름 · 로고 사용 금지 (가칭: Vidlab)
- 브랜치: `feature/{영역}-{기능}`, PR 리뷰 1명 이상
- 커밋 전 `npm run lint`, `npm run format` 실행

## 문서

- 기획서: docs/vidlab-plan.html
