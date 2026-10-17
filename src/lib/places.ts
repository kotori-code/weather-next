// 登録した地点の一覧（ブラウザの localStorage に保存する）

export type SavedPlace = { name: string; country: string; lat: number; lon: number };

export const MAX_PLACES = 10;

/** 緯度・経度が約 1 km 以内なら同じ地点とみなす */
export function samePlace(a: { lat: number; lon: number }, b: { lat: number; lon: number }): boolean {
  return Math.abs(a.lat - b.lat) < 0.01 && Math.abs(a.lon - b.lon) < 0.01;
}

/** 地点を末尾に足す。登録済みか上限に達していればそのまま返す */
export function addPlace(places: SavedPlace[], place: SavedPlace): SavedPlace[] {
  if (places.length >= MAX_PLACES || places.some((p) => samePlace(p, place))) return places;
  return [...places, place];
}

export function removePlace(places: SavedPlace[], place: { lat: number; lon: number }): SavedPlace[] {
  return places.filter((p) => !samePlace(p, place));
}

/** 保存していた文字列を読む。壊れた値は捨てる */
export function parsePlaces(json: string | null): SavedPlace[] {
  try {
    const data: unknown = JSON.parse(json ?? "[]");
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (p): p is SavedPlace =>
          typeof p?.name === "string" &&
          typeof p?.country === "string" &&
          Number.isFinite(p?.lat) &&
          Number.isFinite(p?.lon),
      )
      .slice(0, MAX_PLACES);
  } catch {
    return [];
  }
}
