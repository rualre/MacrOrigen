import { NextResponse } from "next/server";
import { equivalentesDe } from "@/lib/nutrition/plan-generator";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const alimentos = equivalentesDe(id);
  if (!alimentos.length) return NextResponse.json({ error: "No hay equivalentes para este alimento" }, { status: 404 });
  return NextResponse.json({ alimentos });
}
