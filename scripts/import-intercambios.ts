import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import {
  FUENTE_GABA_UDEA,
  GRUPOS_INTERCAMBIO_DEF,
  INTERCAMBIOS_POR_ALIMENTO,
  SUBGRUPOS_INTERCAMBIO_DEF,
} from "../src/data/intercambios";
import { GRUPOS_INTERCAMBIO, SUBGRUPOS_INTERCAMBIO } from "../src/lib/domain/types";
import { alimentosColombia } from "../src/data/alimentos";

const filaSchema = z.object({
  alimentoId: z.string().trim().min(1).max(120),
  grupoId: z.enum(GRUPOS_INTERCAMBIO),
  subgrupoId: z.enum(SUBGRUPOS_INTERCAMBIO),
  poblacionObjetivo: z.enum(["ADULTOS", "NINOS"]).default("ADULTOS"),
  gramosPorIntercambio: z.coerce.number().positive().max(5000),
  medidaCasera: z.string().trim().min(1).max(160),
  estado: z.enum(["VERIFICADO", "HOMOLOGADO", "DERIVADO", "PENDIENTE"]).default("PENDIENTE"),
  fuenteNombre: z.string().trim().min(3).max(200),
  fuenteDocumento: z.string().trim().min(3).max(500),
  fuenteUrl: z.string().trim().url().max(500),
  fuenteAnio: z.coerce.number().int().min(1900).max(2100),
  nota: z.string().trim().max(500).optional().or(z.literal("").transform(() => undefined)),
});

type Fila = z.infer<typeof filaSchema>;

function argumento(nombre: string, corto?: string) {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === `--${nombre}` || (corto && args[i] === corto)) return args[i + 1];
    if (args[i].startsWith(`--${nombre}=`)) return args[i].split("=").slice(1).join("=");
  }
  return undefined;
}

function bandera(nombre: string) {
  return process.argv.includes(`--${nombre}`);
}

function normalizarClave(clave: string) {
  const limpia = clave.replace(/^\uFEFF/, "").trim();
  const equivalencias: Record<string, string> = {
    alimento: "alimentoId", alimento_id: "alimentoId", slug: "alimentoId", id_alimento: "alimentoId",
    grupo: "grupoId", grupo_intercambio: "grupoId", grupoIntercambio: "grupoId",
    subgrupo: "subgrupoId", subgrupo_intercambio: "subgrupoId", subgrupoIntercambio: "subgrupoId",
    poblacion: "poblacionObjetivo", poblacion_objetivo: "poblacionObjetivo", poblacionObjetivo: "poblacionObjetivo",
    gramos: "gramosPorIntercambio", peso: "gramosPorIntercambio", peso_gramos: "gramosPorIntercambio",
    gramos_por_intercambio: "gramosPorIntercambio", gramosPorIntercambio: "gramosPorIntercambio",
    medida: "medidaCasera", medida_casera: "medidaCasera", medidaCasera: "medidaCasera",
    estado: "estado", estado_fuente: "estado",
    fuente: "fuenteNombre", fuente_nombre: "fuenteNombre", fuenteNombre: "fuenteNombre",
    documento: "fuenteDocumento", fuente_documento: "fuenteDocumento", fuenteDocumento: "fuenteDocumento",
    url: "fuenteUrl", fuente_url: "fuenteUrl", fuenteUrl: "fuenteUrl",
    anio: "fuenteAnio", año: "fuenteAnio", fuente_anio: "fuenteAnio", fuenteAnio: "fuenteAnio",
    nota: "nota", observacion: "nota", observación: "nota",
  };
  return equivalencias[limpia] ?? limpia;
}

function normalizarFila(fila: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(fila).map(([clave, valor]) => [normalizarClave(clave), valor]));
}

function parseCsv(texto: string): Record<string, string>[] {
  const filas: string[][] = [];
  let campo = "";
  let fila: string[] = [];
  let entreComillas = false;
  for (let i = 0; i < texto.length; i += 1) {
    const caracter = texto[i];
    const siguiente = texto[i + 1];
    if (caracter === '"' && entreComillas && siguiente === '"') {
      campo += '"';
      i += 1;
    } else if (caracter === '"') {
      entreComillas = !entreComillas;
    } else if (caracter === "," && !entreComillas) {
      fila.push(campo);
      campo = "";
    } else if ((caracter === "\n" || caracter === "\r") && !entreComillas) {
      if (caracter === "\r" && siguiente === "\n") i += 1;
      fila.push(campo);
      if (fila.some((valor) => valor.trim())) filas.push(fila);
      fila = [];
      campo = "";
    } else {
      campo += caracter;
    }
  }
  fila.push(campo);
  if (fila.some((valor) => valor.trim())) filas.push(fila);
  if (filas.length < 2) throw new Error("El CSV debe tener encabezado y al menos una fila.");
  const encabezados = filas[0].map((valor) => valor.trim());
  return filas.slice(1).map((valores) => Object.fromEntries(encabezados.map((encabezado, indice) => [encabezado, valores[indice] ?? ""])));
}

function validarConsistencia(filas: Fila[]) {
  const grupos = new Map(GRUPOS_INTERCAMBIO_DEF.map((grupo) => [grupo.id, grupo]));
  const subgrupos = new Map(SUBGRUPOS_INTERCAMBIO_DEF.map((subgrupo) => [subgrupo.id, subgrupo]));
  const vistos = new Set<string>();
  for (const fila of filas) {
    const subgrupo = subgrupos.get(fila.subgrupoId);
    if (!subgrupo) throw new Error(`Subgrupo inexistente: ${fila.subgrupoId}`);
    if (subgrupo.grupoId !== fila.grupoId) throw new Error(`${fila.alimentoId}: el subgrupo ${fila.subgrupoId} pertenece a ${subgrupo.grupoId}, no a ${fila.grupoId}`);
    if (!grupos.has(fila.grupoId)) throw new Error(`Grupo inexistente: ${fila.grupoId}`);
    const llave = `${fila.alimentoId}|${fila.subgrupoId}|${fila.poblacionObjetivo}`;
    if (vistos.has(llave)) throw new Error(`Registro duplicado: ${llave}`);
    vistos.add(llave);
  }
}

function filasDesdeSeed(): Fila[] {
  return Object.entries(INTERCAMBIOS_POR_ALIMENTO).map(([alimentoId, intercambio]) => {
    const fuente = intercambio.fuente ?? FUENTE_GABA_UDEA;
    return {
      alimentoId,
      grupoId: intercambio.grupoId,
      subgrupoId: intercambio.subgrupoId,
      poblacionObjetivo: intercambio.poblacionObjetivo ?? "ADULTOS",
      gramosPorIntercambio: intercambio.gramosPorIntercambio,
      medidaCasera: intercambio.medidaCasera,
      estado: intercambio.estado,
      fuenteNombre: fuente.nombre,
      fuenteDocumento: fuente.documento,
      fuenteUrl: fuente.url,
      fuenteAnio: fuente.anio,
      nota: intercambio.nota,
    };
  });
}

function csvDe(filas: Fila[]) {
  const encabezados: Array<keyof Fila> = [
    "alimentoId", "grupoId", "subgrupoId", "poblacionObjetivo", "gramosPorIntercambio",
    "medidaCasera", "estado", "fuenteNombre", "fuenteDocumento", "fuenteUrl", "fuenteAnio", "nota",
  ];
  const escapar = (valor: unknown) => {
    const texto = String(valor ?? "");
    return /[",\n\r]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
  };
  return [encabezados.join(","), ...filas.map((fila) => encabezados.map((campo) => escapar(fila[campo])).join(","))].join("\n");
}

async function aplicarEnBase(filas: Fila[]) {
  if (!process.env.DATABASE_URL?.trim()) throw new Error("Falta DATABASE_URL para aplicar los cambios.");
  const prisma = new PrismaClient();
  try {
    for (const fila of filas) {
      const alimento = await prisma.alimentoColombiano.findUnique({ where: { slug: fila.alimentoId }, select: { id: true } });
      if (!alimento) throw new Error(`El alimento ${fila.alimentoId} no existe en la base; cárgalo antes de importar su intercambio.`);
      await prisma.intercambioAlimento.upsert({
        where: {
          alimentoId_subgrupoId_poblacionObjetivo: {
            alimentoId: alimento.id,
            subgrupoId: fila.subgrupoId,
            poblacionObjetivo: fila.poblacionObjetivo,
          },
        },
        update: {
          gramosPorIntercambio: fila.gramosPorIntercambio,
          medidaCasera: fila.medidaCasera,
          estado: fila.estado,
          fuenteNombre: fila.fuenteNombre,
          fuenteDocumento: fila.fuenteDocumento,
          fuenteUrl: fila.fuenteUrl,
          fuenteAnio: fila.fuenteAnio,
          nota: fila.nota ?? null,
        },
        create: {
          alimentoId: alimento.id,
          subgrupoId: fila.subgrupoId,
          poblacionObjetivo: fila.poblacionObjetivo,
          gramosPorIntercambio: fila.gramosPorIntercambio,
          medidaCasera: fila.medidaCasera,
          estado: fila.estado,
          fuenteNombre: fila.fuenteNombre,
          fuenteDocumento: fila.fuenteDocumento,
          fuenteUrl: fila.fuenteUrl,
          fuenteAnio: fila.fuenteAnio,
          nota: fila.nota ?? null,
        },
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const archivoExportar = argumento("exportar");
  if (archivoExportar) {
    const filas = filasDesdeSeed();
    validarConsistencia(filas);
    const destino = path.resolve(archivoExportar);
    const extension = path.extname(destino).toLowerCase();
    const contenido = extension === ".json" ? JSON.stringify(filas, null, 2) : csvDe(filas);
    await writeFile(destino, contenido, "utf8");
    console.log(`Exportados ${filas.length} intercambios a ${destino}`);
    return;
  }

  const archivo = argumento("archivo", "-f");
  if (!archivo) {
    console.log("Uso:");
    console.log("  npm run import:intercambios -- --archivo data/intercambios.csv --formato csv --dry-run");
    console.log("  npm run import:intercambios -- --archivo data/intercambios.json --formato json --aplicar");
    console.log("  npm run import:intercambios -- --exportar data/intercambios-gaba-2015.csv");
    console.log(`Semilla integrada: ${Object.keys(INTERCAMBIOS_POR_ALIMENTO).length} alimentos con intercambio de ${alimentosColombia.length}.`);
    console.log("Sin --aplicar no se escribe en la base de datos.");
    return;
  }

  const ruta = path.resolve(archivo);
  const formato = (argumento("formato") ?? path.extname(ruta).replace(".", "")).toLowerCase();
  const texto = await readFile(ruta, "utf8");
  let crudos: Record<string, unknown>[];
  if (formato === "csv") {
    crudos = parseCsv(texto).map(normalizarFila);
  } else if (formato === "json") {
    const data = JSON.parse(texto) as unknown;
    const lista = Array.isArray(data) ? data : (data as { intercambios?: unknown }).intercambios;
    if (!Array.isArray(lista)) throw new Error("El JSON debe ser un arreglo o un objeto con la clave intercambios.");
    crudos = lista.map((fila) => normalizarFila(fila as Record<string, unknown>));
  } else {
    throw new Error(`Formato no soportado: ${formato}. Usa csv o json.`);
  }

  const filas = crudos.map((fila, indice) => {
    const parsed = filaSchema.safeParse(fila);
    if (!parsed.success) {
      throw new Error(`Fila ${indice + 2}: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
    }
    return parsed.data;
  });
  validarConsistencia(filas);

  const resumen = {
    archivo: ruta,
    formato,
    filas: filas.length,
    porEstado: Object.fromEntries(["VERIFICADO", "HOMOLOGADO", "DERIVADO", "PENDIENTE"].map((estado) => [
      estado, filas.filter((fila) => fila.estado === estado).length,
    ])),
    porPoblacion: Object.fromEntries(["ADULTOS", "NINOS"].map((poblacion) => [
      poblacion, filas.filter((fila) => fila.poblacionObjetivo === poblacion).length,
    ])),
    alimentos: [...new Set(filas.map((fila) => fila.alimentoId))].length,
  };

  if (bandera("aplicar")) {
    await aplicarEnBase(filas);
    console.log(JSON.stringify({ ...resumen, aplicado: true }, null, 2));
  } else {
    console.log(JSON.stringify({ ...resumen, aplicado: false, nota: "Validación correcta. Usa --aplicar para escribir en PostgreSQL." }, null, 2));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
