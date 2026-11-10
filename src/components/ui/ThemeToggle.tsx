'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      aria-label={dark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      aria-pressed={dark}
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      className="border-border bg-bg text-accent dark:bg-surface dark:text-text focus-visible:outline-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {dark ? <Moon aria-hidden="true" size={20} /> : <Sun aria-hidden="true" size={20} />}
    </button>
  );
}
