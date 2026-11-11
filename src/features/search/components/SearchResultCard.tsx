import Image from 'next/image';
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
 * 공용 VideoCard(components/video)는 세로형이고 피드 전용 타입(FeedVideo)을 받아서 검색은 이 카드를 따로 쓴다.
 * 포커스 테두리 모양(두께 · 간격)은 VideoCard와 맞추고, 색은 라이트 모드 대비(3:1 이상)를 위해 text 토큰을 쓴다.
 */
export default function SearchResultCard({ video }: { video: Video }) {
  // 재생시간이 0이면 라이브 방송(진행 중 · 예정)이다. lib/youtube 타입이 라이브를 따로 구분하지 않아서 0으로 판단한다
  const duration = formatDuration(video.durationSec) ?? 'LIVE';
  const meta = [formatViewCount(video.viewCount), formatRelativeTime(video.publishedAt)]
    .filter(Boolean)
    .join(' · ');

  return (
    <li>
      <Link
        href={`/watch/${video.id}`}
        className="group focus-visible:outline-text flex flex-col gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 sm:flex-row sm:gap-4"
      >
        <div className="bg-surface text-sub relative aspect-video w-full shrink-0 overflow-hidden rounded-xl sm:w-80">
          {video.thumbnailUrl ? (
            // 썸네일 도메인(i.ytimg.com, mock은 picsum.photos)은 next.config.ts의 images.remotePatterns에 등록돼 있다.
            // 칸 너비: 모바일은 화면 전체, sm(640px) 이상은 sm:w-80(320px)
            <Image
              src={video.thumbnailUrl}
              alt=""
              fill
              sizes="(min-width: 640px) 320px, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <PlayIcon />
            </div>
          )}
          <span className="bg-bg text-text absolute right-2 bottom-2 rounded px-1.5 py-0.5 text-xs font-medium">
            {duration}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-text line-clamp-2 text-base font-medium group-hover:underline sm:text-lg">
            {video.title}
          </h2>
          {meta && <p className="text-sub mt-1 text-xs">{meta}</p>}
          <p className="text-sub mt-2 text-sm">{video.channel.title}</p>
          {/* sm:block을 쓰면 line-clamp의 display를 덮어써 말줄임이 풀리므로 sm:line-clamp-2로 보이게 한다 */}
          <p className="text-sub mt-2 hidden text-xs sm:line-clamp-2">{video.description}</p>
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
