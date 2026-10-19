// 洗濯日和予報（予報から洗濯物の乾きやすさを決める純粋な関数）
import { weatherKind, type HourlyForecast } from "@/lib/forecast";

export type LaundryLevel = 1 | 2 | 3 | 4;

export type LaundryForecast = {
  level: LaundryLevel;
  mark: string;
  label: string;
  comment: string;
  humidity: number; // 日中の平均湿度（%）
  pop: number; // 日中の最大の降水確率（%）
};

const LEVELS: Record<LaundryLevel, { mark: string; label: string; comment: string }> = {
  4: { mark: "◎", label: "洗濯日和", comment: "外干しでよく乾きます。" },
  3: { mark: "○", label: "外干しOK", comment: "日中のうちに乾きます。" },
  2: { mark: "△", label: "乾きにくい", comment: "厚手のものは室内干しや乾燥機も考えて。" },
  1: { mark: "×", label: "室内干しがおすすめ", comment: "雨の心配があります。" },
};

/** 洗濯物を干す日中の時間帯（その土地の時刻） */
const DAYTIME_FROM = 9;
const DAYTIME_TO = 15;

/**
 * 日中（9〜15 時）の予報から洗濯物の乾きやすさを 4 段階で出す。日中の予報がなければ null。
 * 雨か降水確率 50% 以上なら室内干し。それ以外は晴れ・湿度・気温・風で点を付ける。
 */
export function laundryForecast(hours: HourlyForecast[]): LaundryForecast | null {
  const daytime = hours.filter((h) => {
    const hour = Number(h.time.slice(0, 2));
    return hour >= DAYTIME_FROM && hour <= DAYTIME_TO;
  });
  if (daytime.length === 0) return null;

  const average = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
  const humidity = Math.round(average(daytime.map((h) => h.humidity)));
  const temp = average(daytime.map((h) => h.temp));
  const pop = Math.max(...daytime.map((h) => h.pop));
  const wind = Math.max(...daytime.map((h) => h.windSpeed));
  const sunny = daytime.filter((h) => weatherKind(h.icon) === "sunny").length;
  const rainy = daytime.some((h) => weatherKind(h.icon) === "rainy");

  let level: LaundryLevel;
  let comment: string;
  if (rainy || pop >= 50) {
    level = 1;
    comment = LEVELS[1].comment;
  } else {
    const score =
      (sunny * 2 >= daytime.length ? 1 : 0) + (humidity < 60 ? 1 : 0) + (temp >= 20 ? 1 : 0) + (wind >= 2 ? 1 : 0);
    level = score >= 3 ? 4 : score === 2 ? 3 : 2;
    comment = LEVELS[level].comment;
    if (pop >= 30) {
      level = Math.min(level, 2) as LaundryLevel;
      comment = "にわか雨の心配があります。干すなら早めに取り込みを。";
    }
  }
  if (level > 1 && wind >= 8) comment += " 風が強いので、飛ばされないよう注意。";

  return { level, mark: LEVELS[level].mark, label: LEVELS[level].label, comment, humidity, pop };
}
