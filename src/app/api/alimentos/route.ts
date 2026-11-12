import { NextRequest, NextResponse } from "next/server";
import { buscarAlimentosHibrido } from "@/data/repository";
import { busquedaSchema } from "@/lib/validation/schemas";
import { obtenerCache, guardarCache } from "@/lib/cache";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = busquedaSchema.safeParse(params);
  if (!parsed.success) return NextResponse.json({ error: "Filtros inválidos", detalles: parsed.error.issues.map((i) => i.message) }, { status: 400 });
  const { q, grupo, origen, limite } = parsed.data;
  const clave = `alimentos:${q}:${grupo}:${origen}:${limite}`;
  const cache = await obtenerCache<unknown>(clave);
  if (cache) return NextResponse.json(cache, { headers: { "X-Cache": "HIT" } });
  const resultado = await buscarAlimentosHibrido({ q, grupo: grupo as never, origen, limite });
  const body = { ...resultado, total: resultado.alimentos.length, catalogoSemilla: true };
  await guardarCache(clave, body, 3600);
  return NextResponse.json(body, { headers: { "X-Cache": "MISS", "Cache-Control": "private, max-age=60" } });
}
