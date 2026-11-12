import { describe, expect, it } from "vitest";
import { generarPlan, intercambiarIngrediente, regenerarComida } from "./plan-generator";
import { generarListaCompras } from "./shopping-list";
import { alimentoPorId, alimentosColombia } from "@/data/alimentos";
import type { PerfilBiometricoInput } from "@/lib/domain/types";

const base: PerfilBiometricoInput = { nombre: "Prueba", edad: 32, sexo: "FEMENINO", pesoKg: 70, alturaCm: 165, nivelActividad: "MODERADO", objetivo: "MANTENIMIENTO", formula: "MIFFLIN", preferenciaOrigen: "PRIORIZAR_CRIOLLOS", alergias: [], comidasAlDia: 4, dias: 1 };

describe("planificador con grounding", () => {
  it("genera un plan diario dentro de la tolerancia", () => {
    const plan = generarPlan(base, { semilla: 42 });
    expect(plan.dias).toHaveLength(1); expect(plan.dias[0].comidas).toHaveLength(4);
    expect(plan.validacion.valido, plan.validacion.alertas.join(", ")).toBe(true);
    expect(Object.values(plan.validacion.desviaciones).every((d) => Math.abs(d) <= 3)).toBe(true);
  });
  it("mantiene ±3% en tres objetivos y configuraciones de 3 a 6 comidas", () => {
    for (const objetivo of ["PERDIDA", "MANTENIMIENTO", "AUMENTO"] as const) for (const comidasAlDia of [3, 4, 5, 6]) {
      const plan = generarPlan({ ...base, objetivo, comidasAlDia }, { semilla: 42 });
      expect(plan.validacion.valido, `${objetivo}/${comidasAlDia}: ${plan.validacion.alertas.join(", ")}`).toBe(true);
    }
  });
  it("valida cada día del plan semanal, no solo el promedio", () => {
    const plan = generarPlan({ ...base, dias: 7 }, { semilla: 42 });
    expect(plan.validacion.valido, plan.validacion.alertas.join(", ")).toBe(true);
    expect(plan.dias).toHaveLength(7);
  });
  it("usa solo IDs verificados y gramos no negativos", () => {
    const plan = generarPlan({ ...base, dias: 2, comidasAlDia: 3 }, { semilla: 10 });
    for (const dia of plan.dias) for (const comida of dia.comidas) for (const ingrediente of comida.ingredientes) {
      expect(alimentoPorId.has(ingrediente.alimentoId)).toBe(true); expect(ingrediente.gramos).toBeGreaterThan(0);
    }
  });
  it("excluye alérgenos en todas las comidas", () => {
    const plan = generarPlan({ ...base, alergias: ["LACTEOS", "HUEVO", "GLUTEN", "PESCADO", "FRUTOS_SECOS"] }, { semilla: 42 });
    for (const dia of plan.dias) for (const comida of dia.comidas) for (const ingrediente of comida.ingredientes) {
      expect(alimentoPorId.get(ingrediente.alimentoId)!.alergenos).toEqual([]);
    }
  });
  it("regenera una comida y recalcula el día", () => {
    const plan = generarPlan(base, { semilla: 42 }); const nuevo = regenerarComida(plan, plan.dias[0].comidas[1].id, 87);
    expect(nuevo.dias[0].comidas).toHaveLength(4); expect(nuevo.dias[0].nutrientes.energiaKcal).toBeGreaterThan(0);
    expect(nuevo.validacion.valido, nuevo.validacion.alertas.join(", ")).toBe(true);
  });
  it("intercambia manteniendo grounding y regenera lista de compras", () => {
    const plan = generarPlan(base, { semilla: 42 }); const comida = plan.dias[0].comidas[1]; const primero = comida.ingredientes[0];
    const nuevo = intercambiarIngrediente(plan, comida.id, primero.alimentoId);
    const comidaModificada = nuevo.dias[0].comidas.find((c) => c.id === comida.id)!;
    expect(comidaModificada.ingredientes.some((i) => i.alimentoId === primero.alimentoId)).toBe(false);
    expect(nuevo.validacion.valido, nuevo.validacion.alertas.join(", ")).toBe(true);
    const lista = generarListaCompras(nuevo.dias);
    expect(lista.reduce((s, i) => s + i.gramos, 0)).toBeGreaterThan(0);
    expect(lista.every((i) => alimentosColombia.some((a) => a.id === i.alimentoId))).toBe(true);
  });
});
