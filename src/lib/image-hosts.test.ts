import { matchRemotePattern } from 'next/dist/shared/lib/match-remote-pattern';
import { describe, expect, it } from 'vitest';

import nextConfig from '../../next.config';

// next.config.ts의 images.remotePatterns가 실제로 쓰는 이미지 주소를 허용하는지 확인한다.
// Next가 next/image 주소를 검사할 때 쓰는 함수(matchRemotePattern)를 그대로 쓴다.
// new URL('https://host/**') 형식으로 되돌리면 ?v= 썸네일이 막혀 런타임 에러가 난다 (#26)

const patterns = nextConfig.images?.remotePatterns ?? [];

function isAllowed(src: string): boolean {
  const url = new URL(src);
  return patterns.some((pattern) => matchRemotePattern(pattern, url));
}

describe('next.config.ts images.remotePatterns', () => {
  it.each([
    ['YouTube 썸네일', 'https://i.ytimg.com/vi/JD-kMIpDfnY/hqdefault.jpg'],
    [
      '쿼리가 붙은 maxres 썸네일 (#26)',
      'https://i.ytimg.com/vi/JD-kMIpDfnY/maxresdefault.jpg?v=6ad62daa',
    ],
    ['채널 아바타', 'https://yt3.ggpht.com/abc123=s88-c-k-c0x00ffffff-no-rj'],
    ['쿼리가 붙은 채널 아바타', 'https://yt3.ggpht.com/abc123?v=1'],
    ['mock 썸네일', 'https://picsum.photos/seed/vid-1/640/360'],
    ['국기', 'https://flagcdn.com/w40/kr.png'],
  ])('허용: %s', (_, src) => {
    expect(isAllowed(src)).toBe(true);
  });

  it.each([
    ['http (https만 허용)', 'http://i.ytimg.com/vi/JD-kMIpDfnY/hqdefault.jpg'],
    ['등록하지 않은 호스트', 'https://evil.example.com/a.jpg'],
    ['비슷한 이름의 다른 호스트', 'https://i.ytimg.com.evil.example.com/a.jpg'],
    ['등록하지 않은 YouTube 이미지 호스트', 'https://yt3.googleusercontent.com/abc'],
  ])('거부: %s', (_, src) => {
    expect(isAllowed(src)).toBe(false);
  });
});
