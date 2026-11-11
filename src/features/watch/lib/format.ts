// 상세 페이지용 숫자 · 날짜 표시.
// TODO: 이주혁 SET-05 공용 lib/format.ts가 생기면 그쪽 함수로 교체한다.

const TIME_ZONE = 'Asia/Seoul';

/** 1234567 → 조회수 1,234,567회. 0(조회수 숨김)이면 null */
export function formatViewCountFull(count: number): string | null {
  if (count <= 0) return null;
  return `조회수 ${count.toLocaleString('ko-KR')}회`;
}

/** 1820000 → 182만, 98400 → 9.8만, 1200 → 1.2천, 950 → 950 */
function compactNumber(count: number): string {
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
      return `${text}${unit}`;
    }
  }
  return String(count);
}

/** 1820000 → 구독자 182만명. 숨긴 채널(undefined)이면 null */
export function formatSubscriberCount(count: number | undefined): string | null {
  if (count === undefined) return null;
  return `구독자 ${compactNumber(count)}명`;
}

/** 12345 → 조회수 1.2만회 (카드용 짧은 표기). 0(조회수 숨김)이면 null */
export function formatViewCountShort(count: number): string | null {
  if (count <= 0) return null;
  return `조회수 ${compactNumber(count)}회`;
}

/** 초 → 3725 = 1:02:05, 1122 = 18:42, 45 = 0:45. 0(라이브 등)이면 null */
export function formatDuration(totalSec: number): string | null {
  if (totalSec <= 0) return null;
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const ss = String(totalSec % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${ss}` : `${minutes}:${ss}`;
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

/** ISO 날짜 → 2026. 11. 7. (서버 시간대와 상관없이 한국 날짜) */
export function formatFullDate(iso: string): string {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeZone: TIME_ZONE }).format(
    new Date(iso),
  );
}
