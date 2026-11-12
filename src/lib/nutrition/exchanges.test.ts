import { describe, expect, it } from "vitest";
import { alimentoPorId, alimentosColombia } from "@/data/alimentos";
import { GRUPOS_INTERCAMBIO_DEF, INTERCAMBIOS_POR_ALIMENTO } from "@/data/intercambios";
import type { PerfilBiometricoInput } from "@/lib/domain/types";
import { calcularMetas } from "./calculator";
import {
  alimentosConIntercambio,
  equivalentesDeIntercambio,
  gramosParaIntercambios,
  intercambiarPorEquivalencia,
  resolverAsignacionIntercambios,
} from "./exchanges";
import { generarPlan } from "./plan-generator";

const base: PerfilBiometricoInput = {
  nombre: "Prueba intercambios", edad: 32, sexo: "FEMENINO", pesoKg: 70, alturaCm: 165,
  nivelActividad: "MODERADO", objetivo: "MANTENIMIENTO", formula: "MIFFLIN",
  preferenciaOrigen: "PRIORIZAR_CRIOLLOS", alergias: [], comidasAlDia: 4, dias: 1,
};

describe("motor de intercambios UdeA/GABA", () => {
  it("carga al menos 40 alimentos con peso, medida casera y trazabilidad", () => {
    const alimentos = alimentosConIntercambio();
    expect(alimentos.length).toBeGreaterThanOrEqual(40);
    expect(Object.keys(INTERCAMBIOS_POR_ALIMENTO).length).toBeGreaterThanOrEqual(40);
    for (const alimento of alimentos) {
      expect(alimento.intercambio?.gramosPorIntercambio).toBeGreaterThan(0);
      expect(alimento.intercambio?.medidaCasera.length).toBeGreaterThan(2);
      expect(alimento.intercambio?.fuente.anio).toBe(2015);
      expect(alimento.intercambio?.fuente.documento).toContain("Tablas 26-45");
    }
    expect(new Set(alimentos.map((alimento) => alimento.intercambio!.grupoId)).size).toBe(GRUPOS_INTERCAMBIO_DEF.length);
  });

  it("calcula el total diario y lo distribuye sin perder intercambios", () => {
    for (const comidasAlDia of [3, 4, 5, 6]) {
      const perfil = { ...base, comidasAlDia };
      const metas = calcularMetas(perfil);
      const asignacion = resolverAsignacionIntercambios(perfil, metas, { semilla: 42 });
      for (const grupo of GRUPOS_INTERCAMBIO_DEF) {
        const enComidas = asignacion.comidas.reduce((total, comida) => total + (comida.grupos[grupo.id] ?? 0), 0);
        expect(enComidas, `${grupo.id}/${comidasAlDia}`).toBe(asignacion.grupos[grupo.id]);
      }
      expect(Math.abs(asignacion.errorMacrosPct.calorias)).toBeLessThanOrEqual(6);
      expect(Math.abs(asignacion.errorMacrosPct.proteina)).toBeLessThanOrEqual(8);
    }
  });

  it("genera planes con gramos exactamente multiplicados por intercambio", () => {
    const plan = generarPlan(base, { semilla: 42 });
    expect(plan.validacion.valido, plan.validacion.alertas.join(", ")).toBe(true);
    expect(plan.intercambiosDiarios?.length).toBeGreaterThan(3);
    for (const comida of plan.dias[0].comidas) {
      for (const ingrediente of comida.ingredientes) {
        const alimento = alimentoPorId.get(ingrediente.alimentoId);
        if (!alimento?.intercambio) continue;
        const cantidad = ingrediente.gramos / alimento.intercambio.gramosPorIntercambio;
        expect(Number.isInteger(Math.round(cantidad * 10) / 10)).toBe(true);
        expect(gramosParaIntercambios(alimento, cantidad)).toBe(ingrediente.gramos);
      }
    }
  });

  it("devuelve equivalentes solo del mismo subgrupo y conserva la cantidad", () => {
    const alimento = alimentoPorId.get("res-lomo-magra-cruda")!;
    const equivalentes = equivalentesDeIntercambio(alimento.id, { alergias: [], preferenciaOrigen: "TODOS" }, 2);
    expect(equivalentes.length).toBeGreaterThan(1);
    for (const equivalente of equivalentes) {
      expect(equivalente.alimento.intercambio?.subgrupoId).toBe(alimento.intercambio?.subgrupoId);
      expect(equivalente.gramosSugeridos).toBe(gramosParaIntercambios(equivalente.alimento, 2));
    }
    expect(equivalentes.some((equivalente) => equivalente.alimento.alergenos.includes("LACTEOS"))).toBe(false);
  });

  it("aplica un intercambio sin llamar a IA y recalcula el plan", () => {
    const plan = generarPlan(base, { semilla: 42 });
    const comida = plan.dias[0].comidas.find((item) => item.ingredientes.some((ingrediente) => ingrediente.alimentoId === "res-lomo-magra-cruda"))
      ?? plan.dias[0].comidas[0];
    const ingrediente = comida.ingredientes.find((item) => alimentoPorId.get(item.alimentoId)?.intercambio);
    expect(ingrediente).toBeDefined();
    const equivalentes = equivalentesDeIntercambio(ingrediente!.alimentoId);
    expect(equivalentes.length).toBeGreaterThan(0);
    const nuevo = intercambiarPorEquivalencia(plan, comida.id, ingrediente!.alimentoId, equivalentes[0].alimento.id);
    const modificada = nuevo.dias[0].comidas.find((item) => item.id === comida.id)!;
    expect(modificada.ingredientes.some((item) => item.alimentoId === ingrediente!.alimentoId)).toBe(false);
    expect(modificada.nutrientes.energiaKcal).toBeGreaterThan(0);
    expect(nuevo.validacion.valido, nuevo.validacion.alertas.join(", ")).toBe(true);
    expect(alimentosColombia.some((alimento) => alimento.id === equivalentes[0].alimento.id)).toBe(true);
  });
});
