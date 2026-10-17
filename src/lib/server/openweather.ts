// OpenWeatherMap の無料の API を呼ぶ（サーバーでだけ使う。API キーをブラウザに出さない）
import "server-only";
import { buildReport, type OwmCurrent, type OwmForecast, type WeatherReport } from "@/lib/forecast";

// テストで差し替えられるようにする（ふだんは設定しない）
const BASE_URL = process.env.OPENWEATHER_BASE_URL ?? "https://api.openweathermap.org";

/** 利用者に見せるメッセージ付きのエラー */
export class WeatherError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type GeoResult = { name: string; local_names?: Record<string, string>; country: string; lat: number; lon: number };

function apiKey(): string {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) throw new WeatherError("サーバーに OPENWEATHER_API_KEY が設定されていません。", 500);
  return key;
}

async function call<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const query = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), appid: apiKey() });
  const res = await fetch(`${BASE_URL}${path}?${query}`, { cache: "no-store" });
  if (res.status === 401) {
    throw new WeatherError("API キーが使えません。発行したばかりのキーは有効になるまで最大 2 時間ほどかかります。", 502);
  }
  if (res.status === 429) throw new WeatherError("アクセスが多すぎます。少し待ってからもう一度お試しください。", 429);
  if (!res.ok) throw new WeatherError(`天気の情報を取得できませんでした（${res.status}）。`, 502);
  return (await res.json()) as T;
}

function displayName(geo: GeoResult): string {
  return geo.local_names?.ja ?? geo.name;
}

/** 都市名から緯度・経度を調べる */
async function geocode(city: string): Promise<WeatherReport["location"]> {
  const results = await call<GeoResult[]>("/geo/1.0/direct", { q: city, limit: 1 });
  const geo = results[0];
  if (!geo) throw new WeatherError(`「${city}」が見つかりませんでした。`, 404);
  return { name: displayName(geo), country: geo.country, lat: geo.lat, lon: geo.lon };
}

/** 緯度・経度から地名を調べる（見つからなければ空のまま返す） */
async function reverseGeocode(lat: number, lon: number): Promise<WeatherReport["location"]> {
  const results = await call<GeoResult[]>("/geo/1.0/reverse", { lat, lon, limit: 1 });
  const geo = results[0];
  return { name: geo ? displayName(geo) : "", country: geo?.country ?? "", lat, lon };
}

export async function fetchWeather(target: { city: string } | { lat: number; lon: number }): Promise<WeatherReport> {
  const location = "city" in target ? await geocode(target.city) : await reverseGeocode(target.lat, target.lon);
  const params = { lat: location.lat, lon: location.lon, units: "metric", lang: "ja" };
  const [current, forecast] = await Promise.all([
    call<OwmCurrent>("/data/2.5/weather", params),
    call<OwmForecast>("/data/2.5/forecast", params),
  ]);
  if (!location.name) location.name = current.name || "現在地";
  return buildReport(current, forecast, location);
}
