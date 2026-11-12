import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { GRUPOS } from "../src/lib/domain/types";
import { NUTRIENTES_VACIOS, nutrientKeys } from "../src/lib/nutrition/nutrients";

/** ETL reproducible: CSV normalizado por 100 g/ml -> JSON validado para revisión/seed. */
const filaSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/), nombre: z.string().min(2).max(160),
  nombreCientifico: z.string().max(160).optional().default(""),
  grupo: z.enum(GRUPOS), sub: z.string().min(2).max(120),
  origenTipo: z.enum(["CRIOLLO", "NO_CRIOLLO"]), detalleOrigen: z.string().min(10).max(500),
  descripcion: z.string().min(5).max(500), unidadBase: z.enum(["g", "ml"]),
  porcionGramos: z.coerce.number().positive().max(2000), porcionDescripcion: z.string().min(2).max(160),
  alergenos: z.string().optional().default(""), etiquetas: z.string().optional().default(""),
  fuenteNombre: z.string().min(3), fuenteDocumento: z.string().min(3), fuenteUrl: z.string().url(), fuenteAnio: z.coerce.number().int().min(1900).max(2100),
});

function csvLineas(texto: string): string[][] {
  const filas: string[][] = []; let fila: string[] = []; let campo = ""; let comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const caracter = texto[i];
    if (caracter === '"' && comillas && texto[i + 1] === '"') { campo += '"'; i++; }
    else if (caracter === '"') comillas = !comillas;
    else if (caracter === "," && !comillas) { fila.push(campo.trim()); campo = ""; }
    else if ((caracter === "\n" || caracter === "\r") && !comillas) {
      if (caracter === "\r" && texto[i + 1] === "\n") i++;
      fila.push(campo.trim()); if (fila.some(Boolean)) filas.push(fila); fila = []; campo = "";
    } else campo += caracter;
  }
  if (campo || fila.length) { fila.push(campo.trim()); filas.push(fila); }
  if (comillas) throw new Error("CSV con comillas sin cerrar");
  return filas;
}

async function main() {
  const archivo = process.argv[2];
  if (!archivo) throw new Error("Uso: npx tsx scripts/etl-alimentos.ts data/entrada.csv");
  const filas = csvLineas((await readFile(archivo, "utf8")).replace(/^\ufeff/, ""));
  if (filas.length < 2) throw new Error("El CSV debe incluir encabezados y al menos un registro");
  const headers = filas[0];
  const faltantes = ["id", "nombre", "grupo", "origenTipo", ...nutrientKeys].filter((key) => !headers.includes(key));
  if (faltantes.length) throw new Error(`Columnas requeridas faltantes: ${faltantes.join(", ")}`);
  const ids = new Set<string>();
  const salida = filas.slice(1).map((valores, index) => {
    const crudo = Object.fromEntries(headers.map((header, i) => [header, valores[i] ?? ""]));
    const nutrientes = Object.fromEntries(nutrientKeys.map((key) => {
      const valor = z.coerce.number().finite().min(0).parse(crudo[key] || 0);
      return [key, valor];
    }));
    const fila = filaSchema.parse(crudo);
    if (ids.has(fila.id)) throw new Error(`ID duplicado: ${fila.id}`); ids.add(fila.id);
    if (nutrientes.energiaKcal === 0 && fila.grupo !== "BEBIDAS") throw new Error(`Energía vacía en fila ${index + 2}`);
    return {
      id: fila.id, nombre: fila.nombre, ...(fila.nombreCientifico ? { nombreCientifico: fila.nombreCientifico } : {}),
      grupo: fila.grupo, subgrupo: fila.sub, origenTipo: fila.origenTipo, detalleOrigen: fila.detalleOrigen,
      descripcion: fila.descripcion, unidadBase: fila.unidadBase,
      porcionComun: { gramos: fila.porcionGramos, descripcion: fila.porcionDescripcion },
      nutrientes: { ...NUTRIENTES_VACIOS, ...nutrientes },
      alergenos: fila.alergenos.split("|").map((x) => x.trim()).filter(Boolean), etiquetas: fila.etiquetas.split("|").map((x) => x.trim()).filter(Boolean),
      fuente: { nombre: fila.fuenteNombre, documento: fila.fuenteDocumento, url: fila.fuenteUrl, anio: fila.fuenteAnio },
      fechaActualizacion: new Date().toISOString().slice(0, 10),
    };
  });
  const destino = path.join(".data", "alimentos-validados.json");
  await mkdir(".data", { recursive: true }); await writeFile(destino, JSON.stringify(salida, null, 2), "utf8");
  console.log(`ETL completado: ${salida.length} alimentos válidos → ${destino}. Revisión documental requerida antes de producción.`);
}
main().catch((error) => { console.error(error instanceof z.ZodError ? error.issues : error.message); process.exitCode = 1; });
