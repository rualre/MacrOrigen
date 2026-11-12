import type { MetasNutricionales, PerfilBiometricoInput } from "@/lib/domain/types";
import { redondear } from "./nutrients";

const ACTIVIDAD = { SEDENTARIO: 1.2, LIGERO: 1.375, MODERADO: 1.55, ALTO: 1.725, MUY_ALTO: 1.9 } as const;

export function calcularTmb(perfil: Pick<PerfilBiometricoInput, "sexo" | "pesoKg" | "alturaCm" | "edad" | "formula">) {
  const { sexo, pesoKg: p, alturaCm: a, edad: e, formula } = perfil;
  if (formula === "HARRIS") {
    // Ecuaciones revisadas por Roza y Shizgal (1984).
    return sexo === "MASCULINO" ? 88.362 + 13.397 * p + 4.799 * a - 5.677 * e : 447.593 + 9.247 * p + 3.098 * a - 4.330 * e;
  }
  return 10 * p + 6.25 * a - 5 * e + (sexo === "MASCULINO" ? 5 : -161);
}

export function calcularMetas(perfil: PerfilBiometricoInput): MetasNutricionales {
  const tmb = calcularTmb(perfil);
  const tdee = tmb * ACTIVIDAD[perfil.nivelActividad];
  const ajusteCaloricoPct = perfil.objetivo === "PERDIDA" ? -15 : perfil.objetivo === "AUMENTO" ? 10 : 0;
  const calorias = Math.max(tmb * 1.1, tdee * (1 + ajusteCaloricoPct / 100));

  // Proteína por kg; el resto se reparte entre grasa (30%) y carbohidratos.
  const proteinaPorKg = perfil.objetivo === "PERDIDA" ? 1.8 : perfil.objetivo === "AUMENTO" ? 1.8 : 1.5;
  const proteina = perfil.pesoKg * proteinaPorKg;
  const grasas = (calorias * 0.30) / 9;
  const carbohidratos = Math.max(50, (calorias - proteina * 4 - grasas * 9) / 4);

  return {
    tmbKcal: redondear(tmb), tdeeKcal: redondear(tdee), caloriasObjetivoKcal: redondear(calorias),
    proteinaObjetivoG: redondear(proteina), carbohidratosObjetivoG: redondear(carbohidratos),
    grasasObjetivoG: redondear(grasas), fibraObjetivoG: redondear((calorias / 1000) * 14),
    ajusteCaloricoPct,
  };
}
