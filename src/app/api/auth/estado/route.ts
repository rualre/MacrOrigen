import { NextResponse } from "next/server";
import { resolverAcceso, aplicarCookiesAcceso } from "@/lib/auth/access";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const acceso = await resolverAcceso(request);
  return aplicarCookiesAcceso(NextResponse.json({ access: acceso.state }, { headers: { "Cache-Control": "no-store" } }), acceso);
}
