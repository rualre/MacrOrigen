import "server-only";
import { generateText, stepCountIs, tool, type LanguageModel } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import type { GrupoIntercambioId, MetasNutricionales, PerfilBiometricoInput } from "@/lib/domain/types";
import { buscarAlimentosLocal, obtenerAlimento } from "@/data/repository";
import { calcularMetas } from "@/lib/nutrition/calculator";
import { GRUPOS_NOMBRE, alimentosDeGrupo, resolverAsignacionIntercambios } from "@/lib/nutrition/exchanges";
import { distribucionPara } from "@/lib/nutrition/meal-distribution";

const SYSTEM_PROMPT = `Eres el planificador gastronómico de MacrOrigen, especializado en alimentación colombiana.
REGLAS INQUEBRANTABLES:
1. Selecciona ÚNICAMENTE IDs devueltos por las herramientas del catálogo. Nunca inventes alimentos, IDs, nutrientes, equivalencias ni gramajes.
2. El motor determinístico ya calculó cuántos intercambios de cada grupo corresponden a cada comida. Tú solo eliges un alimento real por cada grupo requerido. NUNCA multipliques ni escribas gramos, porciones, calorías o macros.
3. Consulta las herramientas antes de seleccionar. Cada ingrediente debe ser un ID exacto y verificable.
4. Construye combinaciones culinarias colombianas coherentes, variadas y económicas. Prioriza criollos si se solicita.
5. Respeta alergias y número/tipos de comidas. No agregues condimentos con aporte energético.
6. Devuelve SOLO JSON válido, sin markdown ni explicaciones, con esta estructura:
{"dias":[{"dia":1,"comidas":[{"tipo":"DESAYUNO","ingredientes":["id-verificado"]}]}]}
Cada comida debe cubrir todos los grupos con cantidad mayor que cero usando entre 2 y 6 ingredientes. No incluyas gramos, porciones ni totales numéricos.`;

const respuestaSchema = z.object({
  dias: z.array(z.object({
    dia: z.number().int().min(1).max(7),
    comidas: z.array(z.object({ tipo: z.string().max(30), ingredientes: z.array(z.string().max(100)).min(2).max(6) })).min(3).max(6),
  }).strict()).min(1).max(7),
}).strict();

type SeleccionRespuesta = z.infer<typeof respuestaSchema>;
type ComidaAsignacionPrompt = { tipo: string; grupos: Partial<Record<GrupoIntercambioId, number>> };
type AsignacionPrompt = ComidaAsignacionPrompt[][];


function claves(nombre: string) {
  const multiples = process.env[`${nombre}_KEYS`]?.split(",").map((k) => k.trim()).filter(Boolean) ?? [];
  const individual = process.env[`${nombre}_KEY`]?.trim();
  return [...new Set([...multiples, ...(individual ? [individual] : [])])];
}

export function proveedoresDisponibles() {
  return [
    claves("GOOGLE_GENERATIVE_AI_API").length ? "Gemini" : null,
    claves("GROQ_API").length ? "Groq" : null,
    claves("OPENROUTER_API").length ? "OpenRouter" : null,
  ].filter((value): value is string => Boolean(value));
}

let cursor = 0;
function siguienteClave(valores: string[]) {
  if (!valores.length) return "";
  return valores[cursor++ % valores.length];
}

function modelos(): Array<{ nombre: string; apiKeys: string[]; crear: (key: string) => LanguageModel }> {
  return [
    { nombre: "Gemini", apiKeys: claves("GOOGLE_GENERATIVE_AI_API"), crear: (apiKey) => createGoogleGenerativeAI({ apiKey })(process.env.GEMINI_MODEL ?? "gemini-2.0-flash") },
    { nombre: "Groq", apiKeys: claves("GROQ_API"), crear: (apiKey) => createGroq({ apiKey })(process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile") },
    { nombre: "OpenRouter", apiKeys: claves("OPENROUTER_API"), crear: (apiKey) => createOpenAICompatible({ name: "openrouter", baseURL: "https://openrouter.ai/api/v1", apiKey, headers: { "X-Title": "MacrOrigen" } }).chatModel(process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.3-70b-instruct:free") },
  ];
}

const herramientas = {
  buscar_alimentos_colombianos: tool({
    description: "Busca alimentos reales del catálogo colombiano por texto, grupo y origen. Usa los IDs devueltos en el menú.",
    inputSchema: z.object({
      consulta: z.string().max(80).describe("Alimento o preparación a buscar"),
      grupo: z.string().max(30).optional(),
      origen: z.enum(["TODOS", "CRIOLLO", "NO_CRIOLLO"]).default("TODOS"),
    }),
    execute: async ({ consulta, grupo, origen }) => ({
      alimentos: buscarAlimentosLocal({ q: consulta, grupo: grupo as never, origen, limite: 8 }).map((a) => ({
        id: a.id, nombre: a.nombre, grupo: a.grupo, subgrupo: a.subgrupo, origen: a.origenTipo,
        por100: { kcal: a.nutrientes.energiaKcal, proteinaG: a.nutrientes.proteinaG, carbohidratosG: a.nutrientes.carbohidratosG, grasasG: a.nutrientes.grasasTotalesG },
        alergenos: a.alergenos,
      })),
    }),
  }),
  obtener_nutrientes_verificados: tool({
    description: "Consulta el registro nutricional completo por 100 g/ml de un ID del catálogo. No acepta nombres libres.",
    inputSchema: z.object({ alimentoId: z.string().max(100) }),
    execute: async ({ alimentoId }) => {
      const alimento = obtenerAlimento(alimentoId);
      if (!alimento) return { encontrado: false };
      return { encontrado: true, id: alimento.id, unidadBase: alimento.unidadBase, nutrientesPor100: alimento.nutrientes, fuente: alimento.fuente, origen: alimento.origenTipo };
    },
  }),
};

function extraerJson(texto: string) {
  const limpio = texto.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const inicio = limpio.indexOf("{");
  const fin = limpio.lastIndexOf("}");
  if (inicio < 0 || fin <= inicio) throw new Error("La respuesta no contiene JSON");
  return JSON.parse(limpio.slice(inicio, fin + 1));
}

function construirAsignaciones(perfil: PerfilBiometricoInput, metas: MetasNutricionales, semilla: number): AsignacionPrompt {
  return Array.from({ length: perfil.dias }, (_, index) => {
    const dia = index + 1;
    const asignacion = resolverAsignacionIntercambios(perfil, metas, { semilla: semilla + dia * 131 });
    const distribucion = distribucionPara(perfil.comidasAlDia);
    return asignacion.comidas.map((comida, mealIndex) => ({
      tipo: distribucion[mealIndex]?.tipo ?? comida.tipo,
      grupos: Object.fromEntries(Object.entries(comida.grupos).filter(([, cantidad]) => cantidad > 0)) as Partial<Record<GrupoIntercambioId, number>>,
    }));
  });
}

function resumenAsignaciones(asignaciones: AsignacionPrompt) {
  return asignaciones.map((dia, index) => ({
    dia: index + 1,
    comidas: dia.map((comida) => ({
      tipo: comida.tipo,
      grupos: Object.fromEntries(Object.entries(comida.grupos).map(([grupo, cantidad]) => [
        GRUPOS_NOMBRE[grupo as GrupoIntercambioId] ?? grupo,
        cantidad,
      ])),
    })),
  }));
}

function herramientasIntercambio(asignaciones: AsignacionPrompt, perfil: PerfilBiometricoInput) {
  return {
    consultar_asignacion_intercambios: tool({
      description: "Devuelve la asignación determinística de intercambios por comida para un día. Úsala para cubrir exactamente los grupos requeridos.",
      inputSchema: z.object({ dia: z.number().int().min(1).max(7) }),
      execute: async ({ dia }) => ({
        dia,
        comidas: asignaciones[dia - 1] ?? [],
        nota: "No calcules gramos. Elige un ID del catálogo por cada grupo con cantidad mayor que cero.",
      }),
    }),
    buscar_por_intercambio: tool({
      description: "Lista alimentos reales de un grupo de intercambio, con gramos oficiales por intercambio y medida casera. No inventa equivalencias.",
      inputSchema: z.object({
        grupo: z.enum(["LACTEOS", "SUSTITUTOS", "CARNES_MAGRAS", "CEREALES", "VERDURAS", "FRUTAS", "GRASAS", "AZUCARES"]),
        limite: z.number().int().min(1).max(12).default(8),
      }),
      execute: async ({ grupo, limite }) => ({
        grupo,
        alimentos: alimentosDeGrupo(grupo as GrupoIntercambioId)
          .filter((alimento) => !perfil.alergias.some((alergia) => alimento.alergenos.includes(alergia)))
          .slice(0, limite)
          .map((alimento) => ({
            id: alimento.id,
            nombre: alimento.nombre,
            grupoIntercambio: GRUPOS_NOMBRE[grupo as GrupoIntercambioId],
            subgrupoIntercambio: alimento.intercambio?.subgrupoId,
            gramosPorIntercambio: alimento.intercambio?.gramosPorIntercambio,
            medidaCasera: alimento.intercambio?.medidaCasera,
            origen: alimento.origenTipo,
            alergenos: alimento.alergenos,
          })),
      }),
    }),
  };
}

function validarSeleccion(data: SeleccionRespuesta, perfil: PerfilBiometricoInput, asignaciones: AsignacionPrompt) {
  if (data.dias.length !== perfil.dias || data.dias.some((dia) => dia.comidas.length !== perfil.comidasAlDia)) throw new Error("La IA omitió días o comidas requeridas");
  const idsPermitidos = new Set(buscarAlimentosLocal({ limite: 100 }).map((a) => a.id));
  return data.dias.map((dia, diaIndex) => dia.comidas.map((comida, comidaIndex) => {
    const ids = [...new Set(comida.ingredientes)];
    const gruposSeleccionados = new Set<GrupoIntercambioId>();
    for (const id of ids) {
      const alimento = obtenerAlimento(id);
      if (!idsPermitidos.has(id) || !alimento) throw new Error(`ID no verificado: ${id}`);
      if (perfil.alergias.some((alergia) => alimento.alergenos.includes(alergia))) throw new Error(`Alergia no respetada: ${id}`);
      if (alimento.intercambio) gruposSeleccionados.add(alimento.intercambio.grupoId);
    }
    const requeridos = Object.entries(asignaciones[diaIndex]?.[comidaIndex]?.grupos ?? {})
      .filter(([, cantidad]) => Number(cantidad) > 0)
      .map(([grupo]) => grupo as GrupoIntercambioId);
    for (const grupo of requeridos) {
      if (!gruposSeleccionados.has(grupo)) throw new Error(`Grupo de intercambio sin cubrir: ${GRUPOS_NOMBRE[grupo]}`);
    }
    return ids.join(",");
  }));
}

export async function seleccionarMenusConIA(perfil: PerfilBiometricoInput, semilla = 7919) {
  const metas = calcularMetas(perfil);
  const asignaciones = construirAsignaciones(perfil, metas, semilla);
  const errores: string[] = [];
  const prompt = `Perfil validado: ${JSON.stringify({ comidasAlDia: perfil.comidasAlDia, dias: perfil.dias, preferenciaOrigen: perfil.preferenciaOrigen, alergias: perfil.alergias })}.
Metas exclusivamente de contexto (no las calcules ni las devuelvas): ${JSON.stringify(metas)}.
Asignación determinística de intercambios por día y comida: ${JSON.stringify(resumenAsignaciones(asignaciones))}.
Usa herramientas para descubrir IDs de cada grupo. Tipos de comida por día: ${perfil.comidasAlDia === 3 ? "DESAYUNO, ALMUERZO, CENA" : perfil.comidasAlDia === 4 ? "DESAYUNO, ALMUERZO, MERIENDA, CENA" : perfil.comidasAlDia === 5 ? "DESAYUNO, MEDIA_MANANA, ALMUERZO, MERIENDA, CENA" : "DESAYUNO, MEDIA_MANANA, ALMUERZO, MERIENDA, MEDIA_TARDE, CENA"}.
Para cada comida elige un alimento real por cada grupo que tenga cantidad mayor que cero. No devuelvas gramos: el motor multiplicará gramosPorIntercambio × cantidad.`;

  for (const proveedor of modelos()) {
    if (!proveedor.apiKeys.length) continue;
    try {
      const apiKey = siguienteClave(proveedor.apiKeys);
      const resultado = await generateText({
        model: proveedor.crear(apiKey), system: SYSTEM_PROMPT, prompt,
        tools: { ...herramientas, ...herramientasIntercambio(asignaciones, perfil) },
        stopWhen: stepCountIs(10), temperature: 0.2, maxOutputTokens: 5000,
        abortSignal: AbortSignal.timeout(45_000),
      });
      const json = respuestaSchema.parse(extraerJson(resultado.text));
      return { seleccion: validarSeleccion(json, perfil, asignaciones), proveedor: proveedor.nombre, errores };
    } catch (error) {
      // No devolver mensajes de proveedores: pueden contener detalles sensibles de cuenta/red.
      errores.push(`${proveedor.nombre}: proveedor no disponible o respuesta estructurada inválida`);
      console.warn(`[MacrOrigen] Fallback de IA: ${proveedor.nombre} no disponible (${error instanceof Error ? error.name : "Error"})`);
    }
  }
  return { seleccion: null, proveedor: null, errores };
}
