import { describe, expect, it } from "vitest";
import type { DailyForecast } from "@/lib/forecast";
import { lineShareUrl, shareText, shareUrl, targetFromSearch } from "@/lib/share";

const location = { name: "東京都", country: "JP", lat: 35.68, lon: 139.76 };

const day: DailyForecast = {
  date: "2026-10-20",
  tempMax: 22,
  tempMin: 14,
  humidity: 50,
  pop: 10,
  description: "晴天",
  icon: "01d",
  hours: [{ time: "12:00", temp: 22, humidity: 50, pop: 10, description: "晴天", icon: "01d", windSpeed: 3 }],
  hourly: [],
};

describe("shareUrl と targetFromSearch", () => {
  it("共有のリンクから同じ地点を読み戻せる", () => {
    const url = shareUrl("https://example.com", location);
    expect(url).toBe("https://example.com/?lat=35.68&lon=139.76&name=%E6%9D%B1%E4%BA%AC%E9%83%BD");
    expect(targetFromSearch(new URL(url).search)).toEqual({ lat: 35.68, lon: 139.76, name: "東京都" });
  });

  it("?city= でも開ける", () => {
    expect(targetFromSearch("?city=%E5%A4%A7%E9%98%AA")).toEqual({ city: "大阪" });
  });

  it("地点がない・おかしいときは null", () => {
    expect(targetFromSearch("")).toBeNull();
    expect(targetFromSearch("?lat=abc&lon=1")).toBeNull();
    expect(targetFromSearch("?lat=100&lon=1")).toBeNull();
    expect(targetFromSearch("?city=%20")).toBeNull();
  });
});

describe("shareText", () => {
  it("選んだ日の天気・気温・降水確率・洗濯日和とリンクを入れる", () => {
    expect(shareText(location, day, "https://example.com/?x")).toBe(
      [
        "📍 東京都の天気（10月20日(火)）",
        "☀️ 晴天",
        "🌡️ 最高 22° / 最低 14°",
        "☔ 降水確率 10%",
        "👕 ◎ 洗濯日和",
        "",
        "https://example.com/?x",
      ].join("\n"),
    );
  });

  it("今日なら今の気温を入れ、分からない値は省く", () => {
    const text = shareText(
      location,
      { ...day, tempMax: null, tempMin: null, pop: null, hours: [] },
      "https://example.com/",
      { temp: 9, feelsLike: 8, humidity: 45, description: "曇りがち", icon: "04d", windSpeed: 2 },
    );
    expect(text).toBe(["📍 東京都の天気（10月20日(火)）", "☁️ 今 9°C・曇りがち", "", "https://example.com/"].join("\n"));
  });
});

it("LINE の送信画面のリンクに文面を入れる", () => {
  expect(lineShareUrl("晴れ\nhttps://a/?b=1")).toBe(
    "https://line.me/R/share?text=%E6%99%B4%E3%82%8C%0Ahttps%3A%2F%2Fa%2F%3Fb%3D1",
  );
});
