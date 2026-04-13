import { StoredRating } from "@/types/bar";

export const RATINGS_KEY = "buteco_ratings";

export function readRatings(): StoredRating[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(RATINGS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as StoredRating[];
  } catch {
    return [];
  }
}

export function saveRatings(ratings: StoredRating[]): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
}
