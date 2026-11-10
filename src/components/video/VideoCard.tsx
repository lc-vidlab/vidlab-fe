import Link from 'next/link';
import type { FeedVideo } from '@/features/feed/mocks/videos';

export default function VideoCard({ video }: { video: FeedVideo }) {
  return (
    <article>
      <Link
        href={`/watch/${video.id}`}
        className="group focus-visible:outline-accent block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        <div className="border-border bg-surface group-hover:border-accent/40 relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border transition-colors">
          <span
            aria-hidden="true"
            className="text-brand-soft text-5xl font-black tracking-tight transition-transform duration-200 select-none group-hover:scale-105"
          >
            VIDLAB
          </span>
          <span className="bg-bg text-text absolute right-2 bottom-2 rounded px-1.5 py-0.5 text-xs font-medium tabular-nums">
            {video.duration}
          </span>
        </div>
        <div className="mt-3 flex items-start gap-3">
          <div
            aria-hidden="true"
            className="bg-brand-wash text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
          >
            V
          </div>
          <div className="min-w-0 pt-0.5">
            <h2 className="text-text line-clamp-2 text-base leading-6 font-semibold">
              {video.title}
            </h2>
            <p className="text-sub mt-1 text-[13px] leading-5">Vidlab {video.category}</p>
            <p className="text-sub text-[13px] leading-5">
              조회수 {video.views}회 · {video.uploaded} · {video.category}
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}
