import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,

  // 내부망 개발 접속 허용
  allowedDevOrigins: ['192.168.55.165'],

  images: {
    // new URL('https://host/**') 형식은 쿼리 문자열이 없는 주소만 허용한다 (search: ''로 처리됨).
    // 쿼리가 붙어 오는 주소는 객체 형식으로 쓰고 search를 생략한다 (#26)
    remotePatterns: [
      // Mock 썸네일 · 아바타
      new URL('https://picsum.photos/seed/**'),

      // 국가별 국기 이미지
      new URL('https://flagcdn.com/w40/**'),

      // YouTube 영상 썸네일. maxres 썸네일은 ?v=... 가 붙어 올 수 있다
      { protocol: 'https', hostname: 'i.ytimg.com', pathname: '/**' },

      // YouTube 채널 프로필 이미지
      { protocol: 'https', hostname: 'yt3.ggpht.com', pathname: '/**' },
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
