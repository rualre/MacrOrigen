import { NextResponse } from "next/server";
import { resolverAcceso, estadoUsuario, precioSuscripcion } from "@/lib/auth/access";
import { activarSuscripcionDemo } from "@/lib/auth/store";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const host = request.headers.get("host") ?? "";
  const esLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host);
  if (!esLocal && process.env.ALLOW_DEMO_CHECKOUT !== "true") return NextResponse.json({ error: "El checkout demostrativo solo está disponible en el entorno local autorizado" }, { status: 403 });
  const acceso = await resolverAcceso(request, false);
  if (!acceso.user) return NextResponse.json({ error: "Primero inicia sesión o crea una cuenta", code: "AUTH_REQUIRED" }, { status: 401 });
  try {
    const actualizado = await activarSuscripcionDemo(acceso.user.id, precioSuscripcion());
    return NextResponse.json({ access: estadoUsuario(actualizado), payment: { demo: true, charged: false, message: "Suscripción de demostración activada. No se realizó ningún cargo." } });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    return NextResponse.json({ error: "No fue posible activar la suscripción" }, { status: 400 });
  }
}
