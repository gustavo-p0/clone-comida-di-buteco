import { NextResponse } from "next/server";
import { getBars } from "@/lib/bars";
import {
  consumeSharedRouteCreationRateLimit,
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
const MAX_BODY_CHARS = 48_000;

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

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
      { error: "Compartilhar desativado: configure Redis (Upstash)." },
      { status: 503 }
    );
  }

  let body: CreateSharedRouteBody;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_CHARS) {
      return NextResponse.json({ error: "Payload demasiado grande." }, { status: 400 });
    }
    body = JSON.parse(text) as CreateSharedRouteBody;
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const incomingBarIds = Array.isArray(body.barIds) ? body.barIds : [];
  const uniqueIds = [...new Set(incomingBarIds.filter((item): item is string => typeof item === "string"))];
  if (uniqueIds.length === 0) {
    return NextResponse.json({ error: "Selecione ao menos 1 bar para compartilhar." }, { status: 400 });
  }

  const catalog = getBars();
  const maxBarsPerRoute = catalog.length;
  if (uniqueIds.length > maxBarsPerRoute) {
    return NextResponse.json(
      { error: `Inclua no máximo ${maxBarsPerRoute} bares neste roteiro.` },
      { status: 400 }
    );
  }

  const allowed = await consumeSharedRouteCreationRateLimit(getClientIp(request));
  if (!allowed) {
    return NextResponse.json(
      { error: "Muitas criações de roteiro a partir deste IP. Tente novamente daqui a pouco." },
      { status: 429 }
    );
  }

  const validBarIds = new Set(catalog.map((bar) => bar.id));
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
