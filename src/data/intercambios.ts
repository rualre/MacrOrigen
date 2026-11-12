import type {
  FuenteIntercambio,
  GrupoIntercambioDef,
  GrupoIntercambioId,
  IntercambioAlimento,
  PerfilIntercambio,
  SubgrupoIntercambioDef,
  SubgrupoIntercambioId,
} from "@/lib/domain/types";

/**
 * Pesos y medidas caseras oficiales tomados de las tablas 26 a 45 de las GABA
 * 2015 del ICBF/FAO. Esa lista nacional adoptó por consenso la lista de
 * intercambios de la Universidad de Antioquia (GIANH).
 *
 * La 5.ª edición UdeA 2023 no está disponible en acceso abierto. Por eso este
 * archivo NO presenta valores como si fueran de 2023: cada registro declara si
 * es verificado en tabla, homologado por grupo o derivado por preparación.
 */
export const FUENTE_GABA_UDEA: FuenteIntercambio = {
  nombre: "ICBF/FAO — GABA 2015, listas de intercambio basadas en la UdeA",
  documento:
    "Guías Alimentarias Basadas en Alimentos para la población colombiana mayor de 2 años. Tablas 26-45 (peso y medida casera) y 46 (aporte promedio).",
  url: "https://www.icbf.gov.co/sites/default/files/guias_alimentarias_para_poblacion_colombiana_mayor_de_2_anos_.pdf",
  anio: 2015,
  alcance:
    "Lista nacional consensuada por universidades colombianas con base en la lista de intercambios de la Universidad de Antioquia. No es la edición UdeA 2023.",
};

export const FUENTE_UDEA_2023: FuenteIntercambio = {
  nombre: "UdeA — Lista de intercambio de alimentos, 5.ª edición 2023",
  documento:
    "Archivo local disponible: docs/Lista de intercambios - U de Antioquia 2.pdf (escaneado, 27 páginas). Pendiente de extracción estructurada y validación cruzada con el catálogo actual.",
  url: "https://www.udea.edu.co/",
  anio: 2023,
  alcance:
    "Ya no se considera inaccesible: se dispone del PDF autorizado. Su integración completa requiere OCR/tablas estructuradas y una migración controlada para no romper los perfiles GABA ni la validación ±3%.",
};

const sinDatoUdeA2023 =
  "La tabla UdeA 2023 ya está disponible localmente; su extracción estructurada y validación cruzada están pendientes, por lo que no se inventaron equivalencias ni nutrientes.";

export const GRUPOS_INTERCAMBIO_DEF: GrupoIntercambioDef[] = [
  {
    id: "LACTEOS",
    nombre: "Lácteos",
    orden: 1,
    descripcion: "Leche, yogur y quesos. Aportan proteína, calcio y grasa según el producto.",
    perfilOperativo: { energiaKcal: 129, proteinaG: 7, carbohidratosG: 9.5, grasasG: 7.2, fibraG: 0 },
  },
  {
    id: "SUSTITUTOS",
    nombre: "Sustitutos (huevos, quesos y leguminosas)",
    orden: 2,
    descripcion: "Parte 1: huevos y quesos. Parte 2: leguminosas y mezclas vegetales.",
    perfilOperativo: { energiaKcal: 82, proteinaG: 5.4, carbohidratosG: 8, grasasG: 3, fibraG: 4 },
  },
  {
    id: "CARNES_MAGRAS",
    nombre: "Carnes magras y pescados",
    orden: 3,
    descripcion: "Res, cerdo, pollo, pescados, vísceras y proteínas de origen animal.",
    perfilOperativo: { energiaKcal: 79, proteinaG: 9.9, carbohidratosG: 2, grasasG: 4.1, fibraG: 0 },
  },
  {
    id: "CEREALES",
    nombre: "Cereales, raíces, tubérculos y plátanos",
    orden: 4,
    descripcion: "Fuente principal de carbohidratos complejos y energía.",
    perfilOperativo: { energiaKcal: 90, proteinaG: 2.1, carbohidratosG: 18.5, grasasG: 0.9, fibraG: 2.2 },
  },
  {
    id: "VERDURAS",
    nombre: "Verduras y hortalizas",
    orden: 5,
    descripcion: "Bajo aporte calórico, fibra, vitaminas y minerales.",
    perfilOperativo: { energiaKcal: 24, proteinaG: 1.3, carbohidratosG: 5.3, grasasG: 0.3, fibraG: 1.8 },
  },
  {
    id: "FRUTAS",
    nombre: "Frutas",
    orden: 6,
    descripcion: "Carbohidratos, fibra, vitaminas y antioxidantes.",
    perfilOperativo: { energiaKcal: 55, proteinaG: 1, carbohidratosG: 13.9, grasasG: 0.3, fibraG: 2.2 },
  },
  {
    id: "GRASAS",
    nombre: "Grasas y aceites",
    orden: 7,
    descripcion: "Aceites, mantequilla, manteca, aguacate y frutos secos.",
    perfilOperativo: { energiaKcal: 45, proteinaG: 0.2, carbohidratosG: 0.7, grasasG: 4.9, fibraG: 0.2 },
  },
  {
    id: "AZUCARES",
    nombre: "Azúcares y dulces",
    orden: 8,
    descripcion: "Azúcares simples, panela, dulces y postres.",
    perfilOperativo: { energiaKcal: 83, proteinaG: 0.4, carbohidratosG: 21, grasasG: 0.4, fibraG: 0.2 },
  },
];

type PerfilSubgrupo = { perfil: PerfilIntercambio; nombre: string; grupoId: GrupoIntercambioId; orden: number };

const SUBGRUPOS: Record<SubgrupoIntercambioId, PerfilSubgrupo> = {
  "lacteos-enteros": {
    nombre: "Lácteos enteros",
    grupoId: "LACTEOS",
    orden: 1,
    perfil: { energiaKcal: 129, proteinaG: 7, carbohidratosG: 9.5, grasasG: 7.2, fibraG: 0 },
  },
  "lacteos-reducidos": {
    nombre: "Lácteos semidescremados y descremados",
    grupoId: "LACTEOS",
    orden: 2,
    perfil: { energiaKcal: 87, proteinaG: 7.7, carbohidratosG: 11.3, grasasG: 1.2, fibraG: 0 },
  },
  "lacteos-quesos": {
    nombre: "Quesos",
    grupoId: "LACTEOS",
    orden: 3,
    perfil: { energiaKcal: 86, proteinaG: 5.6, carbohidratosG: 3.9, grasasG: 5.3, fibraG: 0 },
  },
  "sustitutos-huevos": {
    nombre: "Huevos y quesos (sustitutos 1)",
    grupoId: "SUSTITUTOS",
    orden: 1,
    perfil: { energiaKcal: 77, proteinaG: 6.5, carbohidratosG: 5.3, grasasG: 0.4, fibraG: 0 },
  },
  "sustitutos-leguminosas": {
    nombre: "Leguminosas y mezclas vegetales (sustitutos 2)",
    grupoId: "SUSTITUTOS",
    orden: 2,
    perfil: { energiaKcal: 82, proteinaG: 4.9, carbohidratosG: 13.3, grasasG: 1, fibraG: 4.2 },
  },
  "carnes-magras": {
    nombre: "Carnes magras y pescados",
    grupoId: "CARNES_MAGRAS",
    orden: 1,
    perfil: { energiaKcal: 79, proteinaG: 9.9, carbohidratosG: 2, grasasG: 4.1, fibraG: 0 },
  },
  "proteinas-texturizadas": {
    nombre: "Proteínas texturizadas",
    grupoId: "CARNES_MAGRAS",
    orden: 2,
    perfil: { energiaKcal: 82, proteinaG: 7, carbohidratosG: 5, grasasG: 3.5, fibraG: 1.5 },
  },
  cereales: {
    nombre: "Cereales",
    grupoId: "CEREALES",
    orden: 1,
    perfil: { energiaKcal: 88, proteinaG: 2.2, carbohidratosG: 16.7, grasasG: 1.5, fibraG: 1.2 },
  },
  raices: {
    nombre: "Raíces",
    grupoId: "CEREALES",
    orden: 2,
    perfil: { energiaKcal: 90, proteinaG: 0.9, carbohidratosG: 21.7, grasasG: 0.1, fibraG: 3 },
  },
  tuberculos: {
    nombre: "Tubérculos",
    grupoId: "CEREALES",
    orden: 3,
    perfil: { energiaKcal: 93, proteinaG: 2.2, carbohidratosG: 21.3, grasasG: 0.1, fibraG: 1.9 },
  },
  platanos: {
    nombre: "Plátanos",
    grupoId: "CEREALES",
    orden: 4,
    perfil: { energiaKcal: 92, proteinaG: 0.9, carbohidratosG: 23.8, grasasG: 0.1, fibraG: 1 },
  },
  verduras: {
    nombre: "Verduras y hortalizas",
    grupoId: "VERDURAS",
    orden: 1,
    perfil: { energiaKcal: 24, proteinaG: 1.3, carbohidratosG: 5.3, grasasG: 0.3, fibraG: 1.8 },
  },
  frutas: {
    nombre: "Frutas",
    grupoId: "FRUTAS",
    orden: 1,
    perfil: { energiaKcal: 55, proteinaG: 1, carbohidratosG: 13.9, grasasG: 0.3, fibraG: 2.2 },
  },
  "grasas-poliinsaturadas": {
    nombre: "Grasas poliinsaturadas",
    grupoId: "GRASAS",
    orden: 1,
    perfil: { energiaKcal: 44, proteinaG: 0, carbohidratosG: 0, grasasG: 5, fibraG: 0 },
  },
  "grasas-monoinsaturadas": {
    nombre: "Grasas monoinsaturadas",
    grupoId: "GRASAS",
    orden: 2,
    perfil: { energiaKcal: 45, proteinaG: 0.2, carbohidratosG: 0.7, grasasG: 4.9, fibraG: 0.2 },
  },
  "grasas-saturadas": {
    nombre: "Grasas saturadas",
    grupoId: "GRASAS",
    orden: 3,
    perfil: { energiaKcal: 45, proteinaG: 0.5, carbohidratosG: 0.5, grasasG: 4.8, fibraG: 0.2 },
  },
  "azucares-simples": {
    nombre: "Azúcares simples",
    grupoId: "AZUCARES",
    orden: 1,
    perfil: { energiaKcal: 81, proteinaG: 0.1, carbohidratosG: 21.7, grasasG: 0, fibraG: 0 },
  },
  "dulces-postres": {
    nombre: "Dulces y postres",
    grupoId: "AZUCARES",
    orden: 2,
    perfil: { energiaKcal: 86, proteinaG: 0.7, carbohidratosG: 20.5, grasasG: 0.8, fibraG: 0.3 },
  },
};

export const SUBGRUPOS_INTERCAMBIO_DEF: SubgrupoIntercambioDef[] = (
  Object.entries(SUBGRUPOS) as Array<[SubgrupoIntercambioId, PerfilSubgrupo]>
).map(([id, data]) => ({
  id,
  grupoId: data.grupoId,
  nombre: data.nombre,
  orden: data.orden,
  poblacionObjetivo: "ADULTOS",
  perfil: data.perfil,
  fuente: FUENTE_GABA_UDEA,
}));

type EntradaIntercambio = Omit<IntercambioAlimento, "poblacionObjetivo" | "fuente"> & {
  poblacionObjetivo?: "ADULTOS" | "NINOS";
  fuente?: FuenteIntercambio;
};

function registro(
  grupoId: GrupoIntercambioId,
  subgrupoId: SubgrupoIntercambioId,
  gramosPorIntercambio: number,
  medidaCasera: string,
  estado: IntercambioAlimento["estado"],
  nota?: string,
): EntradaIntercambio {
  return {
    grupoId,
    subgrupoId,
    gramosPorIntercambio,
    medidaCasera,
    estado,
    poblacionObjetivo: "ADULTOS",
    fuente: FUENTE_GABA_UDEA,
    nota,
  };
}

/**
 * 44 de los 45 alimentos del catálogo tienen un intercambio declarado. El café
 * sin azúcar queda fuera porque no aporta energía ni macronutrientes relevantes.
 */
export const INTERCAMBIOS_POR_ALIMENTO: Record<string, EntradaIntercambio> = {
  "res-lomo-magra-cruda": registro("CARNES_MAGRAS", "carnes-magras", 60, "1/8 de libra", "VERIFICADO", "Tabla 36: carne de res magra."),
  "res-molida-magra-cruda": registro("CARNES_MAGRAS", "carnes-magras", 60, "1/8 de libra", "HOMOLOGADO", "Tabla 36 no individualiza la molida; se homologa a carne de res magra."),
  "cerdo-lomo-crudo": registro("CARNES_MAGRAS", "carnes-magras", 60, "1/8 de libra", "VERIFICADO", "Tabla 36: carne de cerdo magra."),
  "pollo-pechuga-cruda": registro("CARNES_MAGRAS", "carnes-magras", 60, "1/4 de unidad mediana", "VERIFICADO", "Tabla 36: pechuga de pollo."),
  "pollo-campesino-muslo": registro("CARNES_MAGRAS", "carnes-magras", 60, "1 unidad mediana", "VERIFICADO", "Tabla 36: contramuslo de pollo."),
  "higado-res-crudo": registro("CARNES_MAGRAS", "carnes-magras", 60, "1/8 de libra", "HOMOLOGADO", "La tabla individualiza hígado de pollo (72 g); se homologa al grupo de carnes magras."),
  "tilapia-filete-crudo": registro("CARNES_MAGRAS", "carnes-magras", 60, "1 trozo pequeño", "HOMOLOGADO", "Pescado blanco asimilado al intercambio de 60 g de pescado."),
  "trucha-arcoiris-filete": registro("CARNES_MAGRAS", "carnes-magras", 60, "1 trozo pequeño", "VERIFICADO", "Tabla 36: trucha."),
  "atun-lata-agua": registro("CARNES_MAGRAS", "carnes-magras", 40, "1/3 de lata mediana", "HOMOLOGADO", "La tabla pesa atún en aceite (40 g); el producto en agua conserva el mismo intercambio proteico."),
  "huevo-gallina-entero": registro("SUSTITUTOS", "sustitutos-huevos", 50, "1 unidad pequeña", "VERIFICADO", "Tabla 35: huevo de gallina."),
  "huevo-campesino": registro("SUSTITUTOS", "sustitutos-huevos", 50, "1 unidad pequeña", "HOMOLOGADO", "Mismo peso de intercambio del huevo de gallina."),
  "leche-entera-vaca": registro("LACTEOS", "lacteos-enteros", 200, "1 vaso mediano", "VERIFICADO", "Tabla 39: leche entera."),
  "yogur-natural-sin-azucar": registro("LACTEOS", "lacteos-quesos", 150, "1 vaso pequeño", "VERIFICADO", "Tabla 39: yogur natural."),
  "queso-campesino-fresco": registro("LACTEOS", "lacteos-quesos", 20, "1 tajada pequeña delgada", "VERIFICADO", "Tabla 39: queso campesino."),
  "queso-costeno": registro("LACTEOS", "lacteos-quesos", 20, "1 tajada pequeña delgada", "HOMOLOGADO", "Se homologa a queso campesino por ausencia de fila propia."),
  "aceite-palma": registro("GRASAS", "grasas-saturadas", 5, "1 cucharadita", "VERIFICADO", "Tabla 43: aceite de palma."),
  "aceite-girasol": registro("GRASAS", "grasas-poliinsaturadas", 5, "1 cucharadita", "VERIFICADO", "Tabla 42: aceite de girasol."),
  "aceite-oliva-extra-virgen": registro("GRASAS", "grasas-monoinsaturadas", 5, "1 cucharadita", "VERIFICADO", "Tabla 41: aceite de oliva."),
  "manteca-cerdo": registro("GRASAS", "grasas-saturadas", 4, "1 cucharadita dulcera", "VERIFICADO", "Tabla 43: manteca de cerdo."),
  "papa-criolla-cocida": registro("CEREALES", "tuberculos", 108, "3 unidades medianas", "VERIFICADO", "Tabla 33: papa criolla cocida."),
  "papa-pastusa-cocida": registro("CEREALES", "tuberculos", 83, "1 unidad mediana", "VERIFICADO", "Tabla 33: papa común cocida."),
  "yuca-cocida": registro("CEREALES", "raices", 62, "1 trozo mediano", "DERIVADO", "GABA pesa yuca blanca cruda (62 g). El catálogo usa yuca cocida; se conserva el peso de intercambio y se advierte la diferencia de preparación."),
  "arracacha-cocida": registro("CEREALES", "raices", 96, "1 trozo pequeño", "DERIVADO", "GABA pesa arracacha cruda (96 g). El catálogo usa arracacha cocida; se advierte la diferencia de preparación."),
  "arroz-blanco-cocido": registro("CEREALES", "cereales", 80, "6 cucharadas soperas colmadas", "VERIFICADO", "Tabla 34: arroz blanco cocido."),
  "arroz-integral-cocido": registro("CEREALES", "cereales", 80, "6 cucharadas soperas colmadas", "VERIFICADO", "Tabla 34: arroz integral cocido."),
  "arepa-maiz-blanco": registro("CEREALES", "cereales", 56, "1 unidad pequeña", "HOMOLOGADO", "Tabla 34: arepa delgada de maíz blanco trillado (56 g)."),
  "avena-hojuelas-cruda": registro("CEREALES", "cereales", 24, "4 cucharadas soperas colmadas", "VERIFICADO", "Tabla 34: avena en hojuelas."),
  "platano-harton-cocido": registro("CEREALES", "platanos", 66, "1/4 de unidad mediana", "HOMOLOGADO", "Tabla 32 pesa plátano hartón maduro cocido (66 g); el catálogo usa plátano verde cocido."),
  "banano-maduro": registro("FRUTAS", "frutas", 65, "1/2 unidad grande", "VERIFICADO", "Tabla 29: banano común."),
  "papaya-fresca": registro("FRUTAS", "frutas", 128, "1 trozo mediano", "VERIFICADO", "Tabla 29: papaya."),
  "guayaba-comun": registro("FRUTAS", "frutas", 100, "1 unidad grande", "VERIFICADO", "Tabla 29: guayaba común."),
  "uchuva-fresca": registro("FRUTAS", "frutas", 69, "13 unidades medianas", "VERIFICADO", "Tabla 29: uchuvas."),
  "aguacate-hass": registro("GRASAS", "grasas-monoinsaturadas", 30, "1/8 de unidad", "VERIFICADO", "Tabla 41: aguacate."),
  "tomate-chonto-crudo": registro("VERDURAS", "verduras", 126, "1 unidad grande", "VERIFICADO", "Tabla 28: tomate rojo."),
  "zanahoria-cruda": registro("VERDURAS", "verduras", 58, "1/2 pocillo chocolatero", "VERIFICADO", "Tabla 28: zanahoria."),
  "ahuyama-cocida": registro("VERDURAS", "verduras", 68, "1 trozo mediano", "VERIFICADO", "Tabla 28: ahuyama."),
  "frijol-rojo-cocido": registro("SUSTITUTOS", "sustitutos-leguminosas", 60, "1/2 cucharón", "HOMOLOGADO", "Tabla 35: frijol con plátano/guiso. El catálogo usa frijol cocido simple."),
  "lenteja-cocida": registro("SUSTITUTOS", "sustitutos-leguminosas", 70, "1/2 cucharón", "HOMOLOGADO", "Tabla 35: lenteja con guiso. El catálogo usa lenteja cocida simple."),
  "garbanzo-cocido": registro("SUSTITUTOS", "sustitutos-leguminosas", 50, "1/2 cucharón", "HOMOLOGADO", "Tabla 35: garbanzo con guiso. El catálogo usa garbanzo cocido simple."),
  "man-sin-sal-tostado": registro("GRASAS", "grasas-monoinsaturadas", 10, "1 cucharada sopera colmada", "HOMOLOGADO", "Tabla 44: maní. Se asimila al grupo de grasas por su densidad energética."),
  "galletas-saltinas": registro("CEREALES", "cereales", 24, "3 unidades", "VERIFICADO", "Tabla 34: galletas de soda."),
  "pan-tajado-blanco": registro("CEREALES", "cereales", 22, "1 tajada delgada", "VERIFICADO", "Tabla 34: pan blanco."),
  "chocolate-leche": registro("AZUCARES", "dulces-postres", 12, "1 unidad pequeña", "VERIFICADO", "Tabla 45: chocolatina de leche."),
  panela: registro("AZUCARES", "azucares-simples", 29, "1 trozo pequeño", "VERIFICADO", "Tabla 44: panela."),
};

export const GRUPOS_POR_ALIMENTO: Record<string, GrupoIntercambioId> = Object.fromEntries(
  Object.entries(INTERCAMBIOS_POR_ALIMENTO).map(([id, data]) => [id, data.grupoId]),
);

export const SUBGRUPOS_POR_ALIMENTO: Record<string, SubgrupoIntercambioId> = Object.fromEntries(
  Object.entries(INTERCAMBIOS_POR_ALIMENTO).map(([id, data]) => [id, data.subgrupoId]),
);

export function intercambioCompleto(entrada: EntradaIntercambio): IntercambioAlimento {
  return {
    ...entrada,
    poblacionObjetivo: entrada.poblacionObjetivo ?? "ADULTOS",
    fuente: entrada.fuente ?? FUENTE_GABA_UDEA,
  };
}

export const LIMITES_INTERCAMBIO: Record<GrupoIntercambioId, { min: number; max: number }> = {
  LACTEOS: { min: 1, max: 4 },
  SUSTITUTOS: { min: 0, max: 5 },
  CARNES_MAGRAS: { min: 1, max: 8 },
  CEREALES: { min: 3, max: 15 },
  VERDURAS: { min: 2, max: 8 },
  FRUTAS: { min: 2, max: 6 },
  GRASAS: { min: 1, max: 8 },
  AZUCARES: { min: 0, max: 4 },
};

export const NOTA_FUENTE_INTERCAMBIOS = `${sinDatoUdeA2023} ${FUENTE_GABA_UDEA.documento}`;
