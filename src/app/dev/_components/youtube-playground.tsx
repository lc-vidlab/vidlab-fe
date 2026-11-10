// 개발용 YouTube 서비스 테스트 화면. 배포 전에 src/app/dev 폴더째 삭제한다.
//
// 폼은 GET 방식이라 URL에 파라미터가 남는다. 그 URL을 공유하면 같은 결과를 다시 볼 수 있다.

/* eslint-disable @next/next/no-img-element -- 개발용 화면이라 next/image 설정 없이 원본 이미지를 그대로 쓴다 */

import { Suspense, type ReactNode } from 'react';

import { toYouTubeApiError } from '@/lib/youtube/errors';
import type * as live from '@/lib/youtube/live';
import type { ApiError, SearchOrder, Video } from '@/lib/youtube/types';

import { assertDevelopment } from './dev-only';

type YouTubeService = typeof live;
type SearchParams = Record<string, string | string[] | undefined>;

type Props = {
  title: string;
  description: ReactNode;
  service: YouTubeService;
  searchParams: Promise<SearchParams>;
};

const FUNCTIONS = ['popular', 'categories', 'search', 'video', 'related'] as const;
type FunctionName = (typeof FUNCTIONS)[number];

export function YouTubePlayground({ title, description, service, searchParams }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="text-sub text-sm">{description}</div>
      </header>

      <Forms />

      <Suspense fallback={<p className="text-sub">호출 중...</p>}>
        <Result service={service} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* 입력 폼                                                                     */
/* -------------------------------------------------------------------------- */

const inputClass = 'border-border bg-bg rounded border px-2 py-1 text-sm';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="text-sub flex flex-col gap-1 text-xs">
      {label}
      {children}
    </label>
  );
}

function FunctionForm({
  fn,
  label,
  children,
}: {
  fn: FunctionName;
  label: string;
  children?: ReactNode;
}) {
  return (
    <form
      method="get"
      className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-4"
    >
      <input type="hidden" name="fn" value={fn} />
      <h2 className="font-mono text-sm font-semibold">{label}</h2>
      {children && <div className="grid grid-cols-2 gap-2">{children}</div>}
      <button
        type="submit"
        className="border-border bg-bg text-accent self-start rounded border px-3 py-1 text-sm font-semibold"
      >
        호출
      </button>
    </form>
  );
}

function Forms() {
  return (
    <section className="grid gap-3 md:grid-cols-2">
      <FunctionForm fn="popular" label="getPopularVideos">
        <Field label="categoryId">
          <input name="categoryId" placeholder="예: 10" className={inputClass} />
        </Field>
        <Field label="maxResults">
          <input name="maxResults" type="number" placeholder="기본 24" className={inputClass} />
        </Field>
        <Field label="pageToken">
          <input name="pageToken" className={inputClass} />
        </Field>
      </FunctionForm>

      <FunctionForm fn="search" label="searchVideos">
        <Field label="q (필수)">
          <input name="q" required className={inputClass} />
        </Field>
        <Field label="order">
          <select name="order" className={inputClass}>
            <option value="">relevance (기본)</option>
            <option value="date">date</option>
            <option value="viewCount">viewCount</option>
          </select>
        </Field>
        <Field label="publishedAfter">
          <select name="publishedAfter" className={inputClass}>
            <option value="">전체</option>
            <option value="1">오늘 (24시간)</option>
            <option value="7">이번 주 (7일)</option>
            <option value="30">이번 달 (30일)</option>
          </select>
        </Field>
        <Field label="maxResults">
          <input name="maxResults" type="number" placeholder="기본 20" className={inputClass} />
        </Field>
      </FunctionForm>

      <FunctionForm fn="video" label="getVideo">
        <Field label="id (필수)">
          <input name="id" required className={inputClass} />
        </Field>
      </FunctionForm>

      <FunctionForm fn="related" label="getRelatedVideos">
        <Field label="categoryId (필수)">
          <input name="categoryId" required placeholder="예: 10" className={inputClass} />
        </Field>
        <Field label="excludeId">
          <input name="excludeId" className={inputClass} />
        </Field>
        <Field label="maxResults">
          <input name="maxResults" type="number" placeholder="기본 20" className={inputClass} />
        </Field>
      </FunctionForm>

      <FunctionForm fn="categories" label="getVideoCategories" />
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 호출과 결과                                                                 */
/* -------------------------------------------------------------------------- */

function param(sp: SearchParams, name: string): string | undefined {
  const value = sp[name];
  const text = Array.isArray(value) ? value[0] : value;
  return text?.trim() || undefined;
}

function numberParam(sp: SearchParams, name: string): number | undefined {
  const text = param(sp, name);
  return text ? Number(text) : undefined;
}

/** "7" → 7일 전 ISO 시각 */
function daysAgo(sp: SearchParams): string | undefined {
  const days = numberParam(sp, 'publishedAfter');
  return days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() : undefined;
}

function call(service: YouTubeService, fn: FunctionName, sp: SearchParams): Promise<unknown> {
  switch (fn) {
    case 'popular':
      return service.getPopularVideos({
        categoryId: param(sp, 'categoryId'),
        pageToken: param(sp, 'pageToken'),
        maxResults: numberParam(sp, 'maxResults'),
      });
    case 'categories':
      return service.getVideoCategories();
    case 'search':
      return service.searchVideos({
        q: param(sp, 'q') ?? '',
        order: param(sp, 'order') as SearchOrder | undefined,
        publishedAfter: daysAgo(sp),
        pageToken: param(sp, 'pageToken'),
        maxResults: numberParam(sp, 'maxResults'),
      });
    case 'video':
      return service.getVideo(param(sp, 'id') ?? '');
    case 'related':
      return service.getRelatedVideos({
        categoryId: param(sp, 'categoryId') ?? '',
        excludeId: param(sp, 'excludeId'),
        maxResults: numberParam(sp, 'maxResults'),
      });
  }
}

type Measured = {
  data?: unknown;
  error?: ApiError;
  status?: number;
  /** 걸린 시간(ms) */
  elapsed: number;
};

/** 호출하고 걸린 시간과 결과(또는 에러)를 돌려준다 */
async function measure(run: () => Promise<unknown>): Promise<Measured> {
  const started = performance.now();
  try {
    const data = await run();
    return { data, elapsed: Math.round(performance.now() - started) };
  } catch (e) {
    const apiError = toYouTubeApiError(e);
    return {
      error: apiError.toJSON(),
      status: apiError.status,
      elapsed: Math.round(performance.now() - started),
    };
  }
}

async function Result({
  service,
  searchParams,
}: {
  service: YouTubeService;
  searchParams: Promise<SearchParams>;
}) {
  // 프로덕션에서 실제 API(할당량)를 쓰지 않도록 호출 직전에도 막는다
  assertDevelopment();
  const sp = await searchParams;
  const fn = param(sp, 'fn') as FunctionName | undefined;

  if (!fn || !FUNCTIONS.includes(fn)) {
    return <p className="text-sub">위에서 함수를 골라 호출하세요.</p>;
  }

  const { data, error, status, elapsed } = await measure(() => call(service, fn, sp));

  return (
    <section className="flex flex-col gap-4">
      <div className="border-border flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b pb-2 text-sm">
        <span className="font-mono font-semibold">{fn}</span>
        <span className="text-sub font-mono">{queryString(sp)}</span>
        <span className="text-sub">{elapsed}ms</span>
        <span className={error ? 'font-semibold' : 'text-accent font-semibold'}>
          {error ? `실패 (${status})` : '성공'}
        </span>
      </div>

      {error ? (
        <pre className="border-border bg-surface overflow-x-auto rounded border p-3 text-sm">
          {JSON.stringify(error, null, 2)}
        </pre>
      ) : (
        <Preview fn={fn} sp={sp} data={data} />
      )}

      <details className="border-border rounded border">
        <summary className="text-sub cursor-pointer px-3 py-2 text-sm">응답 JSON</summary>
        <pre className="bg-surface overflow-x-auto p-3 text-xs">
          {JSON.stringify(error ?? data, null, 2)}
        </pre>
      </details>
    </section>
  );
}

/** 화면 표시용 파라미터 목록 (인코딩하지 않은 값) */
function queryString(sp: SearchParams): string {
  return Object.entries(flat(sp))
    .filter(([key]) => key !== 'fn')
    .map(([key, value]) => `${key}=${value}`)
    .join(' · ');
}

const dateFormat = new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Asia/Seoul',
});

function isPage(data: unknown): data is { items: Video[]; nextPageToken?: string } {
  return typeof data === 'object' && data !== null && 'items' in data;
}

function Preview({ fn, sp, data }: { fn: FunctionName; sp: SearchParams; data: unknown }) {
  if (fn === 'categories') {
    const categories = data as { id: string; title: string }[];
    return (
      <ul className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <li key={c.id}>
            <a
              href={`?fn=popular&categoryId=${c.id}`}
              className="border-border bg-surface rounded-full border px-3 py-1 text-sm"
            >
              {c.id} · {c.title}
            </a>
          </li>
        ))}
      </ul>
    );
  }

  if (fn === 'video') return <VideoList videos={[data as Video]} />;

  if (isPage(data)) {
    const next = new URLSearchParams({ ...flat(sp), pageToken: data.nextPageToken ?? '' });
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sub text-sm">
          {data.items.length}개 · nextPageToken:{' '}
          <span className="font-mono">{data.nextPageToken ?? '없음 (마지막 페이지)'}</span>
          {data.nextPageToken && (
            <a href={`?${next}`} className="text-accent ml-3 font-semibold">
              다음 페이지 →
            </a>
          )}
        </p>
        <VideoList videos={data.items} />
      </div>
    );
  }

  return <VideoList videos={data as Video[]} />;
}

function flat(sp: SearchParams): Record<string, string> {
  return Object.fromEntries(
    Object.keys(sp)
      .map((key) => [key, param(sp, key)])
      .filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}

function formatDuration(sec: number): string {
  if (sec === 0) return 'LIVE/없음';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

function VideoList({ videos }: { videos: Video[] }) {
  if (videos.length === 0) return <p className="text-sub">결과 없음 (빈 목록)</p>;
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((v) => (
        <li key={v.id} className="flex flex-col gap-2">
          <a href={`?fn=video&id=${encodeURIComponent(v.id)}`} className="relative block">
            {v.thumbnailUrl ? (
              <img
                src={v.thumbnailUrl}
                alt=""
                className="bg-surface aspect-video w-full rounded-lg object-cover"
              />
            ) : (
              <div className="bg-surface aspect-video w-full rounded-lg" />
            )}
            <span className="bg-bg text-text absolute right-1 bottom-1 rounded px-1 font-mono text-xs">
              {formatDuration(v.durationSec)}
            </span>
          </a>
          <div className="flex gap-2">
            {v.channel.avatarUrl ? (
              <img src={v.channel.avatarUrl} alt="" className="size-8 shrink-0 rounded-full" />
            ) : (
              <div className="bg-surface size-8 shrink-0 rounded-full" />
            )}
            <div className="flex min-w-0 flex-col text-sm">
              <span className="line-clamp-2 font-semibold">{v.title}</span>
              <span className="text-sub">
                {v.channel.title}
                {v.channel.subscriberCount !== undefined &&
                  ` · 구독자 ${v.channel.subscriberCount.toLocaleString()}`}
              </span>
              <span className="text-sub">
                조회수 {v.viewCount.toLocaleString()} · {dateFormat.format(new Date(v.publishedAt))}
              </span>
              <span className="text-sub font-mono text-xs">
                {v.id} · 카테고리 {v.categoryId}
                {!v.embeddable && ' · 임베드 불가'}
                <a
                  href={`?fn=related&categoryId=${v.categoryId}&excludeId=${encodeURIComponent(v.id)}`}
                  className="text-accent ml-2"
                >
                  관련 영상
                </a>
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
