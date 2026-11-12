import type { DiaPlan, MetasNutricionales, Nutrientes, ResultadoValidacion } from "@/lib/domain/types";
import { sumarNutrientes } from "./nutrients";

function desviacion(actual: number, objetivo: number) {
  return objetivo === 0 ? 0 : ((actual - objetivo) / objetivo) * 100;
}

export function validarNutricion(nutrientes: Nutrientes, metas: MetasNutricionales, toleranciaPct = 3): ResultadoValidacion {
  const desviaciones = {
    caloriasPct: desviacion(nutrientes.energiaKcal, metas.caloriasObjetivoKcal),
    proteinaPct: desviacion(nutrientes.proteinaG, metas.proteinaObjetivoG),
    carbohidratosPct: desviacion(nutrientes.carbohidratosG, metas.carbohidratosObjetivoG),
    grasasPct: desviacion(nutrientes.grasasTotalesG, metas.grasasObjetivoG),
  };
  const alertas = Object.entries(desviaciones)
    .filter(([, valor]) => Math.abs(valor) > toleranciaPct)
    .map(([macro, valor]) => `${macro}: ${valor > 0 ? "+" : ""}${valor.toFixed(1)}% respecto a la meta`);
  return { valido: alertas.length === 0, toleranciaPct, desviaciones, alertas };
}

export function validarPlan(dias: DiaPlan[], metas: MetasNutricionales, toleranciaPct = 3): ResultadoValidacion {
  if (!dias.length) return validarNutricion(sumarNutrientes(), metas, toleranciaPct);
  const diarios = dias.map((dia) => validarNutricion(sumarNutrientes(...dia.comidas.map((comida) => comida.nutrientes)), metas, toleranciaPct));
  const promedio = sumarNutrientes(...dias.map((d) => d.nutrientes));
  for (const key of Object.keys(promedio) as (keyof Nutrientes)[]) promedio[key] /= dias.length;
  const resultado = validarNutricion(promedio, metas, toleranciaPct);
  resultado.valido = diarios.every((item) => item.valido) && resultado.valido;
  resultado.alertas = dias.flatMap((dia, index) => diarios[index].alertas.map((alerta) => `Día ${dia.dia} — ${alerta}`));
  return resultado;
}
