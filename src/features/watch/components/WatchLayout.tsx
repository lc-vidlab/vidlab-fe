import type { ReactNode } from 'react';

type WatchLayoutProps = {
  player: ReactNode;
  info: ReactNode;
  comments: ReactNode;
  related: ReactNode;
};

/**
 * 영상 상세 2단 레이아웃 (WATCH-01)
 * - lg 이상: 본문(플레이어 · 정보 · 댓글) + 오른쪽 관련 영상
 * - lg 미만: 1단, 관련 영상은 정보 아래 · 댓글 위로 내려감
 */
export function WatchLayout({ player, info, comments, related }: WatchLayoutProps) {
  return (
    // grid-rows-[auto_1fr]: 관련 영상이 길어도 1행(본문)은 늘어나지 않고 댓글이 정보 바로 아래에 붙음
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:grid-rows-[auto_1fr]">
      <div className="flex min-w-0 flex-col gap-4">
        {player}
        <section aria-label="영상 정보">{info}</section>
      </div>
      <aside aria-label="관련 영상" className="min-w-0 lg:row-span-2">
        {related}
      </aside>
      <section aria-label="댓글" className="min-w-0">
        {comments}
      </section>
    </div>
  );
}
