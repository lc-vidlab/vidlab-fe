## 작업 내용
- 목업 데이터 기반 반응형 홈 피드 UI 구현
- 영상 카드, 카테고리 필터, 검색창 배치
- 오른쪽 햄버거 메뉴 및 Lucide 아이콘 적용
- 다크 모드 전환 구현

## 주요 파일
| 파일 | 역할 |
| --- | --- |
| `src/app/page.tsx` | 홈에서 `FeedPage` 렌더링 |
| `src/features/feed/components/FeedPage.tsx` | 헤더, 카테고리 필터, 영상 그리드 |
| `src/components/video/VideoCard.tsx` | 영상 카드 UI |
| `src/features/feed/components/FeedMenu.tsx` | 오른쪽 메뉴와 테마 전환 |
| `src/features/feed/mocks/videos.ts` | 예시 영상 12개, 카테고리 및 `FeedVideo` 타입 |
| `src/app/globals.css` | 기존 테마에 `brand-soft`, `brand-wash` 색상 토큰 추가 |

## 이어서 작업할 부분

### 피드 API 연결
- 현재 `FeedPage`는 `feedVideos`를 불러와 클라이언트에서 카테고리를 필터링합니다.
- 실제 API 연결 시 데이터 조회 부분을 교체하면 됩니다.
- 현재 `FeedVideo`는 UI용 임시 타입입니다. 서버 공통 `Video` 타입과 통일하거나 변환 처리가 필요합니다.
- API 로딩·오류·빈 결과·페이지네이션 처리는 추가해야 합니다.

### 영상 카드
- 사용 방식: `<VideoCard video={video} />`
- 현재 썸네일은 `VIDLAB` 문구로 표시합니다. 실제 썸네일 이미지 연결이 필요합니다.
- 재생시간·조회수·업로드 시점은 mock에 표시용 문자열로 들어 있습니다.
- 클릭 시 `/watch/${video.id}`로 이동합니다. 현재 ID는 mock ID이며 상세·재생 기능은 연결하지 않았습니다.

### 메뉴
- `FeedMenu`의 `onExplore` 콜백을 통해 피드와 연결합니다.
- 홈·인기 영상: 전체 예시 피드로 돌아갑니다.
- 카테고리 탐색: 피드의 카테고리 버튼으로 포커스를 이동합니다.
- 국가별 인기 영상·내 활동: 현재 준비 중 안내만 표시합니다.
- 좋아요 등 내 활동 항목은 UI만 추가했으며 저장 기능은 없습니다.

### 테마
- 현재 `html`의 `dark` 클래스를 전환하는 방식입니다.
- 새로고침 후 유지와 시스템 테마 연동은 아직 없습니다.
- 공통 ThemeProvider 구현 시 해당 방식으로 통합하면 됩니다.

## 공통 사용 및 참고
- 검색창은 기존 `SearchBar` 컴포넌트를 재사용했습니다.
- 공통 헤더가 생기면 `FeedPage`의 로고·검색창·메뉴를 옮기면 됩니다.
- `lucide-react` 의존성이 추가되어 브랜치를 받은 뒤 `npm install`이 필요합니다.
- `next.config.ts`의 `allowedDevOrigins`에는 개인 개발 IP가 등록되어 있습니다. 다른 IP로 접속할 경우 환경에 맞게 조정해 주세요.
- `.env`는 공유하지 않습니다. `.env.example`을 복사해 각자 설정해 주세요.

## 검증
- 린트·빌드 통과
- 기존 테스트 72개 통과
- 브라우저 시각 검수는 미수행
