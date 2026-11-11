// 익명 댓글 mock 데이터 (COMMENTS_USE_MOCK 모드에서 사용). 모두 지어낸 데이터다.
//
// - mock-vid-01에 댓글 25개: 첫 페이지 20개 + 다음 페이지 5개로 페이지 넘김을 확인한다
// - 다른 영상은 댓글 0개
// - 작성 시각은 서버 시작 시각 기준 상대 시간
// - 모든 mock 댓글의 비밀번호는 1234 (삭제 기능 CMT-04 확인용)
//
// 결정 근거: https://github.com/lc-vidlab/vidlab-fe/issues/19

/** 댓글이 있는 mock 영상 */
export const MOCK_COMMENTED_VIDEO_ID = 'mock-vid-01';

/** 이 내용으로 작성하면 서버 오류(500)를 재현한다 */
export const MOCK_COMMENT_ERROR_CONTENT = '__error__';

/** 비밀번호 '1234'의 bcrypt 해시 */
export const MOCK_COMMENT_PASSWORD_HASH =
  '$2b$10$ARy9dhOND64HqeegZD.XOeYKC0qj7s1ihka2koudYFJhb8k7SSVF2';

const NICKNAMES = ['영상러버', '지나가던사람', '구독자1', 'dev_kim', '야식킬러'];

const CONTENTS = [
  '좋은 영상 감사합니다!',
  '이 부분 설명이 정말 이해하기 쉬웠어요.',
  '두 번째 보는데도 재밌네요 😀',
  '혹시 다음 편은 언제 올라오나요?',
  '첫 줄\n둘째 줄처럼 줄바꿈이 있는 댓글도 이렇게 보여요.',
];

export type MockCommentSeed = {
  nickname: string;
  content: string;
  /** 서버 시작 시각 기준 몇 분 전 */
  minutesAgo: number;
};

/** 오래된 것부터. 저장소에 이 순서로 넣으면 마지막 댓글이 가장 큰 id(최신)가 된다 */
export const MOCK_COMMENT_SEEDS: MockCommentSeed[] = Array.from({ length: 25 }, (_, i) => ({
  nickname: NICKNAMES[i % NICKNAMES.length],
  content: `${CONTENTS[i % CONTENTS.length]} (#${i + 1})`,
  minutesAgo: (25 - i) * 37,
}));
