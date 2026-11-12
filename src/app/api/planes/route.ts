import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { perfilSchema } from "@/lib/validation/schemas";
import { generarPlan } from "@/lib/nutrition/plan-generator";
import { seleccionarMenusConIA, proveedoresDisponibles } from "@/lib/ai/service";
import { ipDe, limitarPlanes } from "@/lib/security/rate-limit";
import { guardarCache, obtenerCache } from "@/lib/cache";
import type { PlanNutricional } from "@/lib/domain/types";
import { aplicarCookiesAcceso, consumirIntento, estadoDesdeResolucion, resolverAcceso } from "@/lib/auth/access";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const limite = await limitarPlanes(ipDe(request));
  if (!limite.permitido) return NextResponse.json({ error: "Has alcanzado 12 solicitudes por minuto. Espera antes de reintentar." }, { status: 429, headers: { "Retry-After": "60" } });
  const acceso = await resolverAcceso(request);
  const responder = (body: unknown, status = 200) => aplicarCookiesAcceso(NextResponse.json(body, status === 200 ? undefined : { status }), acceso);
  if (!acceso.state.canGenerate) return responder({ error: "Agotaste tus 3 planes gratuitos o tu suscripción no está activa. Inicia sesión y suscríbete para continuar.", code: "SUBSCRIPTION_REQUIRED", access: acceso.state }, 403);
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 20_000) return responder({ error: "Solicitud demasiado grande" }, 413);
    const body = await request.json();
    const parsed = perfilSchema.safeParse(body?.perfil ?? body);
    if (!parsed.success) return responder({ error: "Revisa los datos biométricos", detalles: parsed.error.issues.map((i) => ({ campo: i.path.join("."), mensaje: i.message })) }, 400);
    const perfil = parsed.data;
    const usarIA = body?.usarIA !== false;

    let estadoActual = acceso.state;
    if (!acceso.user) {
      if (!acceso.guestId) return responder({ error: "No fue posible iniciar el periodo de prueba" }, 400);
      const consumido = await consumirIntento(acceso.guestId);
      if (!consumido.permitido) return responder({ error: "Ya utilizaste tus 3 planes gratuitos", code: "SUBSCRIPTION_REQUIRED", access: estadoDesdeResolucion(acceso, consumido.usados) }, 403);
      estadoActual = estadoDesdeResolucion(acceso, consumido.usados);
    }

    const clave = createHash("sha256").update(JSON.stringify({ perfil, usarIA })).digest("hex").slice(0, 24);
    const semilla = (Number.parseInt(clave.slice(0, 8), 16) % 90_000) + 1_000;
    const cached = await obtenerCache<{ plan: PlanNutricional; ia: Record<string, unknown> }>(`plan:${clave}`);
    if (cached) return responder({ ...cached, ia: { ...cached.ia, cache: true }, access: estadoActual });

    const resultadoIA = usarIA ? await seleccionarMenusConIA(perfil, semilla) : { seleccion: null, proveedor: null, errores: [] };
    const plan = generarPlan(perfil, {
      semilla,
      metodo: resultadoIA.seleccion ? "IA_HIBRIDA" : "DETERMINISTICO",
      proveedorIA: resultadoIA.proveedor ?? undefined,
      seleccionIA: resultadoIA.seleccion ?? undefined,
    });
    const respuesta = {
      plan,
      ia: {
        solicitada: usarIA,
        utilizada: Boolean(resultadoIA.seleccion),
        proveedor: resultadoIA.proveedor,
        proveedoresConfigurados: proveedoresDisponibles(),
        errores: resultadoIA.errores,
        mensaje: resultadoIA.seleccion ? "Menú seleccionado por IA y cuadrado por el motor determinístico." : "Plan local determinístico. Configura una API key para selección gastronómica asistida por IA.",
      },
    };
    // El estado del cupo nunca se cachea: siempre pertenece al visitante actual.
    await guardarCache(`plan:${clave}`, respuesta, 3600);
    return responder({ ...respuesta, access: estadoActual });
  } catch {
    return responder({ error: "No fue posible procesar la solicitud. Verifica el JSON enviado." }, 400);
  }
}

export async function GET() {
  return NextResponse.json({ proveedoresConfigurados: proveedoresDisponibles(), iaDisponible: proveedoresDisponibles().length > 0 });
}
