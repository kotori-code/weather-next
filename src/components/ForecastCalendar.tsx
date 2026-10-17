"use client";

import { useState } from "react";
import { monthGrid, WEEKDAYS } from "@/lib/calendar";
import { weatherEmoji, type DailyForecast } from "@/lib/forecast";

type Props = {
  days: DailyForecast[];
  today: string;
  selected: string;
  onSelect: (date: string) => void;
};

/** 月のカレンダー。予報のある日だけ選べる */
export function ForecastCalendar({ days, today, selected, onSelect }: Props) {
  const byDate = new Map(days.map((day) => [day.date, day]));
  // 予報が月をまたぐときは、前後の月に切り替えられるようにする
  const months = [...new Set(days.map((day) => day.date.slice(0, 7)))];
  const [shownMonth, setShownMonth] = useState<string | null>(null);
  const month = shownMonth && months.includes(shownMonth) ? shownMonth : selected.slice(0, 7);
  const monthIndex = months.indexOf(month);
  const [year, mon] = month.split("-").map(Number);

  return (
    <section aria-label="予報のカレンダー" className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShownMonth(months[monthIndex - 1])}
          disabled={monthIndex <= 0}
          aria-label="前の月"
          className="rounded-lg px-3 py-1 text-lg disabled:invisible hover:bg-muted"
        >
          ‹
        </button>
        <h2 className="font-bold">
          {year}年{mon}月
        </h2>
        <button
          type="button"
          onClick={() => setShownMonth(months[monthIndex + 1])}
          disabled={monthIndex < 0 || monthIndex >= months.length - 1}
          aria-label="次の月"
          className="rounded-lg px-3 py-1 text-lg disabled:invisible hover:bg-muted"
        >
          ›
        </button>
      </div>

      <table className="w-full table-fixed border-separate border-spacing-1 text-center">
        <thead>
          <tr>
            {WEEKDAYS.map((weekday, i) => (
              <th
                key={weekday}
                className={`text-xs font-normal ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-subtle"}`}
              >
                {weekday}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {monthGrid(month).map((week, w) => (
            <tr key={w}>
              {week.map((date, i) => {
                if (!date) return <td key={i} />;
                const day = byDate.get(date);
                const dayNumber = Number(date.slice(8));
                if (!day) {
                  return (
                    <td key={date} className="py-2 text-sm text-subtle/50">
                      {dayNumber}
                    </td>
                  );
                }
                const isSelected = date === selected;
                return (
                  <td key={date}>
                    <button
                      type="button"
                      onClick={() => onSelect(date)}
                      aria-pressed={isSelected}
                      aria-label={`${mon}月${dayNumber}日 ${day.description}`}
                      className={`flex w-full flex-col items-center rounded-xl py-1 transition ${
                        isSelected ? "bg-accent text-white" : "bg-muted hover:ring-2 hover:ring-accent"
                      }`}
                    >
                      <span className={`text-sm ${date === today ? "font-bold underline" : ""}`}>{dayNumber}</span>
                      <span className="text-lg leading-tight" aria-hidden>
                        {weatherEmoji(day.icon)}
                      </span>
                      <span className="text-[10px] leading-tight sm:text-xs">
                        {day.tempMax !== null ? `${day.tempMax}°/${day.tempMin}°` : "—"}
                      </span>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-subtle">予報は 5 日先まで。色の付いた日を選ぶと、その日の予報に切り替わります。</p>
    </section>
  );
}
