'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import {
  ORDER_OPTIONS,
  PERIOD_OPTIONS,
  type SearchFilters,
  type SearchPeriod,
} from '../lib/filters';
import { buildSearchUrl } from '../lib/query';
import type { SearchOrder } from '@/lib/youtube/types';

type Props = { query: string; filters: SearchFilters };

function OptionGroup<T extends string>({
  label,
  options,
  value,
  disabled,
  onSelect,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  disabled: boolean;
  onSelect: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      <span className="text-sub text-xs">{label}</span>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onSelect(option.value)}
            className={
              selected
                ? 'bg-text text-bg rounded-lg px-3 py-1.5 text-sm font-medium'
                : 'bg-surface text-text rounded-lg px-3 py-1.5 text-sm disabled:opacity-50'
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 정렬 · 기간 필터. 값은 URL(?order= &period=)에 저장한다.
 * 필터를 바꿀 때마다 search.list를 1회 쓰므로, 같은 값을 다시 누르면 아무것도 하지 않는다.
 */
export default function SearchFilterBar({ query, filters }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function apply(next: Partial<SearchFilters>) {
    const merged = { ...filters, ...next };
    if (merged.order === filters.order && merged.period === filters.period) return;
    startTransition(() => {
      router.push(buildSearchUrl(query, merged), { scroll: false });
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-6">
      <OptionGroup<SearchOrder>
        label="정렬"
        options={ORDER_OPTIONS}
        value={filters.order}
        disabled={isPending}
        onSelect={(order) => apply({ order })}
      />
      <OptionGroup<SearchPeriod>
        label="업로드 날짜"
        options={PERIOD_OPTIONS}
        value={filters.period}
        disabled={isPending}
        onSelect={(period) => apply({ period })}
      />
    </div>
  );
}
