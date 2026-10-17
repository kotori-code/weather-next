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
    };
  });
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
    });
  }

  return { location, today, current: toCurrent(current), days };
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
