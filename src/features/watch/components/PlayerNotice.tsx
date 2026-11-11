import { youtubeWatchUrl } from '@/features/watch/lib/video-id';

type PlayerNoticeProps = {
  videoId: string;
  message: string;
};

/**
 * 플레이어 자리에 띄우는 안내 + "YouTube에서 보기" 링크 (WATCH-09).
 * 재생 오류가 났을 때, 그리고 처음부터 외부 재생이 막힌 영상일 때 같이 쓴다.
 */
export function PlayerNotice({ videoId, message }: PlayerNoticeProps) {
  return (
    <div
      className="bg-surface absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center"
      role="alert"
    >
      <p className="text-text font-medium">{message}</p>
      <a
        href={youtubeWatchUrl(videoId)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent text-sm font-medium underline-offset-4 hover:underline"
      >
        YouTube에서 보기
      </a>
    </div>
  );
}

/** 외부 재생(임베드)이 막힌 영상. 플레이어를 불러오지 않고 바로 안내한다 */
export function NotEmbeddablePlayer({ videoId }: { videoId: string }) {
  return (
    <div className="bg-surface relative aspect-video w-full overflow-hidden rounded-xl">
      <PlayerNotice videoId={videoId} message="이 영상은 Vidlab에서 재생할 수 없어요." />
    </div>
  );
}
