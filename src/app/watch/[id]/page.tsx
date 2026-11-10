import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { VideoPlayer } from '@/features/watch/components/VideoPlayer';
import { WatchLayout } from '@/features/watch/components/WatchLayout';
import {
  CommentsSkeleton,
  InfoSkeleton,
  PlayerSkeleton,
  RelatedSkeleton,
} from '@/features/watch/components/WatchSkeletons';
import { isValidVideoId } from '@/features/watch/lib/video-id';

export default function WatchPage({ params }: PageProps<'/watch/[id]'>) {
  return (
    <main className="mx-auto w-full max-w-[1720px] px-4 py-6 lg:px-6">
      {/* cacheComponents: params는 런타임 데이터라 Suspense 안에서 읽어야 함 */}
      <Suspense fallback={<WatchFallback />}>
        {params.then(({ id }) => (
          <WatchContent id={id} />
        ))}
      </Suspense>
    </main>
  );
}

function WatchContent({ id }: { id: string }) {
  if (!isValidVideoId(id)) notFound();

  return (
    <WatchLayout
      player={<VideoPlayer key={id} videoId={id} />}
      // TODO(WATCH-03): 영상 · 채널 정보
      info={<InfoSkeleton />}
      // TODO(WATCH-04, WATCH-06): 댓글 탭(Vidlab 댓글 / YouTube 댓글)
      comments={<CommentsSkeleton />}
      // TODO(WATCH-05): 같은 카테고리 인기 영상
      related={<RelatedSkeleton />}
    />
  );
}

function WatchFallback() {
  return (
    <WatchLayout
      player={<PlayerSkeleton />}
      info={<InfoSkeleton />}
      comments={<CommentsSkeleton />}
      related={<RelatedSkeleton />}
    />
  );
}
