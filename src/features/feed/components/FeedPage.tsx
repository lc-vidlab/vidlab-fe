'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Trash2, X } from 'lucide-react';
import VideoCard from '@/components/video/VideoCard';
import ThemeToggle from '@/components/ui/ThemeToggle';
import SearchBar from '@/features/search/components/SearchBar';
import { fetchFeedPage } from '../api';
import { nextFeedPageToken, uniqueFeedVideos } from '../pagination';
import type { FeedCategory } from '../types';
import {
  clearWatchHistory,
  removeWatchHistory,
  useWatchHistory,
} from '@/lib/history/local-history';

const COUNTRIES = [
  { code: 'KR', label: '대한민국' },
  { code: 'HK', label: '홍콩' },
  { code: 'TW', label: '대만' },
  { code: 'JP', label: '일본' },
  { code: 'IN', label: '인도' },
  { code: 'SA', label: '사우디아라비아' },
  { code: 'ID', label: '인도네시아' },
  { code: 'VN', label: '베트남' },
  { code: 'GB', label: '영국' },
  { code: 'DE', label: '독일' },
  { code: 'FR', label: '프랑스' },
  { code: 'RU', label: '러시아' },
  { code: 'IT', label: '이탈리아' },
  { code: 'ES', label: '스페인' },
  { code: 'US', label: '미국' },
  { code: 'CA', label: '캐나다' },
  { code: 'BR', label: '브라질' },
  { code: 'MX', label: '멕시코' },
  { code: 'AR', label: '아르헨티나' },
  { code: 'AU', label: '호주' },
  { code: 'NZ', label: '뉴질랜드' },
  { code: 'ZA', label: '남아프리카공화국' },
  { code: 'EG', label: '이집트' },
  { code: 'NG', label: '나이지리아' },
  { code: 'KE', label: '케냐' },
] as const;

function flagUrl(code: string) {
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
}

export default function FeedPage() {
  const searchParams = useSearchParams();
  const showHistory = searchParams.get('view') === 'history';
  const watchHistory = useWatchHistory();
  const [categoryId, setCategoryId] = useState('');
  const [regionCode, setRegionCode] = useState('KR');
  const [countryOpen, setCountryOpen] = useState(false);
  const [categories, setCategories] = useState<FeedCategory[]>([]);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const countryRef = useRef<HTMLButtonElement>(null);
  const countryMenuRef = useRef<HTMLDivElement>(null);

  const query = useInfiniteQuery({
    queryKey: ['popular-videos', regionCode, categoryId],
    queryFn: async ({ pageParam }) => {
      const page = await fetchFeedPage({
        regionCode,
        categoryId: categoryId || undefined,
        pageToken: pageParam,
      });
      if (page.categories.length) setCategories(page.categories);
      return page;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: nextFeedPageToken,
    staleTime: 5 * 60 * 1000,
    enabled: !showHistory,
  });

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query;
  const videos = useMemo(() => {
    return uniqueFeedVideos(query.data?.pages ?? []);
  }, [query.data]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    if (!countryOpen) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!countryMenuRef.current?.contains(event.target as Node)) setCountryOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCountryOpen(false);
        countryRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [countryOpen]);

  const selectedCountry = COUNTRIES.find((country) => country.code === regionCode) ?? COUNTRIES[0];

  return (
    <div className="bg-bg min-h-screen">
      <header className="border-border bg-bg sticky top-0 z-20 border-b">
        <div className="mx-auto flex max-w-[1440px] items-center justify-end gap-3 px-6 py-5 sm:px-8 lg:px-12">
          <Link
            href="/"
            aria-label="Vidlab 홈"
            className="text-text hidden text-2xl font-black tracking-tight"
          >
            VIDLAB<span className="text-accent">.</span>
          </Link>
          <div className="max-w-md min-w-0 flex-1">
            <SearchBar />
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-6 pt-8 pb-12 sm:px-8 lg:px-12">
        {showHistory ? (
          <section aria-labelledby="watch-history-heading">
            <div className="mb-7 flex items-center justify-between gap-4">
              <h1 id="watch-history-heading" className="text-text text-xl font-semibold">
                시청 기록
              </h1>
              {watchHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('시청 기록을 모두 삭제할까요?')) clearWatchHistory();
                  }}
                  className="border-border text-sub hover:bg-surface hover:text-text flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <Trash2 aria-hidden="true" size={16} />
                  전체 삭제
                </button>
              )}
            </div>
            {watchHistory.length > 0 && (
              <div className="grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {watchHistory.map((video) => (
                  <div key={video.id} className="relative">
                    <VideoCard video={video} />
                    <button
                      type="button"
                      aria-label={`${video.title} 시청 기록 삭제`}
                      onClick={() => removeWatchHistory(video.id)}
                      className="bg-bg text-sub hover:text-text absolute top-2 left-2 z-10 flex h-8 w-8 items-center justify-center rounded-full shadow"
                    >
                      <X aria-hidden="true" size={17} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            <div className="mb-7 flex items-start gap-2">
              <div ref={countryMenuRef} className="relative shrink-0 text-sm">
                <button
                  ref={countryRef}
                  type="button"
                  aria-label={`국가 선택: ${selectedCountry.label}`}
                  aria-haspopup="listbox"
                  aria-expanded={countryOpen}
                  onClick={() => setCountryOpen((open) => !open)}
                  className="bg-surface hover:text-text focus-visible:outline-accent flex h-9 w-12 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <Image src={flagUrl(selectedCountry.code)} alt="" width={20} height={15} />
                </button>
                {countryOpen && (
                  <div
                    role="listbox"
                    aria-label="국가 선택"
                    className="border-border bg-bg absolute top-full left-0 z-30 mt-1 max-h-80 min-w-52 overflow-y-auto rounded-lg border p-1 shadow-xl"
                  >
                    {COUNTRIES.map((country) => (
                      <button
                        key={country.code}
                        type="button"
                        role="option"
                        aria-selected={regionCode === country.code}
                        onClick={() => {
                          setRegionCode(country.code);
                          setCategoryId('');
                          setCountryOpen(false);
                        }}
                        className={`hover:bg-surface flex w-full items-center gap-3 rounded-md px-3 py-2 text-left ${regionCode === country.code ? 'bg-surface text-text' : 'text-sub'}`}
                      >
                        <Image src={flagUrl(country.code)} alt="" width={20} height={15} />
                        <span>{country.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div aria-hidden="true" className="border-border my-1 h-7 shrink-0 border-l" />
              <nav
                id="feed-categories"
                aria-label="영상 카테고리"
                className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-2"
              >
                <button
                  type="button"
                  aria-pressed={categoryId === ''}
                  onClick={() => setCategoryId('')}
                  className={`focus-visible:outline-accent shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${categoryId === '' ? 'bg-text text-bg' : 'bg-surface text-sub hover:text-text'}`}
                >
                  전체
                </button>
                {categories.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={categoryId === item.id}
                    onClick={() => setCategoryId(item.id)}
                    className={`focus-visible:outline-accent shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${categoryId === item.id ? 'bg-text text-bg' : 'bg-surface text-sub hover:text-text'}`}
                  >
                    {item.title}
                  </button>
                ))}
              </nav>
            </div>

            <p role="status" className="sr-only">
              영상 {videos.length}개
            </p>
            {query.isPending && (
              <p role="status" className="text-sub py-12 text-center">
                인기 영상을 불러오는 중…
              </p>
            )}
            {query.isError && videos.length === 0 && (
              <div role="alert" className="border-border rounded-xl border p-8 text-center">
                <p>{query.error.message}</p>
                <button
                  type="button"
                  disabled={query.isRefetching}
                  onClick={() => void query.refetch()}
                  className="bg-surface mt-4 rounded-lg px-4 py-2 disabled:opacity-50"
                >
                  {query.isRefetching ? '불러오는 중…' : '다시 시도'}
                </button>
              </div>
            )}
            {!query.isPending && !query.isError && videos.length === 0 && !query.hasNextPage && (
              <p role="status" className="text-sub py-12 text-center">
                표시할 영상이 없습니다.
              </p>
            )}
            <div className="grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
            <div ref={sentinelRef} className="min-h-8" aria-hidden="true" />
            {query.isFetchingNextPage && (
              <p role="status" className="text-sub py-6 text-center text-sm">
                영상을 더 불러오는 중…
              </p>
            )}
            {query.isFetchNextPageError && (
              <div role="alert" className="py-6 text-center">
                <p className="text-sub text-sm">
                  기존 영상은 유지됩니다. 다음 영상을 불러오지 못했습니다.
                </p>
                <button
                  type="button"
                  onClick={() => void query.fetchNextPage()}
                  className="border-border text-text hover:bg-surface mt-3 rounded-full border px-4 py-2 text-sm"
                >
                  다시 시도
                </button>
              </div>
            )}
            {!query.isPending && !query.isError && !query.hasNextPage && videos.length > 0 && (
              <p className="text-sub py-6 text-center text-sm">마지막 영상입니다.</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
