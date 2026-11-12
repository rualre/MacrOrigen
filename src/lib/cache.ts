import { Redis } from "@upstash/redis";

let redis: Redis | undefined;
function cliente() {
  if (!redis && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
  }
  return redis;
}

export async function obtenerCache<T>(clave: string): Promise<T | null> {
  try { return await cliente()?.get<T>(`macrorigen:${clave}`) ?? null; } catch { return null; }
}

export async function guardarCache(clave: string, valor: unknown, segundos = 3600) {
  try { await cliente()?.set(`macrorigen:${clave}`, valor, { ex: segundos }); } catch { /* caché opcional */ }
}
