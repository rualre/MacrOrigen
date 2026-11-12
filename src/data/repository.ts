import { alimentosColombia, alimentoPorId } from "./alimentos";
import type { AlimentoColombiano, GrupoAlimenticio, OrigenTipo } from "@/lib/domain/types";

export interface FiltrosAlimentos {
  q?: string;
  grupo?: GrupoAlimenticio | "TODOS";
  origen?: OrigenTipo | "TODOS";
  alergiasExcluidas?: string[];
  limite?: number;
}

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function puntuar(alimento: AlimentoColombiano, consulta: string) {
  if (!consulta) return 1;
  const nombre = normalizar(alimento.nombre);
  const corpus = normalizar(`${alimento.nombre} ${alimento.subgrupo} ${alimento.detalleOrigen} ${alimento.etiquetas.join(" ")}`);
  if (nombre === consulta) return 100;
  if (nombre.startsWith(consulta)) return 60;
  if (nombre.includes(consulta)) return 40;
  const tokens = consulta.split(/\s+/).filter(Boolean);
  const coincidencias = tokens.filter((token) => corpus.includes(token)).length;
  return coincidencias === tokens.length ? 25 : coincidencias ? coincidencias * 5 : 0;
}

export function buscarAlimentosLocal(filtros: FiltrosAlimentos = {}) {
  const consulta = normalizar(filtros.q ?? "");
  return alimentosColombia
    .filter((alimento) => !filtros.grupo || filtros.grupo === "TODOS" || alimento.grupo === filtros.grupo)
    .filter((alimento) => !filtros.origen || filtros.origen === "TODOS" || alimento.origenTipo === filtros.origen)
    .filter((alimento) => !(filtros.alergiasExcluidas ?? []).some((alergia) => alimento.alergenos.includes(alergia)))
    .map((alimento) => ({ alimento, score: puntuar(alimento, consulta) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.alimento.nombre.localeCompare(b.alimento.nombre, "es"))
    .slice(0, filtros.limite ?? 50)
    .map(({ alimento }) => alimento);
}

export function obtenerAlimento(id: string) {
  return alimentoPorId.get(id);
}

/** Combina texto y pgvector mediante Reciprocal Rank Fusion cuando hay DB + embeddings. */
export async function buscarAlimentosHibrido(filtros: FiltrosAlimentos = {}) {
  const locales = buscarAlimentosLocal({ ...filtros, limite: filtros.limite ?? 20 });
  if (!filtros.q || !process.env.DATABASE_URL || !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return { alimentos: locales, modo: "TEXTO" as const };
  }

  try {
    const embedding = await crearEmbedding(filtros.q);
    const semanticos = await buscarPorVector(embedding, filtros);
    const puntajes = new Map<string, number>();
    locales.forEach((item, index) => puntajes.set(item.id, 1 / (60 + index + 1)));
    semanticos.forEach((item, index) => puntajes.set(item.id, (puntajes.get(item.id) ?? 0) + 1 / (60 + index + 1)));
    const ids = new Set([...locales.map((a) => a.id), ...semanticos.map((a) => a.id)]);
    const alimentos = [...ids].map((id) => alimentoPorId.get(id)).filter((a): a is AlimentoColombiano => Boolean(a))
      .sort((a, b) => (puntajes.get(b.id) ?? 0) - (puntajes.get(a.id) ?? 0)).slice(0, filtros.limite ?? 20);
    return { alimentos, modo: "HIBRIDO_PGVECTOR" as const };
  } catch {
    // La búsqueda textual siempre está disponible; el fallo remoto no bloquea el catálogo.
    return { alimentos: locales, modo: "TEXTO_FALLBACK" as const };
  }
}

async function crearEmbedding(texto: string): Promise<number[]> {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY!;
  const model = process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${key}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: { parts: [{ text: texto }] }, outputDimensionality: 768 }),
    signal: AbortSignal.timeout(8_000), cache: "no-store",
  });
  if (!response.ok) throw new Error("No fue posible generar el embedding");
  const data = await response.json() as { embedding?: { values?: number[] } };
  if (!data.embedding?.values?.length) throw new Error("Embedding vacío");
  return data.embedding.values.slice(0, 768);
}

async function buscarPorVector(embedding: number[], filtros: FiltrosAlimentos) {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const vector = `[${embedding.join(",")}]`;
    const limite = Math.min(Math.max(filtros.limite ?? 20, 1), 100);
    const rows = await prisma.$queryRawUnsafe<Array<{ slug: string }>>(
      `SELECT slug FROM "AlimentoColombiano"
       WHERE embedding IS NOT NULL
       AND ($2::text IS NULL OR "grupo"::text = $2)
       AND ($3::text IS NULL OR "origenTipo"::text = $3)
       ORDER BY embedding <=> $1::vector LIMIT $4`,
      vector, filtros.grupo && filtros.grupo !== "TODOS" ? filtros.grupo : null,
      filtros.origen && filtros.origen !== "TODOS" ? filtros.origen : null, limite,
    );
    return rows.map(({ slug }) => alimentoPorId.get(slug)).filter((a): a is AlimentoColombiano => Boolean(a));
  } finally {
    await prisma.$disconnect();
  }
}
