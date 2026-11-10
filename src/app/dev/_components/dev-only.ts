import { notFound } from 'next/navigation';

/**
 * 프로덕션 빌드에서는 404로 막는다.
 *
 * 레이아웃에서만 막으면 안 된다. App Router는 레이아웃과 페이지를 동시에 렌더링하기 시작해서,
 * 레이아웃이 404를 내도 페이지 쪽 YouTube 호출이 이미 시작될 수 있다.
 * 그래서 레이아웃 · 페이지 · API를 호출하기 직전에 모두 이 함수를 부른다.
 */
export function assertDevelopment(): void {
  if (process.env.NODE_ENV === 'production') notFound();
}
