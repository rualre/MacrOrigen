import { alimentoPorId, alimentosColombia } from "@/data/alimentos";
import type {
  AlimentoColombiano,
  ComidaPlan,
  DiaPlan,
  GrupoIntercambioId,
  IngredientePlan,
  IntercambioAsignado,
  MetasNutricionales,
  PerfilBiometricoInput,
  PlanNutricional,
} from "@/lib/domain/types";
import { calcularMetas } from "./calculator";
import {
  anotarIntercambios,
  distribuirPorComida,
  elegirRepresentantes,
  equivalentesDeIntercambio,
  gramosParaIntercambios,
  intercambiarPorEquivalencia,
  resumenIntercambiosDeComida,
  resumenIntercambiosDeDia,
  resolverAsignacionIntercambios,
} from "./exchanges";
import { distribucionPara, ES_COLACION } from "./meal-distribution";
import { escalarNutrientes, sumarNutrientes } from "./nutrients";
import { validarPlan } from "./validator";

interface OpcionesPlan {
  semilla?: number;
  metodo?: "DETERMINISTICO" | "IA_HIBRIDA";
  proveedorIA?: string;
  seleccionIA?: string[][];
}

function seleccionarForzados(
  perfil: PerfilBiometricoInput,
  seleccion?: Array<string | string[]>,
) {
  const forzados: Partial<Record<GrupoIntercambioId, AlimentoColombiano>> = {};
  const lista = (seleccion ?? []).flatMap((item) => Array.isArray(item) ? item : String(item).split(","));
  for (const id of lista) {
    const alimento = alimentoPorId.get(id.trim());
    const grupo = alimento?.intercambio?.grupoId;
    if (!alimento || !grupo || forzados[grupo]) continue;
    if (perfil.alergias.some((alergia) => alimento.alergenos.includes(alergia))) continue;
    forzados[grupo] = alimento;
  }
  return forzados;
}

function preparacion(tipo: string) {
  if (tipo === "DESAYUNO") return "Preparar los ingredientes en cocciones sencillas; el café se sirve sin azúcar. Los gramos corresponden al peso y estado del catálogo.";
  if (ES_COLACION.has(tipo)) return "Porcionar y consumir según los gramos indicados. No añadir azúcar ni grasa fuera de lo registrado.";
  return "Cocinar sin agregar ingredientes no listados. El aceite registrado ya incluye toda la grasa de preparación; pesar los alimentos en el estado indicado.";
}

function construirComida(
  dia: number,
  item: { tipo: string; fraccion: number },
  indice: number,
  grupos: Record<GrupoIntercambioId, number>,
  representantes: Partial<Record<GrupoIntercambioId, AlimentoColombiano>>,
  perfil: PerfilBiometricoInput,
): ComidaPlan {
  const ingredientes: IngredientePlan[] = (Object.entries(grupos) as Array<[GrupoIntercambioId, number]>)
    .filter(([, cantidad]) => cantidad > 0)
    .flatMap(([grupo, cantidad]) => {
      const alimento = representantes[grupo];
      if (!alimento?.intercambio) return [];
      const gramos = gramosParaIntercambios(alimento, cantidad);
      return [{
        alimentoId: alimento.id,
        gramos,
        nutrientes: escalarNutrientes(alimento.nutrientes, gramos),
        intercambios: cantidad,
      }];
    });

  const cafe = alimentoPorId.get("cafe-tinto-sin-azucar");
  if (item.tipo === "DESAYUNO" && cafe && !perfil.alergias.some((alergia) => cafe.alergenos.includes(alergia))
    && !ingredientes.some((ingrediente) => ingrediente.alimentoId === cafe.id)) {
    ingredientes.push({ alimentoId: cafe.id, gramos: 150, nutrientes: escalarNutrientes(cafe.nutrientes, 150) });
  }

  const nombres = ingredientes.slice(0, 2).map(({ alimentoId }) => alimentoPorId.get(alimentoId)?.nombre.split(",")[0]);
  const comida: ComidaPlan = {
    id: `d${dia}-${item.tipo.toLowerCase()}-${indice}`,
    tipo: item.tipo,
    nombre: nombres.join(" con ") || item.tipo,
    ingredientes,
    nutrientes: sumarNutrientes(...ingredientes.map((ingrediente) => ingrediente.nutrientes)),
    preparacion: preparacion(item.tipo),
  };
  return { ...comida, intercambios: resumenIntercambiosDeComida(comida) };
}

function construirDia(
  dia: number,
  perfil: PerfilBiometricoInput,
  metas: MetasNutricionales,
  semilla: number,
  seleccionIA?: string[][],
): DiaPlan {
  const distribucion = distribucionPara(perfil.comidasAlDia);
  const forzados = seleccionarForzados(perfil, seleccionIA?.[dia - 1]);
  const representantes = elegirRepresentantes(perfil, semilla + dia * 131, "ADULTOS", forzados);
  const asignacion = resolverAsignacionIntercambios(perfil, metas, {
    semilla: semilla + dia * 131,
    representantes,
  });
  const comidas = distribucion.map((item, indice) => construirComida(
    dia,
    item,
    indice,
    asignacion.comidas[indice]?.grupos ?? asignacion.grupos,
    representantes,
    perfil,
  ));
  const diaPlan: DiaPlan = {
    dia,
    comidas,
    nutrientes: sumarNutrientes(...comidas.map((comida) => comida.nutrientes)),
  };
  return { ...diaPlan, intercambios: resumenIntercambiosDeDia(diaPlan) };
}

export function generarPlan(perfil: PerfilBiometricoInput, opciones: OpcionesPlan = {}): PlanNutricional {
  const metas = calcularMetas(perfil);
  const semilla = opciones.semilla ?? Date.now() % 100_000;
  const dias = Array.from({ length: perfil.dias }, (_, i) => construirDia(i + 1, perfil, metas, semilla, opciones.seleccionIA));
  const plan: PlanNutricional = {
    id: `plan-${Date.now()}-${semilla}`,
    creadoEn: new Date().toISOString(),
    perfil,
    metas,
    dias,
    validacion: validarPlan(dias, metas, 3),
    metodo: opciones.metodo ?? "DETERMINISTICO",
    proveedorIA: opciones.proveedorIA,
  };
  return anotarIntercambios(plan);
}

export function regenerarComida(plan: PlanNutricional, comidaId: string, semilla = Date.now() % 100_000) {
  const dia = plan.dias.find((item) => item.comidas.some((comida) => comida.id === comidaId));
  if (!dia) throw new Error("Comida no encontrada");
  const indice = dia.comidas.findIndex((comida) => comida.id === comidaId);
  const nuevoDia = construirDia(dia.dia, plan.perfil, plan.metas, semilla);
  const comidas = dia.comidas.map((comida, i) => i === indice ? { ...nuevoDia.comidas[i], id: comida.id } : comida);
  let diaActualizado: DiaPlan = {
    ...dia,
    comidas,
    nutrientes: sumarNutrientes(...comidas.map((comida) => comida.nutrientes)),
  };
  let dias = plan.dias.map((item) => item.dia === dia.dia
    ? { ...diaActualizado, intercambios: resumenIntercambiosDeDia(diaActualizado) }
    : item);
  let validacion = validarPlan(dias, plan.metas, 3);

  // Reemplazar una sola comida puede desbalancear el día. Si ocurre, se
  // regenera el día completo con la nueva semilla para conservar ±3%.
  if (!validacion.valido) {
    diaActualizado = {
      ...nuevoDia,
      comidas: nuevoDia.comidas.map((comida, i) => i === indice ? { ...comida, id: dia.comidas[indice].id } : comida),
      intercambios: nuevoDia.intercambios,
    };
    dias = plan.dias.map((item) => item.dia === dia.dia ? diaActualizado : item);
    validacion = validarPlan(dias, plan.metas, 3);
  }

  const actualizado = { ...plan, id: `${plan.id}-r${semilla}`, dias, validacion, metodo: "DETERMINISTICO" as const, proveedorIA: undefined };
  return anotarIntercambios(actualizado);
}

export function equivalentesDe(id: string, perfil?: PerfilBiometricoInput) {
  const actual = alimentoPorId.get(id);
  if (!actual) return [];
  if (actual.intercambio) {
    return equivalentesDeIntercambio(id, perfil).map((equivalente) => equivalente.alimento);
  }
  return alimentosColombia.filter((item) => item.id !== id && item.grupo === actual.grupo)
    .filter((item) => !perfil?.alergias.some((alergia) => item.alergenos.includes(alergia)))
    .map((item) => ({
      item,
      distancia: Math.abs(item.nutrientes.energiaKcal - actual.nutrientes.energiaKcal) / Math.max(actual.nutrientes.energiaKcal, 50)
        + Math.abs(item.nutrientes.proteinaG - actual.nutrientes.proteinaG) / 20,
    }))
    .sort((a, b) => a.distancia - b.distancia).slice(0, 8).map(({ item }) => item);
}

export function intercambiarIngrediente(plan: PlanNutricional, comidaId: string, alimentoId: string, reemplazoId?: string) {
  const comida = plan.dias.flatMap((dia) => dia.comidas).find((item) => item.id === comidaId);
  if (!comida) throw new Error("Comida no encontrada");
  if (reemplazoId) {
    const reemplazo = alimentoPorId.get(reemplazoId);
    if (!reemplazo) throw new Error("No hay equivalentes disponibles que respeten las alergias");
    return intercambiarPorEquivalencia(plan, comidaId, alimentoId, reemplazo.id);
  }

  const candidatos = equivalentesDeIntercambio(alimentoId, plan.perfil)
    .map((item) => item.alimento)
    .filter((item) => !comida.ingredientes.some((ingrediente) => ingrediente.alimentoId === item.id));
  if (!candidatos.length) throw new Error("No hay equivalentes disponibles que respeten las alergias");

  for (const candidato of candidatos) {
    const resultado = intercambiarPorEquivalencia(plan, comidaId, alimentoId, candidato.id);
    if (resultado.validacion.valido) return resultado;
  }
  return intercambiarPorEquivalencia(plan, comidaId, alimentoId, candidatos[0].id);
}

export function asignacionIntercambiosDelDia(plan: PlanNutricional, dia = 1): IntercambioAsignado[] {
  const diaPlan = plan.dias.find((item) => item.dia === dia);
  return diaPlan?.intercambios ?? [];
}
