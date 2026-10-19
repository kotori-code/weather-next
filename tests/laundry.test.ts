import { describe, expect, it } from "vitest";
import type { HourlyForecast } from "@/lib/forecast";
import { laundryForecast } from "@/lib/laundry";

function hour(time: string, overrides: Partial<HourlyForecast> = {}): HourlyForecast {
  return { time, temp: 22, humidity: 50, pop: 0, description: "晴天", icon: "01d", windSpeed: 3, ...overrides };
}

describe("laundryForecast", () => {
  it("晴れて乾いた暖かい日は洗濯日和", () => {
    const result = laundryForecast([hour("09:00"), hour("12:00"), hour("15:00")]);
    expect(result).toMatchObject({ level: 4, label: "洗濯日和", humidity: 50, pop: 0 });
  });

  it("日中に雨の予報があれば室内干し", () => {
    const result = laundryForecast([hour("09:00"), hour("12:00", { icon: "10d" }), hour("15:00")]);
    expect(result?.level).toBe(1);
  });

  it("降水確率が 50% 以上なら室内干し", () => {
    expect(laundryForecast([hour("12:00", { pop: 50 })])?.level).toBe(1);
  });

  it("曇りで湿度が高く寒い日は乾きにくい", () => {
    const result = laundryForecast([hour("12:00", { icon: "04d", humidity: 80, temp: 12, windSpeed: 1 })]);
    expect(result?.level).toBe(2);
  });

  it("降水確率 30% 以上は、晴れていても乾きにくいにとどめる", () => {
    const result = laundryForecast([hour("12:00", { pop: 30 })]);
    expect(result?.level).toBe(2);
    expect(result?.comment).toContain("にわか雨");
  });

  it("風が強ければ注意を添える", () => {
    expect(laundryForecast([hour("12:00", { windSpeed: 9 })])?.comment).toContain("風が強い");
  });

  it("日中（9〜15 時）の予報がなければ null", () => {
    expect(laundryForecast([hour("18:00"), hour("21:00")])).toBeNull();
    expect(laundryForecast([])).toBeNull();
  });
});
