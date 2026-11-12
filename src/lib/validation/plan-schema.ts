import { z } from "zod";
import { perfilSchema } from "./schemas";

const metasSchema = z.object({
  tmbKcal: z.number(), tdeeKcal: z.number(), caloriasObjetivoKcal: z.number().positive(),
  proteinaObjetivoG: z.number().positive(), carbohidratosObjetivoG: z.number().positive(),
  grasasObjetivoG: z.number().positive(), fibraObjetivoG: z.number(), ajusteCaloricoPct: z.number(),
});

export const planEntradaSchema = z.object({
  id: z.string().max(150), creadoEn: z.string().max(50), perfil: perfilSchema, metas: metasSchema,
  metodo: z.enum(["DETERMINISTICO", "IA_HIBRIDA"]).default("DETERMINISTICO"), proveedorIA: z.string().max(100).optional(),
  dias: z.array(z.object({
    dia: z.number().int(), comidas: z.array(z.object({
      id: z.string().max(100), tipo: z.string().max(30), nombre: z.string().max(200), preparacion: z.string().max(1000),
      ingredientes: z.array(z.object({ alimentoId: z.string().max(100), gramos: z.number().max(5000) })).max(20),
    })).max(6),
  })).max(7),
});

export const accionPlanSchema = z.object({ plan: planEntradaSchema, comidaId: z.string().max(100), alimentoId: z.string().max(100).optional() });
