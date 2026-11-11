import { HomeResetBoundary } from '@/components/layout/HomeResetBoundary';
import FeedPage from '@/features/feed/components/FeedPage';

export default function HomePage() {
  return (
    // 헤더 로고를 누르면 피드를 처음 상태(대한민국 · 전체)로 되돌린다
    <HomeResetBoundary>
      <FeedPage />
    </HomeResetBoundary>
  );
}
