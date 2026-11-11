import Link from 'next/link';
import Image from 'next/image';
import type { FeedVideo } from '@/features/feed/types';

export default function VideoCard({ video }: { video: FeedVideo }) {
  const metadata = [
    video.channelTitle || (video.category ? `Vidlab ${video.category}` : 'Vidlab'),
    video.views ? `${video.views}회` : '',
    video.uploaded,
    video.category,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <article>
      <Link
        href={`/watch/${video.id}`}
        className="group focus-visible:outline-accent block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        <div className="border-border bg-surface group-hover:border-accent/40 relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border transition-colors">
          {video.thumbnailUrl ? (
            <Image
              src={video.thumbnailUrl}
              alt=""
              fill
              sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw"
              className="object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="text-brand-soft text-5xl font-black tracking-tight transition-transform duration-200 select-none group-hover:scale-105"
            >
              VIDLAB
            </span>
          )}
          {video.duration && (
            <span className="bg-bg text-text absolute right-2 bottom-2 rounded px-1.5 py-0.5 text-xs font-medium tabular-nums">
              {video.duration}
            </span>
          )}
        </div>
        <div className="mt-3 flex items-start gap-3">
          <div
            aria-hidden="true"
            className="bg-brand-wash text-accent relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold"
          >
            {video.avatarUrl ? (
              <Image src={video.avatarUrl} alt="" fill sizes="40px" className="object-cover" />
            ) : (
              'V'
            )}
          </div>
          <div className="min-w-0 pt-0.5">
            <h2 className="text-text line-clamp-2 text-base leading-6 font-semibold">
              {video.title}
            </h2>
            <p className="text-sub mt-1 truncate text-[13px] leading-5" title={metadata}>
              {metadata}
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}
