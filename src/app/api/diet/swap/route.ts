import { NextResponse } from "next/server";
import { z } from "zod";
import { alimentoPorId } from "@/data/alimentos";
import { SUBGRUPOS_INTERCAMBIO_DEF } from "@/data/intercambios";
import { intercambiarPorEquivalencia, equivalentesDeIntercambio } from "@/lib/nutrition/exchanges";
import { rehidratarPlan } from "@/lib/nutrition/hydrate-plan";
import { accionPlanSchema } from "@/lib/validation/plan-schema";
import { aplicarCookiesAcceso, resolverAcceso } from "@/lib/auth/access";
import { ipDe, limitarPlanes } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const swapSchema = accionPlanSchema.extend({
  alimentoId: z.string().min(1).max(100),
  reemplazoId: z.string().min(1).max(100),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const alimentoId = searchParams.get("alimentoId") ?? "";
  const alimento = alimentoPorId.get(alimentoId);
  if (!alimento) return NextResponse.json({ error: "Alimento no encontrado" }, { status: 404 });
  if (!alimento.intercambio) return NextResponse.json({ error: "El alimento no tiene subgrupo de intercambio verificado" }, { status: 404 });

  const cantidad = Number(searchParams.get("intercambios") ?? "1");
  if (!Number.isFinite(cantidad) || cantidad <= 0 || cantidad > 20) {
    return NextResponse.json({ error: "Cantidad de intercambios inválida" }, { status: 400 });
  }
  const alergias = (searchParams.get("alergias") ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  const poblacion = searchParams.get("poblacion") === "NINOS" ? "NINOS" : "ADULTOS";
  const preferenciaOrigen = searchParams.get("origen") === "PRIORIZAR_CRIOLLOS" ? "PRIORIZAR_CRIOLLOS" : "TODOS";

  const equivalentes = equivalentesDeIntercambio(alimentoId, { alergias, preferenciaOrigen }, cantidad, poblacion);
  const subgrupo = SUBGRUPOS_INTERCAMBIO_DEF.find((item) => item.id === alimento.intercambio?.subgrupoId);
  return NextResponse.json({
    alimento: {
      id: alimento.id,
      nombre: alimento.nombre,
      intercambio: alimento.intercambio,
    },
    subgrupo: subgrupo ?? null,
    cantidad,
    equivalentes: equivalentes.map((equivalente) => ({
      id: equivalente.alimento.id,
      nombre: equivalente.alimento.nombre,
      grupo: equivalente.alimento.grupo,
      origenTipo: equivalente.alimento.origenTipo,
      gramos: equivalente.gramosSugeridos,
      medidaCasera: equivalente.medidaCasera,
      cantidadIntercambios: equivalente.cantidadIntercambios,
      nutrientes: equivalente.alimento.nutrientes,
      fuente: equivalente.alimento.fuente,
    })),
    regla: "Mismo subgrupo de intercambio, población y filtro de alérgenos. Sin llamadas al modelo de lenguaje.",
  });
}

export async function POST(request: Request) {
  const limite = await limitarPlanes(`${ipDe(request)}:swap`);
  if (!limite.permitido) return NextResponse.json({ error: "Límite temporal alcanzado. Intenta de nuevo en un minuto." }, { status: 429 });
  const acceso = await resolverAcceso(request);
  if (!acceso.state.canGenerate) {
    return aplicarCookiesAcceso(NextResponse.json({
      error: "Necesitas una suscripción activa o cupo disponible para aplicar intercambios al plan",
      code: "SUBSCRIPTION_REQUIRED",
      access: acceso.state,
    }, { status: 403 }), acceso);
  }

  try {
    const parsed = swapSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Datos de intercambio inválidos" }, { status: 400 });
    const plan = intercambiarPorEquivalencia(
      rehidratarPlan(parsed.data.plan),
      parsed.data.comidaId,
      parsed.data.alimentoId,
      parsed.data.reemplazoId,
    );
    return aplicarCookiesAcceso(NextResponse.json({ plan, regla: "Equivalencia determinística del mismo subgrupo; sin IA." }), acceso);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "No fue posible aplicar el intercambio";
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }
}
