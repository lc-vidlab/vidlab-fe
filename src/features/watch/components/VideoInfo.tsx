import Image from 'next/image';
import type { ApiErrorCode, Channel, Video } from '@/lib/youtube/types';
import { VideoDescription } from '@/features/watch/components/VideoDescription';
import {
  formatFullDate,
  formatRelativeTime,
  formatSubscriberCount,
  formatViewCountFull,
} from '@/features/watch/lib/format';

/** 영상 제목 · 채널 · 설명 (WATCH-03) */
export function VideoInfo({ video }: { video: Video }) {
  const views = formatViewCountFull(video.viewCount);
  const meta = [views, formatRelativeTime(video.publishedAt)].filter(Boolean).join(' · ');

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-text line-clamp-2 text-xl font-semibold break-words">{video.title}</h1>
      <ChannelRow channel={video.channel} />
      <VideoDescription
        meta={meta}
        fullDate={formatFullDate(video.publishedAt)}
        description={video.description}
      />
    </div>
  );
}

function ChannelRow({ channel }: { channel: Channel }) {
  const subscribers = formatSubscriberCount(channel.subscriberCount);

  return (
    <div className="flex items-center gap-3">
      <ChannelAvatar channel={channel} />
      <div className="flex min-w-0 flex-col">
        <span className="text-text truncate font-medium">{channel.title}</span>
        {subscribers && <span className="text-sub text-xs">{subscribers}</span>}
      </div>
    </div>
  );
}

function ChannelAvatar({ channel }: { channel: Channel }) {
  // 채널 보강에 실패하면 avatarUrl이 빈 문자열 → 첫 글자로 대체
  if (!channel.avatarUrl) {
    return (
      <span
        aria-hidden="true"
        className="bg-surface text-sub flex size-10 shrink-0 items-center justify-center rounded-full font-medium"
      >
        {channel.title.slice(0, 1)}
      </span>
    );
  }

  return (
    // 실제 API 아바타 도메인(yt3.ggpht.com)이 아직 remotePatterns에 없어서 최적화 없이 그대로 쓴다
    // TODO(FEED-03): 이미지 도메인 등록되면 unoptimized 제거
    <Image
      src={channel.avatarUrl}
      alt=""
      width={40}
      height={40}
      unoptimized
      className="bg-surface size-10 shrink-0 rounded-full object-cover"
    />
  );
}

const ERROR_MESSAGES: Partial<Record<ApiErrorCode, string>> = {
  QUOTA_EXCEEDED: '오늘 사용할 수 있는 API 호출량을 다 써서 영상 정보를 불러오지 못했어요.',
};

/** 영상 정보를 못 가져왔을 때. 플레이어와 댓글은 그대로 쓸 수 있다 */
export function VideoInfoError({ code }: { code: ApiErrorCode }) {
  return (
    <div role="alert" className="bg-surface text-text rounded-xl p-4 text-sm">
      {ERROR_MESSAGES[code] ?? '영상 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'}
    </div>
  );
}
