import Image from 'next/image';
import Link from 'next/link';
import type { Video } from '@/lib/youtube/types';
import {
  formatDuration,
  formatRelativeTime,
  formatViewCountShort,
} from '@/features/watch/lib/format';

/**
 * 관련 영상 목록의 가로형 작은 카드 (WATCH-05)
 * TODO: 주훈 FEED-01 공용 VideoCard가 develop에 합쳐지면 그 소형 변형으로 교체
 */
export function RelatedVideoItem({ video }: { video: Video }) {
  // 재생시간 0은 라이브(진행 중 · 예정). 검색 카드와 같은 규칙
  const duration = formatDuration(video.durationSec) ?? 'LIVE';
  const meta = [formatViewCountShort(video.viewCount), formatRelativeTime(video.publishedAt)]
    .filter(Boolean)
    .join(' · ');

  return (
    <li>
      <Link href={`/watch/${video.id}`} className="group flex gap-2 rounded-lg">
        <div className="bg-surface relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg">
          {video.thumbnailUrl && (
            // 실제 API 썸네일 도메인(i.ytimg.com)이 아직 remotePatterns에 없어서 최적화 없이 쓴다
            // TODO(FEED-03): 이미지 도메인 등록되면 unoptimized 제거
            <Image
              src={video.thumbnailUrl}
              alt=""
              fill
              sizes="160px"
              unoptimized
              className="object-cover"
            />
          )}
          <span className="bg-bg text-text absolute right-1 bottom-1 rounded px-1 py-0.5 text-xs font-medium">
            {duration}
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1 py-0.5">
          <h3 className="text-text line-clamp-2 text-sm font-medium break-words group-hover:underline">
            {video.title}
          </h3>
          <p className="text-sub truncate text-xs">{video.channel.title}</p>
          {meta && <p className="text-sub text-xs">{meta}</p>}
        </div>
      </Link>
    </li>
  );
}
