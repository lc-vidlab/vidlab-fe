// YouTube mock 데이터 (USE_MOCK 모드에서 사용).
//
// - 제목 · 채널 · 조회수는 모두 지어낸 데이터다. YouTube API 데이터를 저장하지 않는다.
// - 썸네일 · 아바타는 picsum.photos 이미지(같은 seed면 항상 같은 이미지)다.
// - 영상 id는 실제 YouTube 영상이 아니라서 IFrame 플레이어로 재생되지 않는다.
// - 업로드 시점은 서버 시작 시각 기준 상대 시간이라, 기간 필터를 언제든 확인할 수 있다.
// - 영상을 추가할 때는 ROWS에 새 id로 한 줄을 더한다. 기존 id는 바꾸지 않는다. (표 형태 유지를 위해 prettier-ignore)
//
// 결정 근거: https://github.com/lc-vidlab/vidlab-fe/issues/4

import type { Channel, Video, VideoCategory } from '@/lib/youtube/types';

/** 실제 API(regionCode=KR, hl=ko)와 같은 카테고리 목록 */
export const MOCK_CATEGORIES: VideoCategory[] = [
  { id: '1', title: '영화/애니메이션' },
  { id: '2', title: '자동차' },
  { id: '10', title: '음악' },
  { id: '15', title: '반려동물/동물' },
  { id: '17', title: '스포츠' },
  { id: '19', title: '여행/이벤트' },
  { id: '20', title: '게임' },
  { id: '22', title: '인물/블로그' },
  { id: '23', title: '코미디' },
  { id: '24', title: '엔터테인먼트' },
  { id: '25', title: '뉴스/정치' },
  { id: '26', title: '노하우/스타일' },
  { id: '27', title: '교육' },
  { id: '28', title: '과학기술' },
];

/** 실제 API에서 한국 인기 차트가 없는 카테고리. 인기 영상을 요청하면 NOT_FOUND */
export const MOCK_CATEGORIES_WITHOUT_CHART = new Set(['19', '27']);

const avatar = (seed: string) => `https://picsum.photos/seed/vidlab-${seed}/88/88`;
const thumbnail = (seed: string) => `https://picsum.photos/seed/vidlab-${seed}/640/360`;

// prettier-ignore
const CHANNELS = {
  tune:    { id: 'mock-ch-tune',    title: '튠박스',               avatarUrl: avatar('ch-tune'),    subscriberCount: 1_820_000 },
  play:    { id: 'mock-ch-play',    title: '플레이그라운드 게임즈', avatarUrl: avatar('ch-play'),    subscriberCount: 640_000 },
  paw:     { id: 'mock-ch-paw',     title: '말랑발바닥',           avatarUrl: avatar('ch-paw'),     subscriberCount: 312_000 },
  dev:     { id: 'mock-ch-dev',     title: '코드 한 스푼',         avatarUrl: avatar('ch-dev'),     subscriberCount: 98_400 },
  news:    { id: 'mock-ch-news',    title: '오늘의 브리핑',        avatarUrl: avatar('ch-news'),    subscriberCount: 2_450_000 },
  kitchen: { id: 'mock-ch-kitchen', title: '자취생 키친',          avatarUrl: avatar('ch-kitchen'), subscriberCount: 156_000 },
  sport:   { id: 'mock-ch-sport',   title: '하이라이트 존',        avatarUrl: avatar('ch-sport'),   subscriberCount: 870_000 },
  // 구독자 수를 숨긴 채널
  vlog:    { id: 'mock-ch-vlog',    title: '느린 하루',            avatarUrl: avatar('ch-vlog') },
  // 아바타를 못 가져온 경우(채널 보강 실패)를 흉내 낸 채널
  laugh:   { id: 'mock-ch-laugh',   title: '웃음 연구소',          avatarUrl: '' },
} satisfies Record<string, Channel>;

type Row = [
  /** 한 번 정하면 바꾸지 않는다. 테스트 · 안내 문서 · 썸네일 seed가 이 id를 쓴다 */
  id: string,
  title: string,
  channel: keyof typeof CHANNELS,
  categoryId: string,
  /** 서버 시작 시각 기준 몇 시간 전에 올렸는지 */
  hoursAgo: number,
  /** 0이면 라이브 등 재생시간 없음 */
  durationSec: number,
  /** 0이면 조회수를 숨긴 영상 */
  viewCount: number,
  /** 생략하면 true */
  embeddable?: boolean,
];

// prettier-ignore
const ROWS: Row[] = [
  // id               제목                                                                    채널       카테고리  시간 전  재생(초)  조회수
  ['mock-video-01', '새벽 감성 플레이리스트 | 공부할 때 듣는 로파이 1시간',                       'tune',    '10',     3,      3612,     1_284_000],
  ['mock-video-02', '인디 밴드 신곡 라이브 클립 모음',                                           'tune',    '10',     30,     742,      214_500],
  ['mock-video-03', '[LIVE] 금요일 밤 신청곡 라디오',                                            'tune',    '10',     1,      0,        8_900],
  ['mock-video-04', '피아노 커버로 듣는 애니메이션 OST 메들리',                                   'tune',    '1',      120,    1265,     3_402_000],
  ['mock-video-05', '영화 리뷰: 올해 꼭 봐야 할 애니메이션 3편',                                  'tune',    '1',      45,     1004,     287_000],
  ['mock-video-06', '신작 RPG 첫인상 리뷰, 이 게임 할 만할까?',                                   'play',    '20',     6,      1088,     452_000],
  ['mock-video-07', '인디 게임 10개 1분씩 해 보기',                                              'play',    '20',     52,     734,      98_700],
  ['mock-video-08', '레이드 공략 완벽 정리 (초보자용)',                                           'play',    '20',     200,    2410,     1_051_000],
  ['mock-video-09', '게임 속 물리 엔진은 어떻게 동작할까',                                        'play',    '28',     340,    965,      233_000],
  ['mock-video-10', '구독자 이벤트 공지',                                                       'play',    '22',     900,    33,       15_400],
  ['mock-video-11', '고양이가 처음 눈을 봤을 때 반응',                                            'paw',     '15',     12,     184,      2_780_000],
  ['mock-video-12', '강아지 산책 브이로그 | 한강 공원 편',                                        'paw',     '15',     75,     612,      341_000],
  ['mock-video-13', '햄스터 미로 탈출 챌린지',                                                   'paw',     '15',     410,    297,      5_120_000],
  ['mock-video-14', 'React 서버 컴포넌트 10분 만에 이해하기',                                     'dev',     '28',     20,     642,      64_300],
  ['mock-video-15', 'TypeScript 제네릭, 이것만 알면 된다',                                        'dev',     '27',     96,     1534,     128_000],
  ['mock-video-16', '주니어 개발자 포트폴리오 리뷰 라이브',                                        'dev',     '27',     260,    5420,     41_200],
  ['mock-video-17', 'CSS 다크 모드, 깜빡임 없이 만드는 법',                                       'dev',     '28',     600,    803,      87_500],
  ['mock-video-18', '이 영상 제목은 아주 길어서 두 줄을 넘어가면 말줄임표로 잘려야 합니다. 카드 레이아웃 확인용 긴 제목 테스트', 'dev', '28', 4, 59, 1_200],
  ['mock-video-19', '오늘의 주요 뉴스 5분 요약',                                                 'news',    '25',     2,      312,      610_000],
  ['mock-video-20', '경제 브리핑: 금리와 환율 한눈에 보기',                                       'news',    '25',     26,     528,      403_000],
  ['mock-video-21', '날씨 특보 | 주말 전국 비 소식',                                             'news',    '25',     8,      145,      1_920_000, false],
  ['mock-video-22', '전기차 한 달 타 본 솔직 후기',                                               'news',    '2',      110,    1166,     648_000],
  ['mock-video-23', '자취생 만 원으로 일주일 식단 짜기',                                          'kitchen', '26',     40,     1123,     772_000],
  ['mock-video-24', '전자레인지 하나로 만드는 계란찜',                                            'kitchen', '26',     150,    268,      2_310_000],
  ['mock-video-25', '편의점 신상 디저트 전부 먹어 봤습니다',                                       'kitchen', '24',     18,     934,      1_405_000],
  ['mock-video-26', '주말 축구 하이라이트 | 극장골 모음',                                         'sport',   '17',     14,     486,      3_880_000],
  ['mock-video-27', '마라톤 완주 도전기 (42.195km)',                                             'sport',   '17',     180,    1712,     156_000],
  ['mock-video-28', '농구 슈팅 자세 교정 꿀팁',                                                  'sport',   '17',     520,    655,      92_300],
  ['mock-video-29', '자동차 초보가 알아야 할 계기판 경고등',                                       'sport',   '2',      700,    721,      534_000],
  ['mock-video-30', '혼자 떠난 제주도 3박 4일',                                                  'vlog',    '19',     60,     1840,     204_000],
  ['mock-video-31', '출근 전 아침 루틴 브이로그',                                                 'vlog',    '22',     22,     723,      0],
  ['mock-video-32', '비 오는 날 카페에서 책 읽기',                                                'vlog',    '22',     230,    1502,     61_800],
  ['mock-video-33', '조용한 동네 산책 ASMR',                                                     'vlog',    '22',     480,    2734,     112_000],
  ['mock-video-34', '상황극: 회의 시간에 꼭 있는 사람들',                                          'laugh',   '23',     5,      402,      1_560_000],
  ['mock-video-35', '1분 만에 웃기기 챌린지 실패 모음',                                            'laugh',   '23',     90,     61,       4_210_000],
  ['mock-video-36', '예능 명장면 다시 보기 | 레전드 편',                                           'laugh',   '24',     300,    1388,     6_730_000],
];

/** 서버 시작 시각. 업로드 시점 계산의 기준 */
const NOW = Date.now();
const HOUR = 60 * 60 * 1000;

export const MOCK_VIDEOS: Video[] = ROWS.map(
  ([id, title, channel, categoryId, hoursAgo, durationSec, viewCount, embeddable = true]) => ({
    id,
    title,
    description: `${title}\n\nVidlab mock 데이터입니다. 설명 펼치기/접기를 확인할 수 있도록 여러 줄로 작성했습니다.\n\n#vidlab #mock`,
    thumbnailUrl: thumbnail(id),
    publishedAt: new Date(NOW - hoursAgo * HOUR).toISOString(),
    durationSec,
    viewCount,
    categoryId,
    embeddable,
    channel: CHANNELS[channel],
  }),
);

/** 화면 예외 상태를 확인할 때 쓰는 mock 영상 id. 테스트와 안내 문서도 이 이름으로 참조한다 */
export const MOCK_IDS = {
  /** 임베드 불가 (embeddable: false) */
  notEmbeddable: 'mock-video-21',
  /** 라이브 (재생시간 0) */
  live: 'mock-video-03',
  /** 조회수 숨김 (0) */
  hiddenViewCount: 'mock-video-31',
  /** 두 줄을 넘는 긴 제목 */
  longTitle: 'mock-video-18',
  /** 인기 차트가 없는 카테고리(27 교육) → 관련 영상 빈 목록 */
  noRelated: 'mock-video-15',
} as const;
