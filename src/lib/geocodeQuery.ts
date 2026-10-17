// OpenWeatherMap の地名検索は日本語に弱い（「福岡」が中国の地名になる、「札幌」が見つからないなど）。
// 日本語の地名は「市」と国コードを付けて探すと正しく見つかるので、問い合わせる順番をここで決める。

export type GeocodeAttempt = {
  query: string;
  /** 指定したときは、日本語名がこれと一致する結果だけを使う */
  exactName?: string;
  /** 指定したときは、日本語名がこれで始まる結果だけを使う（似た字の別の地名を避ける） */
  namePrefix?: string;
};

const JAPANESE = /[぀-ヿ㐀-鿿]/;
// 「京都」「北海道」のように都・道で終わる地名もあるので、市区町村だけを見る
const ADMIN_SUFFIX = /[市区町村]$/;

export function geocodeAttempts(city: string): GeocodeAttempt[] {
  // 日本語でない地名や、「Paris,FR」のように国まで指定してあるときはそのまま探す
  if (!JAPANESE.test(city) || city.includes(",")) return [{ query: city }];

  const attempts: GeocodeAttempt[] = [];
  // 「札幌」→「札幌市」。同名の別の市が先に出ることがあるので名前が一致するものに限る
  if (!ADMIN_SUFFIX.test(city)) attempts.push({ query: `${city}市,JP`, exactName: `${city}市` });
  // 「東京」→「東京都」、「新宿」など市でない地名は日本の中で探す
  attempts.push({ query: `${city},JP`, namePrefix: city });
  // 日本で見つからなければ（「北京」など）国を限らずに探す
  attempts.push({ query: city, namePrefix: city });
  // 「大阪府」「静岡県」は府・県を取った名前（大阪市・静岡市）でも探す
  const prefecture = city.match(/^(.+)[府県]$/);
  if (prefecture) attempts.push(...geocodeAttempts(prefecture[1]));
  return attempts;
}
