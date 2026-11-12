import type { AlimentoColombiano, FuenteNutricional, Nutrientes } from "@/lib/domain/types";
import { NUTRIENTES_VACIOS } from "@/lib/nutrition/nutrients";
import { INTERCAMBIOS_POR_ALIMENTO, intercambioCompleto } from "./intercambios";

/**
 * Semilla funcional de referencia, NO una reproducción exhaustiva de la TCAC.
 * Cada cálculo usa exclusivamente estos registros. Antes de uso asistivo real,
 * contraste cada registro con el documento fuente y la presentación comercial.
 */
const USDA: FuenteNutricional = {
  nombre: "USDA FoodData Central / semilla de referencia MacrOrigen",
  documento: "Valores representativos por 100 g/ml; homologación TCAC y etiqueta local pendiente",
  url: "https://fdc.nal.usda.gov/",
  anio: 2024,
};

const TCAC: FuenteNutricional = {
  nombre: "ICBF — Tabla de Composición de Alimentos Colombianos (referencia metodológica)",
  documento: "Registro semilla representativo; verificar contra la edición TCAC antes de producción",
  url: "https://www.icbf.gov.co/bienestar/nutricion",
  anio: 2021,
};

type Entrada = Omit<AlimentoColombiano, "nutrientes" | "fuente" | "fechaActualizacion" | "etiquetas" | "alergenos"> & {
  nutrientes: Partial<Nutrientes>;
  fuente?: FuenteNutricional;
  etiquetas?: string[];
  alergenos?: string[];
};

function food(entrada: Entrada): AlimentoColombiano {
  const nutrientes = { ...NUTRIENTES_VACIOS, ...entrada.nutrientes };
  if (!entrada.nutrientes.energiaKj) nutrientes.energiaKj = Math.round(nutrientes.energiaKcal * 4.184);
  return {
    ...entrada,
    nutrientes,
    alergenos: entrada.alergenos ?? [],
    etiquetas: entrada.etiquetas ?? [],
    fuente: entrada.fuente ?? USDA,
    fechaActualizacion: "2026-11-12",
  };
}

const porcion = (gramos: number, descripcion: string) => ({ gramos, descripcion });
const macros = (energiaKcal: number, proteinaG: number, carbohidratosG: number, grasasTotalesG: number, resto: Partial<Nutrientes> = {}): Partial<Nutrientes> => ({
  energiaKcal, proteinaG, carbohidratosG, grasasTotalesG, ...resto,
});

const alimentosBase: AlimentoColombiano[] = [
  food({
    id: "res-lomo-magra-cruda", nombre: "Lomo de res magro, crudo", grupo: "CARNES", subgrupo: "Res / cortes",
    origenTipo: "NO_CRIOLLO", detalleOrigen: "Corte comercial; no identifica raza criolla ni país de cría.",
    descripcion: "Corte de res sin grasa visible, estado crudo.", unidadBase: "g", porcionComun: porcion(120, "1 filete mediano"),
    nutrientes: macros(143, 21.4, 0, 5.5, { aguaG: 72, grasasSaturadasG: 2.1, grasasMonoinsaturadasG: 2.3, grasasPoliinsaturadasG: 0.2, colesterolMg: 60, sodioMg: 55, potasioMg: 350, hierroMg: 2.1, zincMg: 4.5, fosforoMg: 205, vitaminaB12Mcg: 2.4 }),
    etiquetas: ["proteína", "hierro", "crudo"],
  }),
  food({
    id: "res-molida-magra-cruda", nombre: "Carne molida de res magra, cruda", grupo: "CARNES", subgrupo: "Res / molida",
    origenTipo: "NO_CRIOLLO", detalleOrigen: "Producto cárnico comercial; la etiqueta no acredita ganado criollo.",
    descripcion: "Carne molida con aproximadamente 10% de grasa.", unidadBase: "g", porcionComun: porcion(125, "1 porción"),
    nutrientes: macros(176, 20, 0, 10, { aguaG: 69, grasasSaturadasG: 3.9, grasasMonoinsaturadasG: 4.3, grasasPoliinsaturadasG: 0.3, colesterolMg: 71, sodioMg: 66, potasioMg: 318, hierroMg: 2, zincMg: 4.8, fosforoMg: 190, vitaminaB12Mcg: 2.2 }),
    etiquetas: ["proteína", "crudo"],
  }),
  food({
    id: "cerdo-lomo-crudo", nombre: "Lomo de cerdo magro, crudo", grupo: "CARNES", subgrupo: "Cerdo / cortes",
    origenTipo: "NO_CRIOLLO", detalleOrigen: "Corte comercial de cerdo; origen de raza no especificado.",
    descripcion: "Lomo de cerdo sin piel y con grasa visible retirada.", unidadBase: "g", porcionComun: porcion(120, "1 filete mediano"),
    nutrientes: macros(143, 21.2, 0, 5.7, { aguaG: 72, grasasSaturadasG: 1.9, grasasMonoinsaturadasG: 2.5, grasasPoliinsaturadasG: 0.5, colesterolMg: 62, sodioMg: 54, potasioMg: 370, hierroMg: 0.8, zincMg: 2.2, fosforoMg: 210, vitaminaB12Mcg: 0.7 }),
    etiquetas: ["proteína", "crudo"],
  }),
  food({
    id: "pollo-pechuga-cruda", nombre: "Pechuga de pollo sin piel, cruda", grupo: "CARNES", subgrupo: "Pollo / pechuga",
    origenTipo: "NO_CRIOLLO", detalleOrigen: "Pechuga de pollo comercial; no corresponde necesariamente a pollo campesino.",
    descripcion: "Pechuga sin piel ni hueso, estado crudo.", unidadBase: "g", porcionComun: porcion(140, "1 pechuga pequeña"),
    nutrientes: macros(120, 22.5, 0, 2.6, { aguaG: 74, grasasSaturadasG: 0.7, grasasMonoinsaturadasG: 0.8, grasasPoliinsaturadasG: 0.5, colesterolMg: 73, sodioMg: 45, potasioMg: 334, calcioMg: 5, hierroMg: 0.4, zincMg: 0.7, fosforoMg: 213, vitaminaB12Mcg: 0.3 }),
    etiquetas: ["proteína", "bajo en grasa"],
  }),
  food({
    id: "pollo-campesino-muslo", nombre: "Pollo campesino, muslo sin piel", grupo: "CARNES", subgrupo: "Pollo / producción campesina",
    origenTipo: "CRIOLLO", detalleOrigen: "Clasificado por sistema tradicional de producción campesina local; verificar procedencia del proveedor.",
    descripcion: "Muslo de pollo campesino sin piel, valor de referencia para ave cruda.", unidadBase: "g", porcionComun: porcion(130, "1 muslo"),
    nutrientes: macros(161, 20.1, 0, 8.5, { aguaG: 71, grasasSaturadasG: 2.4, grasasMonoinsaturadasG: 3.4, grasasPoliinsaturadasG: 1.8, colesterolMg: 88, sodioMg: 82, potasioMg: 240, hierroMg: 1.1, zincMg: 2, fosforoMg: 180, vitaminaB12Mcg: 0.5 }),
    etiquetas: ["proteína", "campesino"], fuente: TCAC,
  }),
  food({
    id: "higado-res-crudo", nombre: "Hígado de res, crudo", grupo: "CARNES", subgrupo: "Res / vísceras",
    origenTipo: "NO_CRIOLLO", detalleOrigen: "Subproducto cárnico comercial; no implica raza o producción criolla.",
    descripcion: "Hígado de res crudo, fuente concentrada de hierro y vitamina A.", unidadBase: "g", porcionComun: porcion(90, "1 filete pequeño"),
    nutrientes: macros(135, 20.4, 3.9, 3.6, { aguaG: 70.8, grasasSaturadasG: 1.2, grasasMonoinsaturadasG: 0.5, grasasPoliinsaturadasG: 0.5, colesterolMg: 275, sodioMg: 69, potasioMg: 313, calcioMg: 5, hierroMg: 4.9, zincMg: 4, fosforoMg: 387, vitaminaAMcg: 4968, vitaminaCMg: 1.3, vitaminaB12Mcg: 59.3, folatoMcg: 290 }),
    etiquetas: ["proteína", "hierro", "vitamina A"],
  }),
  food({
    id: "tilapia-filete-crudo", nombre: "Tilapia, filete crudo", grupo: "PESCADOS", subgrupo: "Pescado de cultivo",
    origenTipo: "NO_CRIOLLO", detalleOrigen: "Especie introducida y ampliamente cultivada; no nativa de Colombia.",
    descripcion: "Filete de tilapia fresco sin piel.", unidadBase: "g", porcionComun: porcion(140, "1 filete"),
    nutrientes: macros(96, 20.1, 0, 1.7, { aguaG: 78, grasasSaturadasG: 0.6, grasasMonoinsaturadasG: 0.5, grasasPoliinsaturadasG: 0.4, colesterolMg: 50, sodioMg: 52, potasioMg: 302, calcioMg: 10, hierroMg: 0.6, zincMg: 0.3, fosforoMg: 170, vitaminaB12Mcg: 1.6 }),
    etiquetas: ["proteína", "bajo en grasa"], alergenos: ["PESCADO"],
  }),
  food({
    id: "trucha-arcoiris-filete", nombre: "Trucha arcoíris, filete crudo", grupo: "PESCADOS", subgrupo: "Pescado de cultivo",
    origenTipo: "NO_CRIOLLO", detalleOrigen: "Especie exótica cultivada localmente; producción local no equivale a especie nativa.",
    descripcion: "Filete de trucha arcoíris de acuicultura.", unidadBase: "g", porcionComun: porcion(140, "1 filete"),
    nutrientes: macros(141, 19.9, 0, 6.2, { aguaG: 72.8, grasasSaturadasG: 1.4, grasasMonoinsaturadasG: 2, grasasPoliinsaturadasG: 2.1, colesterolMg: 57, sodioMg: 51, potasioMg: 394, calcioMg: 31, hierroMg: 0.3, fosforoMg: 245, vitaminaB12Mcg: 4.2 }),
    etiquetas: ["proteína", "omega 3"], alergenos: ["PESCADO"], fuente: TCAC,
  }),
  food({
    id: "atun-lata-agua", nombre: "Atún en lata en agua, escurrido", grupo: "PROCESADOS", subgrupo: "Conservas / pescado",
    origenTipo: "NO_CRIOLLO", detalleOrigen: "Producto industrial en conserva; revisar marca y país de origen.",
    descripcion: "Atún claro enlatado en agua, escurrido, sin sal añadida como referencia.", unidadBase: "g", porcionComun: porcion(90, "1 lata pequeña escurrida"),
    nutrientes: macros(116, 25.5, 0, 0.8, { aguaG: 72, grasasSaturadasG: 0.2, grasasMonoinsaturadasG: 0.2, grasasPoliinsaturadasG: 0.3, colesterolMg: 42, sodioMg: 50, potasioMg: 237, calcioMg: 11, hierroMg: 1, fosforoMg: 198, vitaminaB12Mcg: 2.2 }),
    etiquetas: ["proteína", "procesado", "conserva"], alergenos: ["PESCADO"],
  }),
  food({
    id: "huevo-gallina-entero", nombre: "Huevo de gallina, entero crudo", grupo: "HUEVOS", subgrupo: "Huevo de gallina",
    origenTipo: "NO_CRIOLLO", detalleOrigen: "Huevo comercial estándar; no implica producción campesina ni gallina criolla.",
    descripcion: "Huevo entero, composición comestible por 100 g sin cáscara.", unidadBase: "g", porcionComun: porcion(50, "1 huevo mediano"),
    nutrientes: macros(143, 12.6, 0.7, 9.5, { aguaG: 76.2, grasasSaturadasG: 3.1, grasasMonoinsaturadasG: 3.7, grasasPoliinsaturadasG: 1.9, colesterolMg: 372, sodioMg: 142, potasioMg: 138, calcioMg: 56, hierroMg: 1.8, zincMg: 1.3, fosforoMg: 198, vitaminaAMcg: 160, vitaminaB12Mcg: 0.9, folatoMcg: 47 }),
    etiquetas: ["proteína", "desayuno"], alergenos: ["HUEVO"],
  }),
  food({
    id: "huevo-campesino", nombre: "Huevo campesino, entero crudo", grupo: "HUEVOS", subgrupo: "Huevo / producción campesina",
    origenTipo: "CRIOLLO", detalleOrigen: "Clasificación por producción tradicional local; composición igualada a referencia genérica, no análisis de granja.",
    descripcion: "Huevo campesino entero crudo; el color de cáscara no determina su composición.", unidadBase: "g", porcionComun: porcion(50, "1 huevo mediano"),
    nutrientes: macros(143, 12.6, 0.7, 9.5, { aguaG: 76.2, grasasSaturadasG: 3.1, grasasMonoinsaturadasG: 3.7, grasasPoliinsaturadasG: 1.9, colesterolMg: 372, sodioMg: 142, potasioMg: 138, calcioMg: 56, hierroMg: 1.8, zincMg: 1.3, fosforoMg: 198, vitaminaAMcg: 160, vitaminaB12Mcg: 0.9, folatoMcg: 47 }),
    etiquetas: ["proteína", "campesino"], alergenos: ["HUEVO"], fuente: TCAC,
  }),
  food({
    id: "leche-entera-vaca", nombre: "Leche entera de vaca", grupo: "LACTEOS", subgrupo: "Leche fluida",
    origenTipo: "NO_CRIOLLO", detalleOrigen: "Bebida láctea comercial; el origen criollo requiere trazabilidad de producción y raza.",
    descripcion: "Leche entera pasteurizada, aproximadamente 3% de grasa.", unidadBase: "ml", porcionComun: porcion(200, "1 vaso"),
    nutrientes: macros(61, 3.2, 4.8, 3.3, { aguaG: 88.3, azucaresG: 5.1, grasasSaturadasG: 1.9, grasasMonoinsaturadasG: 0.8, grasasPoliinsaturadasG: 0.2, colesterolMg: 10, sodioMg: 43, potasioMg: 132, calcioMg: 113, magnesioMg: 10, fosforoMg: 84, zincMg: 0.4, vitaminaAMcg: 46, vitaminaB12Mcg: 0.5 }),
    etiquetas: ["calcio", "lácteo"], alergenos: ["LACTEOS"],
  }),
  food({
    id: "yogur-natural-sin-azucar", nombre: "Yogur natural sin azúcar", grupo: "PROCESADOS", subgrupo: "Lácteos fermentados",
    origenTipo: "NO_CRIOLLO", detalleOrigen: "Producto lácteo fermentado comercial; no es un alimento autóctono.",
    descripcion: "Yogur entero natural, sin saborizantes ni azúcares añadidos.", unidadBase: "g", porcionComun: porcion(150, "1 vaso pequeño"),
    nutrientes: macros(61, 3.5, 4.7, 3.3, { aguaG: 87.9, azucaresG: 4.7, grasasSaturadasG: 2.1, grasasMonoinsaturadasG: 0.9, grasasPoliinsaturadasG: 0.1, colesterolMg: 13, sodioMg: 46, potasioMg: 155, calcioMg: 121, magnesioMg: 12, fosforoMg: 95, zincMg: 0.6, vitaminaB12Mcg: 0.4 }),
    etiquetas: ["calcio", "sin azúcar añadida"], alergenos: ["LACTEOS"],
  }),
  food({
    id: "queso-campesino-fresco", nombre: "Queso campesino fresco", grupo: "LACTEOS", subgrupo: "Quesos frescos",
    origenTipo: "CRIOLLO", detalleOrigen: "Producto de elaboración tradicional campesina; la composición y humedad varían por productor.",
    descripcion: "Queso fresco de leche de vaca de elaboración local, sin maduración.", unidadBase: "g", porcionComun: porcion(50, "1 tajada"),
    nutrientes: macros(240, 19, 3, 16, { aguaG: 57, grasasSaturadasG: 10, grasasMonoinsaturadasG: 4, grasasPoliinsaturadasG: 0.6, colesterolMg: 55, sodioMg: 526, potasioMg: 104, calcioMg: 500, magnesioMg: 22, fosforoMg: 350, zincMg: 2.5, vitaminaAMcg: 180, vitaminaB12Mcg: 1.1 }),
    etiquetas: ["calcio", "tradicional", "alto en sodio"], alergenos: ["LACTEOS"], fuente: TCAC,
  }),
  food({
    id: "queso-costeno", nombre: "Queso costeño salado", grupo: "LACTEOS", subgrupo: "Quesos tradicionales",
    origenTipo: "CRIOLLO", detalleOrigen: "Queso tradicional de la región Caribe colombiana; clasificación cultural, no certificación de origen.",
    descripcion: "Queso costeño de pasta semidura y sal añadida.", unidadBase: "g", porcionComun: porcion(40, "1 tajada delgada"),
    nutrientes: macros(315, 21, 2, 25, { aguaG: 44, grasasSaturadasG: 15, grasasMonoinsaturadasG: 7, grasasPoliinsaturadasG: 0.8, colesterolMg: 75, sodioMg: 1200, potasioMg: 98, calcioMg: 600, fosforoMg: 390, zincMg: 2.8, vitaminaAMcg: 240, vitaminaB12Mcg: 1.2 }),
    etiquetas: ["costa Caribe", "alto en sodio", "tradicional"], alergenos: ["LACTEOS"], fuente: TCAC,
  }),
  food({
    id: "aceite-palma", nombre: "Aceite de palma rojo refinado", grupo: "ACEITES_GRASAS", subgrupo: "Aceites vegetales",
    origenTipo: "CRIOLLO", detalleOrigen: "Palma de aceite cultivada y procesada tradicionalmente en Colombia; especie con historia africana, clasificación por producción local.",
    descripcion: "Aceite de palma refinado de uso culinario colombiano.", unidadBase: "ml", porcionComun: porcion(10, "2 cucharaditas"),
    nutrientes: macros(884, 0, 0, 100, { grasasSaturadasG: 49.3, grasasMonoinsaturadasG: 37, grasasPoliinsaturadasG: 9.3, vitaminaAMcg: 0 }),
    etiquetas: ["grasa", "palma", "local"],
  }),
  food({
    id: "aceite-girasol", nombre: "Aceite de girasol", grupo: "ACEITES_GRASAS", subgrupo: "Aceites vegetales",
    origenTipo: "NO_CRIOLLO", detalleOrigen: "Aceite vegetal refinado comercial; cultivo y especie no autóctonos.",
    descripcion: "Aceite de girasol refinado para cocinar.", unidadBase: "ml", porcionComun: porcion(10, "2 cucharaditas"),
    nutrientes: macros(884, 0, 0, 100, { grasasSaturadasG: 10.3, grasasMonoinsaturadasG: 19.5, grasasPoliinsaturadasG: 65.7 }),
    etiquetas: ["grasa", "omega 6"],
  }),
  food({
    id: "aceite-oliva-extra-virgen", nombre: "Aceite de oliva extra virgen", grupo: "ACEITES_GRASAS", subgrupo: "Aceites vegetales",
    origenTipo: "NO_CRIOLLO", detalleOrigen: "Producto foráneo o de cultivos locales no tradicionales; revisar etiqueta para país de origen.",
    descripcion: "Aceite de oliva extra virgen; valor genérico para aceite de oliva.", unidadBase: "ml", porcionComun: porcion(10, "2 cucharaditas"),
    nutrientes: macros(884, 0, 0, 100, { grasasSaturadasG: 13.8, grasasMonoinsaturadasG: 73, grasasPoliinsaturadasG: 10.5, potasioMg: 1, vitaminaAMcg: 0 }),
    etiquetas: ["grasa", "monoinsaturada"],
  }),
  food({
    id: "manteca-cerdo", nombre: "Manteca de cerdo", grupo: "ACEITES_GRASAS", subgrupo: "Grasas animales",
    origenTipo: "NO_CRIOLLO", detalleOrigen: "Grasa animal comercial; no acredita producción campesina o raza criolla.",
    descripcion: "Grasa de cerdo fundida para preparaciones culinarias.", unidadBase: "g", porcionComun: porcion(5, "1 cucharadita"),
    nutrientes: macros(902, 0, 0, 100, { grasasSaturadasG: 39.2, grasasMonoinsaturadasG: 45.1, grasasPoliinsaturadasG: 11.2, colesterolMg: 95, sodioMg: 0 }),
    etiquetas: ["grasa", "animal"],
  }),
  food({
    id: "papa-criolla-cocida", nombre: "Papa criolla cocida sin piel", grupo: "TUBERCULOS", subgrupo: "Papa / variedades locales",
    origenTipo: "CRIOLLO", detalleOrigen: "Variedad tradicional andina cultivada ampliamente en Colombia; preparación criolla cocida.",
    descripcion: "Papa criolla (Solanum tuberosum grupo Phureja) cocida, sin sal ni grasa.", unidadBase: "g", porcionComun: porcion(150, "3 unidades pequeñas"),
    nombreCientifico: "Solanum tuberosum grupo Phureja",
    nutrientes: macros(74, 1.9, 16.2, 0.1, { aguaG: 80.5, fibraG: 1.8, azucaresG: 0.7, sodioMg: 5, potasioMg: 390, calcioMg: 10, hierroMg: 0.5, magnesioMg: 22, fosforoMg: 48, vitaminaCMg: 12, folatoMcg: 15 }),
    etiquetas: ["andino", "sin gluten", "cocido"], fuente: TCAC,
  }),
  food({
    id: "papa-pastusa-cocida", nombre: "Papa pastusa cocida con piel", grupo: "TUBERCULOS", subgrupo: "Papa / variedades locales",
    origenTipo: "CRIOLLO", detalleOrigen: "Variedad de uso tradicional en Colombia; denominación local, no nativa exclusiva del territorio.",
    descripcion: "Papa pastusa cocida con piel, sin sal ni grasa.", unidadBase: "g", porcionComun: porcion(150, "1 unidad mediana"),
    nombreCientifico: "Solanum tuberosum",
    nutrientes: macros(87, 1.9, 20.1, 0.1, { aguaG: 77, fibraG: 1.8, azucaresG: 0.9, sodioMg: 5, potasioMg: 379, calcioMg: 5, hierroMg: 0.3, magnesioMg: 22, fosforoMg: 44, vitaminaCMg: 13, folatoMcg: 17 }),
    etiquetas: ["andino", "sin gluten", "cocido"], fuente: TCAC,
  }),
  food({
    id: "yuca-cocida", nombre: "Yuca cocida", grupo: "TUBERCULOS", subgrupo: "Raíces tropicales",
    origenTipo: "CRIOLLO", detalleOrigen: "Especie nativa de Suramérica y preparación tradicional colombiana.",
    descripcion: "Yuca pelada y cocida en agua, sin sal.", unidadBase: "g", porcionComun: porcion(120, "2 trozos medianos"),
    nombreCientifico: "Manihot esculenta",
    nutrientes: macros(160, 1.4, 38.1, 0.3, { aguaG: 59.7, fibraG: 1.8, azucaresG: 1.7, sodioMg: 14, potasioMg: 271, calcioMg: 16, hierroMg: 0.3, magnesioMg: 21, fosforoMg: 27, vitaminaCMg: 20.6, folatoMcg: 27 }),
    etiquetas: ["nativo", "tropical", "cocido"], fuente: TCAC,
  }),
  food({
    id: "arracacha-cocida", nombre: "Arracacha cocida", grupo: "TUBERCULOS", subgrupo: "Raíces andinas",
    origenTipo: "CRIOLLO", detalleOrigen: "Raíz andina de cultivo y consumo tradicional en Colombia.",
    descripcion: "Arracacha amarilla cocida, sin sal ni mantequilla.", unidadBase: "g", porcionComun: porcion(120, "1 porción"),
    nombreCientifico: "Arracacia xanthorrhiza",
    nutrientes: macros(101, 1, 24, 0.2, { aguaG: 73, fibraG: 2.4, sodioMg: 20, potasioMg: 330, calcioMg: 24, hierroMg: 0.7, vitaminaCMg: 18 }),
    etiquetas: ["andino", "tradicional", "cocido"], fuente: TCAC,
  }),
  food({
    id: "arroz-blanco-cocido", nombre: "Arroz blanco cocido", grupo: "CEREALES", subgrupo: "Arroz / cocido",
    origenTipo: "NO_CRIOLLO", detalleOrigen: "Cereal introducido y preparación genérica; no distingue variedad ni producción local.",
    descripcion: "Arroz blanco de grano largo cocido en agua, sin sal ni aceite.", unidadBase: "g", porcionComun: porcion(150, "¾ de taza"),
    nombreCientifico: "Oryza sativa",
    nutrientes: macros(130, 2.7, 28.2, 0.3, { aguaG: 68.4, fibraG: 0.4, azucaresG: 0.1, grasasSaturadasG: 0.1, sodioMg: 1, potasioMg: 35, calcioMg: 10, hierroMg: 0.2, magnesioMg: 13, fosforoMg: 43, zincMg: 0.5, folatoMcg: 58 }),
    etiquetas: ["cocido", "cereal", "sin gluten"],
  }),
  food({
    id: "arroz-integral-cocido", nombre: "Arroz integral cocido", grupo: "CEREALES", subgrupo: "Arroz / cocido",
    origenTipo: "NO_CRIOLLO", detalleOrigen: "Cereal introducido y preparación genérica; no distingue variedad local.",
    descripcion: "Arroz integral de grano largo cocido en agua, sin sal.", unidadBase: "g", porcionComun: porcion(150, "¾ de taza"),
    nutrientes: macros(123, 2.7, 25.6, 1, { aguaG: 69.5, fibraG: 1.6, azucaresG: 0.4, grasasSaturadasG: 0.2, grasasPoliinsaturadasG: 0.3, sodioMg: 4, potasioMg: 86, calcioMg: 3, hierroMg: 0.6, magnesioMg: 44, fosforoMg: 103, zincMg: 0.7 }),
    etiquetas: ["cocido", "integral", "fibra"],
  }),
  food({
    id: "arepa-maiz-blanco", nombre: "Arepa de maíz blanco, a la plancha", grupo: "CEREALES", subgrupo: "Maíz / preparaciones tradicionales",
    origenTipo: "CRIOLLO", detalleOrigen: "Preparación tradicional colombiana de maíz, sin queso ni mantequilla en esta referencia.",
    descripcion: "Arepa delgada de maíz precocido y agua, asada a la plancha.", unidadBase: "g", porcionComun: porcion(80, "1 arepa mediana"),
    nutrientes: macros(218, 5, 45.5, 1.2, { aguaG: 45, fibraG: 3.5, grasasSaturadasG: 0.2, sodioMg: 210, potasioMg: 130, calcioMg: 70, hierroMg: 1.5, magnesioMg: 45, fosforoMg: 120, folatoMcg: 70 }),
    etiquetas: ["tradicional", "maíz", "sin gluten"], fuente: TCAC,
  }),
  food({
    id: "avena-hojuelas-cruda", nombre: "Avena en hojuelas, cruda", grupo: "CEREALES", subgrupo: "Cereales integrales",
    origenTipo: "NO_CRIOLLO", detalleOrigen: "Cereal foráneo procesado en hojuelas; no autóctono.",
    descripcion: "Hojuelas de avena integral secas, sin azúcar añadida.", unidadBase: "g", porcionComun: porcion(40, "½ taza"),
    nombreCientifico: "Avena sativa",
    nutrientes: macros(389, 16.9, 66.3, 6.9, { aguaG: 8.2, fibraG: 10.6, azucaresG: 0, grasasSaturadasG: 1.2, grasasMonoinsaturadasG: 2.2, grasasPoliinsaturadasG: 2.5, sodioMg: 2, potasioMg: 429, calcioMg: 54, hierroMg: 4.7, magnesioMg: 177, fosforoMg: 523, zincMg: 4, folatoMcg: 56 }),
    etiquetas: ["fibra", "integral", "seco"], alergenos: ["GLUTEN"],
  }),
  food({
    id: "platano-harton-cocido", nombre: "Plátano hartón cocido", grupo: "FRUTAS", subgrupo: "Plátano / cocido",
    origenTipo: "CRIOLLO", detalleOrigen: "Ingrediente de uso tradicional local; la especie fue introducida históricamente y aquí se clasifica por tradición culinaria.",
    descripcion: "Plátano verde pelado y cocido en agua, sin sal.", unidadBase: "g", porcionComun: porcion(120, "½ plátano mediano"),
    nombreCientifico: "Musa paradisiaca",
    nutrientes: macros(122, 1.3, 31.9, 0.4, { aguaG: 65.2, fibraG: 2.3, azucaresG: 15, sodioMg: 4, potasioMg: 482, calcioMg: 3, hierroMg: 0.6, magnesioMg: 37, fosforoMg: 34, vitaminaAMcg: 56, vitaminaCMg: 18.4, folatoMcg: 22 }),
    etiquetas: ["tradicional", "cocido", "tropical"], fuente: TCAC,
  }),
  food({
    id: "banano-maduro", nombre: "Banano maduro", grupo: "FRUTAS", subgrupo: "Frutas tropicales",
    origenTipo: "CRIOLLO", detalleOrigen: "Fruta tropical de producción y consumo tradicional local; especie introducida históricamente.",
    descripcion: "Banano maduro pelado, porción comestible cruda.", unidadBase: "g", porcionComun: porcion(100, "1 banano mediano sin cáscara"),
    nombreCientifico: "Musa × paradisiaca",
    nutrientes: macros(89, 1.1, 22.8, 0.3, { aguaG: 74.9, fibraG: 2.6, azucaresG: 12.2, grasasSaturadasG: 0.1, sodioMg: 1, potasioMg: 358, calcioMg: 5, hierroMg: 0.3, magnesioMg: 27, fosforoMg: 22, zincMg: 0.2, vitaminaCMg: 8.7, folatoMcg: 20 }),
    etiquetas: ["tropical", "potasio"], fuente: TCAC,
  }),
  food({
    id: "papaya-fresca", nombre: "Papaya fresca", grupo: "FRUTAS", subgrupo: "Frutas tropicales",
    origenTipo: "CRIOLLO", detalleOrigen: "Fruta de origen tropical americano y consumo tradicional en Colombia.",
    descripcion: "Papaya madura sin piel ni semillas, cruda.", unidadBase: "g", porcionComun: porcion(140, "1 taza en cubos"),
    nombreCientifico: "Carica papaya",
    nutrientes: macros(43, 0.5, 10.8, 0.3, { aguaG: 88.1, fibraG: 1.7, azucaresG: 7.8, sodioMg: 8, potasioMg: 182, calcioMg: 20, hierroMg: 0.3, magnesioMg: 21, fosforoMg: 10, vitaminaAMcg: 47, vitaminaCMg: 60.9, folatoMcg: 37 }),
    etiquetas: ["nativo", "vitamina C", "tropical"], fuente: TCAC,
  }),
  food({
    id: "guayaba-comun", nombre: "Guayaba común fresca", grupo: "FRUTAS", subgrupo: "Frutas tropicales",
    origenTipo: "CRIOLLO", detalleOrigen: "Fruta nativa de América tropical, de cultivo y consumo tradicional local.",
    descripcion: "Guayaba común madura, cruda, con semillas.", unidadBase: "g", porcionComun: porcion(90, "1 unidad mediana"),
    nombreCientifico: "Psidium guajava",
    nutrientes: macros(68, 2.6, 14.3, 1, { aguaG: 80.8, fibraG: 5.4, azucaresG: 8.9, grasasSaturadasG: 0.3, grasasMonoinsaturadasG: 0.1, grasasPoliinsaturadasG: 0.4, sodioMg: 2, potasioMg: 417, calcioMg: 18, hierroMg: 0.3, magnesioMg: 22, fosforoMg: 40, vitaminaAMcg: 31, vitaminaCMg: 228.3, folatoMcg: 49 }),
    etiquetas: ["nativo", "vitamina C", "fibra"], fuente: TCAC,
  }),
  food({
    id: "uchuva-fresca", nombre: "Uchuva fresca", grupo: "FRUTAS", subgrupo: "Frutas andinas",
    origenTipo: "CRIOLLO", detalleOrigen: "Fruta andina nativa y de producción tradicional colombiana.",
    descripcion: "Uchuvas frescas sin capacho, listas para consumo.", unidadBase: "g", porcionComun: porcion(80, "½ taza"),
    nombreCientifico: "Physalis peruviana",
    nutrientes: macros(53, 1.9, 11.2, 0.7, { aguaG: 85.4, fibraG: 2.2, azucaresG: 8, sodioMg: 1, potasioMg: 190, calcioMg: 9, hierroMg: 1, fosforoMg: 40, vitaminaAMcg: 36, vitaminaCMg: 11 }),
    etiquetas: ["andino", "nativo", "vitamina C"], fuente: TCAC,
  }),
  food({
    id: "aguacate-hass", nombre: "Aguacate Hass", grupo: "FRUTAS", subgrupo: "Frutas grasas",
    origenTipo: "NO_CRIOLLO", detalleOrigen: "Variedad comercial Hass; aunque el aguacate es americano, esta variedad se clasifica como no criolla.",
    descripcion: "Aguacate Hass maduro sin piel ni semilla.", unidadBase: "g", porcionComun: porcion(70, "⅓ de aguacate mediano"),
    nombreCientifico: "Persea americana var. Hass",
    nutrientes: macros(160, 2, 8.5, 14.7, { aguaG: 73.2, fibraG: 6.7, azucaresG: 0.7, grasasSaturadasG: 2.1, grasasMonoinsaturadasG: 9.8, grasasPoliinsaturadasG: 1.8, sodioMg: 7, potasioMg: 485, calcioMg: 12, hierroMg: 0.6, magnesioMg: 29, fosforoMg: 52, zincMg: 0.6, vitaminaCMg: 10, folatoMcg: 81 }),
    etiquetas: ["grasa saludable", "fibra", "Hass"],
  }),
  food({
    id: "tomate-chonto-crudo", nombre: "Tomate chonto crudo", grupo: "VERDURAS", subgrupo: "Frutas culinarias",
    origenTipo: "CRIOLLO", detalleOrigen: "Variedad hortícola de uso tradicional colombiano; especie americana.",
    descripcion: "Tomate chonto fresco, lavado y sin preparación.", unidadBase: "g", porcionComun: porcion(120, "1 unidad grande"),
    nombreCientifico: "Solanum lycopersicum",
    nutrientes: macros(18, 0.9, 3.9, 0.2, { aguaG: 94.5, fibraG: 1.2, azucaresG: 2.6, sodioMg: 5, potasioMg: 237, calcioMg: 10, hierroMg: 0.3, magnesioMg: 11, fosforoMg: 24, vitaminaAMcg: 42, vitaminaCMg: 13.7, folatoMcg: 15 }),
    etiquetas: ["local", "ensalada", "vitamina C"], fuente: TCAC,
  }),
  food({
    id: "zanahoria-cruda", nombre: "Zanahoria cruda", grupo: "VERDURAS", subgrupo: "Hortalizas de raíz",
    origenTipo: "NO_CRIOLLO", detalleOrigen: "Hortaliza foránea, aunque se cultiva localmente; no variedad autóctona.",
    descripcion: "Zanahoria fresca pelada, cruda.", unidadBase: "g", porcionComun: porcion(80, "1 unidad mediana"),
    nombreCientifico: "Daucus carota",
    nutrientes: macros(41, 0.9, 9.6, 0.2, { aguaG: 88.3, fibraG: 2.8, azucaresG: 4.7, sodioMg: 69, potasioMg: 320, calcioMg: 33, hierroMg: 0.3, magnesioMg: 12, fosforoMg: 35, vitaminaAMcg: 835, vitaminaCMg: 5.9, folatoMcg: 19 }),
    etiquetas: ["vitamina A", "ensalada"],
  }),
  food({
    id: "ahuyama-cocida", nombre: "Ahuyama cocida", grupo: "VERDURAS", subgrupo: "Cucurbitáceas",
    origenTipo: "CRIOLLO", detalleOrigen: "Cucurbitácea americana de uso alimentario tradicional local.",
    descripcion: "Ahuyama pelada y cocida en agua, sin sal.", unidadBase: "g", porcionComun: porcion(120, "1 taza en cubos"),
    nombreCientifico: "Cucurbita moschata",
    nutrientes: macros(45, 1.1, 11.7, 0.1, { aguaG: 86, fibraG: 2, azucaresG: 2.2, sodioMg: 1, potasioMg: 350, calcioMg: 35, hierroMg: 0.5, magnesioMg: 22, vitaminaAMcg: 532, vitaminaCMg: 10 }),
    etiquetas: ["nativo", "vitamina A", "tradicional"], fuente: TCAC,
  }),
  food({
    id: "frijol-rojo-cocido", nombre: "Frijol rojo cocido", grupo: "LEGUMINOSAS", subgrupo: "Frijoles / cocidos",
    origenTipo: "CRIOLLO", detalleOrigen: "Leguminosa americana y preparación tradicional colombiana; no especifica variedad regional.",
    descripcion: "Frijol rojo cocido en agua, sin sal ni grasa añadida.", unidadBase: "g", porcionComun: porcion(150, "¾ de taza"),
    nombreCientifico: "Phaseolus vulgaris",
    nutrientes: macros(127, 8.7, 22.8, 0.5, { aguaG: 66.9, fibraG: 6.4, azucaresG: 0.3, grasasSaturadasG: 0.1, grasasPoliinsaturadasG: 0.3, sodioMg: 2, potasioMg: 405, calcioMg: 28, hierroMg: 2.9, magnesioMg: 45, fosforoMg: 142, zincMg: 1.1, folatoMcg: 130 }),
    etiquetas: ["nativo", "proteína vegetal", "fibra", "cocido"], fuente: TCAC,
  }),
  food({
    id: "lenteja-cocida", nombre: "Lenteja cocida", grupo: "LEGUMINOSAS", subgrupo: "Lentejas / cocidas",
    origenTipo: "NO_CRIOLLO", detalleOrigen: "Leguminosa foránea; preparación genérica cocida.",
    descripcion: "Lentejas cocidas en agua, sin sal.", unidadBase: "g", porcionComun: porcion(150, "¾ de taza"),
    nombreCientifico: "Lens culinaris",
    nutrientes: macros(116, 9, 20.1, 0.4, { aguaG: 69.6, fibraG: 7.9, azucaresG: 1.8, grasasSaturadasG: 0.1, grasasPoliinsaturadasG: 0.2, sodioMg: 2, potasioMg: 369, calcioMg: 19, hierroMg: 3.3, magnesioMg: 36, fosforoMg: 180, zincMg: 1.3, folatoMcg: 181 }),
    etiquetas: ["proteína vegetal", "fibra", "hierro", "cocido"],
  }),
  food({
    id: "garbanzo-cocido", nombre: "Garbanzo cocido", grupo: "LEGUMINOSAS", subgrupo: "Garbanzos / cocidos",
    origenTipo: "NO_CRIOLLO", detalleOrigen: "Leguminosa foránea; preparación genérica cocida.",
    descripcion: "Garbanzos cocidos en agua, sin sal.", unidadBase: "g", porcionComun: porcion(150, "¾ de taza"),
    nutrientes: macros(164, 8.9, 27.4, 2.6, { aguaG: 60.2, fibraG: 7.6, azucaresG: 4.8, grasasSaturadasG: 0.3, grasasMonoinsaturadasG: 0.6, grasasPoliinsaturadasG: 1.2, sodioMg: 7, potasioMg: 291, calcioMg: 49, hierroMg: 2.9, magnesioMg: 48, fosforoMg: 168, zincMg: 1.5, folatoMcg: 172 }),
    etiquetas: ["proteína vegetal", "fibra", "cocido"],
  }),
  food({
    id: "man-sin-sal-tostado", nombre: "Maní tostado sin sal", grupo: "FRUTOS_SECOS", subgrupo: "Maní / tostado",
    origenTipo: "CRIOLLO", detalleOrigen: "Especie originaria de Suramérica y de consumo tradicional; tostado sin sal.",
    descripcion: "Maní tostado seco, sin cáscara, sal ni aceite añadido.", unidadBase: "g", porcionComun: porcion(20, "1 puñado pequeño"),
    nombreCientifico: "Arachis hypogaea",
    nutrientes: macros(587, 24.4, 21.3, 49.7, { aguaG: 1.6, fibraG: 8.4, azucaresG: 4.9, grasasSaturadasG: 6.9, grasasMonoinsaturadasG: 24.6, grasasPoliinsaturadasG: 15.7, sodioMg: 6, potasioMg: 634, calcioMg: 54, hierroMg: 2.3, magnesioMg: 176, fosforoMg: 355, zincMg: 3.3, folatoMcg: 97 }),
    etiquetas: ["nativo", "proteína vegetal", "grasa"], alergenos: ["FRUTOS_SECOS"], fuente: TCAC,
  }),
  food({
    id: "galletas-saltinas", nombre: "Galletas saltinas", grupo: "PROCESADOS", subgrupo: "Panadería industrial",
    origenTipo: "NO_CRIOLLO", detalleOrigen: "Producto horneado industrial; los valores varían según marca y presentación.",
    descripcion: "Galletas saladas tipo saltina; referencia genérica, no una etiqueta de marca.", unidadBase: "g", porcionComun: porcion(25, "5 galletas aproximadamente"),
    nutrientes: macros(421, 9.5, 74.1, 8.8, { aguaG: 4, fibraG: 2.5, azucaresG: 2.7, grasasSaturadasG: 2.1, grasasMonoinsaturadasG: 2.7, grasasPoliinsaturadasG: 3.2, sodioMg: 941, potasioMg: 120, calcioMg: 20, hierroMg: 4.5, fosforoMg: 100, folatoMcg: 120 }),
    etiquetas: ["procesado", "alto en sodio"], alergenos: ["GLUTEN"],
  }),
  food({
    id: "pan-tajado-blanco", nombre: "Pan tajado blanco comercial", grupo: "PROCESADOS", subgrupo: "Panadería industrial",
    origenTipo: "NO_CRIOLLO", detalleOrigen: "Pan industrial de trigo, no tradicional ni autóctono.",
    descripcion: "Pan blanco de molde comercial; valor genérico sin marca.", unidadBase: "g", porcionComun: porcion(50, "2 tajadas"),
    nutrientes: macros(265, 9, 49, 3.2, { aguaG: 36.4, fibraG: 2.7, azucaresG: 5, grasasSaturadasG: 0.7, grasasMonoinsaturadasG: 0.6, grasasPoliinsaturadasG: 1.4, sodioMg: 491, potasioMg: 115, calcioMg: 151, hierroMg: 3.6, magnesioMg: 25, fosforoMg: 100, folatoMcg: 111 }),
    etiquetas: ["procesado", "trigo"], alergenos: ["GLUTEN"],
  }),
  food({
    id: "chocolate-leche", nombre: "Chocolate con leche comercial", grupo: "PROCESADOS", subgrupo: "Confitería",
    origenTipo: "NO_CRIOLLO", detalleOrigen: "Producto de confitería industrial; no equivale a cacao criollo ni chocolate artesanal.",
    descripcion: "Barra de chocolate con leche, referencia genérica por 100 g.", unidadBase: "g", porcionComun: porcion(20, "4 cuadros pequeños"),
    nutrientes: macros(535, 7.7, 59.4, 29.7, { aguaG: 1.5, fibraG: 3.4, azucaresG: 51.5, grasasSaturadasG: 18.5, grasasMonoinsaturadasG: 9.6, grasasPoliinsaturadasG: 1.1, colesterolMg: 23, sodioMg: 79, potasioMg: 372, calcioMg: 189, hierroMg: 2.4, magnesioMg: 63, fosforoMg: 208, zincMg: 2.3, vitaminaB12Mcg: 0.7 }),
    etiquetas: ["procesado", "azúcar añadida"], alergenos: ["LACTEOS"],
  }),
  food({
    id: "panela", nombre: "Panela", grupo: "AZUCARES", subgrupo: "Caña / derivados tradicionales",
    origenTipo: "CRIOLLO", detalleOrigen: "Derivado tradicional colombiano de caña de azúcar; la especie fue introducida, la elaboración es local tradicional.",
    descripcion: "Panela sólida, sin otros ingredientes declarados en esta referencia.", unidadBase: "g", porcionComun: porcion(20, "1 cucharada rallada"),
    nutrientes: macros(380, 0.4, 95, 0.1, { aguaG: 4, azucaresG: 90, sodioMg: 20, potasioMg: 350, calcioMg: 80, hierroMg: 2.5, magnesioMg: 80, fosforoMg: 50 }),
    etiquetas: ["tradicional", "azúcar"], fuente: TCAC,
  }),
  food({
    id: "cafe-tinto-sin-azucar", nombre: "Café tinto sin azúcar", grupo: "BEBIDAS", subgrupo: "Café / preparado",
    origenTipo: "CRIOLLO", detalleOrigen: "Bebida de preparación y cultivo tradicional colombiano; especie introducida históricamente.",
    descripcion: "Infusión filtrada de café, sin azúcar, leche ni crema.", unidadBase: "ml", porcionComun: porcion(150, "1 pocillo"),
    nombreCientifico: "Coffea arabica",
    nutrientes: macros(1, 0.1, 0, 0, { aguaG: 99.7, sodioMg: 2, potasioMg: 49, calcioMg: 2, magnesioMg: 3, fosforoMg: 3 }),
    etiquetas: ["tradicional", "sin azúcar", "bebida"], fuente: TCAC,
  }),
];

export const alimentosColombia: AlimentoColombiano[] = alimentosBase.map((alimento) => {
  const intercambio = INTERCAMBIOS_POR_ALIMENTO[alimento.id];
  return intercambio ? { ...alimento, intercambio: intercambioCompleto(intercambio) } : alimento;
});

export const alimentoPorId = new Map(alimentosColombia.map((alimento) => [alimento.id, alimento]));
