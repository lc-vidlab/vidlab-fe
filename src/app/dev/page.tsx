// 개발용 테스트 페이지 목록. 배포 전에 src/app/dev 폴더째 삭제한다.

const PAGES = [
  {
    href: '/dev/youtube-mock',
    title: 'YouTube mock 테스트',
    description: 'mock 데이터로 서비스 함수 호출. API 키 · 할당량 필요 없음',
  },
  {
    href: '/dev/youtube-live',
    title: 'YouTube 실제 API 테스트',
    description: '.env.local의 YOUTUBE_API_KEY로 실제 호출. 할당량을 씀',
  },
];

export default function DevPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-bold">개발용 테스트 페이지</h1>
      <ul className="flex flex-col gap-3">
        {PAGES.map((page) => (
          <li key={page.href}>
            <a href={page.href} className="border-border bg-surface block rounded-lg border p-4">
              <span className="text-accent font-semibold">{page.title}</span>
              <span className="text-sub block text-sm">{page.description}</span>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
