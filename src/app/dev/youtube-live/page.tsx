// 개발용: 실제 YouTube API 호출 결과 확인. 배포 전에 src/app/dev 폴더째 삭제한다.

import * as live from '@/lib/youtube/live';

import { assertDevelopment } from '../_components/dev-only';
import { YouTubePlayground } from '../_components/youtube-playground';

export default function YouTubeLivePage({ searchParams }: PageProps<'/dev/youtube-live'>) {
  assertDevelopment();
  return (
    <YouTubePlayground
      title="YouTube 실제 API 테스트"
      service={live}
      searchParams={searchParams}
      description={
        <>
          <p>
            USE_MOCK 값과 관계없이 항상 실제 API를 호출합니다. .env.local의 YOUTUBE_API_KEY(개인
            키)가 필요합니다.
          </p>
          <p className="font-semibold">
            할당량 주의: 검색(searchVideos)은 하루 100회 한도입니다. 다른 함수는 호출당 1~2유닛(하루
            10,000유닛)입니다. 새로고침해도 다시 호출됩니다.
          </p>
        </>
      }
    />
  );
}
