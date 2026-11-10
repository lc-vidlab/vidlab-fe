'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Suspense,
  useRef,
  useState,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { buildSearchUrl, MAX_QUERY_LENGTH, normalizeQuery, SEARCH_PATH } from '../lib/query';
import {
  addRecentSearch,
  clearRecentSearches,
  removeRecentSearch,
  useRecentSearches,
} from '../lib/recentSearches';

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

function HistoryIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
    >
      <circle cx="12" cy="12" r="8" strokeWidth="2" />
      <path d="M12 8v4l3 2" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function RecentSearchPanel({
  items,
  onSelect,
  onRemove,
  onClear,
}: {
  items: string[];
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="border-border bg-bg absolute top-full right-16 left-0 z-20 mt-1 rounded-xl border py-2">
      <div className="flex items-center justify-between px-4 pb-1">
        <span id="recent-search-title" className="text-sub text-xs">
          최근 검색어
        </span>
        <button type="button" onClick={onClear} className="text-sub hover:text-text text-xs">
          전체 삭제
        </button>
      </div>
      <ul aria-labelledby="recent-search-title">
        {items.map((item) => (
          <li key={item} className="hover:bg-surface flex items-center">
            <button
              type="button"
              onClick={() => onSelect(item)}
              className="text-text flex min-w-0 flex-1 items-center gap-3 px-4 py-2 text-left text-sm"
            >
              <HistoryIcon />
              <span className="truncate">{item}</span>
            </button>
            <button
              type="button"
              onClick={() => onRemove(item)}
              aria-label={`${item} 검색 기록 삭제`}
              className="text-sub hover:text-text mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            >
              <ClearIcon />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SearchForm({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [isPanelOpen, setPanelOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recent = useRecentSearches();

  // 입력값이 있으면 그 글자가 들어간 최근 검색어만 보여준다 (로컬 필터라 API 호출 없음)
  const keyword = normalizeQuery(value).toLowerCase();
  const visibleRecent = keyword ? recent.filter((q) => q.toLowerCase().includes(keyword)) : recent;

  // 입력 중에는 아무 요청도 하지 않는다. 제출(Enter · 버튼 · 최근 검색어 클릭) 시에만 이동한다.
  function search(raw: string) {
    const query = normalizeQuery(raw);
    if (!query) {
      inputRef.current?.focus();
      return;
    }
    setValue(query);
    setPanelOpen(false);
    addRecentSearch(query);
    // 같은 검색어로 다시 제출하면 이동하지 않아 search.list 중복 호출을 막는다.
    if (query === initialQuery) return;
    router.push(buildSearchUrl(query));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    search(value);
  }

  function handleClear() {
    setValue('');
    inputRef.current?.focus();
  }

  function handleRemove(query: string) {
    removeRecentSearch(query);
    // 누른 버튼이 사라져 포커스가 빠지면 패널이 닫히므로 입력창으로 돌려준다
    inputRef.current?.focus();
  }

  function handleBlur(e: FocusEvent<HTMLFormElement>) {
    if (!e.currentTarget.contains(e.relatedTarget)) setPanelOpen(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    if (e.key === 'Escape') setPanelOpen(false);
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      onFocus={() => setPanelOpen(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`relative ${formClass}`}
    >
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
          onChange={(e) => {
            setValue(e.target.value);
            setPanelOpen(true);
          }}
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
      {isPanelOpen && visibleRecent.length > 0 && (
        <RecentSearchPanel
          items={visibleRecent}
          onSelect={search}
          onRemove={handleRemove}
          onClear={() => {
            clearRecentSearches();
            inputRef.current?.focus();
          }}
        />
      )}
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
