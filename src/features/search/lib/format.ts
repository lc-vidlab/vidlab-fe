// TODO(민진): 이주혁 SET-05 lib/format.ts가 생기면 그쪽 함수로 교체하고 이 파일은 삭제한다.

/** 1234 → 1.2천회, 12345 → 1.2만회, 123456789 → 1.2억회 */
export function formatViewCount(count: number | null): string | null {
  if (count === null) return null;
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

/** PT1H2M5S → 1:02:05, PT18M42S → 18:42, PT45S → 0:45 */
export function formatDuration(iso: string | null): string | null {
  if (!iso) return null;
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return null;
  const [, d = '0', h = '0', m = '0', s = '0'] = match;
  const hours = Number(d) * 24 + Number(h);
  const mm = hours > 0 ? m.padStart(2, '0') : m;
  const ss = s.padStart(2, '0');
  if (hours === 0 && Number(m) === 0 && Number(s) === 0) return null;
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}
