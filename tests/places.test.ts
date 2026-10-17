import { describe, expect, it } from "vitest";
import { addPlace, MAX_PLACES, parsePlaces, removePlace, type SavedPlace } from "@/lib/places";

const tokyo: SavedPlace = { name: "東京都", country: "JP", lat: 35.68, lon: 139.76 };
const osaka: SavedPlace = { name: "大阪市", country: "JP", lat: 34.69, lon: 135.5 };

describe("登録した地点", () => {
  it("末尾に足し、同じ地点（約 1 km 以内）は二重に登録しない", () => {
    const places = addPlace(addPlace([], tokyo), osaka);
    expect(places.map((p) => p.name)).toEqual(["東京都", "大阪市"]);
    expect(addPlace(places, { ...tokyo, name: "千代田区", lat: 35.685 })).toBe(places);
  });

  it("上限に達したら足さない", () => {
    const full = Array.from({ length: MAX_PLACES }, (_, i) => ({ ...tokyo, lat: i }));
    expect(addPlace(full, osaka)).toBe(full);
  });

  it("緯度・経度で探して消す", () => {
    expect(removePlace([tokyo, osaka], { lat: 35.68, lon: 139.76 })).toEqual([osaka]);
  });

  it("保存していた値を読み、壊れた値は捨てる", () => {
    expect(parsePlaces(JSON.stringify([tokyo, { name: "x" }, null]))).toEqual([tokyo]);
    expect(parsePlaces("{壊れた")).toEqual([]);
    expect(parsePlaces(null)).toEqual([]);
  });
});
