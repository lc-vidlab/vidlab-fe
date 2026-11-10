// 공용 Skeleton(SET-04)이 나오면 Bone을 그걸로 교체
function Bone({ className = '' }: { className?: string }) {
  // rounded-* 클래스끼리는 CSS 순서로 승패가 갈려서, 직접 지정하면 기본값을 빼준다
  const radius = className.includes('rounded-') ? '' : 'rounded-md';
  return <div className={`bg-surface motion-safe:animate-pulse ${radius} ${className}`} />;
}

export function PlayerSkeleton() {
  return <Bone className="aspect-video w-full rounded-xl" />;
}

/** WATCH-03 영상 · 채널 정보 자리 */
export function InfoSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <Bone className="h-6 w-3/4" />
      <div className="flex items-center gap-3">
        <Bone className="size-10 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Bone className="h-4 w-32" />
          <Bone className="h-3 w-20" />
        </div>
      </div>
      <Bone className="h-24 w-full rounded-xl" />
    </div>
  );
}

/** WATCH-06 Vidlab 댓글 목록 자리 */
export function CommentsSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-hidden="true">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex gap-3">
          <Bone className="size-10 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Bone className="h-3 w-28" />
            <Bone className="h-4 w-full" />
            <Bone className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** WATCH-05 관련 영상 자리 */
export function RelatedSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex gap-2">
          <Bone className="aspect-video w-40 shrink-0 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2 py-1">
            <Bone className="h-4 w-full" />
            <Bone className="h-3 w-2/3" />
            <Bone className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
