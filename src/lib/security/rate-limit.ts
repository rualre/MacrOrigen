import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const memoria = new Map<string, { total: number; reinicia: number }>();
let limiterRemoto: Ratelimit | undefined;

function remoto() {
  if (!limiterRemoto && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
    limiterRemoto = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(12, "1 m"), prefix: "macrorigen:planes" });
  }
  return limiterRemoto;
}

export async function limitarPlanes(identificador: string) {
  const remotoLimiter = remoto();
  if (remotoLimiter) {
    try {
      const resultado = await remotoLimiter.limit(identificador);
      return { permitido: resultado.success, restantes: resultado.remaining, reinicia: resultado.reset };
    } catch { /* fail-open solo para disponibilidad local: conserva límite en memoria */ }
  }
  const ahora = Date.now();
  const actual = memoria.get(identificador);
  if (!actual || actual.reinicia < ahora) {
    const nuevo = { total: 1, reinicia: ahora + 60_000 };
    memoria.set(identificador, nuevo);
    return { permitido: true, restantes: 11, reinicia: nuevo.reinicia };
  }
  actual.total += 1;
  return { permitido: actual.total <= 12, restantes: Math.max(0, 12 - actual.total), reinicia: actual.reinicia };
}

export function ipDe(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}
