'use client';

import { useEffect } from 'react';
import type { FeedVideo } from '@/features/feed/types';
import { addWatchHistory } from '@/lib/history/local-history';

export function WatchHistoryRecorder({ videoId }: { videoId: string }) {
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/youtube/video?id=${encodeURIComponent(videoId)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        addWatchHistory((await response.json()) as FeedVideo);
      })
      .catch(() => {
        // 기록 저장 실패가 상세 화면 진입을 막지 않게 한다.
      });
    return () => controller.abort();
  }, [videoId]);

  return null;
}
