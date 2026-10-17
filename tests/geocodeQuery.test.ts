import { expect, it } from "vitest";
import { geocodeAttempts } from "@/lib/geocodeQuery";

it("日本語の地名は「市,JP」→「,JP」→そのままの順に探す", () => {
  expect(geocodeAttempts("札幌")).toEqual([
    { query: "札幌市,JP", exactName: "札幌市" },
    { query: "札幌,JP", namePrefix: "札幌" },
    { query: "札幌", namePrefix: "札幌" },
  ]);
});

it("市区町村で終わる地名には「市」を足さない", () => {
  expect(geocodeAttempts("那覇市")).toEqual([
    { query: "那覇市,JP", namePrefix: "那覇市" },
    { query: "那覇市", namePrefix: "那覇市" },
  ]);
});

it("「京都」のように都で終わる地名にも「市」を足して探す", () => {
  expect(geocodeAttempts("京都")[0]).toEqual({ query: "京都市,JP", exactName: "京都市" });
});

it("日本語でない地名や、国まで指定した地名はそのまま探す", () => {
  expect(geocodeAttempts("London")).toEqual([{ query: "London" }]);
  expect(geocodeAttempts("台北,TW")).toEqual([{ query: "台北,TW" }]);
});

it("府・県で終わる地名は、府・県を取った名前でも探す", () => {
  expect(geocodeAttempts("大阪府").map((a) => a.query)).toEqual([
    "大阪府市,JP",
    "大阪府,JP",
    "大阪府",
    "大阪市,JP",
    "大阪,JP",
    "大阪",
  ]);
});
