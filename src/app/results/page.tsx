import { Suspense } from 'react';
import SearchFilterBar from '@/features/search/components/SearchFilterBar';
import SearchResultList from '@/features/search/components/SearchResultList';
import { parseFilters } from '@/features/search/lib/filters';
import { normalizeQuery } from '@/features/search/lib/query';

async function SearchResults({
  searchParams,
}: {
  searchParams: PageProps<'/results'>['searchParams'];
}) {
  const { q, order, period } = await searchParams;
  const query = normalizeQuery(Array.isArray(q) ? q[0] : q);
  const filters = parseFilters({ order, period });

  if (!query) {
    return <p className="text-sub">검색어를 입력해 주세요.</p>;
  }

  return (
    <section aria-labelledby="results-heading">
      <h1 id="results-heading" className="text-text text-lg font-semibold">
        &lsquo;{query}&rsquo; 검색 결과
      </h1>
      <div className="mt-4">
        <SearchFilterBar query={query} filters={filters} />
      </div>
      <div className="mt-6">
        {/* 검색어 · 필터가 바뀌면 목록 상태를 새로 시작한다 */}
        <SearchResultList
          key={`${query}|${filters.order}|${filters.period}`}
          query={query}
          filters={filters}
        />
      </div>
    </section>
  );
}

export default function ResultsPage({ searchParams }: PageProps<'/results'>) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
      <Suspense fallback={<p className="text-sub">불러오는 중…</p>}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
