"use client";

import { useCallback, useEffect, useState } from "react";
import { DayDetail } from "@/components/DayDetail";
import { ForecastCalendar } from "@/components/ForecastCalendar";
import { LaundryForecastList } from "@/components/LaundryForecastList";
import type { WeatherReport } from "@/lib/forecast";
import { addPlace, MAX_PLACES, parsePlaces, removePlace, samePlace, type SavedPlace } from "@/lib/places";

// 登録した地点から開くときは、登録したときの名前で表示する
type Target = { city: string } | { lat: number; lon: number; name?: string };

const LAST_TARGET_KEY = "weather-next:last-target";
const PLACES_KEY = "weather-next:places";
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

function savePlaces(places: SavedPlace[]) {
  try {
    localStorage.setItem(PLACES_KEY, JSON.stringify(places));
  } catch {
    // 保存できなくても、開いている間は使える
  }
}

export function WeatherApp() {
  const [query, setQuery] = useState("");
  const [report, setReport] = useState<WeatherReport | null>(null);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [places, setPlaces] = useState<SavedPlace[]>([]);

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
      if ("name" in target && target.name) data.location.name = target.name;
      setReport(data as WeatherReport);
      setSelected(data.today);
      saveLastTarget(target);
    } catch (e) {
      setError(e instanceof Error ? e.message : "天気の情報を取得できませんでした。");
    } finally {
      setLoading(false);
    }
  }, []);

  // 登録した地点を読み、前回見た場所（なければ東京）を最初に表示する
  useEffect(() => {
    let saved: SavedPlace[] = [];
    try {
      saved = parsePlaces(localStorage.getItem(PLACES_KEY));
    } catch {
      // 読めなければ登録なしとして扱う
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 初回の読み込み
    setPlaces(saved);
    void load(loadLastTarget());
  }, [load]);

  function updatePlaces(next: SavedPlace[]) {
    setPlaces(next);
    savePlaces(next);
  }

  function openPlace(place: SavedPlace) {
    void load({ lat: place.lat, lon: place.lon, name: place.name });
  }

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
  const isSaved = report ? places.some((p) => samePlace(p, report.location)) : false;

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

      {places.length > 0 && (
        <nav aria-label="登録した地点">
          <ul className="flex flex-wrap gap-2">
            {places.map((place) => {
              const active = report !== null && samePlace(place, report.location);
              return (
                <li
                  key={`${place.lat},${place.lon}`}
                  className={`flex items-center rounded-full border text-sm ${
                    active ? "border-accent bg-accent text-white" : "border-line bg-card"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => openPlace(place)}
                    disabled={loading}
                    aria-current={active ? "true" : undefined}
                    className="py-1.5 pl-4 pr-1 font-bold disabled:opacity-60"
                  >
                    {place.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePlaces(removePlace(places, place))}
                    aria-label={`${place.name}を登録から外す`}
                    className={`rounded-full px-2.5 py-1.5 ${active ? "text-white/80 hover:text-white" : "text-subtle hover:text-foreground"}`}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-red-100 px-4 py-3 text-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      {loading && !report && <p className="py-12 text-center text-subtle">読み込んでいます…</p>}

      {report && day && (
        <div className={`flex flex-col gap-4 transition-opacity ${loading ? "opacity-50" : ""}`} aria-busy={loading}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold">
              📍 {report.location.name}
              {report.location.country && <span className="ml-2 text-sm font-normal text-subtle">{report.location.country}</span>}
            </h2>
            <button
              type="button"
              onClick={() =>
                updatePlaces(isSaved ? removePlace(places, report.location) : addPlace(places, report.location))
              }
              disabled={!isSaved && places.length >= MAX_PLACES}
              aria-pressed={isSaved}
              className={`rounded-full border px-4 py-1.5 text-sm font-bold disabled:opacity-50 ${
                isSaved ? "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" : "border-line bg-card"
              }`}
            >
              {isSaved ? "★ 登録済み" : places.length >= MAX_PLACES ? `☆ 登録は ${MAX_PLACES} 件まで` : "☆ この地点を登録"}
            </button>
          </div>
          <DayDetail day={day} current={day.date === report.today ? report.current : undefined} />
          <ForecastCalendar days={report.days} today={report.today} selected={day.date} onSelect={setSelected} />
          <LaundryForecastList days={report.days} selected={day.date} onSelect={setSelected} />
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
