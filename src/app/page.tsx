import FeedPage from '@/features/feed/components/FeedPage';
import { Suspense } from 'react';

export default function HomePage() {
  return (
    <Suspense fallback={<main className="text-sub p-8 text-center">피드를 불러오는 중…</main>}>
      <FeedPage />
    </Suspense>
  );
}
