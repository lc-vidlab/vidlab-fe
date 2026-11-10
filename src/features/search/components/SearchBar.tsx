'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useRef, useState, type FormEvent } from 'react';
import { buildSearchUrl, MAX_QUERY_LENGTH, normalizeQuery, SEARCH_PATH } from '../lib/query';

const formClass = 'flex w-full max-w-xl items-center';
const inputWrapClass =
  'flex h-10 min-w-0 flex-1 items-center rounded-l-full border border-border bg-bg pr-1 pl-4 focus-within:border-accent';
const submitClass =
  'flex h-10 w-16 shrink-0 items-center justify-center rounded-r-full border border-l-0 border-border bg-surface text-text';

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
    >
      <circle cx="11" cy="11" r="7" strokeWidth="2" />
      <path d="m20 20-4-4" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
    >
      <path d="M6 6l12 12M18 6 6 18" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SearchForm({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  // 입력 중에는 아무 요청도 하지 않는다. 제출(Enter · 버튼) 시에만 이동한다.
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const query = normalizeQuery(value);
    if (!query) {
      inputRef.current?.focus();
      return;
    }
    setValue(query);
    // 같은 검색어로 다시 제출하면 이동하지 않아 search.list 중복 호출을 막는다.
    if (query === initialQuery) return;
    router.push(buildSearchUrl(query));
  }

  function handleClear() {
    setValue('');
    inputRef.current?.focus();
  }

  return (
    <form role="search" onSubmit={handleSubmit} className={formClass}>
      <div className={inputWrapClass}>
        <label htmlFor="header-search" className="sr-only">
          검색어
        </label>
        <input
          ref={inputRef}
          id="header-search"
          type="search"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={MAX_QUERY_LENGTH}
          placeholder="검색"
          autoComplete="off"
          enterKeyHint="search"
          className="text-text placeholder:text-sub h-full min-w-0 flex-1 bg-transparent outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="검색어 지우기"
            className="text-sub hover:bg-surface hover:text-text flex h-8 w-8 items-center justify-center rounded-full"
          >
            <ClearIcon />
          </button>
        )}
      </div>
      <button type="submit" aria-label="검색" className={submitClass}>
        <SearchIcon />
      </button>
    </form>
  );
}

function SearchBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = pathname === SEARCH_PATH ? normalizeQuery(searchParams.get('q')) : '';
  // URL의 검색어가 바뀌면(뒤로가기 등) key로 폼을 다시 만들어 입력값을 URL과 맞춘다.
  return <SearchForm key={query} initialQuery={query} />;
}

function SearchBarFallback() {
  return (
    <div className={formClass} aria-hidden="true">
      <div className={inputWrapClass}>
        <span className="text-sub">검색</span>
      </div>
      <div className={submitClass}>
        <SearchIcon />
      </div>
    </div>
  );
}

/** 헤더 검색창. useSearchParams를 쓰므로 Suspense로 감싸서 내보낸다. */
export default function SearchBar() {
  return (
    <Suspense fallback={<SearchBarFallback />}>
      <SearchBarInner />
    </Suspense>
  );
}
