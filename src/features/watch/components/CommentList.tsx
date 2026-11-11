'use client';

import { useId, useState } from 'react';
import type { CommentItem } from '@/lib/comments/types';
import { DeleteCommentDialog } from '@/features/watch/components/DeleteCommentDialog';
import { CommentsSkeleton } from '@/features/watch/components/WatchSkeletons';
import { useComments } from '@/features/watch/hooks/useComments';
import { formatFullDate, formatRelativeTime } from '@/features/watch/lib/format';

/** Vidlab 댓글 목록 (WATCH-06). 최신순, "댓글 더 보기"로 다음 20개 */
export function CommentList({ videoId }: { videoId: string }) {
  const query = useComments(videoId);
  const [deleting, setDeleting] = useState<CommentItem | null>(null);

  if (query.isPending) return <CommentsSkeleton />;

  // "더 보기"가 실패해도 쿼리 전체가 에러 상태가 되지만 이미 불러온 목록(data)은 남아 있다.
  // 목록이 아예 없을 때만 전체 에러 화면을 보여 준다
  const data = query.data;
  if (!data) {
    return (
      <div role="alert" className="bg-surface flex flex-col items-start gap-2 rounded-xl p-4">
        <p className="text-text text-sm">{query.error?.message ?? '댓글을 불러오지 못했어요.'}</p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="text-text border-border hover:bg-bg h-8 rounded-full border px-3 text-sm font-medium"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const comments = data.pages.flatMap((page) => page.items);
  // 첫 페이지의 total이 작성 · 삭제 때 함께 고쳐지므로 그 값을 쓴다
  const total = data.pages[0]?.total ?? comments.length;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-text text-base font-semibold">
        댓글 <span className="tabular-nums">{total.toLocaleString('ko-KR')}</span>개
      </h2>

      {comments.length === 0 ? (
        <p className="text-sub text-sm">아직 Vidlab 댓글이 없어요. 첫 댓글을 남겨 보세요.</p>
      ) : (
        <ul className="flex flex-col gap-5">
          {comments.map((comment) => (
            <CommentRow key={comment.id} comment={comment} onDelete={() => setDeleting(comment)} />
          ))}
        </ul>
      )}

      {query.hasNextPage && (
        <button
          type="button"
          onClick={() => void query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
          className="text-text border-border hover:bg-surface disabled:text-sub h-9 self-start rounded-full border px-4 text-sm font-medium"
        >
          {query.isFetchingNextPage ? '불러오는 중…' : '댓글 더 보기'}
        </button>
      )}
      {query.isFetchNextPageError && (
        <p role="alert" className="text-sub text-sm">
          {query.error?.message ?? '댓글을 더 불러오지 못했어요.'}
        </p>
      )}

      {deleting && (
        <DeleteCommentDialog
          videoId={videoId}
          comment={deleting}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

/** 이보다 길면 접어서 보여준다 */
const COLLAPSE_LINES = 4;
const COLLAPSE_CHARS = 200;

function CommentRow({ comment, onDelete }: { comment: CommentItem; onDelete: () => void }) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const collapsible =
    comment.content.split('\n').length > COLLAPSE_LINES || comment.content.length > COLLAPSE_CHARS;

  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="bg-surface text-sub flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-medium"
      >
        {[...comment.nickname][0]}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="text-text font-medium break-all">{comment.nickname}</span>
          <time
            dateTime={comment.createdAt}
            title={formatFullDate(comment.createdAt)}
            className="text-sub text-xs"
          >
            {formatRelativeTime(comment.createdAt)}
          </time>
        </p>
        <p
          id={`${id}-content`}
          className={`text-text text-sm break-words whitespace-pre-line ${
            collapsible && !expanded ? 'line-clamp-4' : ''
          }`}
        >
          {comment.content}
        </p>
        <div className="flex gap-3">
          {collapsible && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-controls={`${id}-content`}
              className="text-text text-xs font-medium hover:underline"
            >
              {expanded ? '간략히' : '자세히 보기'}
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            aria-label={`${comment.nickname}님의 댓글 삭제`}
            className="text-sub hover:text-text text-xs font-medium"
          >
            삭제
          </button>
        </div>
      </div>
    </li>
  );
}
