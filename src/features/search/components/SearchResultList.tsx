'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { fetchSearchPage } from '../api';
import { isQuotaError, isRetryableError } from '../errors';
import { toPublishedAfter, type SearchFilters } from '../lib/filters';
import SearchResultCard, { SearchResultCardSkeleton } from './SearchResultCard';

const SKELETON_COUNT = 4;
/** 한 번에 불러올 검색 결과 수. 더 보기를 누르면 다음 10개를 불러온다 */
const PAGE_SIZE = 10;

function SkeletonList() {
  return (
    <ul className="space-y-4">
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <SearchResultCardSkeleton key={i} />
      ))}
    </ul>
  );
}

function StateMessage({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div
      role="status"
      className="border-border flex flex-col items-center gap-2 rounded-xl border px-4 py-12 text-center"
    >
      <p className="text-text font-medium">{title}</p>
      {children}
    </div>
  );
}

export default function SearchResultList({
  query,
  filters,
}: {
  query: string;
  filters: SearchFilters;
}) {
  // 더 보기로 다음 페이지를 불러올 때도 같은 기준 시각을 쓰도록 처음 한 번만 계산한다
  const [publishedAfter] = useState(() => toPublishedAfter(filters.period));
  const {
    data,
    error,
    isPending,
    isError,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useInfiniteQuery({
    // 기간 필터는 시각이 아니라 period 값으로 캐시를 구분한다
    queryKey: ['search', query, filters.order, filters.period],
    queryFn: ({ pageParam, signal }) =>
      fetchSearchPage(
        {
          q: query,
          order: filters.order,
          publishedAfter,
          pageToken: pageParam,
          maxResults: PAGE_SIZE,
        },
        signal,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextPageToken ?? undefined,
    // 같은 검색어는 1시간 동안 다시 요청하지 않고 캐시에도 남겨 둔다 (search.list 하루 100회 할당량 보호).
    // 전역 기본값(1분 · 5분)보다 길게 둔다. 전역 설정은 src/app/providers.tsx
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    // 할당량 초과 · 잘못된 요청은 재시도해도 실패하므로 바로 안내한다. 그 외 오류는 1회만 재시도.
    retry: (failureCount, err) => isRetryableError(err) && failureCount < 1,
  });

  if (isPending) {
    return (
      <div aria-busy="true">
        <span className="sr-only">검색 결과를 불러오는 중</span>
        <SkeletonList />
      </div>
    );
  }

  if (isError && !isFetchNextPageError) {
    if (isQuotaError(error)) {
      return (
        <StateMessage title="오늘 검색 가능 횟수를 모두 사용했어요">
          <p className="text-sub text-sm">
            검색 할당량은 매일 오후 5시(한국 시간)에 초기화됩니다. 그때 다시 시도해 주세요.
          </p>
        </StateMessage>
      );
    }
    return (
      <StateMessage title="검색 결과를 불러오지 못했어요">
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="border-border text-text hover:bg-surface mt-2 rounded-full border px-4 py-2 text-sm disabled:opacity-50"
        >
          {isRefetching ? '다시 시도하는 중…' : '다시 시도'}
        </button>
      </StateMessage>
    );
  }

  // YouTube 검색은 다음 페이지에 이전 페이지와 같은 영상을 다시 줄 때가 있어서 id 기준으로 한 번만 보여준다
  const seen = new Set<string>();
  const videos = data.pages
    .flatMap((page) => page.items)
    .filter((video) => !seen.has(video.id) && seen.add(video.id));

  if (videos.length === 0) {
    return (
      <StateMessage title="검색 결과가 없어요">
        <p className="text-sub text-sm">
          {filters.period !== 'all'
            ? '기간을 넓히거나 다른 검색어를 입력해 보세요.'
            : '다른 검색어를 입력하거나 철자를 확인해 주세요.'}
        </p>
      </StateMessage>
    );
  }

  return (
    <div>
      <ul className="space-y-4">
        {videos.map((video) => (
          <SearchResultCard key={video.id} video={video} />
        ))}
        {isFetchingNextPage &&
          Array.from({ length: 2 }, (_, i) => <SearchResultCardSkeleton key={`more-${i}`} />)}
      </ul>

      <div className="mt-6 flex flex-col items-center gap-2">
        {isFetchNextPageError && (
          <p role="alert" className="text-sub text-sm">
            {isQuotaError(error)
              ? '오늘 검색 가능 횟수를 모두 사용해서 더 불러올 수 없어요.'
              : '결과를 더 불러오지 못했어요.'}
          </p>
        )}
        {hasNextPage ? (
          <button
            type="button"
            onClick={() => fetchNextPage()}
            // 불러오는 중에는 비활성화해 같은 페이지 중복 요청을 막는다
            disabled={isFetchingNextPage}
            className="border-border text-text hover:bg-surface rounded-full border px-6 py-2 text-sm font-medium disabled:opacity-50"
          >
            {isFetchingNextPage ? '불러오는 중…' : isFetchNextPageError ? '다시 시도' : '더 보기'}
          </button>
        ) : (
          <p className="text-sub text-sm">마지막 검색 결과입니다.</p>
        )}
      </div>
    </div>
  );
}
