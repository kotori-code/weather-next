// カレンダーの日付の計算（"YYYY-MM-DD" の文字列で扱い、タイムゾーンの影響を受けないよう UTC で計算する）

/** その月を日曜始まりの週ごとに並べる。前後の月の日は null */
export function monthGrid(month: string): (string | null)[][] {
  const [year, mon] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, mon - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, mon, 0)).getUTCDate();

  const cells: (string | null)[] = Array(first.getUTCDay()).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${month}-${String(day).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** "2026-10-17" → "10月17日(土)" */
export function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${month}月${day}日(${weekday})`;
}

export { WEEKDAYS };
