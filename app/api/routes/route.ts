import { NextResponse } from "next/server";
import { getBars } from "@/lib/bars";
import {
  createSharedRoute,
  generateSharedRouteId,
  isSharedRouteStoreConfigured,
  type SharedRoute
} from "@/lib/shared-route-store";
import type { RatingValue } from "@/types/bar";

type CreateSharedRouteBody = {
  barIds?: unknown;
  title?: unknown;
  ratingsByBarId?: unknown;
};

const MAX_TITLE_LENGTH = 80;

function getValidatedTitle(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, MAX_TITLE_LENGTH);
}

/** Estado do backend de compartilhamento (sem chamar Redis). */
export async function GET() {
  return NextResponse.json({ shareEnabled: isSharedRouteStoreConfigured() });
}

export async function POST(request: Request) {
  if (!isSharedRouteStoreConfigured()) {
    return NextResponse.json(
      { error: "Compartilhamento indisponível no momento. Configure o Upstash para habilitar esse recurso." },
      { status: 503 }
    );
  }

  let body: CreateSharedRouteBody;
  try {
    body = (await request.json()) as CreateSharedRouteBody;
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const incomingBarIds = Array.isArray(body.barIds) ? body.barIds : [];
  const uniqueIds = [...new Set(incomingBarIds.filter((item): item is string => typeof item === "string"))];
  if (uniqueIds.length === 0) {
    return NextResponse.json({ error: "Selecione ao menos 1 bar para compartilhar." }, { status: 400 });
  }

  const validBarIds = new Set(getBars().map((bar) => bar.id));
  const hasInvalidBarId = uniqueIds.some((id) => !validBarIds.has(id));
  if (hasInvalidBarId) {
    return NextResponse.json({ error: "Lista contém bares inválidos." }, { status: 400 });
  }

  const title = getValidatedTitle(body.title);
  if (!title) {
    return NextResponse.json({ error: "Informe um título para o roteiro." }, { status: 400 });
  }

  let ratingsByBarId: Record<string, RatingValue> | undefined;
  const rawRatings = body.ratingsByBarId;
  if (rawRatings && typeof rawRatings === "object" && !Array.isArray(rawRatings)) {
    const acc: Record<string, RatingValue> = {};
    const allowed = new Set(uniqueIds);
    for (const [key, val] of Object.entries(rawRatings as Record<string, unknown>)) {
      if (!allowed.has(key)) continue;
      if (val === "like" || val === "dislike") {
        acc[key] = val;
      }
    }
    if (Object.keys(acc).length > 0) {
      ratingsByBarId = acc;
    }
  }

  let routeId = "";
  let created = false;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    routeId = generateSharedRouteId();
    const route: SharedRoute = {
      id: routeId,
      title,
      barIds: uniqueIds,
      createdAt: new Date().toISOString(),
      ...(ratingsByBarId ? { ratingsByBarId } : {})
    };
    created = await createSharedRoute(route);
    if (created) break;
  }

  if (!created || !routeId) {
    return NextResponse.json({ error: "Não foi possível criar o roteiro agora. Tente novamente." }, { status: 500 });
  }

  const shareUrl = new URL(`/roteiro/${routeId}`, request.url).toString();
  return NextResponse.json({
    id: routeId,
    shareUrl
  });
}
