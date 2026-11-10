// 개발용 테스트 페이지 (/dev/*). 배포 전에 src/app/dev 폴더째 삭제한다.
// 삭제를 잊어도 프로덕션 빌드에서는 404가 되도록 막아 둔다.

import { assertDevelopment } from './_components/dev-only';

export default function DevLayout({ children }: LayoutProps<'/dev'>) {
  assertDevelopment();
  return children;
}
