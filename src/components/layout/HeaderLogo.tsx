'use client';

import Link from 'next/link';
import { requestHomeReset } from './home-reset';

/**
 * 헤더 왼쪽 로고. 홈에서는 새로고침, 다른 화면에서는 처음 상태의 홈으로 이동.
 *
 * 주소는 그리는 중(usePathname)이 아니라 클릭할 때 읽는다. 빌드 때 공통 뼈대를 미리 만들 때
 * /watch/[id]처럼 주소를 모르는 화면에서도 로고를 그릴 수 있어야 하기 때문이다 (#29)
 */
export function HeaderLogo() {
  return (
    <Link
      href="/"
      aria-label="Vidlab 홈"
      onClick={(e) => {
        // 홈에서 누르면 페이지를 새로 불러온다 (새로고침과 같음)
        if (window.location.pathname === '/') {
          e.preventDefault();
          // 브라우저가 스크롤 위치를 기억했다가 되살리므로, 먼저 맨 위로 올리고 새로고침한다
          window.scrollTo({ top: 0 });
          window.location.reload();
          return;
        }
        // 다른 화면에서 누르면 홈으로 이동하면서 홈 화면을 처음 상태로 되돌린다
        requestHomeReset();
      }}
      className="focus-visible:outline-accent flex h-10 shrink-0 items-center justify-self-start rounded-lg px-1 text-xl font-black tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <span className="text-text">Vid</span>
      <span className="text-accent">lab</span>
    </Link>
  );
}
