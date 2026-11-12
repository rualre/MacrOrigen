import { NextResponse } from "next/server";
import { registroSchema } from "@/lib/validation/auth-schemas";
import { hashPassword, insertarSesion } from "@/lib/auth/security";
import { crearUsuario } from "@/lib/auth/store";
import { aplicarCookiesAcceso, estadoUsuario, precioSuscripcion, resolverAcceso } from "@/lib/auth/access";
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
    const nuevo = await crearUsuario({
      email: parsed.data.email,
      nombre: parsed.data.nombre,
      passwordHash,
      precioCOP: precioSuscripcion(),
    });
    const response = NextResponse.json({ access: estadoUsuario(nuevo), mensaje: "Cuenta creada. Completa la suscripción para desbloquear MacrOrigen." }, { status: 201 });
    insertarSesion(response, nuevo.id);
    return aplicarCookiesAcceso(response, acceso);
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_EXISTS") return NextResponse.json({ error: "Ya existe una cuenta con este correo. Inicia sesión." }, { status: 409 });
    return NextResponse.json({ error: "No fue posible crear la cuenta" }, { status: 400 });
  }
}
