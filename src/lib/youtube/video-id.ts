// YouTube 영상 id 형식 검사. 서버 전용 코드가 없어서 클라이언트(상세 페이지 등)에서도 import할 수 있다.
// 상세 페이지와 API가 같은 규칙을 쓰도록 한 곳에 둔다. (#11)

/** YouTube 영상 id 형식: 영문 · 숫자 · `-` · `_` 11자 */
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function isVideoId(id: string): boolean {
  return VIDEO_ID_PATTERN.test(id);
}
