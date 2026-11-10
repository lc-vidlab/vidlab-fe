'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Clock, House, ListClock, X } from 'lucide-react';
import { Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  addSearchHistory,
  removeSearchHistory,
  useSearchHistory,
} from '@/lib/history/local-history';
import { buildSearchUrl, MAX_QUERY_LENGTH, normalizeQuery, SEARCH_PATH } from '../lib/query';

const wrapClass = 'flex w-full max-w-xl items-center gap-2';
const formClass = 'relative flex min-w-0 flex-1 items-center';
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
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const history = useSearchHistory();
  const filteredHistory = useMemo(() => {
    const keyword = value.trim().toLocaleLowerCase();
    return keyword
      ? history.filter((entry) => entry.query.toLocaleLowerCase().includes(keyword))
      : history;
  }, [history, value]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!formRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  function runSearch(query: string) {
    addSearchHistory(query);
    setValue(query);
    setOpen(false);
    if (query !== initialQuery) router.push(buildSearchUrl(query));
  }

  // 입력 중에는 아무 요청도 하지 않는다. 제출(Enter · 버튼) 시에만 이동한다.
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const query = normalizeQuery(value);
    if (!query) {
      inputRef.current?.focus();
      return;
    }
    runSearch(query);
    // 같은 검색어로 다시 제출하면 이동하지 않아 search.list 중복 호출을 막는다.
  }

  function handleClear() {
    setValue('');
    inputRef.current?.focus();
  }

  return (
    <form ref={formRef} role="search" onSubmit={handleSubmit} className={formClass}>
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
          onFocus={() => setOpen(true)}
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
      {open && (
        <div className="border-border bg-bg absolute top-full right-0 left-0 z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border p-2 shadow-xl">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push('/?view=history');
            }}
            className="text-text hover:bg-surface flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm"
          >
            <ListClock aria-hidden="true" size={18} className="text-sub shrink-0" />
            시청 기록
          </button>
          {filteredHistory.map((entry) => (
            <div key={entry.query} className="hover:bg-surface flex items-center rounded-lg">
              <button
                type="button"
                onClick={() => runSearch(entry.query)}
                className="text-text flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left text-sm"
              >
                <Clock aria-hidden="true" size={17} className="text-sub shrink-0" />
                <span className="truncate">{entry.query}</span>
              </button>
              <button
                type="button"
                aria-label={`${entry.query} 검색 기록 삭제`}
                onClick={(event) => {
                  event.stopPropagation();
                  removeSearchHistory(entry.query);
                }}
                className="text-sub hover:text-text mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              >
                <X aria-hidden="true" size={17} />
              </button>
            </div>
          ))}
        </div>
      )}
    </form>
  );
}

function SearchBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = pathname === SEARCH_PATH ? normalizeQuery(searchParams.get('q')) : '';
  // URL의 검색어가 바뀌면(뒤로가기 등) key로 폼을 다시 만들어 입력값을 URL과 맞춘다.
  return (
    <div className={wrapClass}>
      <Link
        href="/"
        aria-label="홈으로 이동"
        className="text-sub hover:bg-surface hover:text-text focus-visible:outline-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-full focus-visible:outline-2"
      >
        <House aria-hidden="true" size={20} />
      </Link>
      <SearchForm key={query} initialQuery={query} />
    </div>
  );
}

function SearchBarFallback() {
  return (
    <div className={wrapClass} aria-hidden="true">
      <div className="h-10 w-10 shrink-0" />
      <div className={formClass}>
        <div className={inputWrapClass}>
          <span className="text-sub">검색</span>
        </div>
        <div className={submitClass}>
          <SearchIcon />
        </div>
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
