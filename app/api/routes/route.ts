import { NextResponse } from "next/server";
import { getBars } from "@/lib/bars";
import {
  createSharedRoute,
  generateSharedRouteId,
  isSharedRouteStoreConfigured,
  type SharedRoute
} from "@/lib/shared-route-store";

type CreateSharedRouteBody = {
  barIds?: unknown;
  title?: unknown;
};

const MAX_TITLE_LENGTH = 80;

function getValidatedTitle(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, MAX_TITLE_LENGTH);
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
  let routeId = "";
  let created = false;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    routeId = generateSharedRouteId();
    const route: SharedRoute = {
      id: routeId,
      title,
      barIds: uniqueIds,
      createdAt: new Date().toISOString()
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
