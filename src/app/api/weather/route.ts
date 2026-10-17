import { fetchWeather, WeatherError } from "@/lib/server/openweather";

// GET /api/weather?city=東京 または ?lat=35.68&lon=139.76
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const city = params.get("city")?.trim();
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));

  let target: { city: string } | { lat: number; lon: number };
  if (city) {
    if (city.length > 100) return Response.json({ error: "都市名が長すぎます。" }, { status: 400 });
    target = { city };
  } else if (params.has("lat") && params.has("lon") && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
    target = { lat, lon };
  } else {
    return Response.json({ error: "都市名か現在地を指定してください。" }, { status: 400 });
  }

  try {
    return Response.json(await fetchWeather(target));
  } catch (error) {
    if (error instanceof WeatherError) return Response.json({ error: error.message }, { status: error.status });
    console.error(error);
    return Response.json({ error: "天気の情報を取得できませんでした。" }, { status: 500 });
  }
}
