import { getRelatedVideos } from '@/lib/youtube/service';
import { RelatedVideoItem } from '@/features/watch/components/RelatedVideoItem';

type RelatedVideosProps = {
  categoryId: string;
  /** 지금 보고 있는 영상. 목록에서 뺀다 */
  excludeId: string;
};

/**
 * 관련 영상 목록 (WATCH-05). 서버 컴포넌트.
 * 같은 카테고리의 인기 영상으로 대체한다 (YouTube API의 관련 영상 기능이 없어져서).
 * 인기 차트가 없는 카테고리면 서비스가 빈 목록을 준다.
 */
export async function RelatedVideos({ categoryId, excludeId }: RelatedVideosProps) {
  let videos;
  try {
    videos = await getRelatedVideos({ categoryId, excludeId });
  } catch {
    // 관련 영상은 부가 정보라, 실패해도 페이지 나머지는 그대로 두고 이 칸에만 안내
    return <RelatedMessage>관련 영상을 불러오지 못했어요.</RelatedMessage>;
  }

  if (videos.length === 0) {
    return <RelatedMessage>관련 영상이 없어요.</RelatedMessage>;
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-text text-base font-semibold">관련 영상</h2>
      <ul className="flex flex-col gap-3">
        {videos.map((video) => (
          <RelatedVideoItem key={video.id} video={video} />
        ))}
      </ul>
    </div>
  );
}

function RelatedMessage({ children }: { children: string }) {
  return <p className="text-sub bg-surface rounded-xl p-4 text-sm">{children}</p>;
}
