import { describe, expect, it } from "vitest";
import { formatDate, monthGrid } from "@/lib/calendar";
import { buildReport, groupByDay, localDateTime, weatherEmoji, type OwmCurrent, type OwmItem } from "@/lib/forecast";

const JST = 9 * 3600;

/** 日本時間の "YYYY-MM-DDTHH:mm" から予報の 1 件を作る */
function item(jst: string, overrides: { temp?: number; humidity?: number; pop?: number; icon?: string } = {}): OwmItem {
  const temp = overrides.temp ?? 20;
  return {
    dt: Date.parse(`${jst}:00+09:00`) / 1000,
    main: { temp, feels_like: temp, temp_min: temp, temp_max: temp, humidity: overrides.humidity ?? 50 },
    weather: [{ id: 800, main: "Clear", description: "晴天", icon: overrides.icon ?? "01d" }],
    wind: { speed: 3.14 },
    pop: overrides.pop ?? 0,
  };
}

describe("localDateTime", () => {
  it("その土地の時差で日付と時刻を出す", () => {
    const dt = Date.parse("2026-10-17T15:00:00Z") / 1000;
    expect(localDateTime(dt, JST)).toEqual({ date: "2026-10-18", time: "00:00", hour: 0 });
    expect(localDateTime(dt, 0)).toEqual({ date: "2026-10-17", time: "15:00", hour: 15 });
  });
});

describe("groupByDay", () => {
  it("日本時間の日付ごとにまとめ、最高・最低・平均湿度・最大の降水確率を出す", () => {
    const days = groupByDay(
      [
        item("2026-10-17T09:00", { temp: 18.4, humidity: 40, pop: 0.1 }),
        item("2026-10-17T12:00", { temp: 23.6, humidity: 60, pop: 0.72, icon: "10d" }),
        item("2026-10-17T21:00", { temp: 15.2, humidity: 80, pop: 0.3, icon: "01n" }),
        item("2026-10-18T00:00", { temp: 14 }),
      ],
      JST,
    );
    expect(days.map((d) => d.date)).toEqual(["2026-10-17", "2026-10-18"]);
    expect(days[0]).toMatchObject({ tempMax: 24, tempMin: 15, humidity: 60, pop: 72, icon: "10d" });
    expect(days[0].hours.map((h) => h.time)).toEqual(["09:00", "12:00", "21:00"]);
    expect(days[0].hours[0]).toMatchObject({ temp: 18, pop: 10, windSpeed: 3.1 });
  });

  it("その日の天気は正午にいちばん近い時間帯のものにする", () => {
    const [day] = groupByDay(
      [item("2026-10-17T06:00", { icon: "09d" }), item("2026-10-17T15:00", { icon: "04d" })],
      JST,
    );
    expect(day.icon).toBe("04d");
  });
});

describe("buildReport", () => {
  const current: OwmCurrent = { ...item("2026-10-17T23:00", { temp: 12.6, humidity: 77, icon: "01n" }), name: "Tokyo", timezone: JST, sys: { country: "JP" } };
  const location = { name: "東京都", country: "JP", lat: 35.68, lon: 139.76 };

  it("今日の予報が残っていないときは、現在の天気で今日の欄を作る", () => {
    const report = buildReport(current, { list: [item("2026-10-18T00:00")], city: { name: "Tokyo", country: "JP", timezone: JST, coord: { lat: 0, lon: 0 } } }, location);
    expect(report.today).toBe("2026-10-17");
    expect(report.days.map((d) => d.date)).toEqual(["2026-10-17", "2026-10-18"]);
    expect(report.days[0]).toMatchObject({ tempMax: null, pop: null, humidity: 77, hours: [] });
    expect(report.current).toMatchObject({ temp: 13, humidity: 77 });
  });
});

describe("カレンダー", () => {
  it("2026 年 10 月は木曜始まりで 5 週", () => {
    const weeks = monthGrid("2026-10");
    expect(weeks).toHaveLength(5);
    expect(weeks[0].slice(0, 5)).toEqual([null, null, null, null, "2026-10-01"]);
    expect(weeks[4].filter(Boolean).at(-1)).toBe("2026-10-31");
  });

  it("日付を曜日付きで表示する", () => {
    expect(formatDate("2026-10-17")).toBe("10月17日(土)");
  });
});

it("アイコンの番号を昼夜に合わせた絵文字にする", () => {
  expect(weatherEmoji("01d")).toBe("☀️");
  expect(weatherEmoji("01n")).toBe("🌙");
  expect(weatherEmoji("10d")).toBe("🌦️");
});
