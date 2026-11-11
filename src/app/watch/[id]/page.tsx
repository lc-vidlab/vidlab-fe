import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { CommentForm } from '@/features/watch/components/CommentForm';
import { VideoPlayer } from '@/features/watch/components/VideoPlayer';
import { WatchLayout } from '@/features/watch/components/WatchLayout';
import {
  CommentsSkeleton,
  InfoSkeleton,
  PlayerSkeleton,
  RelatedSkeleton,
} from '@/features/watch/components/WatchSkeletons';
import { RelatedVideos } from '@/features/watch/components/RelatedVideos';
import { VideoInfo, VideoInfoError } from '@/features/watch/components/VideoInfo';
import { loadVideo } from '@/features/watch/server/load-video';
import { isVideoId } from '@/lib/youtube/video-id';

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

async function WatchContent({ id }: { id: string }) {
  if (!isVideoId(id)) notFound();

  const result = await loadVideo(id);
  if ('error' in result && result.error === 'NOT_FOUND') notFound();

  // 정보를 못 가져와도(할당량 초과 등) 플레이어 · 댓글은 그대로 쓸 수 있게 정보 칸만 에러 표시
  const info =
    'video' in result ? <VideoInfo video={result.video} /> : <VideoInfoError code={result.error} />;
  const title = 'video' in result ? result.video.title : undefined;

  // 관련 영상은 영상의 카테고리가 있어야 찾을 수 있다. 따로 Suspense로 감싸서
  // 관련 영상 조회가 늦어도 플레이어 · 정보는 먼저 보이게 한다
  const related =
    'video' in result ? (
      <Suspense fallback={<RelatedSkeleton />}>
        <RelatedVideos categoryId={result.video.categoryId} excludeId={id} />
      </Suspense>
    ) : null;

  return (
    <WatchLayout
      player={<VideoPlayer key={id} videoId={id} title={title} />}
      info={info}
      comments={
        <div className="flex flex-col gap-6">
          {/* 영상이 바뀌면 입력 중이던 내용이 남지 않도록 key로 초기화 */}
          <CommentForm key={id} />
          {/* TODO(WATCH-06): Vidlab 댓글 목록 (YouTube 댓글 목록 WATCH-04는 범위에서 제외) */}
          <CommentsSkeleton />
        </div>
      }
      related={related}
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
