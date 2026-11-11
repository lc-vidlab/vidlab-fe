'use client';

import { CommentForm } from '@/features/watch/components/CommentForm';
import { CommentList } from '@/features/watch/components/CommentList';
import { useCreateComment } from '@/features/watch/hooks/useComments';

/** 상세 페이지 댓글 칸: 작성 폼 + Vidlab 댓글 목록 */
export function CommentSection({ videoId }: { videoId: string }) {
  const create = useCreateComment(videoId);

  return (
    <div className="flex flex-col gap-6">
      <CommentForm onSubmit={(input) => create.mutateAsync(input).then(() => undefined)} />
      <CommentList videoId={videoId} />
    </div>
  );
}
