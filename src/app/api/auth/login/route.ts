import { NextResponse } from "next/server";
import { loginSchema } from "@/lib/validation/auth-schemas";
import { insertarSesion, verificarPassword } from "@/lib/auth/security";
import { buscarUsuarioPorEmail } from "@/lib/auth/local-store";
import { aplicarCookiesAcceso, estadoUsuario, resolverAcceso } from "@/lib/auth/access";
import { ipDe, limitarPlanes } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const limite = await limitarPlanes(`${ipDe(request)}:login`);
  if (!limite.permitido) return NextResponse.json({ error: "Demasiados intentos. Espera un minuto." }, { status: 429 });
  const acceso = await resolverAcceso(request);
  try {
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Correo o contraseña inválidos" }, { status: 400 });
    const user = await buscarUsuarioPorEmail(parsed.data.email);
    if (!user || !(await verificarPassword(parsed.data.password, user.passwordHash))) return NextResponse.json({ error: "Correo o contraseña incorrectos" }, { status: 401 });
    const response = NextResponse.json({ access: estadoUsuario(user) });
    insertarSesion(response, user.id);
    return aplicarCookiesAcceso(response, acceso);
  } catch { return NextResponse.json({ error: "No fue posible iniciar sesión" }, { status: 400 }); }
}
