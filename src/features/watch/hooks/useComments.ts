'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import {
  CommentRequestError,
  createComment,
  deleteComment,
  fetchComments,
} from '@/features/watch/api/comments';
import type { CommentInput, CommentItem, CommentPage } from '@/lib/comments/types';

type CommentPages = InfiniteData<CommentPage, string | undefined>;

export function commentsQueryKey(videoId: string) {
  return ['comments', videoId] as const;
}

/** Vidlab 댓글 목록 (WATCH-06). 최신순, "더 보기"로 다음 페이지 */
export function useComments(videoId: string) {
  return useInfiniteQuery({
    queryKey: commentsQueryKey(videoId),
    queryFn: ({ pageParam, signal }) => fetchComments(videoId, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

/** 불러온 목록을 직접 고친다. 아직 목록을 안 불러왔으면 다음에 새로 불러오게 한다 */
function useUpdatePages(videoId: string) {
  const queryClient = useQueryClient();
  const key = commentsQueryKey(videoId);

  return (update: (data: CommentPages) => CommentPages) => {
    if (queryClient.getQueryData<CommentPages>(key)) {
      queryClient.setQueryData<CommentPages>(key, (data) => (data ? update(data) : data));
    } else {
      void queryClient.invalidateQueries({ queryKey: key });
    }
  };
}

/** 댓글 작성 (WATCH-07). 성공하면 목록 맨 위에 추가 */
export function useCreateComment(videoId: string) {
  const updatePages = useUpdatePages(videoId);

  return useMutation({
    mutationFn: (input: CommentInput) => createComment({ ...input, videoId }),
    onSuccess: (created) =>
      updatePages((data) => ({
        ...data,
        pages: data.pages.map((page, i) =>
          i === 0 ? { ...page, items: [created, ...page.items], total: page.total + 1 } : page,
        ),
      })),
  });
}

function withoutComment(data: CommentPages, id: string): CommentPages {
  const exists = data.pages.some((page) => page.items.some((c) => c.id === id));
  if (!exists) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.filter((c) => c.id !== id),
      total: Math.max(0, page.total - 1),
    })),
  };
}

/** 댓글 삭제 (WATCH-08). 성공하거나 이미 지워진 댓글이면 목록에서 뺀다 */
export function useDeleteComment(videoId: string) {
  const updatePages = useUpdatePages(videoId);

  return useMutation({
    mutationFn: ({ comment, password }: { comment: CommentItem; password: string }) =>
      deleteComment(comment.id, password),
    onSuccess: (_, { comment }) => updatePages((data) => withoutComment(data, comment.id)),
    onError: (err, { comment }) => {
      if (err instanceof CommentRequestError && err.code === 'NOT_FOUND') {
        updatePages((data) => withoutComment(data, comment.id));
      }
    },
  });
}
