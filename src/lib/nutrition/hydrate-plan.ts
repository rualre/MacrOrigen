import { z } from "zod";
import type { PlanNutricional } from "@/lib/domain/types";
import type { planEntradaSchema } from "@/lib/validation/plan-schema";
import { alimentoPorId } from "@/data/alimentos";
import { escalarNutrientes, sumarNutrientes } from "./nutrients";
import { validarPlan } from "./validator";

type Entrada = z.infer<typeof planEntradaSchema>;

/** Ignora cualquier nutriente recibido del navegador y recalcula desde registros conocidos. */
export function rehidratarPlan(entrada: Entrada): PlanNutricional {
  const dias = entrada.dias.map((dia) => {
    const comidas = dia.comidas.map((comida) => {
      const ingredientes = comida.ingredientes.filter((i) => alimentoPorId.has(i.alimentoId) && i.gramos >= 0 && i.gramos <= 5000)
        .map((i) => ({ alimentoId: i.alimentoId, gramos: Math.round(i.gramos), nutrientes: escalarNutrientes(alimentoPorId.get(i.alimentoId)!.nutrientes, i.gramos) }));
      return { ...comida, ingredientes, nutrientes: sumarNutrientes(...ingredientes.map((i) => i.nutrientes)) };
    });
    return { dia: dia.dia, comidas, nutrientes: sumarNutrientes(...comidas.map((c) => c.nutrientes)) };
  });
  return { ...entrada, dias, validacion: validarPlan(dias, entrada.metas, 3) };
}
