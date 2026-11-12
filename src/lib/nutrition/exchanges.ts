import { alimentoPorId, alimentosColombia } from "@/data/alimentos";
import {
  FUENTE_GABA_UDEA,
  GRUPOS_INTERCAMBIO_DEF,
  LIMITES_INTERCAMBIO,
  SUBGRUPOS_INTERCAMBIO_DEF,
} from "@/data/intercambios";
import {
  GRUPOS_INTERCAMBIO,
  type AlimentoColombiano,
  type ComidaPlan,
  type DiaPlan,
  type GrupoIntercambioId,
  type IntercambioAsignado,
  type MetasNutricionales,
  type Nutrientes,
  type PerfilBiometricoInput,
  type PerfilIntercambio,
  type PlanNutricional,
  type PoblacionObjetivo,
  type SubgrupoIntercambioId,
} from "@/lib/domain/types";
import { distribucionPara, type DistribucionComida } from "./meal-distribution";
import { NUTRIENTES_VACIOS, escalarNutrientes, sumarNutrientes } from "./nutrients";
import { validarPlan } from "./validator";

export const GRUPOS_ORDEN = GRUPOS_INTERCAMBIO;
export const GRUPOS_NOMBRE: Record<GrupoIntercambioId, string> = Object.fromEntries(
  GRUPOS_INTERCAMBIO_DEF.map((grupo) => [grupo.id, grupo.nombre]),
) as Record<GrupoIntercambioId, string>;

export const SUBGRUPOS_DEF = SUBGRUPOS_INTERCAMBIO_DEF;

const AFINIDAD_COMIDA: Record<GrupoIntercambioId, Record<string, number>> = {
  LACTEOS: { DESAYUNO: 4, MEDIA_MANANA: 1, MERIENDA: 3, MEDIA_TARDE: 1, CENA: 1 },
  SUSTITUTOS: { DESAYUNO: 3, ALMUERZO: 1, CENA: 2 },
  CARNES_MAGRAS: { ALMUERZO: 3, CENA: 2 },
  CEREALES: { DESAYUNO: 2, MEDIA_MANANA: 0.4, ALMUERZO: 3, MERIENDA: 1, MEDIA_TARDE: 0.6, CENA: 2 },
  VERDURAS: { ALMUERZO: 3, CENA: 2 },
  FRUTAS: { DESAYUNO: 2, MEDIA_MANANA: 2, MERIENDA: 2, MEDIA_TARDE: 1.5, CENA: 0.5 },
  GRASAS: { DESAYUNO: 1, ALMUERZO: 3, CENA: 2 },
  AZUCARES: { DESAYUNO: 1, MEDIA_MANANA: 0.5, MERIENDA: 1 },
};

const PESO_OBJETIVO = { energia: 1.6, proteina: 1.15, carbohidratos: 1, grasas: 1.1 } as const;

export interface ConteosIntercambio {
  grupos: Record<GrupoIntercambioId, number>;
  perfilAplicado: Record<GrupoIntercambioId, PerfilIntercambio>;
}

export interface ComidaAsignada {
  tipo: string;
  fraccion: number;
  grupos: Record<GrupoIntercambioId, number>;
}

export interface AsignacionIntercambios extends ConteosIntercambio {
  comidas: ComidaAsignada[];
  errorMacrosPct: {
    calorias: number;
    proteina: number;
    carbohidratos: number;
    grasas: number;
  };
  fuente: typeof FUENTE_GABA_UDEA;
}

interface OpcionesAsignacion {
  semilla?: number;
  poblacion?: PoblacionObjetivo;
  representantes?: Partial<Record<GrupoIntercambioId, AlimentoColombiano>>;
}

function vacioGrupos(): Record<GrupoIntercambioId, number> {
  return Object.fromEntries(GRUPOS_ORDEN.map((grupo) => [grupo, 0])) as Record<GrupoIntercambioId, number>;
}

function redondear(value: number) {
  return Math.round(value * 10) / 10;
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function alimentosConIntercambio(poblacion: PoblacionObjetivo = "ADULTOS") {
  return alimentosColombia.filter((alimento) => alimento.intercambio?.poblacionObjetivo === poblacion);
}

export function alimentosDeGrupo(grupoId: GrupoIntercambioId, poblacion: PoblacionObjetivo = "ADULTOS") {
  return alimentosConIntercambio(poblacion).filter((alimento) => alimento.intercambio?.grupoId === grupoId);
}

export function alimentosDeSubgrupo(subgrupoId: SubgrupoIntercambioId, poblacion: PoblacionObjetivo = "ADULTOS") {
  return alimentosConIntercambio(poblacion).filter((alimento) => alimento.intercambio?.subgrupoId === subgrupoId);
}

export function macroPorIntercambio(alimento: AlimentoColombiano): PerfilIntercambio {
  if (!alimento.intercambio) {
    return { energiaKcal: 0, proteinaG: 0, carbohidratosG: 0, grasasG: 0, fibraG: 0 };
  }
  const por100 = alimento.nutrientes;
  const factor = alimento.intercambio.gramosPorIntercambio / 100;
  return {
    energiaKcal: por100.energiaKcal * factor,
    proteinaG: por100.proteinaG * factor,
    carbohidratosG: por100.carbohidratosG * factor,
    grasasG: por100.grasasTotalesG * factor,
    fibraG: por100.fibraG * factor,
  };
}

function apto(alimento: AlimentoColombiano, perfil: PerfilBiometricoInput) {
  return !perfil.alergias.some((alergia) => alimento.alergenos.includes(alergia));
}

function elegirDeLista(lista: AlimentoColombiano[], perfil: PerfilBiometricoInput, semilla: number, excluidos: Set<string>) {
  const disponibles = lista.filter((alimento) => !excluidos.has(alimento.id) && apto(alimento, perfil));
  if (!disponibles.length) return undefined;
  const criollos = disponibles.filter((alimento) => alimento.origenTipo === "CRIOLLO");
  const pool = perfil.preferenciaOrigen === "PRIORIZAR_CRIOLLOS" && criollos.length ? criollos : disponibles;
  return pool[Math.abs(semilla) % pool.length];
}

export function elegirRepresentantes(
  perfil: PerfilBiometricoInput,
  semilla: number,
  poblacion: PoblacionObjetivo = "ADULTOS",
  forzados: Partial<Record<GrupoIntercambioId, AlimentoColombiano>> = {},
) {
  const elegidos: Partial<Record<GrupoIntercambioId, AlimentoColombiano>> = {};
  const excluidos = new Set<string>();
  for (const [index, grupoId] of GRUPOS_ORDEN.entries()) {
    const forzado = forzados[grupoId];
    if (forzado?.intercambio?.grupoId === grupoId && apto(forzado, perfil)) {
      elegidos[grupoId] = forzado;
      excluidos.add(forzado.id);
      continue;
    }
    const candidato = elegirDeLista(alimentosDeGrupo(grupoId, poblacion), perfil, semilla + index * 97, excluidos);
    if (candidato) {
      elegidos[grupoId] = candidato;
      excluidos.add(candidato.id);
    }
  }
  return elegidos;
}

function matrizDesdeRepresentantes(
  representantes: Partial<Record<GrupoIntercambioId, AlimentoColombiano>>,
  poblacion: PoblacionObjetivo,
) {
  return Object.fromEntries(GRUPOS_ORDEN.map((grupo) => {
    const alimento = representantes[grupo];
    const perfilGrupo = GRUPOS_INTERCAMBIO_DEF.find((item) => item.id === grupo)?.perfilOperativo ?? {
      energiaKcal: 50, proteinaG: 2, carbohidratosG: 8, grasasG: 1, fibraG: 1,
    };
    return [grupo, alimento?.intercambio ? macroPorIntercambio(alimento) : perfilGrupo];
  })) as Record<GrupoIntercambioId, PerfilIntercambio>;
}

function calcularTotales(conteos: Record<GrupoIntercambioId, number>, matriz: Record<GrupoIntercambioId, PerfilIntercambio>) {
  return GRUPOS_ORDEN.reduce((total, grupo) => {
    const cantidad = conteos[grupo];
    const perfil = matriz[grupo];
    return {
      energiaKcal: total.energiaKcal + perfil.energiaKcal * cantidad,
      proteinaG: total.proteinaG + perfil.proteinaG * cantidad,
      carbohidratosG: total.carbohidratosG + perfil.carbohidratosG * cantidad,
      grasasG: total.grasasG + perfil.grasasG * cantidad,
      fibraG: total.fibraG + perfil.fibraG * cantidad,
    };
  }, { energiaKcal: 0, proteinaG: 0, carbohidratosG: 0, grasasG: 0, fibraG: 0 });
}

function errorObjetivo(
  conteos: Record<GrupoIntercambioId, number>,
  matriz: Record<GrupoIntercambioId, PerfilIntercambio>,
  metas: MetasNutricionales,
) {
  const total = calcularTotales(conteos, matriz);
  const norma = (actual: number, objetivo: number) => objetivo <= 0 ? 0 : (actual - objetivo) / objetivo;
  const e = norma(total.energiaKcal, metas.caloriasObjetivoKcal);
  const p = norma(total.proteinaG, metas.proteinaObjetivoG);
  const c = norma(total.carbohidratosG, metas.carbohidratosObjetivoG);
  const g = norma(total.grasasG, metas.grasasObjetivoG);
  return (
    PESO_OBJETIVO.energia * e * e +
    PESO_OBJETIVO.proteina * p * p +
    PESO_OBJETIVO.carbohidratos * c * c +
    PESO_OBJETIVO.grasas * g * g
  );
}

function clonar(conteos: Record<GrupoIntercambioId, number>) {
  return { ...conteos };
}

function conteosMinimos(): Record<GrupoIntercambioId, number> {
  return Object.fromEntries(GRUPOS_ORDEN.map((grupo) => [grupo, LIMITES_INTERCAMBIO[grupo].min])) as Record<GrupoIntercambioId, number>;
}

function mejoraLocal(
  inicial: Record<GrupoIntercambioId, number>,
  matriz: Record<GrupoIntercambioId, PerfilIntercambio>,
  metas: MetasNutricionales,
  limites: Record<GrupoIntercambioId, { min: number; max: number }>,
) {
  const actual = clonar(inicial);
  let error = errorObjetivo(actual, matriz, metas);
  for (let iteracion = 0; iteracion < 260; iteracion += 1) {
    let mejorGrupo: GrupoIntercambioId | undefined;
    let mejorDelta = 0;
    let mejorError = error;
    for (const grupo of GRUPOS_ORDEN) {
      const { min, max } = limites[grupo];
      for (const delta of [-1, 1]) {
        const siguiente = actual[grupo] + delta;
        if (siguiente < min || siguiente > max) continue;
        actual[grupo] = siguiente;
        const candidato = errorObjetivo(actual, matriz, metas);
        actual[grupo] -= delta;
        if (candidato < mejorError - 1e-9) {
          mejorError = candidato;
          mejorGrupo = grupo;
          mejorDelta = delta;
        }
      }
    }
    if (mejorGrupo && mejorDelta !== 0) {
      actual[mejorGrupo] += mejorDelta;
      error = mejorError;
      continue;
    }
    let parA: GrupoIntercambioId | undefined;
    let parB: GrupoIntercambioId | undefined;
    for (const a of GRUPOS_ORDEN) {
      if (actual[a] + 1 > limites[a].max) continue;
      for (const b of GRUPOS_ORDEN) {
        if (a === b || actual[b] - 1 < limites[b].min) continue;
        actual[a] += 1;
        actual[b] -= 1;
        const candidato = errorObjetivo(actual, matriz, metas);
        actual[a] -= 1;
        actual[b] += 1;
        if (candidato < mejorError - 1e-9) {
          mejorError = candidato;
          parA = a;
          parB = b;
        }
      }
    }
    if (!parA || !parB) break;
    actual[parA] += 1;
    actual[parB] -= 1;
    error = mejorError;
  }
  return { conteos: actual, error };
}

function optimizarConteos(
  matriz: Record<GrupoIntercambioId, PerfilIntercambio>,
  metas: MetasNutricionales,
  semilla: number,
  disponibles: Set<GrupoIntercambioId>,
) {
  const rng = mulberry32(semilla);
  const limites = Object.fromEntries(GRUPOS_ORDEN.map((grupo) => [
    grupo,
    disponibles.has(grupo) ? LIMITES_INTERCAMBIO[grupo] : { min: 0, max: 0 },
  ])) as Record<GrupoIntercambioId, { min: number; max: number }>;
  const minimos = Object.fromEntries(GRUPOS_ORDEN.map((grupo) => [grupo, limites[grupo].min])) as Record<GrupoIntercambioId, number>;
  let mejor = { conteos: minimos, error: errorObjetivo(minimos, matriz, metas) };

  const arranques: Array<Record<GrupoIntercambioId, number>> = [];
  arranques.push(clonar(minimos));
  const escalaCalorica = Math.max(0.7, Math.min(2.2, metas.caloriasObjetivoKcal / 1900));
  for (let i = 0; i < 18; i += 1) {
    const conteos = vacioGrupos();
    for (const grupo of GRUPOS_ORDEN) {
      const { min, max } = limites[grupo];
      const base = min + (max - min) * Math.min(1, rng() * escalaCalorica);
      conteos[grupo] = Math.max(min, Math.min(max, Math.round(base)));
    }
    arranques.push(conteos);
  }

  for (const arranque of arranques) {
    const resultado = mejoraLocal(arranque, matriz, metas, limites);
    if (resultado.error < mejor.error) mejor = resultado;
  }

  const total = calcularTotales(mejor.conteos, matriz);
  const desvio = (actual: number, objetivo: number) => objetivo <= 0 ? 0 : ((actual - objetivo) / objetivo) * 100;
  return {
    ...mejor,
    total,
    errorMacrosPct: {
      calorias: redondear(desvio(total.energiaKcal, metas.caloriasObjetivoKcal)),
      proteina: redondear(desvio(total.proteinaG, metas.proteinaObjetivoG)),
      carbohidratos: redondear(desvio(total.carbohidratosG, metas.carbohidratosObjetivoG)),
      grasas: redondear(desvio(total.grasasG, metas.grasasObjetivoG)),
    },
  };
}

function repartirEntero(cantidad: number, pesos: number[]) {
  if (cantidad <= 0) return pesos.map(() => 0);
  const suma = pesos.reduce((acc, peso) => acc + Math.max(0, peso), 0);
  if (suma <= 0) {
    const resultado = pesos.map(() => 0);
    resultado[0] = cantidad;
    return resultado;
  }
  const brutos = pesos.map((peso) => (Math.max(0, peso) / suma) * cantidad);
  const resultado = brutos.map(Math.floor);
  let restante = cantidad - resultado.reduce((acc, valor) => acc + valor, 0);
  const orden = brutos
    .map((valor, indice) => ({ indice, resto: valor - Math.floor(valor) }))
    .sort((a, b) => b.resto - a.resto || a.indice - b.indice);
  for (const { indice } of orden) {
    if (restante <= 0) break;
    resultado[indice] += 1;
    restante -= 1;
  }
  return resultado;
}

export function distribuirPorComida(
  grupos: Record<GrupoIntercambioId, number>,
  comidasAlDia: number,
  distribucion: DistribucionComida[] = distribucionPara(comidasAlDia),
): ComidaAsignada[] {
  const comidas = distribucion.map((item) => ({ tipo: item.tipo, fraccion: item.fraccion, grupos: vacioGrupos() }));
  for (const grupo of GRUPOS_ORDEN) {
    const cantidad = grupos[grupo];
    if (cantidad <= 0) continue;
    const pesos = distribucion.map((comida) => AFINIDAD_COMIDA[grupo][comida.tipo] ?? 0);
    const reparto = repartirEntero(cantidad, pesos);
    reparto.forEach((valor, indice) => { comidas[indice].grupos[grupo] = valor; });
  }
  return comidas;
}

export function resolverAsignacionIntercambios(
  perfil: PerfilBiometricoInput,
  metas: MetasNutricionales,
  opciones: OpcionesAsignacion = {},
): AsignacionIntercambios {
  const semilla = opciones.semilla ?? 7919;
  const poblacion = opciones.poblacion ?? "ADULTOS";
  const representantes = elegirRepresentantes(perfil, semilla, poblacion, opciones.representantes);
  const matriz = matrizDesdeRepresentantes(representantes, poblacion);
  const disponibles = new Set(GRUPOS_ORDEN.filter((grupo) => Boolean(representantes[grupo])));
  const optimizado = optimizarConteos(matriz, metas, semilla, disponibles);
  return {
    grupos: optimizado.conteos,
    perfilAplicado: matriz,
    comidas: distribuirPorComida(optimizado.conteos, perfil.comidasAlDia),
    errorMacrosPct: optimizado.errorMacrosPct,
    fuente: FUENTE_GABA_UDEA,
  };
}

export function gramosParaIntercambios(alimento: AlimentoColombiano, cantidad: number) {
  if (!alimento.intercambio) return 0;
  return Math.max(1, Math.round(cantidad * alimento.intercambio.gramosPorIntercambio));
}

export function intercambiosParaGramos(alimento: AlimentoColombiano, gramos: number) {
  if (!alimento.intercambio || alimento.intercambio.gramosPorIntercambio <= 0) return undefined;
  return redondear(gramos / alimento.intercambio.gramosPorIntercambio);
}

export function nutrientesDeIntercambios(alimento: AlimentoColombiano, cantidad: number): Nutrientes {
  return escalarNutrientes(alimento.nutrientes, gramosParaIntercambios(alimento, cantidad));
}

export interface EquivalenteIntercambio {
  alimento: AlimentoColombiano;
  cantidadIntercambios: number;
  gramosSugeridos: number;
  medidaCasera: string;
}

export function equivalentesDeIntercambio(
  alimentoId: string,
  perfil?: Pick<PerfilBiometricoInput, "alergias" | "preferenciaOrigen">,
  cantidadIntercambios = 1,
  poblacion: PoblacionObjetivo = "ADULTOS",
): EquivalenteIntercambio[] {
  const actual = alimentoPorId.get(alimentoId);
  if (!actual?.intercambio) return [];
  const { subgrupoId } = actual.intercambio;
  const perfilActual = macroPorIntercambio(actual);
  return alimentosDeSubgrupo(subgrupoId, poblacion)
    .filter((alimento) => alimento.id !== alimentoId)
    .filter((alimento) => !perfil?.alergias.some((alergia) => alimento.alergenos.includes(alergia)))
    .filter((alimento) => alimento.intercambio?.estado !== "PENDIENTE")
    .map((alimento) => ({
      alimento,
      cantidadIntercambios,
      gramosSugeridos: gramosParaIntercambios(alimento, cantidadIntercambios),
      medidaCasera: alimento.intercambio?.medidaCasera ?? "",
    }))
    .sort((a, b) => {
      if (perfil?.preferenciaOrigen === "PRIORIZAR_CRIOLLOS") {
        const origen = Number(b.alimento.origenTipo === "CRIOLLO") - Number(a.alimento.origenTipo === "CRIOLLO");
        if (origen) return origen;
      }
      const distancia = (item: EquivalenteIntercambio) => {
        const perfilItem = macroPorIntercambio(item.alimento);
        return Math.abs(perfilItem.energiaKcal - perfilActual.energiaKcal) / Math.max(perfilActual.energiaKcal, 1)
          + Math.abs(perfilItem.proteinaG - perfilActual.proteinaG) / Math.max(perfilActual.proteinaG, 1)
          + Math.abs(perfilItem.carbohidratosG - perfilActual.carbohidratosG) / Math.max(perfilActual.carbohidratosG, 1)
          + Math.abs(perfilItem.grasasG - perfilActual.grasasG) / Math.max(perfilActual.grasasG, 1);
      };
      return distancia(a) - distancia(b) || a.alimento.nombre.localeCompare(b.alimento.nombre, "es");
    });
}

export function resumenIntercambiosDeComida(comida: ComidaPlan): IntercambioAsignado[] {
  const cantidades = vacioGrupos();
  const gramos = vacioGrupos();
  for (const ingrediente of comida.ingredientes) {
    const alimento = alimentoPorId.get(ingrediente.alimentoId);
    const intercambio = alimento?.intercambio;
    if (!intercambio) continue;
    const cantidad = ingrediente.intercambios ?? intercambiosParaGramos(alimento, ingrediente.gramos) ?? 0;
    cantidades[intercambio.grupoId] += cantidad;
    gramos[intercambio.grupoId] += ingrediente.gramos;
  }
  return GRUPOS_ORDEN
    .filter((grupo) => cantidades[grupo] > 0)
    .map((grupo) => ({
      grupoId: grupo,
      grupoNombre: GRUPOS_NOMBRE[grupo],
      cantidad: redondear(cantidades[grupo]),
      gramosEquivalentes: Math.round(gramos[grupo]),
    }));
}

export function resumenIntercambiosDeDia(dia: DiaPlan): IntercambioAsignado[] {
  const totales = vacioGrupos();
  for (const comida of dia.comidas) {
    for (const item of resumenIntercambiosDeComida(comida)) totales[item.grupoId] += item.cantidad;
  }
  return GRUPOS_ORDEN
    .filter((grupo) => totales[grupo] > 0)
    .map((grupo) => {
      const gramos = dia.comidas.flatMap((comida) => comida.ingredientes).reduce((acc, ingrediente) => {
        const alimento = alimentoPorId.get(ingrediente.alimentoId);
        return alimento?.intercambio?.grupoId === grupo ? acc + ingrediente.gramos : acc;
      }, 0);
      return {
        grupoId: grupo,
        grupoNombre: GRUPOS_NOMBRE[grupo],
        cantidad: redondear(totales[grupo]),
        gramosEquivalentes: Math.round(gramos),
      };
    });
}

export function anotarIntercambios(plan: PlanNutricional): PlanNutricional {
  const dias = plan.dias.map((dia) => {
    const comidas = dia.comidas.map((comida) => ({
      ...comida,
      ingredientes: comida.ingredientes.map((ingrediente) => {
        const alimento = alimentoPorId.get(ingrediente.alimentoId);
        return {
          ...ingrediente,
          intercambios: alimento ? intercambiosParaGramos(alimento, ingrediente.gramos) : undefined,
        };
      }),
      intercambios: resumenIntercambiosDeComida(comida),
    }));
    const anotado = { ...dia, comidas };
    return { ...anotado, intercambios: resumenIntercambiosDeDia(anotado) };
  });
  return { ...plan, dias, intercambiosDiarios: dias[0]?.intercambios };
}

function errorNutrientes(nutrientes: Nutrientes, metas: MetasNutricionales) {
  const norma = (actual: number, objetivo: number) => objetivo <= 0 ? 0 : Math.abs((actual - objetivo) / objetivo);
  const desvios = [
    norma(nutrientes.energiaKcal, metas.caloriasObjetivoKcal),
    norma(nutrientes.proteinaG, metas.proteinaObjetivoG),
    norma(nutrientes.carbohidratosG, metas.carbohidratosObjetivoG),
    norma(nutrientes.grasasTotalesG, metas.grasasObjetivoG),
  ];
  // El validador rechaza si CUALQUIER macro supera 3%. Minimizar el máximo
  // evita aceptar un intercambio con una grasa al 3.3% y energía perfecta.
  return Math.max(...desvios) + 0.05 * desvios.reduce((total, desvio) => total + desvio * desvio, 0);
}

/**
 * Tras un intercambio puntual, ajusta otros ingredientes en pasos enteros de
 * intercambio para recuperar la tolerancia diaria. No inventa gramajes: cada
 * ajuste sigue siendo cantidad × gramosPorIntercambio.
 */
function reequilibrarDia(dia: DiaPlan, metas: MetasNutricionales, alimentoFijoId: string): DiaPlan {
  let comidas = dia.comidas.map((comida) => ({
    ...comida,
    ingredientes: comida.ingredientes.map((ingrediente) => ({ ...ingrediente })),
  }));

  const evaluar = (candidatas: ComidaPlan[]) => {
    const comidasConNutrientes = candidatas.map((comida) => ({
      ...comida,
      nutrientes: sumarNutrientes(...comida.ingredientes.map((ingrediente) => ingrediente.nutrientes)),
    }));
    const nutrientes = sumarNutrientes(...comidasConNutrientes.map((comida) => comida.nutrientes));
    return { comidas: comidasConNutrientes, nutrientes, error: errorNutrientes(nutrientes, metas) };
  };

  let estado = evaluar(comidas);
  for (let iteracion = 0; iteracion < 60; iteracion += 1) {
    let mejor: { comida: number; ingrediente: number; cantidad: number; error: number; comidas: ComidaPlan[] } | null = null;
    for (let indiceComida = 0; indiceComida < comidas.length; indiceComida += 1) {
      const comida = comidas[indiceComida];
      for (let indiceIngrediente = 0; indiceIngrediente < comida.ingredientes.length; indiceIngrediente += 1) {
        const ingrediente = comida.ingredientes[indiceIngrediente];
        if (ingrediente.alimentoId === alimentoFijoId) continue;
        const alimento = alimentoPorId.get(ingrediente.alimentoId);
        if (!alimento?.intercambio) continue;
        const actual = ingrediente.intercambios ?? intercambiosParaGramos(alimento, ingrediente.gramos) ?? 0;
        if (actual <= 0) continue;
        for (const delta of [-3, -2, -1, 1, 2, 3]) {
          const siguiente = actual + delta;
          if (siguiente < 0 || siguiente > 20) continue;
          const gramos = siguiente === 0 ? 0 : gramosParaIntercambios(alimento, siguiente);
          const candidatas = comidas.map((item, i) => i !== indiceComida ? item : {
            ...item,
            ingredientes: siguiente === 0
              ? item.ingredientes.filter((_, j) => j !== indiceIngrediente)
              : item.ingredientes.map((ing, j) => j !== indiceIngrediente ? ing : {
                ...ing,
                gramos,
                nutrientes: escalarNutrientes(alimento.nutrientes, gramos),
                intercambios: siguiente,
              }),
          });
          const evaluado = evaluar(candidatas);
          if (evaluado.error < estado.error - 1e-9 && (!mejor || evaluado.error < mejor.error)) {
            mejor = { comida: indiceComida, ingrediente: indiceIngrediente, cantidad: siguiente, error: evaluado.error, comidas: evaluado.comidas };
          }
        }
      }
    }
    if (!mejor) break;
    comidas = mejor.comidas;
    estado = evaluar(comidas);
  }

  const resultado: DiaPlan = { ...dia, comidas: estado.comidas, nutrientes: estado.nutrientes };
  return { ...resultado, intercambios: resumenIntercambiosDeDia(resultado) };
}

export function intercambiarPorEquivalencia(
  plan: PlanNutricional,
  comidaId: string,
  alimentoId: string,
  reemplazoId: string,
) {
  const dia = plan.dias.find((item) => item.comidas.some((comida) => comida.id === comidaId));
  const comida = dia?.comidas.find((item) => item.id === comidaId);
  if (!dia || !comida) throw new Error("Comida no encontrada");
  const actual = alimentoPorId.get(alimentoId);
  const reemplazo = alimentoPorId.get(reemplazoId);
  if (!actual?.intercambio || !reemplazo?.intercambio) throw new Error("El alimento no tiene intercambio verificado");
  if (actual.intercambio.subgrupoId !== reemplazo.intercambio.subgrupoId) throw new Error("El reemplazo debe pertenecer al mismo subgrupo de intercambio");
  if (plan.perfil.alergias.some((alergia) => reemplazo.alergenos.includes(alergia))) throw new Error("El reemplazo contiene un alérgeno del perfil");
  if (comida.ingredientes.some((ingrediente) => ingrediente.alimentoId === reemplazoId)) throw new Error("El reemplazo ya está en esta comida");

  const ingredienteActual = comida.ingredientes.find((ingrediente) => ingrediente.alimentoId === alimentoId);
  if (!ingredienteActual) throw new Error("Ingrediente no encontrado en la comida");
  const cantidad = ingredienteActual.intercambios ?? intercambiosParaGramos(actual, ingredienteActual.gramos) ?? 1;
  const gramos = gramosParaIntercambios(reemplazo, cantidad);
  const ingredientes = comida.ingredientes.map((ingrediente) => ingrediente.alimentoId === alimentoId
    ? { alimentoId: reemplazoId, gramos, nutrientes: escalarNutrientes(reemplazo.nutrientes, gramos), intercambios: cantidad }
    : ingrediente);
  const comidaNueva: ComidaPlan = {
    ...comida,
    ingredientes,
    nutrientes: sumarNutrientes(...ingredientes.map((ingrediente) => ingrediente.nutrientes)),
  };
  const comidas = dia.comidas.map((item) => item.id === comidaId ? comidaNueva : item);
  const diaConSwap: DiaPlan = { ...dia, comidas, nutrientes: sumarNutrientes(...comidas.map((item) => item.nutrientes)) };
  const diaNuevo = reequilibrarDia(diaConSwap, plan.metas, reemplazoId);
  const dias = plan.dias.map((item) => item.dia === dia.dia ? diaNuevo : item);
  return anotarIntercambios({ ...plan, dias, validacion: validarPlan(dias, plan.metas, 3) });
}

export function perfilIntercambioVacio(): Nutrientes {
  return { ...NUTRIENTES_VACIOS };
}
