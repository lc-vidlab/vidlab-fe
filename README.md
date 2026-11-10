# Vidlab

YouTube Data API v3 기반 영상 탐색 웹 (토이 프로젝트, 4인 팀)

## 실행 방법

```bash
npm install
cp .env.example .env.local
npm run dev
```

브라우저에서 http://localhost:3000 을 엽니다. 개발 기본값은 `USE_MOCK=true`입니다.

## 담당

| 영역                        | 경로          | 담당   |
| --------------------------- | ------------- | ------ |
| 세팅 · 서버 · 익명 댓글 API | -             | 이주혁 |
| 홈 피드                     | `/`           | 주훈   |
| 검색                        | `/results`    | 민진   |
| 영상 상세                   | `/watch/[id]` | 수현   |
