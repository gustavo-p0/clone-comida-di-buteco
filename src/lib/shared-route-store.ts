const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const ROUTE_TTL_SECONDS = 60 * 60 * 24 * 30;
const ROUTE_KEY_PREFIX = "route:";

export type SharedRoute = {
  id: string;
  title: string | null;
  barIds: string[];
  createdAt: string;
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
  const response = await runRedisCommand(["GET", getRouteKey(id)]);

  if (!response.result || typeof response.result !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(response.result) as SharedRoute;
    if (!Array.isArray(parsed.barIds) || typeof parsed.id !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
