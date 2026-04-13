export const ROUTE_DRAFT_KEY = "buteco_route_draft";
export const ROUTE_LAST_SHARE_KEY = "buteco_route_last_share";
export const ROUTE_DRAFT_UPDATED_EVENT = "buteco-route-draft-updated";

export type RouteDraft = {
  barIds: string[];
  title: string;
};

export type LastSharedRoute = {
  shareUrl: string;
  savedAt: string;
  title?: string;
};

export function readRouteDraft(): RouteDraft {
  if (typeof window === "undefined") {
    return { barIds: [], title: "" };
  }

  try {
    const raw = window.localStorage.getItem(ROUTE_DRAFT_KEY);
    if (!raw) {
      return { barIds: [], title: "" };
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return { barIds: [], title: "" };
    }

    const barIds = Array.isArray((parsed as { barIds?: unknown }).barIds)
      ? ((parsed as { barIds: string[] }).barIds.filter((id) => typeof id === "string"))
      : [];
    const title =
      typeof (parsed as { title?: unknown }).title === "string"
        ? (parsed as { title: string }).title
        : "";

    return { barIds, title };
  } catch {
    return { barIds: [], title: "" };
  }
}

export function saveRouteDraft(draft: RouteDraft): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    ROUTE_DRAFT_KEY,
    JSON.stringify({ barIds: draft.barIds, title: draft.title })
  );
}

/** Acrescenta um bar ao fim do rascunho se ainda não estiver (ex.: após avaliar na página do bar). */
export function appendBarIdToRouteDraft(barId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const draft = readRouteDraft();
  if (draft.barIds.includes(barId)) {
    return;
  }

  saveRouteDraft({ ...draft, barIds: [...draft.barIds, barId] });
  window.dispatchEvent(new Event(ROUTE_DRAFT_UPDATED_EVENT));
}

export function readLastSharedRoute(): LastSharedRoute | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(ROUTE_LAST_SHARE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const shareUrl = (parsed as { shareUrl?: unknown }).shareUrl;
    const savedAt = (parsed as { savedAt?: unknown }).savedAt;
    if (typeof shareUrl !== "string" || typeof savedAt !== "string") {
      return null;
    }

    const title = (parsed as { title?: unknown }).title;
    return {
      shareUrl,
      savedAt,
      title: typeof title === "string" ? title : undefined
    };
  } catch {
    return null;
  }
}

export function saveLastSharedRoute(shareUrl: string, title?: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const payload: LastSharedRoute = {
    shareUrl,
    savedAt: new Date().toISOString(),
    title: title?.trim() || undefined
  };

  window.localStorage.setItem(ROUTE_LAST_SHARE_KEY, JSON.stringify(payload));
}
