// 스냅샷 날짜는 시각 정보가 없는 "달력 날짜"이므로 항상 UTC 자정 기준으로
// 파싱/포맷해 타임존에 따라 하루가 밀리는 문제를 방지한다.

export function parseDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export function formatDateOnlyISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatDateOnlyKorean(date: Date): string {
  const [y, m, d] = formatDateOnlyISO(date).split("-").map(Number);
  return `${y}년 ${m}월 ${d}일`;
}
