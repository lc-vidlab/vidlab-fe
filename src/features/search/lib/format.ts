// TODO(민진): 이주혁 SET-05 lib/format.ts가 생기면 그쪽 함수로 교체하고 이 파일은 삭제한다.

/** 1234 → 1.2천회, 12345 → 1.2만회, 123456789 → 1.2억회. 0(조회수 숨김)이면 null */
export function formatViewCount(count: number): string | null {
  if (count <= 0) return null;
  const units: [number, string][] = [
    [1e8, '억'],
    [1e4, '만'],
    [1e3, '천'],
  ];
  for (const [size, unit] of units) {
    if (count >= size) {
      const value = count / size;
      const text =
        value >= 10 ? Math.floor(value).toString() : (Math.floor(value * 10) / 10).toString();
      return `조회수 ${text}${unit}회`;
    }
  }
  return `조회수 ${count}회`;
}

/** ISO 날짜 → 3일 전, 2개월 전 */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const diffSec = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  const steps: [number, string][] = [
    [60 * 60 * 24 * 365, '년'],
    [60 * 60 * 24 * 30, '개월'],
    [60 * 60 * 24 * 7, '주'],
    [60 * 60 * 24, '일'],
    [60 * 60, '시간'],
    [60, '분'],
  ];
  for (const [size, unit] of steps) {
    if (diffSec >= size) return `${Math.floor(diffSec / size)}${unit} 전`;
  }
  return '방금 전';
}

/** 초 → 3725 = 1:02:05, 1122 = 18:42, 45 = 0:45. 0(라이브 등)이면 null */
export function formatDuration(totalSec: number): string | null {
  if (totalSec <= 0) return null;
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const ss = String(totalSec % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${ss}` : `${minutes}:${ss}`;
}
