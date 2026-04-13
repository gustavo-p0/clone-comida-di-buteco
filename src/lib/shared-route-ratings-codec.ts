import type { RatingValue } from "@/types/bar";

/** Uma letra por parada na ordem de `barIds`: like, dislike ou sem nota do autor. */
export function encodeRatingsVector(
  barIds: string[],
  ratingsByBarId: Record<string, RatingValue> | undefined
): string {
  if (!ratingsByBarId || barIds.length === 0) {
    return barIds.map(() => "-").join("");
  }
  return barIds
    .map((id) => {
      const r = ratingsByBarId[id];
      if (r === "like") return "l";
      if (r === "dislike") return "d";
      return "-";
    })
    .join("");
}

export function decodeRatingsVector(
  barIds: string[],
  rv: string
): Record<string, RatingValue> | undefined {
  if (typeof rv !== "string" || !rv.length || !barIds.length) {
    return undefined;
  }
  const acc: Record<string, RatingValue> = {};
  const len = Math.min(barIds.length, rv.length);
  for (let i = 0; i < len; i += 1) {
    const c = rv[i];
    const id = barIds[i];
    if (c === "l") acc[id] = "like";
    else if (c === "d") acc[id] = "dislike";
  }
  return Object.keys(acc).length > 0 ? acc : undefined;
}

export function ratingsVectorHasScores(rv: string): boolean {
  return rv.includes("l") || rv.includes("d");
}
