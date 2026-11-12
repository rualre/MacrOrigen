import type { Nutrientes } from "@/lib/domain/types";

export const NUTRIENTES_VACIOS: Nutrientes = {
  energiaKcal: 0, energiaKj: 0, aguaG: 0, proteinaG: 0, carbohidratosG: 0,
  fibraG: 0, azucaresG: 0, grasasTotalesG: 0, grasasSaturadasG: 0,
  grasasMonoinsaturadasG: 0, grasasPoliinsaturadasG: 0, colesterolMg: 0,
  sodioMg: 0, potasioMg: 0, calcioMg: 0, hierroMg: 0, magnesioMg: 0,
  fosforoMg: 0, zincMg: 0, vitaminaAMcg: 0, vitaminaCMg: 0,
  vitaminaB12Mcg: 0, folatoMcg: 0,
};

export const nutrientKeys = Object.keys(NUTRIENTES_VACIOS) as (keyof Nutrientes)[];

export function escalarNutrientes(nutrientes: Nutrientes, gramos: number): Nutrientes {
  const factor = gramos / 100;
  return Object.fromEntries(nutrientKeys.map((key) => [key, redondear(nutrientes[key] * factor, 3)])) as unknown as Nutrientes;
}

export function sumarNutrientes(...valores: Nutrientes[]): Nutrientes {
  return Object.fromEntries(nutrientKeys.map((key) => [
    key, redondear(valores.reduce((total, item) => total + (item[key] ?? 0), 0), 3),
  ])) as unknown as Nutrientes;
}

export function redondear(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
