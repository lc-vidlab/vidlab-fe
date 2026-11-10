// TODO(수현): 영상 상세 구현
import { Suspense } from 'react';
import { WatchHistoryRecorder } from '@/features/watch/components/WatchHistoryRecorder';

export default function WatchPage({ params }: PageProps<'/watch/[id]'>) {
  return (
    <main>
      <p>영상 상세 (수현)</p>
      <Suspense fallback={<p>id: ...</p>}>
        {params.then(({ id }) => (
          <>
            <WatchHistoryRecorder videoId={id} />
            <p>id: {id}</p>
          </>
        ))}
      </Suspense>
    </main>
  );
}
