import { NextResponse } from "next/server";
import { borrarSesion } from "@/lib/auth/security";

export async function POST() {
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  borrarSesion(response);
  return response;
}
