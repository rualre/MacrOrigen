import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { resolverAcceso, estadoUsuario } from "@/lib/auth/access";
import { actualizarStore } from "@/lib/auth/local-store";
import type { UsuarioLocal } from "@/lib/auth/types";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const host = request.headers.get("host") ?? "";
  const esLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host);
  if (!esLocal && process.env.ALLOW_DEMO_CHECKOUT !== "true") return NextResponse.json({ error: "El checkout demostrativo solo está disponible en el entorno local autorizado" }, { status: 403 });
  const acceso = await resolverAcceso(request, false);
  if (!acceso.user) return NextResponse.json({ error: "Primero inicia sesión o crea una cuenta", code: "AUTH_REQUIRED" }, { status: 401 });
  let actualizado: UsuarioLocal | undefined;
  await actualizarStore((store) => {
    const user = store.usuarios.find((item) => item.id === acceso.user!.id);
    if (!user) throw new Error("USER_NOT_FOUND");
    const ahora = new Date();
    const fin = new Date(ahora.getTime() + 30 * 86_400_000);
    user.suscripcion = { ...user.suscripcion, estado: "ACTIVA", proveedor: "DEMO", referenciaExterna: `DEMO-${randomUUID()}`, finPeriodo: fin.toISOString() };
    actualizado = { ...user };
  });
  if (!actualizado) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
  return NextResponse.json({ access: estadoUsuario(actualizado), payment: { demo: true, charged: false, message: "Suscripción de demostración activada. No se realizó ningún cargo." } });
}
