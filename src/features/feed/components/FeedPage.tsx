'use client';

import Link from 'next/link';
import { useState } from 'react';
import VideoCard from '@/components/video/VideoCard';
import SearchBar from '@/features/search/components/SearchBar';
import { categories, feedVideos, type FeedCategory } from '../mocks/videos';
import FeedMenu from './FeedMenu';

export default function FeedPage() {
  const [category, setCategory] = useState<FeedCategory>('전체');
  const videos = feedVideos.filter((video) => category === '전체' || video.category === category);

  return (
    <div className="bg-bg min-h-screen">
      <header className="border-border bg-bg sticky top-0 z-20 border-b">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-8 lg:px-12">
          <Link
            href="/"
            aria-label="Vidlab 홈"
            className="text-text text-2xl font-black tracking-tight"
          >
            VIDLAB<span className="text-accent">.</span>
          </Link>
          <div className="order-3 w-full sm:order-none sm:w-auto sm:flex-1 sm:px-8 lg:max-w-2xl">
            <SearchBar />
          </div>
          <FeedMenu
            onExplore={(focusCategory) => {
              if (focusCategory) {
                document.querySelector<HTMLButtonElement>('#feed-categories button')?.focus();
              } else {
                setCategory('전체');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-6 pt-8 pb-12 sm:px-8 lg:px-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sub mt-2 text-sm">취향을 따라, 새로운 이야기를 만나보세요.</p>
          </div>
          <span className="border-border text-sub hidden rounded-full border px-3 py-1.5 text-xs sm:block">
            대한민국 · 인기 영상
          </span>
        </div>

        <nav
          id="feed-categories"
          aria-label="영상 카테고리"
          className="mb-7 flex gap-2 overflow-x-auto pb-2"
        >
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
              className={`focus-visible:outline-accent shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${category === item ? 'bg-text text-bg' : 'bg-surface text-sub hover:text-text'}`}
            >
              {item}
            </button>
          ))}
        </nav>

        <p role="status" className="sr-only">
          {category} 영상 {videos.length}개
        </p>
        <div className="grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      </main>
    </div>
  );
}
