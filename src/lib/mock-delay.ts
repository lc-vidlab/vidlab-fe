// mock 모드 응답 지연. 유튜브 · 댓글 mock이 같이 쓴다.

/** 기본 응답 지연(ms). 로딩 스켈레톤을 확인할 수 있게 한다 */
const DEFAULT_DELAY_MS = 300;

/**
 * 응답 지연(ms). MOCK_DELAY_MS 환경변수로 바꿀 수 있다.
 * 예: 스켈레톤을 오래 보고 싶으면 2000, 테스트에서는 0
 */
function delayMs(): number {
  const raw = process.env.MOCK_DELAY_MS;
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_DELAY_MS;
}

/** 실제 네트워크처럼 잠깐 기다린다 */
export function mockDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs()));
}
