// OpenWeatherMap の応答を画面で使う形に変える（API には接続しない純粋な関数だけを置く）

/** OpenWeatherMap の天気の 1 件（現在の天気・3 時間ごとの予報で共通） */
export type OwmItem = {
  dt: number;
  main: { temp: number; feels_like: number; temp_min: number; temp_max: number; humidity: number };
  weather: { id: number; main: string; description: string; icon: string }[];
  wind: { speed: number };
  pop?: number; // 降水確率（0〜1）。予報にだけある
  rain?: { "1h"?: number; "3h"?: number };
  snow?: { "1h"?: number; "3h"?: number };
};

export type OwmForecast = {
  list: OwmItem[];
  city: { name: string; country: string; timezone: number; coord: { lat: number; lon: number } };
};

export type OwmCurrent = OwmItem & { name: string; timezone: number; sys: { country: string } };

export type HourlyForecast = {
  time: string; // その土地の時刻 "HH:mm"
  temp: number;
  humidity: number;
  pop: number; // 降水確率（%）
  description: string;
  icon: string;
  windSpeed: number;
};

export type CurrentWeather = {
  temp: number;
  feelsLike: number;
  humidity: number;
  description: string;
  icon: string;
  windSpeed: number;
};

export type DailyForecast = {
  date: string; // その土地の日付 "YYYY-MM-DD"
  tempMax: number | null;
  tempMin: number | null;
  humidity: number | null; // 1 日の平均（%）
  pop: number | null; // 1 日のうち最も高い降水確率（%）
  description: string;
  icon: string;
  hours: HourlyForecast[];
  hourly: HourlyForecast[]; // 1 時間ごと（3 時間ごとの予報から補った目安）
};

export type WeatherReport = {
  location: { name: string; country: string; lat: number; lon: number };
  today: string;
  current: CurrentWeather;
  days: DailyForecast[];
};

/** UNIX 時刻（秒）と UTC からのずれ（秒）から、その土地の日付と時刻を返す */
export function localDateTime(dt: number, timezoneOffset: number): { date: string; time: string; hour: number } {
  const iso = new Date((dt + timezoneOffset) * 1000).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16), hour: Number(iso.slice(11, 13)) };
}

function toHourly(item: OwmItem, timezoneOffset: number): HourlyForecast {
  return {
    time: localDateTime(item.dt, timezoneOffset).time,
    temp: Math.round(item.main.temp),
    humidity: item.main.humidity,
    pop: Math.round((item.pop ?? 0) * 100),
    description: item.weather[0]?.description ?? "",
    icon: item.weather[0]?.icon ?? "",
    windSpeed: Math.round(item.wind.speed * 10) / 10,
  };
}

export function toCurrent(item: OwmItem): CurrentWeather {
  return {
    temp: Math.round(item.main.temp),
    feelsLike: Math.round(item.main.feels_like),
    humidity: item.main.humidity,
    description: item.weather[0]?.description ?? "",
    icon: item.weather[0]?.icon ?? "",
    windSpeed: Math.round(item.wind.speed * 10) / 10,
  };
}

/** 3 時間ごとの予報を、その土地の日付ごとにまとめる */
export function groupByDay(list: OwmItem[], timezoneOffset: number): DailyForecast[] {
  const byDate = new Map<string, OwmItem[]>();
  for (const item of list) {
    const { date } = localDateTime(item.dt, timezoneOffset);
    byDate.set(date, [...(byDate.get(date) ?? []), item]);
  }

  return [...byDate.entries()].map(([date, items]) => {
    // その日の天気は正午にいちばん近い時間帯のものを代表にする
    const representative = items.reduce((best, item) =>
      Math.abs(localDateTime(item.dt, timezoneOffset).hour - 12) <
      Math.abs(localDateTime(best.dt, timezoneOffset).hour - 12)
        ? item
        : best,
    );
    const humidity = items.reduce((sum, item) => sum + item.main.humidity, 0) / items.length;
    return {
      date,
      tempMax: Math.round(Math.max(...items.map((item) => item.main.temp_max))),
      tempMin: Math.round(Math.min(...items.map((item) => item.main.temp_min))),
      humidity: Math.round(humidity),
      pop: Math.round(Math.max(...items.map((item) => item.pop ?? 0)) * 100),
      description: representative.weather[0]?.description ?? "",
      icon: representative.weather[0]?.icon ?? "",
      hours: items.map((item) => toHourly(item, timezoneOffset)),
      hourly: [], // buildReport で入れる
    };
  });
}

const HOUR = 3600;

/**
 * 3 時間ごとの予報を、その土地の時刻で 1 時間ごとにする。
 * 気温・湿度・風速は前後の予報から直線で補い、天気と降水確率は近いほうの予報を使う。
 */
export function interpolateHourly(items: OwmItem[], timezoneOffset: number): (HourlyForecast & { date: string })[] {
  const sorted = [...items].sort((a, b) => a.dt - b.dt);
  if (sorted.length === 0) return [];

  const result: (HourlyForecast & { date: string })[] = [];
  // その土地のちょうどの時刻（〇時 00 分）から始める
  const start = Math.ceil((sorted[0].dt + timezoneOffset) / HOUR) * HOUR - timezoneOffset;
  let i = 0;
  for (let t = start; t <= sorted[sorted.length - 1].dt; t += HOUR) {
    while (i < sorted.length - 1 && sorted[i + 1].dt <= t) i++;
    const before = sorted[i];
    const after = sorted[i + 1] ?? before;
    const ratio = after === before ? 0 : (t - before.dt) / (after.dt - before.dt);
    const nearest = ratio <= 0.5 ? before : after;
    const lerp = (from: number, to: number) => from + (to - from) * ratio;
    result.push({
      date: localDateTime(t, timezoneOffset).date,
      time: localDateTime(t, timezoneOffset).time,
      temp: Math.round(lerp(before.main.temp, after.main.temp)),
      humidity: Math.round(lerp(before.main.humidity, after.main.humidity)),
      pop: Math.round((nearest.pop ?? 0) * 100),
      description: nearest.weather[0]?.description ?? "",
      icon: nearest.weather[0]?.icon ?? "",
      windSpeed: Math.round(lerp(before.wind.speed, after.wind.speed) * 10) / 10,
    });
  }
  return result;
}

/** 現在の天気と予報から、画面に渡す内容を作る */
export function buildReport(
  current: OwmCurrent,
  forecast: OwmForecast,
  location: WeatherReport["location"],
): WeatherReport {
  const timezoneOffset = forecast.city.timezone;
  const today = localDateTime(current.dt, timezoneOffset).date;
  const days = groupByDay(forecast.list, timezoneOffset).filter((day) => day.date >= today);

  // 夜遅くは今日の予報が残っていないので、今日の欄を現在の天気で作る
  if (days[0]?.date !== today) {
    days.unshift({
      date: today,
      tempMax: null,
      tempMin: null,
      humidity: current.main.humidity,
      pop: null,
      description: current.weather[0]?.description ?? "",
      icon: current.weather[0]?.icon ?? "",
      hours: [],
      hourly: [],
    });
  }

  // 1 時間ごとの予報は、今の時刻（〇時 00 分）を現在の天気にして、その先を予報から補う。
  // 現在の天気には降水確率がないので、次の予報の値を使う
  const now = Math.floor((current.dt + timezoneOffset) / HOUR) * HOUR - timezoneOffset;
  const upcoming = forecast.list.filter((item) => item.dt > now);
  const timeline = interpolateHourly([{ ...current, dt: now, pop: upcoming[0]?.pop ?? 0 }, ...upcoming], timezoneOffset);
  for (const day of days) {
    day.hourly = timeline.filter((hour) => hour.date === day.date);
  }

  return { location, today, current: toCurrent(current), days };
}

export type WeatherKind = "sunny" | "cloudy" | "rainy";

export const WEATHER_KIND_LABEL: Record<WeatherKind, string> = { sunny: "晴れ", cloudy: "曇り", rainy: "雨・雪" };

/** アイコンの番号を晴れ・曇り・雨（雪・雷を含む）に分ける。霧は曇りにする */
export function weatherKind(icon: string): WeatherKind {
  switch (icon.slice(0, 2)) {
    case "01":
    case "02":
      return "sunny";
    case "09":
    case "10":
    case "11":
    case "13":
      return "rainy";
    default:
      return "cloudy";
  }
}

/** OpenWeatherMap のアイコンの番号を絵文字にする（末尾の d/n は昼/夜） */
export function weatherEmoji(icon: string): string {
  const night = icon.endsWith("n");
  switch (icon.slice(0, 2)) {
    case "01":
      return night ? "🌙" : "☀️";
    case "02":
      return night ? "☁️" : "🌤️";
    case "03":
      return "⛅";
    case "04":
      return "☁️";
    case "09":
      return "🌧️";
    case "10":
      return night ? "🌧️" : "🌦️";
    case "11":
      return "⛈️";
    case "13":
      return "❄️";
    case "50":
      return "🌫️";
    default:
      return "🌡️";
  }
}
