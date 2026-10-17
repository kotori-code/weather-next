"use client";

import { useCallback, useEffect, useState } from "react";
import { DayDetail } from "@/components/DayDetail";
import { ForecastCalendar } from "@/components/ForecastCalendar";
import type { WeatherReport } from "@/lib/forecast";

type Target = { city: string } | { lat: number; lon: number };

const LAST_TARGET_KEY = "weather-next:last-target";
const DEFAULT_TARGET: Target = { city: "東京" };

function loadLastTarget(): Target {
  try {
    const saved = localStorage.getItem(LAST_TARGET_KEY);
    return saved ? (JSON.parse(saved) as Target) : DEFAULT_TARGET;
  } catch {
    return DEFAULT_TARGET;
  }
}

function saveLastTarget(target: Target) {
  try {
    localStorage.setItem(LAST_TARGET_KEY, JSON.stringify(target));
  } catch {
    // 保存できなくても表示には困らない
  }
}

export function WeatherApp() {
  const [query, setQuery] = useState("");
  const [report, setReport] = useState<WeatherReport | null>(null);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (target: Target) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams(
        "city" in target ? { city: target.city } : { lat: String(target.lat), lon: String(target.lon) },
      );
      const res = await fetch(`/api/weather?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "天気の情報を取得できませんでした。");
      setReport(data as WeatherReport);
      setSelected(data.today);
      saveLastTarget(target);
    } catch (e) {
      setError(e instanceof Error ? e.message : "天気の情報を取得できませんでした。");
    } finally {
      setLoading(false);
    }
  }, []);

  // 前回見た場所（なければ東京）を最初に表示する
  useEffect(() => {
    const target = loadLastTarget();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初回の読み込み
    void load(target);
  }, [load]);

  function search(event: React.FormEvent) {
    event.preventDefault();
    const city = query.trim();
    if (city) void load({ city });
  }

  function locate() {
    if (!navigator.geolocation) {
      setError("このブラウザでは現在地を使えません。");
      return;
    }
    setLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // 小数 2 桁（約 1 km）に丸めて送る
        const round = (n: number) => Math.round(n * 100) / 100;
        void load({ lat: round(position.coords.latitude), lon: round(position.coords.longitude) });
      },
      (err) => {
        setLoading(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "位置情報の利用が許可されていません。ブラウザの設定で許可してください。"
            : "現在地を取得できませんでした。",
        );
      },
      { timeout: 10000, maximumAge: 10 * 60 * 1000 },
    );
  }

  const day = report?.days.find((d) => d.date === selected) ?? report?.days[0];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <header>
        <h1 className="text-2xl font-bold">🌤️ お天気カレンダー</h1>
        <p className="text-sm text-subtle">都市名か現在地で、気温・天気・湿度・降水確率を調べます。</p>
      </header>

      <form onSubmit={search} className="flex flex-wrap gap-2" role="search">
        <label htmlFor="city" className="sr-only">
          都市名
        </label>
        <input
          id="city"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="都市名（例: 大阪、札幌、London）"
          maxLength={100}
          className="min-w-0 basis-full rounded-xl sm:basis-0 sm:flex-1 border border-line bg-card px-4 py-2.5 outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="flex-1 rounded-xl bg-accent px-5 py-2.5 font-bold text-white disabled:opacity-50 sm:flex-none"
        >
          検索
        </button>
        <button
          type="button"
          onClick={locate}
          disabled={loading}
          className="flex-1 rounded-xl border border-accent px-4 py-2.5 font-bold text-accent disabled:opacity-50 sm:flex-none"
        >
          📍 現在地
        </button>
      </form>

      {error && (
        <p role="alert" className="rounded-xl bg-red-100 px-4 py-3 text-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      {loading && !report && <p className="py-12 text-center text-subtle">読み込んでいます…</p>}

      {report && day && (
        <div className={`flex flex-col gap-4 transition-opacity ${loading ? "opacity-50" : ""}`} aria-busy={loading}>
          <h2 className="text-xl font-bold">
            📍 {report.location.name}
            {report.location.country && <span className="ml-2 text-sm font-normal text-subtle">{report.location.country}</span>}
          </h2>
          <DayDetail day={day} current={day.date === report.today ? report.current : undefined} />
          <ForecastCalendar days={report.days} today={report.today} selected={day.date} onSelect={setSelected} />
        </div>
      )}

      <footer className="pt-2 text-center text-xs text-subtle">
        天気データ:{" "}
        <a href="https://openweathermap.org/" className="underline" target="_blank" rel="noreferrer">
          OpenWeatherMap
        </a>
      </footer>
    </main>
  );
}
