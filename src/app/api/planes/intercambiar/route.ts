import { NextResponse } from "next/server";
import { accionPlanSchema } from "@/lib/validation/plan-schema";
import { rehidratarPlan } from "@/lib/nutrition/hydrate-plan";
import { intercambiarIngrediente } from "@/lib/nutrition/plan-generator";
import { ipDe, limitarPlanes } from "@/lib/security/rate-limit";
import { aplicarCookiesAcceso, resolverAcceso } from "@/lib/auth/access";

export async function POST(request: Request) {
  const limite = await limitarPlanes(`${ipDe(request)}:intercambio`);
  if (!limite.permitido) return NextResponse.json({ error: "Límite temporal alcanzado. Intenta de nuevo en un minuto." }, { status: 429 });
  const acceso = await resolverAcceso(request);
  if (!acceso.state.canGenerate) return aplicarCookiesAcceso(NextResponse.json({ error: "Necesitas una suscripción activa para intercambiar ingredientes", code: "SUBSCRIPTION_REQUIRED", access: acceso.state }, { status: 403 }), acceso);
  try {
    const parsed = accionPlanSchema.safeParse(await request.json());
    if (!parsed.success || !parsed.data.alimentoId) return NextResponse.json({ error: "Datos de intercambio inválidos" }, { status: 400 });
    const plan = intercambiarIngrediente(rehidratarPlan(parsed.data.plan), parsed.data.comidaId, parsed.data.alimentoId);
    return NextResponse.json({ plan, access: acceso.state });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No fue posible intercambiar" }, { status: 400 });
  }
}
