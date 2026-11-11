
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,

  // 내부망 개발 접속 허용
  allowedDevOrigins: ['192.168.55.165'],

  images: {
    remotePatterns: [
      // Mock 썸네일 · 아바타
      new URL('https://picsum.photos/seed/**'),

      // 국가별 국기 이미지
      new URL('https://flagcdn.com/w40/**'),

      // YouTube 영상 썸네일
      new URL('https://i.ytimg.com/**'),

      // YouTube 채널 프로필 이미지
      new URL('https://yt3.ggpht.com/**'),
    ],
  },

  partialPrefetching: true,

  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
