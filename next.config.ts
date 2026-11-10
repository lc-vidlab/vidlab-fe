import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.55.165'],
  cacheComponents: true,
  images: {
    remotePatterns: [
      // mock 썸네일 · 아바타 (src/mocks/youtube.ts)
      new URL('https://picsum.photos/seed/**'),
      new URL('https://i.ytimg.com/**'),
      new URL('https://yt3.ggpht.com/**'),
      new URL('https://yt3.googleusercontent.com/**'),
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
        pathname: '/w40/**',
      },
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
