import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.55.165'],
  cacheComponents: true,
  images: {
    remotePatterns: [
      // mock 썸네일 · 아바타 (src/mocks/youtube.ts)
      new URL('https://picsum.photos/seed/**'),
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
