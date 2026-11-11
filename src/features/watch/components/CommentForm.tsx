'use client';

import { useId, useState, useSyncExternalStore, type FormEvent } from 'react';
import { COMMENT_RULES, countChars, validateCommentInput } from '@/lib/comments/rules';
import type { CommentFieldErrors, CommentInput } from '@/lib/comments/types';
import { CommentRequestError } from '@/features/watch/api/comments';

const NICKNAME_KEY = 'vidlab:nickname';

function readSavedNickname() {
  try {
    return localStorage.getItem(NICKNAME_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveNickname(nickname: string) {
  try {
    localStorage.setItem(NICKNAME_KEY, nickname);
  } catch {
    // 시크릿 모드 등에서 저장이 막혀도 댓글 작성은 계속 가능
  }
}

const noopSubscribe = () => () => {};

type Message = { type: 'info' | 'error'; text: string };

type CommentFormProps = {
  /** 댓글 등록 요청. 실패하면 CommentRequestError를 던진다 */
  onSubmit: (input: CommentInput) => Promise<void>;
};

const NO_ERRORS: CommentFieldErrors = {};

/** Vidlab 익명 댓글 작성 폼 (WATCH-07). 입력 규칙은 서버와 같은 @/lib/comments/rules */
export function CommentForm({ onSubmit }: CommentFormProps) {
  const id = useId();

  // 브라우저에 기억해 둔 닉네임. 서버 렌더링 때는 빈 값이고, 브라우저에서 저장값으로 채워짐
  const savedNickname = useSyncExternalStore(noopSubscribe, readSavedNickname, () => '');
  const [nicknameDraft, setNicknameDraft] = useState<string | null>(null);
  const nickname = nicknameDraft ?? savedNickname;

  const [password, setPassword] = useState('');
  const [content, setContent] = useState('');
  const [honeypot, setHoneypot] = useState(''); // 봇 차단용 숨김 필드 (CMT-05)
  const [touched, setTouched] = useState({ nickname: false, password: false });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  // 서버가 돌려준 칸별 메시지. 그 칸을 고치면 지운다
  const [serverErrors, setServerErrors] = useState<CommentFieldErrors>(NO_ERRORS);

  const validation = validateCommentInput({ nickname, password, content });
  const errors = validation.ok ? NO_ERRORS : validation.errors;
  const nicknameError = serverErrors.nickname ?? (touched.nickname ? errors.nickname : undefined);
  const passwordError = serverErrors.password ?? (touched.password ? errors.password : undefined);
  const contentLength = countChars(content);
  const contentTooLong = contentLength > COMMENT_RULES.content.max;
  // 글자 수 초과는 입력 중에도 바로 보여 준다. 그 밖의 내용 오류는 서버 응답일 때만
  const contentError = serverErrors.content ?? (contentTooLong ? errors.content : undefined);

  function clearServerError(field: keyof CommentFieldErrors) {
    if (serverErrors[field]) setServerErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function reset() {
    setPassword('');
    setContent('');
    setTouched({ nickname: false, password: false });
    setServerErrors(NO_ERRORS);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validation.ok || submitting) return;

    // 사람이 볼 수 없는 칸이 채워졌으면 봇으로 보고 조용히 무시
    if (honeypot) {
      reset();
      return;
    }

    // 서버에는 입력 그대로 보낸다 (정규화 · 검사는 서버가 같은 규칙으로 다시 한다)
    const input = { nickname, password, content };
    setSubmitting(true);
    setMessage(null);
    try {
      await onSubmit(input);
      const savedName = validation.value.nickname;
      saveNickname(savedName);
      setNicknameDraft(savedName);
      reset();
      setMessage({ type: 'info', text: '댓글을 등록했어요.' });
    } catch (err) {
      if (err instanceof CommentRequestError && err.code === 'VALIDATION_ERROR' && err.fields) {
        setServerErrors(err.fields);
      } else {
        setMessage({
          type: 'error',
          text:
            err instanceof CommentRequestError
              ? err.message
              : '댓글을 등록하지 못했어요. 잠시 후 다시 시도해 주세요.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'h-10 w-full rounded-lg border border-border bg-bg px-3 text-sm text-text placeholder:text-sub focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent';

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="border-border flex flex-col gap-3 rounded-xl border p-4"
      aria-label="Vidlab 댓글 작성"
    >
      <p className="text-sub text-sm">
        Vidlab에서만 보이는 댓글이에요. YouTube에는 등록되지 않아요.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-nickname`} className="sr-only">
            닉네임
          </label>
          <input
            id={`${id}-nickname`}
            type="text"
            value={nickname}
            onChange={(e) => {
              setNicknameDraft(e.target.value);
              clearServerError('nickname');
            }}
            onBlur={() => setTouched((t) => ({ ...t, nickname: true }))}
            placeholder={`닉네임 (${COMMENT_RULES.nickname.min}~${COMMENT_RULES.nickname.max}자)`}
            autoComplete="nickname"
            aria-invalid={!!nicknameError}
            aria-describedby={nicknameError ? `${id}-nickname-error` : undefined}
            className={inputClass}
          />
          {nicknameError && (
            <p id={`${id}-nickname-error`} className="text-sub text-xs">
              {nicknameError}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-password`} className="sr-only">
            비밀번호 (삭제할 때 필요)
          </label>
          <input
            id={`${id}-password`}
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearServerError('password');
            }}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            placeholder={`비밀번호 (${COMMENT_RULES.password.min}~${COMMENT_RULES.password.max}자, 삭제 시 필요)`}
            autoComplete="off"
            aria-invalid={!!passwordError}
            aria-describedby={passwordError ? `${id}-password-error` : undefined}
            className={inputClass}
          />
          {passwordError && (
            <p id={`${id}-password-error`} className="text-sub text-xs">
              {passwordError}
            </p>
          )}
        </div>
      </div>

      <label htmlFor={`${id}-content`} className="sr-only">
        댓글 내용
      </label>
      <textarea
        id={`${id}-content`}
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          clearServerError('content');
        }}
        rows={3}
        placeholder="댓글 추가..."
        aria-invalid={!!contentError}
        aria-describedby={contentError ? `${id}-count ${id}-content-error` : `${id}-count`}
        className={`${inputClass} h-auto resize-y py-2 leading-relaxed`}
      />
      {contentError && (
        <p id={`${id}-content-error`} className="text-sub -mt-2 text-xs">
          {contentError}
        </p>
      )}

      {/* 봇 차단용 숨김 필드: 사람에게는 보이지 않고 키보드로도 닿지 않음 */}
      <div aria-hidden="true" className="absolute -left-[10000px] size-px overflow-hidden">
        <label htmlFor={`${id}-website`}>웹사이트</label>
        <input
          id={`${id}-website`}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span
          id={`${id}-count`}
          className={`text-xs tabular-nums ${contentTooLong ? 'text-text font-semibold' : 'text-sub'}`}
        >
          {contentLength} / {COMMENT_RULES.content.max}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              reset();
              setMessage(null);
            }}
            disabled={submitting || (!password && !content)}
            className="text-text hover:bg-surface disabled:text-sub h-9 rounded-full px-4 text-sm font-medium disabled:hover:bg-transparent"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={!validation.ok || submitting}
            className="bg-text text-bg disabled:bg-surface disabled:text-sub h-9 rounded-full px-4 text-sm font-medium"
          >
            {submitting ? '등록 중…' : '등록'}
          </button>
        </div>
      </div>

      {message && (
        <p role={message.type === 'error' ? 'alert' : 'status'} className="text-sub text-sm">
          {message.text}
        </p>
      )}
    </form>
  );
}
