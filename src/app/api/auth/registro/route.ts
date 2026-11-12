import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { registroSchema } from "@/lib/validation/auth-schemas";
import { hashPassword, insertarSesion } from "@/lib/auth/security";
import { actualizarStore } from "@/lib/auth/local-store";
import { aplicarCookiesAcceso, estadoUsuario, precioSuscripcion, resolverAcceso } from "@/lib/auth/access";
import type { UsuarioLocal } from "@/lib/auth/types";
import { ipDe, limitarPlanes } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const limite = await limitarPlanes(`${ipDe(request)}:registro`);
  if (!limite.permitido) return NextResponse.json({ error: "Demasiados registros desde esta red. Espera un minuto." }, { status: 429 });
  const acceso = await resolverAcceso(request);
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 10_000) return NextResponse.json({ error: "Solicitud demasiado grande" }, { status: 413 });
    const parsed = registroSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    const passwordHash = await hashPassword(parsed.data.password);
    const ahora = new Date().toISOString();
    const nuevo: UsuarioLocal = { id: randomUUID(), email: parsed.data.email, nombre: parsed.data.nombre, passwordHash, creadoEn: ahora, suscripcion: { estado: "PENDIENTE", proveedor: "POR_CONFIGURAR", precioCOP: precioSuscripcion() } };
    await actualizarStore((store) => {
      if (store.usuarios.some((user) => user.email === nuevo.email)) throw new Error("EMAIL_EXISTS");
      store.usuarios.push(nuevo);
    });
    const response = NextResponse.json({ access: estadoUsuario(nuevo), mensaje: "Cuenta creada. Completa la suscripción para desbloquear MacrOrigen." }, { status: 201 });
    insertarSesion(response, nuevo.id);
    return aplicarCookiesAcceso(response, acceso);
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_EXISTS") return NextResponse.json({ error: "Ya existe una cuenta con este correo. Inicia sesión." }, { status: 409 });
    return NextResponse.json({ error: "No fue posible crear la cuenta" }, { status: 400 });
  }
}
