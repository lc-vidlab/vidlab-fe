// mock 모드 판단. service.ts에서 분리해 두어, SRV-05에서 service.ts에 파일 단위
// 'use cache'를 붙여도 이 동기 함수가 걸리지 않게 한다. ('use cache' 파일은 export가 모두 async여야 함)

/**
 * mock 모드인지 확인한다.
 * 실수로 할당량을 쓰지 않도록, USE_MOCK=false로 명시했을 때만 실제 API를 쓴다.
 */
export function isMockMode(): boolean {
  return process.env.USE_MOCK !== 'false';
}
