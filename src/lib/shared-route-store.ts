import type { RatingValue } from "@/types/bar";

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const ROUTE_TTL_SECONDS = 60 * 60 * 24 * 10;
const ROUTE_KEY_PREFIX = "route:";

export type SharedRoute = {
  id: string;
  title: string | null;
  barIds: string[];
  createdAt: string;
  /** Avaliações do autor, só para bares que estão em `barIds`. */
  ratingsByBarId?: Record<string, RatingValue>;
};

function getRouteKey(id: string) {
  return `${ROUTE_KEY_PREFIX}${id}`;
}

function assertRedisConfigured() {
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    throw new Error("UPSTASH_NOT_CONFIGURED");
  }
}

async function runRedisCommand(command: Array<string | number>) {
  assertRedisConfigured();

  const response = await fetch(UPSTASH_REDIS_REST_URL!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN!}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`UPSTASH_REQUEST_FAILED:${response.status}`);
  }

  return (await response.json()) as { result?: unknown; error?: string };
}

export function isSharedRouteStoreConfigured() {
  return Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);
}

export function generateSharedRouteId() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));

  let id = "";
  for (const byte of bytes) {
    id += alphabet[byte % alphabet.length];
  }
  return id;
}

export async function createSharedRoute(route: SharedRoute) {
  const response = await runRedisCommand([
    "SET",
    getRouteKey(route.id),
    JSON.stringify(route),
    "EX",
    ROUTE_TTL_SECONDS,
    "NX"
  ]);

  return response.result === "OK";
}

export async function getSharedRoute(id: string): Promise<SharedRoute | null> {
  const routeKey = getRouteKey(id);
  let serializedRoute: string | null = null;

  // Tenta leitura já renovando o TTL (sliding expiration).
  const getAndRefreshResponse = await runRedisCommand(["GETEX", routeKey, "EX", ROUTE_TTL_SECONDS]);

  if (typeof getAndRefreshResponse.result === "string") {
    serializedRoute = getAndRefreshResponse.result;
  } else if (getAndRefreshResponse.error) {
    // Fallback para ambientes Redis sem suporte ao GETEX.
    const getResponse = await runRedisCommand(["GET", routeKey]);
    if (typeof getResponse.result !== "string") {
      return null;
    }
    serializedRoute = getResponse.result;
    await runRedisCommand(["EXPIRE", routeKey, ROUTE_TTL_SECONDS]);
  } else {
    return null;
  }

  try {
    const parsed = JSON.parse(serializedRoute) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    if (!Array.isArray(record.barIds) || typeof record.id !== "string") {
      return null;
    }
    const barIds = record.barIds.filter((item): item is string => typeof item === "string");
    const ratingsRaw = record.ratingsByBarId;
    let ratingsByBarId: Record<string, RatingValue> | undefined;
    if (ratingsRaw && typeof ratingsRaw === "object" && !Array.isArray(ratingsRaw)) {
      const acc: Record<string, RatingValue> = {};
      for (const [key, val] of Object.entries(ratingsRaw as Record<string, unknown>)) {
        if (!barIds.includes(key)) continue;
        if (val === "like" || val === "dislike") {
          acc[key] = val;
        }
      }
      if (Object.keys(acc).length > 0) {
        ratingsByBarId = acc;
      }
    }

    const title =
      typeof record.title === "string" ? record.title : record.title === null ? null : null;

    return {
      id: record.id as string,
      title,
      barIds,
      createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString(),
      ratingsByBarId
    };
  } catch {
    return null;
  }
}
