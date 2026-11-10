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

Next.js (App Router) · React · TypeScript · Tailwind CSS v4 · TanStack Query · next-themes · Supabase(Postgres, 익명 댓글 저장 예정) · Vercel 배포

## 실행 방법

```bash
npm install
cp .env.example .env.local
npm run dev
```

브라우저에서 http://localhost:3000 을 엽니다.

### 환경변수

| 이름              | 설명                                                                             |
| ----------------- | -------------------------------------------------------------------------------- |
| `YOUTUBE_API_KEY` | YouTube Data API v3 키. 서버에서만 사용하며 `NEXT_PUBLIC_`으로 노출하지 않습니다 |
| `USE_MOCK`        | `true`면 실제 API 대신 `src/mocks`의 fixture를 씁니다. 개발 기본값은 `true`      |
| `DATABASE_URL`    | 익명 댓글 DB 연결 주소                                                           |
| `IP_HASH_SALT`    | 댓글 작성자 IP를 해시할 때 쓰는 솔트                                             |

실제 API는 개인 GCP 프로젝트 키로만 테스트하고, 팀 키는 배포에만 씁니다.

### 스크립트

| 명령             | 설명          |
| ---------------- | ------------- |
| `npm run dev`    | 개발 서버     |
| `npm run build`  | 프로덕션 빌드 |
| `npm run lint`   | ESLint 검사   |
| `npm run format` | Prettier 포맷 |

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
- 색상은 테마 토큰 클래스(`bg-bg`, `bg-surface`, `text-text`, `text-sub`, `border-border`, `text-accent`)만 씁니다. 하드코딩한 색은 리뷰에서 반려합니다
- `lib/youtube/types.ts`와 Route Handler 응답 형태는 W1 수요일까지 확정하고, 이후 각자 mock으로 개발합니다

## API 할당량 주의

- 기본 할당량은 프로젝트당 하루 `search.list` 100회와 그 외 호출 합산 10,000유닛입니다. 한국 시간 오후 5시(서머타임 기간 오후 4시)에 초기화됩니다
- 검색은 입력 중에 호출하지 않고 제출할 때만 호출하며, 서버에서 캐싱합니다
- API 데이터는 장기 보관하지 않고 캐시는 분~시간 단위로만 유지합니다

자세한 화면 정의, API 매핑, 업무 리스트, 리스크는 [기획서](docs/vidlab-plan.html)를 참고하세요.
