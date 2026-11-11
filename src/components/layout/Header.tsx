import SearchBar from '@/features/search/components/SearchBar';
import { HeaderLogo } from './HeaderLogo';

/**
 * 모든 화면 위에 붙는 공통 헤더 (SET-03).
 * 왼쪽 로고, 가운데 검색창(민진 님 SearchBar 그대로 사용).
 */
export function Header() {
  return (
    <header className="bg-bg border-border sticky top-0 z-40 border-b">
      <div className="mx-auto flex h-14 w-full max-w-[1720px] items-center gap-4 px-4 md:grid md:grid-cols-[1fr_minmax(0,36rem)_1fr] lg:px-6">
        <HeaderLogo />
        <div className="flex min-w-0 flex-1 justify-center">
          <SearchBar />
        </div>
      </div>
    </header>
  );
}
