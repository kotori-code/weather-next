"use client";

import { useState } from "react";
import type { CurrentWeather, DailyForecast, WeatherReport } from "@/lib/forecast";
import { lineShareUrl, shareText, shareUrl } from "@/lib/share";

type Props = {
  location: WeatherReport["location"];
  day: DailyForecast;
  /** 今日を選んでいるときだけ渡す */
  current?: CurrentWeather;
};

/** 選んだ日の天気を共有する（スマホの共有メニュー・LINE・コピー） */
export function ShareButtons({ location, day, current }: Props) {
  const [message, setMessage] = useState("");

  function text() {
    return shareText(location, day, shareUrl(window.location.origin, location), current);
  }

  async function share() {
    setMessage("");
    const body = text();
    if (typeof navigator.share === "function") {
      try {
        // リンクは本文に入れる（url を別に渡すと本文を捨てるアプリがある）
        await navigator.share({ text: body });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return; // 利用者が閉じた
      }
    }
    // 共有メニューがないブラウザ（パソコンなど）ではコピーする
    try {
      await navigator.clipboard.writeText(body);
      setMessage("天気をコピーしました。LINE などに貼り付けて送れます。");
    } catch {
      setMessage("共有できませんでした。「LINE」のボタンを使ってください。");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void share()}
          className="rounded-full border border-line bg-card px-4 py-1.5 text-sm font-bold"
        >
          📤 共有
        </button>
        <button
          type="button"
          onClick={() => window.open(lineShareUrl(text()), "_blank", "noopener")}
          className="rounded-full bg-[#06C755] px-4 py-1.5 text-sm font-bold text-white"
        >
          LINE で送る
        </button>
      </div>
      {message && (
        <p role="status" className="text-xs text-subtle">
          {message}
        </p>
      )}
    </div>
  );
}
