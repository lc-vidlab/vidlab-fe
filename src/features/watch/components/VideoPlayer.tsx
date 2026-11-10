'use client';

import { useEffect, useRef, useState } from 'react';
import { loadIframeApi, type PlayerErrorCode } from '@/features/watch/lib/iframe-api';
import { youtubeWatchUrl } from '@/features/watch/lib/video-id';

type Status =
  { type: 'loading' } | { type: 'ready' } | { type: 'error'; code: PlayerErrorCode | 'load' };

const ERROR_MESSAGES: Record<PlayerErrorCode | 'load', string> = {
  2: '잘못된 영상 주소예요.',
  5: '이 브라우저에서 영상을 재생할 수 없어요.',
  100: '삭제되었거나 비공개로 전환된 영상이에요.',
  // 존재하지 않는 영상도 150으로 오는 경우가 있어 두 경우를 모두 아우르는 문구로
  101: '외부 재생이 막혀 있거나 볼 수 없는 영상이에요.',
  150: '외부 재생이 막혀 있거나 볼 수 없는 영상이에요.',
  load: '플레이어를 불러오지 못했어요. 네트워크 상태를 확인해 주세요.',
};

type VideoPlayerProps = {
  videoId: string;
  /** iframe 접근성 제목. WATCH-03에서 영상 제목을 넘겨줄 예정 */
  title?: string;
  onError?: (code: PlayerErrorCode | 'load') => void;
};

/**
 * IFrame Player API 기반 16:9 반응형 플레이어 (WATCH-02)
 *
 * 영상이 바뀌면 부모에서 key={videoId}로 새로 마운트해 상태를 초기화한다.
 * cacheComponents의 Activity 때문에 다른 페이지로 이동해도 이 컴포넌트는 숨겨진 채 남는데,
 * 그때 effect cleanup이 실행되므로 destroy()로 재생을 확실히 멈춘다.
 */
export function VideoPlayer({ videoId, title = '영상 플레이어', onError }: VideoPlayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>({ type: 'loading' });

  // 콜백이 바뀌어도 플레이어를 다시 만들지 않도록 ref로 최신 값을 참조
  const onErrorRef = useRef(onError);
  const titleRef = useRef(title);
  useEffect(() => {
    onErrorRef.current = onError;
    titleRef.current = title;
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let player: { destroy(): void } | null = null;

    const fail = (code: PlayerErrorCode | 'load') => {
      if (cancelled) return;
      setStatus({ type: 'error', code });
      onErrorRef.current?.(code);
    };

    loadIframeApi()
      .then((YT) => {
        if (cancelled) return;
        // API가 대상 요소를 iframe으로 바꿔치기하므로 React가 관리하지 않는 자식 요소를 따로 만든다
        const target = document.createElement('div');
        host.appendChild(target);
        player = new YT.Player(target, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: { playsinline: 1, rel: 0, origin: window.location.origin },
          events: {
            onReady: ({ target: p }) => {
              if (cancelled) return;
              p.getIframe().title = titleRef.current;
              setStatus({ type: 'ready' });
            },
            onError: ({ data }) => fail(data),
          },
        });
      })
      .catch(() => fail('load'));

    return () => {
      cancelled = true;
      player?.destroy();
      host.replaceChildren();
    };
  }, [videoId]);

  return (
    <div className="bg-surface relative aspect-video w-full overflow-hidden rounded-xl">
      <div ref={hostRef} className="absolute inset-0 [&>iframe]:size-full" />

      {status.type === 'loading' && (
        <div
          className="bg-surface absolute inset-0 motion-safe:animate-pulse"
          role="status"
          aria-label="플레이어 불러오는 중"
        />
      )}

      {status.type === 'error' && (
        <div
          className="bg-surface absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center"
          role="alert"
        >
          <p className="text-text font-medium">{ERROR_MESSAGES[status.code]}</p>
          <a
            href={youtubeWatchUrl(videoId)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent text-sm font-medium underline-offset-4 hover:underline"
          >
            YouTube에서 보기
          </a>
        </div>
      )}
    </div>
  );
}
