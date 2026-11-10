'use client';

import { useRef, useState } from 'react';
import {
  House,
  Flame,
  Globe,
  LayoutGrid,
  History,
  ThumbsUp,
  Bookmark,
  Sun,
  Moon,
  Menu,
  X,
} from 'lucide-react';

const icons = {
  menu: Menu,
  close: X,
  home: House,
  popular: Flame,
  country: Globe,
  category: LayoutGrid,
  history: History,
  like: ThumbsUp,
  bookmark: Bookmark,
  sun: Sun,
  moon: Moon,
};

function Icon({ name }: { name: keyof typeof icons }) {
  const LucideIcon = icons[name];
  return <LucideIcon aria-hidden="true" size={18} strokeWidth={1.5} className="shrink-0" />;
}

const explore = [
  { icon: 'home', label: '홈' },
  { icon: 'popular', label: '인기 영상' },
  { icon: 'country', label: '국가별 인기 영상' },
  { icon: 'category', label: '카테고리 탐색' },
] as const;
const activity = [
  { icon: 'history', label: '최근 시청한 영상' },
  { icon: 'like', label: '좋아요 누른 영상' },
  { icon: 'bookmark', label: '나중에 볼 영상' },
] as const;

export default function FeedMenu({ onExplore }: { onExplore: (category: boolean) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [notice, setNotice] = useState('');
  const previousOverflow = useRef('');

  function close() {
    dialog.current?.close();
  }

  function show() {
    setNotice('');
    setDark(document.documentElement.classList.contains('dark'));
    previousOverflow.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.showModal();
    setOpen(true);
  }

  const rowClass =
    'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-bg focus-visible:outline-2 focus-visible:outline-accent';

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label="메뉴 열기"
        aria-expanded={open}
        aria-controls="feed-menu"
        aria-haspopup="dialog"
        onClick={show}
        className="text-sub hover:bg-surface focus-visible:outline-accent flex h-10 w-10 items-center justify-center rounded-full focus-visible:outline-2"
      >
        <Icon name="menu" />
      </button>
      <dialog
        ref={dialog}
        id="feed-menu"
        aria-label="탐색 메뉴"
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        onClose={() => {
          setOpen(false);
          document.body.style.overflow = previousOverflow.current;
          trigger.current?.focus();
        }}
        className="bg-surface text-text backdrop:bg-text/20 fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-[285px] max-w-[85vw] border-0 p-0 shadow-xl"
      >
        <div className="flex min-h-full flex-col px-2 pb-6">
          <div className="border-border flex h-[69px] shrink-0 items-center justify-end border-b px-2">
            <button
              type="button"
              aria-label="메뉴 닫기"
              onClick={close}
              className="text-sub hover:bg-bg flex h-10 w-10 items-center justify-center rounded-full"
            >
              <Icon name="close" />
            </button>
          </div>
          <nav aria-label="메인 메뉴">
            <section
              className="border-border border-b px-1 pt-5 pb-6"
              aria-labelledby="explore-heading"
            >
              <h2 id="explore-heading" className="text-sub mb-1 text-xs">
                탐색
              </h2>
              <div className="space-y-1">
                {explore.map(({ icon, label }) => (
                  <button
                    key={icon}
                    type="button"
                    aria-current={icon === 'home' ? 'page' : undefined}
                    className={`${rowClass} ${icon === 'home' ? 'bg-bg' : ''}`}
                    onClick={() => {
                      if (icon === 'country') {
                        setNotice('국가별 인기 영상은 준비 중입니다.');
                        return;
                      }
                      close();
                      onExplore(icon === 'category');
                    }}
                  >
                    <span className="text-sub">
                      <Icon name={icon} />
                    </span>
                    {label}
                  </button>
                ))}
              </div>
            </section>
            <section
              className="border-border border-b px-1 pt-5 pb-6"
              aria-labelledby="activity-heading"
            >
              <h2 id="activity-heading" className="text-sub mb-1 text-xs">
                내 활동
              </h2>
              <div className="space-y-1">
                {activity.map(({ icon, label }) => (
                  <button
                    key={icon}
                    type="button"
                    className={rowClass}
                    onClick={() => setNotice(`${label} 기능은 준비 중입니다.`)}
                  >
                    <span className="text-sub">
                      <Icon name={icon} />
                    </span>
                    {label}
                  </button>
                ))}
              </div>
            </section>
          </nav>
          <div className="px-1 pt-5">
            <button
              type="button"
              role="switch"
              aria-checked={dark}
              onClick={() => {
                const next = !dark;
                setDark(next);
                document.documentElement.classList.toggle('dark', next);
              }}
              className={rowClass}
            >
              <span className="text-sub">
                <Icon name={dark ? 'moon' : 'sun'} />
              </span>
              <span className="flex-1">다크 모드</span>
              <span
                aria-hidden="true"
                className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${dark ? 'bg-accent' : 'bg-border'}`}
              >
                <span
                  className={`bg-bg h-4 w-4 rounded-full shadow-sm transition-transform ${dark ? 'translate-x-4' : ''}`}
                />
              </span>
            </button>
            <p role="status" className="text-sub mt-3 px-3 text-xs leading-5">
              {notice}
            </p>
          </div>
        </div>
      </dialog>
    </>
  );
}
