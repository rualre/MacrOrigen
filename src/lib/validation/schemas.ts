import { z } from "zod";
import { GRUPOS } from "@/lib/domain/types";

const textoSeguro = (max: number) => z.string().trim().max(max)
  .refine((value) => !/(ignore\s+(all|previous)|system\s*:|developer\s*:|<\/?system|olvida\s+las\s+instrucciones)/i.test(value), "El texto contiene instrucciones no permitidas");

export const perfilSchema = z.object({
  nombre: textoSeguro(50).default("Invitado"),
  edad: z.coerce.number().int().min(18, "Disponible para adultos desde 18 años").max(90),
  sexo: z.enum(["FEMENINO", "MASCULINO"]),
  pesoKg: z.coerce.number().min(35).max(300),
  alturaCm: z.coerce.number().min(130).max(230),
  nivelActividad: z.enum(["SEDENTARIO", "LIGERO", "MODERADO", "ALTO", "MUY_ALTO"]),
  objetivo: z.enum(["PERDIDA", "MANTENIMIENTO", "AUMENTO"]),
  formula: z.enum(["MIFFLIN", "HARRIS"]),
  preferenciaOrigen: z.enum(["TODOS", "PRIORIZAR_CRIOLLOS", "INCLUIR_COMERCIALES"]),
  alergias: z.array(z.enum(["LACTEOS", "HUEVO", "GLUTEN", "PESCADO", "FRUTOS_SECOS"])).max(5).default([]),
  comidasAlDia: z.coerce.number().int().min(3).max(6).default(4),
  dias: z.coerce.number().int().min(1).max(7).default(1),
});

export const busquedaSchema = z.object({
  q: textoSeguro(80).optional().default(""),
  grupo: z.enum(["TODOS", ...GRUPOS]).optional().default("TODOS"),
  origen: z.enum(["TODOS", "CRIOLLO", "NO_CRIOLLO"]).optional().default("TODOS"),
  limite: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const regenerarSchema = z.object({
  perfil: perfilSchema,
  metas: z.object({
    tmbKcal: z.number(), tdeeKcal: z.number(), caloriasObjetivoKcal: z.number(),
    proteinaObjetivoG: z.number(), carbohidratosObjetivoG: z.number(),
    grasasObjetivoG: z.number(), fibraObjetivoG: z.number(), ajusteCaloricoPct: z.number(),
  }),
  comidaId: z.string().min(1).max(80),
  excluirAlimentoId: z.string().max(80).optional(),
});

export function sanitizarTextoPlano(value: string, max = 200) {
  return value.replace(/[<>\u0000-\u001F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
