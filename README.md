# お天気カレンダー

都市名か現在地で、気温・天気・湿度・降水確率を表示する天気予報アプリです。カレンダーで日付を選ぶと、その日の予報（3 時間ごと）に切り替わります。

よく見る地点は「☆ この地点を登録」で 10 件まで登録でき、地点名のボタンを押すとその地点の天気に切り替わります（登録した地点はブラウザに保存します）。

- 天気データ: [OpenWeatherMap](https://openweathermap.org/)の無料プラン（Current Weather・5 day / 3 hour Forecast・Geocoding）
- Next.js（App Router）・Tailwind CSS・Vercel

## しくみ

- ブラウザは自分のサーバーの `/api/weather` だけを呼び、OpenWeatherMap にはサーバー（Route Handler）から問い合わせます。API キーはブラウザに送られません。
- API キーは環境変数 `OPENWEATHER_API_KEY` から読みます（コードには書いていません）。
- 予報は 3 時間ごと・5 日先まで。その土地の日付ごとにまとめ、最高/最低気温・平均湿度・最大の降水確率を出します。

## 動かし方

1. [OpenWeatherMap](https://home.openweathermap.org/users/sign_up) に登録して API キーを発行する（無料・カード不要。有効になるまで最大 2 時間ほどかかります）
2. `.env.example` を `.env.local` にコピーしてキーを入れる

   ```
   OPENWEATHER_API_KEY=発行したキー
   ```

3. 起動する

   ```
   npm install
   npm run dev
   ```

テスト: `npm test`

## Vercel に公開する

Vercel のプロジェクトの Settings → Environment Variables に `OPENWEATHER_API_KEY` を追加してから、デプロイし直します。
