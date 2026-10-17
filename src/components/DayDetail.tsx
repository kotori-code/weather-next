import { formatDate } from "@/lib/calendar";
import { weatherEmoji, type CurrentWeather, type DailyForecast } from "@/lib/forecast";

type Props = {
  day: DailyForecast;
  /** 今日を選んでいるときだけ渡す */
  current?: CurrentWeather;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted px-3 py-2">
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className="text-lg font-bold">{value}</dd>
    </div>
  );
}

/** 選んだ日の天気（今日なら現在の天気も）と 3 時間ごとの予報 */
export function DayDetail({ day, current }: Props) {
  const show = (value: number | null, unit: string) => (value === null ? "—" : `${value}${unit}`);

  return (
    <section aria-label={`${formatDate(day.date)}の天気`} className="rounded-2xl bg-card p-4 shadow-sm">
      <h2 className="mb-3 font-bold">
        {formatDate(day.date)}
        {current && <span className="ml-2 text-sm font-normal text-subtle">今日</span>}
      </h2>

      <div className="mb-4 flex items-center gap-4">
        <span className="text-6xl" aria-hidden>
          {weatherEmoji(current?.icon ?? day.icon)}
        </span>
        <div>
          {current ? (
            <>
              <p className="text-4xl font-bold">{current.temp}°C</p>
              <p className="text-subtle">
                {current.description}・体感 {current.feelsLike}°C
              </p>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold">
                <span className="text-red-500">{show(day.tempMax, "°")}</span>
                <span className="mx-1 text-subtle">/</span>
                <span className="text-blue-500">{show(day.tempMin, "°")}</span>
              </p>
              <p className="text-subtle">{day.description}</p>
            </>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {current ? (
          <Stat label="最高 / 最低" value={day.tempMax === null ? "—" : `${day.tempMax}° / ${day.tempMin}°`} />
        ) : (
          <Stat label="天気" value={day.description || "—"} />
        )}
        <Stat label={current ? "湿度（現在）" : "湿度（平均）"} value={show(current?.humidity ?? day.humidity, "%")} />
        <Stat label="降水確率（最大）" value={show(day.pop, "%")} />
        <Stat
          label={current ? "風速（現在）" : "風速（最大）"}
          value={
            current
              ? `${current.windSpeed} m/s`
              : day.hours.length
                ? `${Math.max(...day.hours.map((h) => h.windSpeed))} m/s`
                : "—"
          }
        />
      </dl>

      {day.hours.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-center text-sm">
            <caption className="mb-1 text-left text-xs text-subtle">3 時間ごとの予報（その土地の時刻）</caption>
            <thead className="text-xs text-subtle">
              <tr>
                <th className="py-1 font-normal">時刻</th>
                <th className="font-normal">天気</th>
                <th className="font-normal">気温</th>
                <th className="font-normal">降水確率</th>
                <th className="font-normal">湿度</th>
                <th className="font-normal">風速(m/s)</th>
              </tr>
            </thead>
            <tbody>
              {day.hours.map((hour) => (
                <tr key={hour.time} className="border-t border-line">
                  <td className="py-1.5">{hour.time}</td>
                  <td>
                    <span aria-hidden>{weatherEmoji(hour.icon)}</span> <span className="sr-only text-xs sm:not-sr-only">{hour.description}</span>
                  </td>
                  <td>{hour.temp}°</td>
                  <td className={hour.pop >= 50 ? "font-bold text-blue-500" : ""}>{hour.pop}%</td>
                  <td>{hour.humidity}%</td>
                  <td>{hour.windSpeed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-subtle">今日の残りの時間の予報はありません。</p>
      )}
    </section>
  );
}
