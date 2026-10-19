// 天気を LINE などで共有するための文面とリンク（純粋な関数だけを置く）
import { formatDate } from "@/lib/calendar";
import { weatherEmoji, type CurrentWeather, type DailyForecast, type WeatherReport } from "@/lib/forecast";
import { laundryForecast } from "@/lib/laundry";

// 登録した地点から開くときは、登録したときの名前で表示する
export type Target = { city: string } | { lat: number; lon: number; name?: string };

/** 開くとその地点の天気が出るリンク */
export function shareUrl(origin: string, location: WeatherReport["location"]): string {
  const params = new URLSearchParams({ lat: String(location.lat), lon: String(location.lon) });
  if (location.name) params.set("name", location.name);
  return `${origin}/?${params}`;
}

/** 共有のリンク（?lat=&lon=&name= か ?city=）から表示する地点を読む。なければ null */
export function targetFromSearch(search: string): Target | null {
  const params = new URLSearchParams(search);
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  if (params.has("lat") && params.has("lon") && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
    const name = params.get("name")?.slice(0, 100);
    return name ? { lat, lon, name } : { lat, lon };
  }
  const city = params.get("city")?.trim().slice(0, 100);
  return city ? { city } : null;
}

/** 選んだ日の天気を、LINE などに送る文面にする（最後にリンクを付ける） */
export function shareText(
  location: WeatherReport["location"],
  day: DailyForecast,
  url: string,
  current?: CurrentWeather,
): string {
  const lines = [`📍 ${location.name || "現在地"}の天気（${formatDate(day.date)}）`];
  if (current) lines.push(`${weatherEmoji(current.icon)} 今 ${current.temp}°C・${current.description}`);
  else lines.push(`${weatherEmoji(day.icon)} ${day.description}`);
  if (day.tempMax !== null) lines.push(`🌡️ 最高 ${day.tempMax}° / 最低 ${day.tempMin}°`);
  if (day.pop !== null) lines.push(`☔ 降水確率 ${day.pop}%`);
  const laundry = laundryForecast(day.hours);
  if (laundry) lines.push(`👕 ${laundry.mark} ${laundry.label}`);
  lines.push("", url);
  return lines.join("\n");
}

/** LINE の送信画面を開くリンク（スマホは LINE のアプリ、パソコンは LINE のページが開く） */
export function lineShareUrl(text: string): string {
  return `https://line.me/R/share?text=${encodeURIComponent(text)}`;
}
