import Link from 'next/link';
import { formatDuration, formatRelativeTime, formatViewCount } from '../lib/format';
import type { Video } from '@/lib/youtube/types';

function PlayIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-10 w-10" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

/**
 * 검색 결과용 가로형 카드. 모바일에서는 세로로 쌓인다.
 * TODO(민진): 주훈 FEED-01 VideoCard가 나오면 썸네일·배지 부분을 공용 컴포넌트와 맞춘다.
 */
export default function SearchResultCard({ video }: { video: Video }) {
  const duration = formatDuration(video.durationSec);
  const meta = [formatViewCount(video.viewCount), formatRelativeTime(video.publishedAt)]
    .filter(Boolean)
    .join(' · ');

  return (
    <li>
      <Link
        href={`/watch/${video.id}`}
        className="group flex flex-col gap-3 rounded-xl sm:flex-row sm:gap-4"
      >
        <div className="bg-surface text-sub relative aspect-video w-full shrink-0 overflow-hidden rounded-xl sm:w-80">
          {video.thumbnailUrl ? (
            // TODO(민진): FEED-03에서 next/image remotePatterns가 등록되면 next/image로 교체
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={video.thumbnailUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <PlayIcon />
            </div>
          )}
          {duration && (
            <span className="bg-bg text-text absolute right-2 bottom-2 rounded px-1.5 py-0.5 text-xs font-medium">
              {duration}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-text line-clamp-2 text-base font-medium group-hover:underline sm:text-lg">
            {video.title}
          </h2>
          {meta && <p className="text-sub mt-1 text-xs">{meta}</p>}
          <p className="text-sub mt-2 text-sm">{video.channel.title}</p>
          <p className="text-sub mt-2 line-clamp-2 hidden text-xs sm:block">{video.description}</p>
        </div>
      </Link>
    </li>
  );
}

export function SearchResultCardSkeleton() {
  return (
    <li aria-hidden="true" className="flex animate-pulse flex-col gap-3 sm:flex-row sm:gap-4">
      <div className="bg-surface aspect-video w-full shrink-0 rounded-xl sm:w-80" />
      <div className="flex-1 space-y-2">
        <div className="bg-surface h-5 w-11/12 rounded" />
        <div className="bg-surface h-5 w-2/3 rounded" />
        <div className="bg-surface h-3 w-1/3 rounded" />
        <div className="bg-surface h-3 w-1/4 rounded" />
      </div>
    </li>
  );
}
