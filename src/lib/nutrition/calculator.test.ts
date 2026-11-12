import { describe, expect, it } from "vitest";
import { calcularMetas, calcularTmb } from "./calculator";
import { escalarNutrientes, sumarNutrientes } from "./nutrients";
import { validarNutricion } from "./validator";
import type { PerfilBiometricoInput } from "@/lib/domain/types";
import { alimentoPorId } from "@/data/alimentos";

const perfil: PerfilBiometricoInput = { nombre: "Prueba", edad: 30, sexo: "MASCULINO", pesoKg: 70, alturaCm: 175, nivelActividad: "MODERADO", objetivo: "MANTENIMIENTO", formula: "MIFFLIN", preferenciaOrigen: "TODOS", alergias: [], comidasAlDia: 4, dias: 1 };

describe("motor nutricional determinístico", () => {
  it("aplica Mifflin-St Jeor para hombre", () => { expect(calcularTmb(perfil)).toBeCloseTo(1648.75, 2); });
  it("aplica Mifflin-St Jeor para mujer", () => { expect(calcularTmb({ ...perfil, sexo: "FEMENINO" })).toBeCloseTo(1482.75, 2); });
  it("aplica el factor de actividad y el ajuste del objetivo", () => {
    const metas = calcularMetas(perfil);
    expect(metas.tdeeKcal).toBeCloseTo(1648.75 * 1.55, 1);
    expect(metas.caloriasObjetivoKcal).toBe(metas.tdeeKcal);
    const deficit = calcularMetas({ ...perfil, objetivo: "PERDIDA" });
    expect(deficit.caloriasObjetivoKcal).toBeLessThan(metas.caloriasObjetivoKcal);
  });
  it("conserva la identidad energética aproximada de los objetivos", () => {
    const m = calcularMetas(perfil);
    expect(m.proteinaObjetivoG * 4 + m.carbohidratosObjetivoG * 4 + m.grasasObjetivoG * 9).toBeCloseTo(m.caloriasObjetivoKcal, 0);
  });
  it("escala y suma nutrientes exclusivamente por gramos", () => {
    const pollo = alimentoPorId.get("pollo-pechuga-cruda")!.nutrientes;
    const porcion = escalarNutrientes(pollo, 200);
    expect(porcion.proteinaG).toBe(45);
    expect(sumarNutrientes(porcion, porcion).energiaKcal).toBe(480);
  });
  it("valida límites de ±3% sin confiar en textos generados", () => {
    const m = calcularMetas(perfil);
    expect(validarNutricion({ ...escalarNutrientes(alimentoPorId.get("aceite-palma")!.nutrientes, 0), energiaKcal: m.caloriasObjetivoKcal, proteinaG: m.proteinaObjetivoG, carbohidratosG: m.carbohidratosObjetivoG, grasasTotalesG: m.grasasObjetivoG }, m).valido).toBe(true);
  });
});
