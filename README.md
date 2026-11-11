# Vidlab

YouTube Data API v3로 인기 영상 피드, 검색, 영상 상세(재생 · 댓글)를 만드는 영상 탐색 웹입니다. 4인 팀 토이 프로젝트로, 3주 안에 데모 가능한 버전을 만드는 것이 목표입니다.

> Vidlab은 가칭이며 YouTube와 관련이 없는 개인 학습 프로젝트입니다.

## 주요 기능

- **홈 피드** `/`: 국가별 인기 영상 그리드, 카테고리 필터, 무한 스크롤
- **검색** `/results?q=`: 키워드 검색, 더 보기, 정렬 · 기간 필터, 최근 검색어
- **영상 상세** `/watch/[id]`: IFrame 임베드 재생, 영상 · 채널 정보, YouTube 댓글(읽기 전용), 관련 영상
- **익명 댓글**: 로그인 없이 닉네임 · 비밀번호 · 내용으로 작성하고 비밀번호로 삭제. 자체 DB에만 저장되며 YouTube에는 올라가지 않습니다
- 다크/라이트 모드(시스템 설정 연동), 반응형

만들지 않는 것: 로그인 · 회원, 좋아요, YouTube 댓글 등록, 개인화 추천, 영상 업로드, 대댓글 · 댓글 수정

## 기술 스택

Next.js (App Router) · React · TypeScript · Tailwind CSS v4 · TanStack Query · next-themes · Supabase(Postgres, 익명 댓글 저장) · Vercel 배포

## 실행 방법

```bash
npm install
cp .env.example .env.local
npm run dev
```

브라우저에서 http://localhost:3000 을 엽니다.

같은 와이파이의 휴대폰 등 다른 기기로 확인하려면 내 컴퓨터의 내부망 IP로 개발 서버를 띄우고, 두 기기 모두 그 주소로 엽니다. 개발 서버는 띄울 때 쓴 호스트 이름을 허용하므로 `next.config.ts`의 `allowedDevOrigins`에 개인 IP를 넣지 않습니다.

```bash
npm run dev -- -H 192.168.0.12   # 예시. 내 IP는 시스템 설정 → 네트워크에서 확인
# 휴대폰 · 내 컴퓨터 모두 http://192.168.0.12:3000 으로 접속
```

### 환경변수

| 이름                | 설명                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| `YOUTUBE_API_KEY`   | YouTube Data API v3 키. 서버에서만 사용하며 `NEXT_PUBLIC_`으로 노출하지 않습니다                   |
| `USE_MOCK`          | `false`로 적었을 때만 실제 API를 호출합니다. 없거나 다른 값이면 `src/mocks`의 mock 데이터를 씁니다 |
| `MOCK_DELAY_MS`     | (선택) mock 응답 지연(ms). 기본 300. 스켈레톤을 오래 보고 싶을 때 늘립니다                         |
| `DATABASE_URL`      | (댓글 API 담당만) 익명 댓글 DB 연결 주소. 아래 "댓글 DB" 참고                                      |
| `COMMENTS_USE_MOCK` | `false`로 적었을 때만 댓글을 실제 DB에 저장합니다. 없거나 다른 값이면 메모리 mock 저장소를 씁니다  |
| `IP_HASH_SALT`      | (댓글 API 담당만) 댓글 작성자 IP 해시 키. `openssl rand -hex 32`로 만듭니다 (32자 이상)            |

실제 API는 개인 GCP 프로젝트 키로만 테스트하고, 팀 키는 배포에만 씁니다. 배포 환경에는 `USE_MOCK=false`, `COMMENTS_USE_MOCK=false`를 반드시 설정합니다. (아래 [배포](#배포) 참고)

mock 모드에서 재현할 수 있는 상태(무한 스크롤, 결과 없음, 할당량 초과 등)는 [#4](https://github.com/lc-vidlab/vidlab-fe/issues/4)를 참고하세요. 예: 검색어 `__quota__`로 검색하면 할당량 초과 에러가 납니다.

### 스크립트

| 명령                   | 설명                                              |
| ---------------------- | ------------------------------------------------- |
| `npm run dev`          | 개발 서버                                         |
| `npm run build`        | 프로덕션 빌드                                     |
| `npm run lint`         | ESLint 검사                                       |
| `npm run format`       | Prettier 포맷                                     |
| `npm run format:check` | 포맷 검사만 (CI에서 실행)                         |
| `npm test`             | 단위 테스트 (Vitest). 네트워크 · API 키 없이 실행 |
| `npm run test:watch`   | 파일을 고칠 때마다 테스트 다시 실행               |

테스트 파일은 대상 파일 옆에 `*.test.ts`로 둡니다. (예: `src/lib/youtube/mock.test.ts`)

### 댓글 DB

익명 댓글은 Supabase(Postgres)에 저장합니다. 결정 근거는 [#15](https://github.com/lc-vidlab/vidlab-fe/issues/15)를 참고하세요.

- 콘솔은 이주혁만 관리합니다. 다른 팀원은 DB 없이 개발할 수 있습니다.
- 테이블 정의는 `src/lib/db/schema.sql`입니다. 처음 만들 때는 이 파일을 Supabase SQL Editor에서 실행합니다.
- 이미 있는 테이블은 이 파일을 다시 실행해도 바뀌지 않습니다. 바꿀 때는 `alter table` 문을 따로 실행하고, `schema.sql`도 최종 모습으로 고쳐 둡니다.
- 기존 테이블에 적용할 변경은 `src/lib/db/migrations/`에 날짜 순으로 둡니다. 여러 번 실행해도 안전하게 씁니다. (`2026-11-11-delete-lock.sql`: 삭제 잠금 컬럼, CMT-04)
- `DATABASE_URL`은 Supabase 콘솔 **Connect → Direct → Transaction pooler** 주소(포트 6543)를 씁니다. 직접 연결(5432)은 배포 환경에서 연결 수가 바닥납니다. 비밀번호에 `@ # / ? :` 같은 문자가 있으면 퍼센트 인코딩해야 합니다.
- `npm run db:check`: `.env.local`의 `DATABASE_URL`로 연결 · 테이블 · RLS · 입력 제약을 확인합니다. 데이터는 바꾸지 않습니다.
- 무료 플랜은 7일 동안 요청이 없으면 일시정지됩니다. 시연 전에 콘솔에서 상태를 확인하세요.

### 댓글 API

결정 근거는 [#19](https://github.com/lc-vidlab/vidlab-fe/issues/19)(목록 · 작성), [#21](https://github.com/lc-vidlab/vidlab-fe/issues/21)(삭제)를 참고하세요. 타입은 `@/lib/comments/types`, 입력 규칙 · 검사는 `@/lib/comments/rules`에서 가져옵니다 (화면에서도 import 가능).

| 요청                                                                   | 응답                                                                                                             |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `GET /api/comments?videoId=…&cursor=…`                                 | 200 `CommentPage` `{ items, nextCursor?, total }`. 최신순 20개. 다음 페이지는 `nextCursor`를 `cursor`로 넘깁니다 |
| `POST /api/comments` (JSON `{ videoId, nickname, password, content }`) | 201 `CommentItem` `{ id, nickname, content, createdAt }`                                                         |
| `DELETE /api/comments/{id}` (JSON `{ password }`)                      | 204 (본문 없음). 비밀번호를 5번 틀리면 그 댓글의 삭제가 15분 동안 잠깁니다                                       |

- 실패하면 `{ error: { code, message, fields? } }`. 화면에는 `message`를 그대로 보여 주면 됩니다.
  - `VALIDATION_ERROR`(400): `fields`에 닉네임 · 비밀번호 · 내용별 메시지
  - `BAD_REQUEST`(400): 영상 id · 댓글 id · 커서 · 요청 형식 오류
  - `WRONG_PASSWORD`(403): 삭제 비밀번호가 틀림. 메시지에 남은 횟수
  - `NOT_FOUND`(404): 없거나 이미 지운 댓글
  - `TOO_MANY_ATTEMPTS`(429): 삭제가 잠김. 메시지에 기다릴 시간, `Retry-After` 헤더(초)
  - `SERVER_ERROR`(500)
- `POST` · `DELETE`는 `Content-Type: application/json`만 받습니다.
- 잠금 기준(5번 · 15분)은 `COMMENT_DELETE_RULES`(`@/lib/comments/rules`)에 있습니다.
- mock 모드: `mock-vid-01`에 댓글 25개(2페이지)가 있고 다른 영상은 0개입니다. 내용을 `__error__`로 작성하면 500을 재현합니다. mock 댓글의 비밀번호는 모두 `1234`입니다. 작성 · 삭제 · 잠금은 서버를 다시 켜면 처음 상태로 돌아갑니다.
- 서버 코드는 `@/lib/comments/service`만 import합니다. (`postgres.ts` · `mock.ts` 직접 import는 ESLint가 막습니다)
- SQL 테스트: `src/lib/comments/postgres.test.ts` 맨 위 안내대로 로컬 Postgres를 띄우고 `TEST_DATABASE_URL`을 넣으면 실행됩니다. 평소 `npm test`에서는 건너뜁니다.

```ts
// 작성 예 (클라이언트)
const response = await fetch('/api/comments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ videoId, nickname, password, content }),
});
if (!response.ok) {
  const { error } = (await response.json()) as CommentApiErrorBody;
  // error.fields?.nickname 등을 칸 아래에 표시
}
```

## 배포

Vercel(무료 플랜)에 배포합니다. 결정 근거는 [#33](https://github.com/lc-vidlab/vidlab-fe/issues/33)을 참고하세요.

```
lc-vidlab/vidlab-fe (비공개, 작업 저장소)
  develop ─(출시 PR, merge commit)→ main
                                     │ GitHub Actions(mirror.yml)
                                     ▼
                       이주혁 개인 저장소 main (비공개)
                                     │ Vercel Git 연동
                                     ▼
                                운영 배포 (icn1)
```

- Vercel 무료 플랜은 GitHub 조직의 비공개 저장소를 배포할 수 없어서, `main`만 개인 저장소로 복제해 배포합니다.
- 개인 저장소가 비공개라 Vercel은 **커밋 작성자가 저장소 주인(이주혁)인 커밋만** 배포합니다.
  - 출시는 이주혁이 develop → main PR을 **Create a merge commit**으로 병합합니다. (병합 커밋 작성자 = 병합한 사람)
  - `main`에 직접 커밋하지 않습니다.
  - PR별 미리보기 배포는 쓰지 않습니다. 확인은 로컬 개발 서버와 CI로 합니다.
- 함수 지역은 서울(`icn1`, `vercel.json`)입니다. 댓글 DB(Supabase)는 뭄바이에 있어 댓글 API만 왕복이 조금 깁니다.

### 운영 환경변수 (Vercel → Settings → Environment Variables)

| 이름                | Production                             | Preview   |
| ------------------- | -------------------------------------- | --------- |
| `USE_MOCK`          | `false`                                | `false`   |
| `YOUTUBE_API_KEY`   | 팀 키                                  | 팀 키     |
| `COMMENTS_USE_MOCK` | `false`                                | `true`    |
| `DATABASE_URL`      | Supabase Transaction pooler 주소(6543) | 넣지 않음 |
| `IP_HASH_SALT`      | `openssl rand -hex 32`로 새로 만든 값  | 넣지 않음 |

- `IP_HASH_SALT`는 로컬과 다른 값을 쓰고, 한 번 정하면 바꾸지 않습니다. (바꾸면 같은 IP를 알아보지 못합니다)
- 키 · 주소는 `NEXT_PUBLIC_`을 붙이지 않습니다.

### 복제 설정 (lc-vidlab/vidlab-fe → Settings → Secrets and variables → Actions)

- 변수 `MIRROR_REPO`: 개인 저장소 `계정/저장소`
- 비밀값 `MIRROR_TOKEN`: 개인 저장소 하나에만 **Contents: Read and write**, **Workflows: Read and write** 권한을 준 fine-grained 토큰 (복제하는 코드에 `.github/workflows`가 있어 Workflows 권한이 없으면 push가 거부됩니다). 만료일이 지나면 복제가 멈추니 갱신합니다
- 둘 중 하나가 없으면 복제를 건너뜁니다. Actions 탭의 **Mirror main → Run workflow**로 직접 실행할 수도 있습니다.

### 출시 순서

1. develop의 CI가 초록 ✓인지 확인합니다.
2. develop → main PR을 만들고 **Create a merge commit**으로 병합합니다 (이주혁).
3. Actions의 **Mirror main**이 개인 저장소로 복제하고, Vercel이 운영 배포를 시작합니다.
4. 배포 URL에서 홈 → 검색 → 상세 → 댓글 작성 · 삭제를 확인합니다.

## 폴더 구조

```
src/
  app/
    page.tsx              홈 피드
    results/page.tsx      검색 결과
    watch/[id]/page.tsx   영상 상세
    api/youtube/          YouTube 프록시 (Route Handler)
    api/comments/         익명 댓글 API
  components/
    ui/                   Button, Skeleton, EmptyState 등 공용 UI
    video/                VideoCard 등 영상 공용 컴포넌트
  features/
    feed/ search/ watch/  영역별 훅 · 컴포넌트
  lib/
    youtube/              API 클라이언트 · 타입
    comments/             댓글 서비스 · 입력 규칙 · 타입
    db/                   DB 클라이언트 · 댓글 스키마
  mocks/                  API 응답 fixture
docs/
  vidlab-plan.html        기획서 · 업무 분장
```

## 담당

| 영역                                        | 경로          | 담당   |
| ------------------------------------------- | ------------- | ------ |
| 세팅 · 공통 레이아웃 · 서버 · 익명 댓글 API | `/api/*`      | 이주혁 |
| 홈 피드                                     | `/`           | 주훈   |
| 검색                                        | `/results`    | 민진   |
| 영상 상세                                   | `/watch/[id]` | 수현   |

## 일정

| 주차      | 목표                                            | 완료 기준                                                      |
| --------- | ----------------------------------------------- | -------------------------------------------------------------- |
| W1 · 기반 | 세팅, 테마, 레이아웃, API 래퍼, mock, 화면 골격 | mock 데이터로 세 화면 이동 가능, 다크/라이트 전환 동작         |
| W2 · 기능 | 실제 API 연동, 익명 댓글 API                    | 실제 API로 피드 · 검색 · 상세 조회 동작, 댓글 작성 · 삭제 확인 |
| W3 · 완성 | 댓글 폼 연결, 필터, 예외 상태, QA, 배포         | 배포 URL에서 데모 시나리오 전체 통과                           |

## 협업 규칙

- 브랜치는 `main` ← `develop` ← `feature/{영역}-{기능}` 순서로 머지합니다. PR마다 리뷰어 1명 이상 승인이 필요합니다
- 공용 컴포넌트(VideoCard, Skeleton)를 고칠 때는 다른 담당자를 리뷰어로 추가합니다
- 커밋 전에 `npm run lint`, `npm run format`을 실행합니다
- PR을 올리면 GitHub Actions(CI)가 `lint` → `format:check` → `test` → `build`를 자동으로 돌립니다. 빨간 ✗가 뜨면 PR 아래 Checks에서 실패한 단계 로그를 보고 고친 뒤 다시 푸시합니다. CI가 통과한 PR만 병합합니다 ([#31](https://github.com/lc-vidlab/vidlab-fe/issues/31))
- 개발 서버(`npm run dev`)에서 잘 돼도 빌드는 실패할 수 있습니다(예: [#29](https://github.com/lc-vidlab/vidlab-fe/issues/29)). 큰 변경은 PR 전에 `npm run build`를 한 번 돌려 봅니다
- 색상은 테마 토큰 클래스(`bg-bg`, `bg-surface`, `text-text`, `text-sub`, `border-border`, `text-accent`)만 씁니다. 하드코딩한 색은 리뷰에서 반려합니다
- `lib/youtube/types.ts`와 Route Handler 응답 형태는 W1 수요일까지 확정하고, 이후 각자 mock으로 개발합니다

## API 할당량 주의

- 기본 할당량은 프로젝트당 하루 `search.list` 100회와 그 외 호출 합산 10,000유닛입니다. 한국 시간 오후 5시(서머타임 기간 오후 4시)에 초기화됩니다
- 검색은 입력 중에 호출하지 않고 제출할 때만 호출하며, 서버에서 캐싱합니다
- API 데이터는 장기 보관하지 않고 캐시는 분~시간 단위로만 유지합니다

자세한 화면 정의, API 매핑, 업무 리스트, 리스크는 [기획서](docs/vidlab-plan.html)를 참고하세요.
