import { describe, expect, it } from "vitest";
import { buildReport, interpolateHourly, weatherKind, type OwmCurrent, type OwmItem } from "@/lib/forecast";

const JST = 9 * 3600;

function item(jst: string, overrides: { temp?: number; humidity?: number; pop?: number; icon?: string; wind?: number } = {}): OwmItem {
  const temp = overrides.temp ?? 20;
  return {
    dt: Date.parse(`${jst}:00+09:00`) / 1000,
    main: { temp, feels_like: temp, temp_min: temp, temp_max: temp, humidity: overrides.humidity ?? 50 },
    weather: [{ id: 800, main: "Clear", description: overrides.icon ?? "01d", icon: overrides.icon ?? "01d" }],
    wind: { speed: overrides.wind ?? 3 },
    pop: overrides.pop ?? 0,
  };
}

describe("interpolateHourly", () => {
  it("3 時間ごとの予報の間を 1 時間ごとに補う", () => {
    const hours = interpolateHourly(
      [
        item("2026-10-17T12:00", { temp: 20, humidity: 50, pop: 0.1, icon: "01d", wind: 3 }),
        item("2026-10-17T15:00", { temp: 26, humidity: 80, pop: 0.7, icon: "10d", wind: 6 }),
      ],
      JST,
    );
    expect(hours.map((h) => h.time)).toEqual(["12:00", "13:00", "14:00", "15:00"]);
    // 気温・湿度・風速は直線で補う
    expect(hours.map((h) => h.temp)).toEqual([20, 22, 24, 26]);
    expect(hours.map((h) => h.humidity)).toEqual([50, 60, 70, 80]);
    expect(hours[1].windSpeed).toBe(4);
    // 天気と降水確率は近いほうの予報
    expect(hours.map((h) => h.icon)).toEqual(["01d", "01d", "10d", "10d"]);
    expect(hours.map((h) => h.pop)).toEqual([10, 10, 70, 70]);
  });

  it("日付をまたいでも、その土地の日付を付ける", () => {
    const hours = interpolateHourly([item("2026-10-17T21:00"), item("2026-10-18T00:00")], JST);
    expect(hours.map((h) => `${h.date} ${h.time}`)).toEqual([
      "2026-10-17 21:00",
      "2026-10-17 22:00",
      "2026-10-17 23:00",
      "2026-10-18 00:00",
    ]);
  });

  it("予報がなければ空", () => {
    expect(interpolateHourly([], JST)).toEqual([]);
  });
});

describe("buildReport の 1 時間ごとの予報", () => {
  it("今日は今の時刻（現在の天気）から始まり、日ごとに分かれる", () => {
    const current: OwmCurrent = {
      ...item("2026-10-17T22:40", { temp: 16 }),
      name: "Tokyo",
      timezone: JST,
      sys: { country: "JP" },
    };
    const forecast = {
      // 過去の予報は使わない
      list: [item("2026-10-17T21:00", { temp: 99 }), item("2026-10-18T00:00", { temp: 13, pop: 0.4 })],
      city: { name: "Tokyo", country: "JP", timezone: JST, coord: { lat: 0, lon: 0 } },
    };
    const report = buildReport(current, forecast, { name: "東京都", country: "JP", lat: 0, lon: 0 });
    const [today, tomorrow] = report.days;
    expect(today.hourly.map((h) => `${h.time} ${h.temp}`)).toEqual(["22:00 16", "23:00 15"]);
    // 現在の天気には降水確率がないので、次の予報の値を使う
    expect(today.hourly[0].pop).toBe(40);
    expect(tomorrow.hourly.map((h) => h.time)).toEqual(["00:00"]);
  });
});

it("アイコンの番号を晴れ・曇り・雨に分ける", () => {
  expect(["01d", "02n", "03d", "04d", "50d", "09d", "10n", "11d", "13d"].map(weatherKind)).toEqual([
    "sunny",
    "sunny",
    "cloudy",
    "cloudy",
    "cloudy",
    "rainy",
    "rainy",
    "rainy",
    "rainy",
  ]);
});
