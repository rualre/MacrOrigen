export const GRUPOS = [
  "CARNES", "PESCADOS", "HUEVOS", "LACTEOS", "ACEITES_GRASAS",
  "TUBERCULOS", "CEREALES", "FRUTAS", "VERDURAS", "LEGUMINOSAS",
  "PROCESADOS", "BEBIDAS", "FRUTOS_SECOS", "AZUCARES",
] as const;

export type GrupoAlimenticio = (typeof GRUPOS)[number];
export type OrigenTipo = "CRIOLLO" | "NO_CRIOLLO";
export type UnidadBase = "g" | "ml";

export interface Nutrientes {
  energiaKcal: number;
  energiaKj: number;
  aguaG: number;
  proteinaG: number;
  carbohidratosG: number;
  fibraG: number;
  azucaresG: number;
  grasasTotalesG: number;
  grasasSaturadasG: number;
  grasasMonoinsaturadasG: number;
  grasasPoliinsaturadasG: number;
  colesterolMg: number;
  sodioMg: number;
  potasioMg: number;
  calcioMg: number;
  hierroMg: number;
  magnesioMg: number;
  fosforoMg: number;
  zincMg: number;
  vitaminaAMcg: number;
  vitaminaCMg: number;
  vitaminaB12Mcg: number;
  folatoMcg: number;
}

export interface FuenteNutricional {
  nombre: string;
  documento: string;
  url: string;
  anio: number;
}

export const GRUPOS_INTERCAMBIO = [
  "LACTEOS",
  "SUSTITUTOS",
  "CARNES_MAGRAS",
  "CEREALES",
  "VERDURAS",
  "FRUTAS",
  "GRASAS",
  "AZUCARES",
] as const;

export type GrupoIntercambioId = (typeof GRUPOS_INTERCAMBIO)[number];
export type PoblacionObjetivo = "ADULTOS" | "NINOS";
export type EstadoFuenteIntercambio = "VERIFICADO" | "HOMOLOGADO" | "DERIVADO" | "PENDIENTE";

export const SUBGRUPOS_INTERCAMBIO = [
  "lacteos-enteros",
  "lacteos-reducidos",
  "lacteos-quesos",
  "sustitutos-huevos",
  "sustitutos-leguminosas",
  "carnes-magras",
  "proteinas-texturizadas",
  "cereales",
  "raices",
  "tuberculos",
  "platanos",
  "verduras",
  "frutas",
  "grasas-poliinsaturadas",
  "grasas-monoinsaturadas",
  "grasas-saturadas",
  "azucares-simples",
  "dulces-postres",
] as const;

export type SubgrupoIntercambioId = (typeof SUBGRUPOS_INTERCAMBIO)[number];

export interface FuenteIntercambio {
  nombre: string;
  documento: string;
  url: string;
  anio: number;
  alcance: string;
}

export interface PerfilIntercambio {
  energiaKcal: number;
  proteinaG: number;
  carbohidratosG: number;
  grasasG: number;
  fibraG: number;
}

export interface GrupoIntercambioDef {
  id: GrupoIntercambioId;
  nombre: string;
  orden: number;
  descripcion: string;
  perfilOperativo: PerfilIntercambio;
}

export interface SubgrupoIntercambioDef {
  id: SubgrupoIntercambioId;
  grupoId: GrupoIntercambioId;
  nombre: string;
  orden: number;
  poblacionObjetivo: PoblacionObjetivo;
  perfil: PerfilIntercambio;
  fuente: FuenteIntercambio;
}

export interface IntercambioAlimento {
  grupoId: GrupoIntercambioId;
  subgrupoId: SubgrupoIntercambioId;
  poblacionObjetivo: PoblacionObjetivo;
  gramosPorIntercambio: number;
  medidaCasera: string;
  estado: EstadoFuenteIntercambio;
  fuente: FuenteIntercambio;
  nota?: string;
}

export interface IntercambioAsignado {
  grupoId: GrupoIntercambioId;
  grupoNombre: string;
  cantidad: number;
  gramosEquivalentes: number;
}

export interface AlimentoColombiano {
  id: string;
  nombre: string;
  nombreCientifico?: string;
  marca?: string;
  grupo: GrupoAlimenticio;
  subgrupo: string;
  origenTipo: OrigenTipo;
  detalleOrigen: string;
  descripcion: string;
  unidadBase: UnidadBase;
  porcionComun: { gramos: number; descripcion: string };
  nutrientes: Nutrientes;
  alergenos: string[];
  etiquetas: string[];
  fuente: FuenteNutricional;
  fechaActualizacion: string;
  intercambio?: IntercambioAlimento;
}

export type Sexo = "FEMENINO" | "MASCULINO";
export type NivelActividad = "SEDENTARIO" | "LIGERO" | "MODERADO" | "ALTO" | "MUY_ALTO";
export type Objetivo = "PERDIDA" | "MANTENIMIENTO" | "AUMENTO";
export type FormulaTmb = "MIFFLIN" | "HARRIS";
export type PreferenciaOrigen = "TODOS" | "PRIORIZAR_CRIOLLOS" | "INCLUIR_COMERCIALES";

export interface PerfilBiometricoInput {
  nombre: string;
  edad: number;
  sexo: Sexo;
  pesoKg: number;
  alturaCm: number;
  nivelActividad: NivelActividad;
  objetivo: Objetivo;
  formula: FormulaTmb;
  preferenciaOrigen: PreferenciaOrigen;
  alergias: string[];
  comidasAlDia: number;
  dias: number;
}

export interface MetasNutricionales {
  tmbKcal: number;
  tdeeKcal: number;
  caloriasObjetivoKcal: number;
  proteinaObjetivoG: number;
  carbohidratosObjetivoG: number;
  grasasObjetivoG: number;
  fibraObjetivoG: number;
  ajusteCaloricoPct: number;
}

export interface IngredientePlan {
  alimentoId: string;
  gramos: number;
  nutrientes: Nutrientes;
  intercambios?: number;
}

export interface ComidaPlan {
  id: string;
  tipo: string;
  nombre: string;
  ingredientes: IngredientePlan[];
  nutrientes: Nutrientes;
  preparacion: string;
  intercambios?: IntercambioAsignado[];
}

export interface DiaPlan {
  dia: number;
  comidas: ComidaPlan[];
  nutrientes: Nutrientes;
  intercambios?: IntercambioAsignado[];
}

export interface ResultadoValidacion {
  valido: boolean;
  toleranciaPct: number;
  desviaciones: {
    caloriasPct: number;
    proteinaPct: number;
    carbohidratosPct: number;
    grasasPct: number;
  };
  alertas: string[];
}

export interface PlanNutricional {
  id: string;
  creadoEn: string;
  perfil: PerfilBiometricoInput;
  metas: MetasNutricionales;
  dias: DiaPlan[];
  validacion: ResultadoValidacion;
  metodo: "DETERMINISTICO" | "IA_HIBRIDA";
  proveedorIA?: string;
  intercambiosDiarios?: IntercambioAsignado[];
}

export interface ItemListaCompras {
  alimentoId: string;
  nombre: string;
  grupo: GrupoAlimenticio;
  origenTipo: OrigenTipo;
  gramos: number;
  cantidadCompra: string;
}
