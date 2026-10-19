import { formatDate } from "@/lib/calendar";
import type { DailyForecast } from "@/lib/forecast";
import { laundryForecast, type LaundryLevel } from "@/lib/laundry";

type Props = {
  days: DailyForecast[];
  selected: string;
  onSelect: (date: string) => void;
};

const MARK_COLOR: Record<LaundryLevel, string> = {
  4: "text-orange-500",
  3: "text-emerald-600 dark:text-emerald-400",
  2: "text-amber-600 dark:text-amber-400",
  1: "text-sky-600 dark:text-sky-400",
};

/** 日ごとの洗濯日和予報。押すとその日の予報に切り替わる */
export function LaundryForecastList({ days, selected, onSelect }: Props) {
  return (
    <section aria-label="洗濯日和予報" className="rounded-2xl bg-card p-4 shadow-sm">
      <h2 className="font-bold">👕 洗濯日和予報</h2>
      <p className="mb-3 text-xs text-subtle">
        日中（9〜15 時）の降水確率・湿度・気温・風・天気から、洗濯物の乾きやすさを出しています。
      </p>
      <ul className="flex flex-col gap-2">
        {days.map((day) => {
          const laundry = laundryForecast(day.hours);
          const isSelected = day.date === selected;
          return (
            <li key={day.date}>
              <button
                type="button"
                onClick={() => onSelect(day.date)}
                aria-pressed={isSelected}
                className={`flex w-full items-center gap-3 rounded-xl bg-muted px-3 py-2 text-left transition ${
                  isSelected ? "ring-2 ring-accent" : "hover:ring-2 hover:ring-accent/50"
                }`}
              >
                <span className="w-24 shrink-0 text-sm">{formatDate(day.date)}</span>
                {laundry ? (
                  <>
                    <span className={`w-6 shrink-0 text-center text-2xl font-bold ${MARK_COLOR[laundry.level]}`} aria-hidden>
                      {laundry.mark}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold">{laundry.label}</span>
                      <span className="block text-xs text-subtle">
                        {laundry.comment}（湿度 {laundry.humidity}%・降水確率 {laundry.pop}%）
                      </span>
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-subtle">日中の予報がありません</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
