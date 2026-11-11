'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { validateDeletePassword } from '@/lib/comments/rules';
import type { CommentItem } from '@/lib/comments/types';
import { CommentRequestError } from '@/features/watch/api/comments';
import { useDeleteComment } from '@/features/watch/hooks/useComments';

type DeleteCommentDialogProps = {
  videoId: string;
  comment: CommentItem;
  onClose: () => void;
};

/**
 * 댓글 삭제 확인 창 (WATCH-08). 작성할 때 정한 비밀번호를 입력해야 지워진다.
 * 브라우저 기본 <dialog>를 써서 포커스 가두기 · Esc 닫기를 브라우저에 맡긴다.
 */
export function DeleteCommentDialog({ videoId, comment, onClose }: DeleteCommentDialogProps) {
  const id = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [password, setPassword] = useState('');
  const remove = useDeleteComment(videoId);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  const canSubmit = validateDeletePassword(password).ok && !remove.isPending;
  const error = remove.error;
  // 잠김 · 이미 지워진 댓글이면 비밀번호를 다시 넣어도 소용없어서 입력을 막는다
  const blocked =
    error instanceof CommentRequestError &&
    (error.code === 'TOO_MANY_ATTEMPTS' || error.code === 'NOT_FOUND');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit || blocked) return;
    remove.mutate({ comment, password }, { onSuccess: onClose });
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`${id}-title`}
      // Esc: 브라우저가 바로 닫지 않게 막고, 부모 상태를 바꿔서 닫는다 (삭제 중이면 무시)
      onCancel={(e) => {
        e.preventDefault();
        if (!remove.isPending) onClose();
      }}
      className="bg-bg text-text border-border backdrop:bg-bg/80 m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border p-5"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1">
          <h2 id={`${id}-title`} className="text-base font-semibold">
            댓글을 삭제할까요?
          </h2>
          <p className="text-sub text-sm">작성할 때 정한 비밀번호를 입력해 주세요.</p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-password`} className="sr-only">
            비밀번호
          </label>
          <input
            id={`${id}-password`}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={blocked}
            autoComplete="off"
            placeholder="비밀번호"
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            className="border-border bg-bg text-text placeholder:text-sub focus-visible:outline-accent h-10 w-full rounded-lg border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 disabled:opacity-60"
          />
          {error && (
            <p id={`${id}-error`} role="alert" className="text-sub text-sm">
              {error.message}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={remove.isPending}
            className="text-text hover:bg-surface h-9 rounded-full px-4 text-sm font-medium"
          >
            {blocked ? '닫기' : '취소'}
          </button>
          {!blocked && (
            <button
              type="submit"
              disabled={!canSubmit}
              className="bg-text text-bg disabled:bg-surface disabled:text-sub h-9 rounded-full px-4 text-sm font-medium"
            >
              {remove.isPending ? '삭제 중…' : '삭제'}
            </button>
          )}
        </div>
      </form>
    </dialog>
  );
}
