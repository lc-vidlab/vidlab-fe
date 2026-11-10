'use client';

import { useId, useState, type ReactNode } from 'react';

type VideoDescriptionProps = {
  /** 조회수 · 업로드 시점 줄. 서버에서 만든 문자열을 받는다 (날짜 계산을 서버 한 곳에서만) */
  meta: ReactNode;
  /** 펼쳤을 때만 보이는 정확한 업로드 날짜 */
  fullDate: string;
  description: string;
};

/** 설명이 이보다 길면 접어서 보여준다 */
const COLLAPSE_LINES = 3;
const COLLAPSE_CHARS = 150;

/** 영상 설명 펼치기 / 접기 (WATCH-03) */
export function VideoDescription({ meta, fullDate, description }: VideoDescriptionProps) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);

  const text = description.trim();
  const collapsible = text.split('\n').length > COLLAPSE_LINES || text.length > COLLAPSE_CHARS;
  const isOpen = expanded || !collapsible;

  return (
    <div className="bg-surface text-text flex flex-col gap-1 rounded-xl p-3 text-sm">
      <p className="font-medium">
        {meta}
        {isOpen && <span className="ml-2">{fullDate}</span>}
      </p>

      {text ? (
        <p
          id={`${id}-text`}
          className={`break-words whitespace-pre-line ${isOpen ? '' : 'line-clamp-3'}`}
        >
          {text}
        </p>
      ) : (
        <p className="text-sub">설명이 없는 영상이에요.</p>
      )}

      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={`${id}-text`}
          className="text-text self-start font-medium hover:underline"
        >
          {expanded ? '간략히' : '더보기'}
        </button>
      )}
    </div>
  );
}
