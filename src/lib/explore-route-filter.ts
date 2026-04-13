export const EXPLORE_ROUTE_FILTER_STORAGE_KEY = "buteco_explore_route_filter";
export const EXPLORE_ROUTE_OPEN_TAB_KEY = "buteco_open_explorer_tab";

export type ExploreRouteFilterPayload = {
  barIds: string[];
  title: string | null;
};

export type ExplorerEntryTab = "lista" | "mapa";

export function writeExploreRouteFilterForNavigation(
  payload: ExploreRouteFilterPayload,
  openTab: ExplorerEntryTab = "lista"
): void {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(EXPLORE_ROUTE_FILTER_STORAGE_KEY, JSON.stringify(payload));
  window.sessionStorage.setItem(EXPLORE_ROUTE_OPEN_TAB_KEY, openTab);
}

/** Lê e remove a chave do filtro (uma aplicação por navegação). */
export function consumeExploreRouteFilterPayload(): ExploreRouteFilterPayload | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(EXPLORE_ROUTE_FILTER_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    window.sessionStorage.removeItem(EXPLORE_ROUTE_FILTER_STORAGE_KEY);
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const barIdsRaw = (parsed as { barIds?: unknown }).barIds;
    const barIds = Array.isArray(barIdsRaw)
      ? barIdsRaw.filter((id): id is string => typeof id === "string")
      : [];
    if (barIds.length === 0) {
      return null;
    }
    const titleVal = (parsed as { title?: unknown }).title;
    const title = typeof titleVal === "string" ? titleVal : titleVal === null ? null : null;
    return { barIds, title };
  } catch {
    return null;
  }
}

export function consumeExplorerOpenTab(): ExplorerEntryTab | null {
  if (typeof window === "undefined") {
    return null;
  }
  const v = window.sessionStorage.getItem(EXPLORE_ROUTE_OPEN_TAB_KEY);
  window.sessionStorage.removeItem(EXPLORE_ROUTE_OPEN_TAB_KEY);
  if (v === "lista" || v === "mapa") {
    return v;
  }
  return null;
}
