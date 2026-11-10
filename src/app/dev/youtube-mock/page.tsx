// 개발용: mock 서비스 함수 호출 결과 확인. 배포 전에 src/app/dev 폴더째 삭제한다.

import { mockService } from '@/lib/youtube/mock';

import { assertDevelopment } from '../_components/dev-only';
import { YouTubePlayground } from '../_components/youtube-playground';

export default function YouTubeMockPage({ searchParams }: PageProps<'/dev/youtube-mock'>) {
  assertDevelopment();
  return (
    <YouTubePlayground
      title="YouTube mock 테스트"
      service={mockService}
      searchParams={searchParams}
      description={
        <>
          <p>
            USE_MOCK 값과 관계없이 항상 mock 데이터(src/mocks/youtube.ts)를 씁니다. API 키와
            할당량이 필요 없습니다.
          </p>
          <p>
            에러 재현: 검색어 <code>__quota__</code>(할당량 초과), <code>__error__</code>(서버
            오류), 카테고리 19 · 27(인기 차트 없음), 없는 영상 id
          </p>
        </>
      }
    />
  );
}
