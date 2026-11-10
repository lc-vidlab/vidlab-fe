export const categories = ['전체', '여행', '음악', '일상', '요리', '기술', '게임'] as const;
export type FeedCategory = (typeof categories)[number];

export type FeedVideo = {
  id: string;
  title: string;
  category: Exclude<FeedCategory, '전체'>;
  duration: string;
  views: string;
  uploaded: string;
};

// UI 구성을 위한 예시 데이터. 실제 API 연결 시 교체한다.
export const feedVideos: FeedVideo[] = [
  {
    id: 'feed-01',
    title: '여행을 떠나기 전에 알아두면 좋은 작은 팁들',
    category: '여행',
    duration: '12:48',
    views: '12만',
    uploaded: '3일 전',
  },
  {
    id: 'feed-02',
    title: '아무 생각 없이 틀어두기 좋은 오후의 플레이리스트',
    category: '음악',
    duration: '48:32',
    views: '8.4만',
    uploaded: '1일 전',
  },
  {
    id: 'feed-03',
    title: '조금 느리게 시작하는 주말 아침의 기록',
    category: '일상',
    duration: '08:15',
    views: '2.1만',
    uploaded: '2일 전',
  },
  {
    id: 'feed-04',
    title: '집에 있는 재료로 만드는 근사한 한 끼',
    category: '요리',
    duration: '16:24',
    views: '5.6만',
    uploaded: '4일 전',
  },
  {
    id: 'feed-05',
    title: '매일 쓰는 도구, 이렇게 사용하면 더 편해요',
    category: '기술',
    duration: '10:06',
    views: '3.2만',
    uploaded: '1일 전',
  },
  {
    id: 'feed-06',
    title: '주말에 가볍게 즐기기 좋은 게임 모음',
    category: '게임',
    duration: '21:37',
    views: '9.8만',
    uploaded: '5일 전',
  },
  {
    id: 'feed-07',
    title: '골목을 따라 걷다 발견한 나만 알고 싶은 장소',
    category: '여행',
    duration: '14:52',
    views: '4.7만',
    uploaded: '6일 전',
  },
  {
    id: 'feed-08',
    title: '집중이 필요한 순간, 잔잔한 피아노와 함께',
    category: '음악',
    duration: '1:02:18',
    views: '21만',
    uploaded: '1주 전',
  },
  {
    id: 'feed-09',
    title: '나를 위한 공간을 조금씩 바꾸는 하루',
    category: '일상',
    duration: '11:43',
    views: '1.8만',
    uploaded: '3일 전',
  },
  {
    id: 'feed-10',
    title: '실패 없이 완성하는 주말 브런치 레시피',
    category: '요리',
    duration: '09:28',
    views: '6.3만',
    uploaded: '1주 전',
  },
  {
    id: 'feed-11',
    title: '처음 시작하는 사람을 위한 작은 데스크 셋업',
    category: '기술',
    duration: '18:09',
    views: '7.2만',
    uploaded: '2일 전',
  },
  {
    id: 'feed-12',
    title: '친구들과 함께하면 더 재미있는 순간들',
    category: '게임',
    duration: '15:36',
    views: '11만',
    uploaded: '4일 전',
  },
];
