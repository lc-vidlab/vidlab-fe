'use client';

import { useId, useState, useSyncExternalStore, type FormEvent } from 'react';
import {
  COMMENT_RULES,
  validateComment,
  type CommentInput,
} from '@/features/watch/lib/comment-rules';

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
  /**
   * 댓글 등록 요청. CMT-03(POST /api/comments)이 나오면 연결한다.
   * 없으면 화면만 동작하고 "아직 저장되지 않음" 안내를 띄운다.
   */
  onSubmit?: (input: CommentInput) => Promise<void>;
};

/** Vidlab 익명 댓글 작성 폼 (WATCH-07, 화면만) */
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

  const errors = validateComment({ nickname, password, content });
  const isValid = !errors.nickname && !errors.password && !errors.content;
  const showNicknameError = touched.nickname && !!errors.nickname;
  const showPasswordError = touched.password && !!errors.password;

  function reset() {
    setPassword('');
    setContent('');
    setTouched({ nickname: false, password: false });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isValid || submitting) return;

    // 사람이 볼 수 없는 칸이 채워졌으면 봇으로 보고 조용히 무시
    if (honeypot) {
      reset();
      return;
    }

    const input = { nickname: nickname.trim(), password, content: content.trim() };
    setSubmitting(true);
    setMessage(null);
    try {
      if (onSubmit) {
        await onSubmit(input);
      } else {
        // TODO(WATCH-07): CMT-03 연결 후 이 분기 제거
        setMessage({
          type: 'info',
          text: '아직 댓글 API가 연결되지 않아 저장되지 않았어요.',
        });
      }
      saveNickname(input.nickname);
      setNicknameDraft(input.nickname);
      reset();
    } catch {
      setMessage({ type: 'error', text: '댓글을 등록하지 못했어요. 잠시 후 다시 시도해 주세요.' });
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
            onChange={(e) => setNicknameDraft(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, nickname: true }))}
            maxLength={COMMENT_RULES.nickname.max}
            placeholder={`닉네임 (${COMMENT_RULES.nickname.min}~${COMMENT_RULES.nickname.max}자)`}
            autoComplete="nickname"
            aria-invalid={showNicknameError}
            aria-describedby={showNicknameError ? `${id}-nickname-error` : undefined}
            className={inputClass}
          />
          {showNicknameError && (
            <p id={`${id}-nickname-error`} className="text-sub text-xs">
              {errors.nickname}
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
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            maxLength={COMMENT_RULES.password.max}
            placeholder={`비밀번호 (${COMMENT_RULES.password.min}~${COMMENT_RULES.password.max}자, 삭제 시 필요)`}
            autoComplete="off"
            aria-invalid={showPasswordError}
            aria-describedby={showPasswordError ? `${id}-password-error` : undefined}
            className={inputClass}
          />
          {showPasswordError && (
            <p id={`${id}-password-error`} className="text-sub text-xs">
              {errors.password}
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
        onChange={(e) => setContent(e.target.value)}
        maxLength={COMMENT_RULES.content.max}
        rows={3}
        placeholder="댓글 추가..."
        aria-describedby={`${id}-count`}
        className={`${inputClass} h-auto resize-y py-2 leading-relaxed`}
      />

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
        <span id={`${id}-count`} className="text-sub text-xs tabular-nums">
          {content.length} / {COMMENT_RULES.content.max}
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
            disabled={!isValid || submitting}
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
