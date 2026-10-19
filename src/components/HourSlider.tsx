"use client";

import { useState } from "react";
import { weatherEmoji, type HourlyForecast } from "@/lib/forecast";

type Props = {
  hours: HourlyForecast[];
  /** 今日なら最初の時刻を「現在」として表示する */
  isToday: boolean;
};

/** バーで 1 時間ずつ時刻を変えて、その時刻の天気を見る */
export function HourSlider({ hours, isToday }: Props) {
  // 今日は今の時刻、それ以外の日は正午（なければ最初の時刻）から表示する
  const [index, setIndex] = useState(() => (isToday ? 0 : Math.max(0, hours.findIndex((h) => h.time === "12:00"))));
  if (hours.length === 0) return null;

  const i = Math.min(index, hours.length - 1);
  const hour = hours[i];
  const isNow = isToday && i === 0;

  return (
    <section aria-label="時間ごとの天気" className="mt-4 rounded-xl bg-muted p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <h3 className="text-sm font-bold">🕐 時間ごとの天気</h3>
        <span className="text-xs text-subtle">1 時間ごとの値は 3 時間ごとの予報から補った目安です</span>
      </div>

      <div className="my-2 flex items-center gap-3" aria-live="polite">
        <span className="text-5xl" aria-hidden>
          {weatherEmoji(hour.icon)}
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-bold">
            {hour.time}
            {isNow && <span className="ml-1 text-sm font-normal text-subtle">（現在）</span>}
          </p>
          <p className="truncate text-sm text-subtle">{hour.description}</p>
        </div>
        <p className="ml-auto text-4xl font-bold">{hour.temp}°</p>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-card px-2 py-1">
          <dt className="text-xs text-subtle">降水確率</dt>
          <dd className={`font-bold ${hour.pop >= 50 ? "text-blue-500" : ""}`}>{hour.pop}%</dd>
        </div>
        <div className="rounded-lg bg-card px-2 py-1">
          <dt className="text-xs text-subtle">湿度</dt>
          <dd className="font-bold">{hour.humidity}%</dd>
        </div>
        <div className="rounded-lg bg-card px-2 py-1">
          <dt className="text-xs text-subtle">風速</dt>
          <dd className="font-bold">{hour.windSpeed} m/s</dd>
        </div>
      </dl>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIndex(i - 1)}
          disabled={i === 0}
          aria-label="1 時間前"
          className="rounded-lg bg-card px-3 py-1 text-lg disabled:opacity-30"
        >
          ‹
        </button>
        <input
          type="range"
          min={0}
          max={hours.length - 1}
          step={1}
          value={i}
          onChange={(e) => setIndex(Number(e.target.value))}
          aria-label="時刻"
          aria-valuetext={hour.time}
          className="min-w-0 flex-1 accent-accent"
        />
        <button
          type="button"
          onClick={() => setIndex(i + 1)}
          disabled={i === hours.length - 1}
          aria-label="1 時間後"
          className="rounded-lg bg-card px-3 py-1 text-lg disabled:opacity-30"
        >
          ›
        </button>
      </div>
      <div className="flex justify-between px-12 text-xs text-subtle">
        <span>{isToday ? "現在" : hours[0].time}</span>
        <span>{hours[hours.length - 1].time}</span>
      </div>
    </section>
  );
}
