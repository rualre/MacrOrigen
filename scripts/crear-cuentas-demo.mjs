#!/usr/bin/env node
/**
 * Crea 10 cuentas demo con suscripción activa de larga duración.
 *
 * - Sin --postgres: escribe en .data/auth.json (demo local).
 * - Con --postgres: usa DATABASE_URL y crea/actualiza usuarios en PostgreSQL.
 * - Siempre guarda las credenciales en .data/cuentas-demo.csv (ignorado por Git).
 *
 * Uso: npm run cuentas:demo
 *      npm run cuentas:demo:db
 */
import { randomBytes, randomUUID, scrypt as scryptCallback } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const raiz = process.cwd();
const archivoStore = path.join(raiz, ".data", "auth.json");
const archivoCsv = path.join(raiz, ".data", "cuentas-demo.csv");
const TOTAL = 10;
const FIN_PERIODO = "2099-12-31T23:59:59.999Z";
const usarPostgres = process.argv.includes("--postgres");

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64);
  return `$scrypt$${salt}$${hash.toString("hex")}`;
}

async function leerStore() {
  try {
    const data = JSON.parse(await readFile(archivoStore, "utf8"));
    return { version: 1, usuarios: Array.isArray(data.usuarios) ? data.usuarios : [], usosGratuitos: data.usosGratuitos ?? {} };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return { version: 1, usuarios: [], usosGratuitos: {} };
  }
}

function escaparCsv(valor) {
  return `"${String(valor).replaceAll('"', '""')}"`;
}

function crearPassword(indice) {
  return `MR-${String(indice).padStart(2, "0")}-${randomBytes(9).toString("base64url")}-2026`;
}

function generarCuentas() {
  const cuentas = [];
  for (let indice = 1; indice <= TOTAL; indice += 1) {
    const numero = String(indice).padStart(2, "0");
    cuentas.push({
      numero,
      nombre: `Cuenta ilimitada ${numero}`,
      email: `demo${numero}@macrorigen.app`,
      password: crearPassword(indice),
      referencia: `ILIMITADO-DEMO-${numero}`,
    });
  }
  return cuentas;
}

async function guardarCsv(cuentas) {
  const encabezado = ["nombre", "email", "password", "estado", "finPeriodo", "referencia"].join(",");
  const filas = cuentas.map((cuenta) => [
    cuenta.nombre,
    cuenta.email,
    cuenta.password,
    "ACTIVA",
    FIN_PERIODO,
    cuenta.referencia,
  ].map(escaparCsv).join(","));
  const temporalCsv = `${archivoCsv}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporalCsv, `\uFEFF${[encabezado, ...filas].join("\r\n")}`, { encoding: "utf8", mode: 0o600 });
  await mkdir(path.dirname(archivoCsv), { recursive: true });
  const { rename } = await import("node:fs/promises");
  await rename(temporalCsv, archivoCsv);
}

async function main() {
  if (usarPostgres && !process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL es obligatoria para --postgres");
  }

  const cuentas = generarCuentas();
  const conHash = [];
  for (const cuenta of cuentas) {
    conHash.push({ ...cuenta, passwordHash: await hashPassword(cuenta.password) });
  }

  if (usarPostgres) {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    try {
      await prisma.$transaction(async (tx) => {
        for (const cuenta of conHash) {
          const usuario = await tx.usuario.upsert({
            where: { email: cuenta.email },
            create: { email: cuenta.email, nombre: cuenta.nombre, passwordHash: cuenta.passwordHash },
            update: { nombre: cuenta.nombre, passwordHash: cuenta.passwordHash },
          });
          await tx.suscripcion.upsert({
            where: { usuarioId: usuario.id },
            create: {
              usuarioId: usuario.id,
              estado: "ACTIVA",
              proveedor: "DEMO",
              referenciaExterna: cuenta.referencia,
              precioCOP: 29900,
              finPeriodo: new Date(FIN_PERIODO),
            },
            update: {
              estado: "ACTIVA",
              proveedor: "DEMO",
              referenciaExterna: cuenta.referencia,
              precioCOP: 29900,
              finPeriodo: new Date(FIN_PERIODO),
            },
          });
        }
      });
    } finally {
      await prisma.$disconnect();
    }
    console.log(`Creadas/actualizadas ${cuentas.length} cuentas ilimitadas en PostgreSQL.`);
  } else {
    const store = await leerStore();
    const ahora = new Date().toISOString();
    for (const cuenta of conHash) {
      const suscripcion = {
        estado: "ACTIVA",
        proveedor: "DEMO",
        precioCOP: 29900,
        referenciaExterna: cuenta.referencia,
        finPeriodo: FIN_PERIODO,
      };
      const existente = store.usuarios.find((usuario) => usuario.email === cuenta.email);
      if (existente) {
        existente.nombre = cuenta.nombre;
        existente.passwordHash = cuenta.passwordHash;
        existente.suscripcion = suscripcion;
      } else {
        store.usuarios.push({
          id: randomUUID(),
          email: cuenta.email,
          nombre: cuenta.nombre,
          passwordHash: cuenta.passwordHash,
          creadoEn: ahora,
          suscripcion,
        });
      }
    }
    await mkdir(path.dirname(archivoStore), { recursive: true });
    const temporalStore = `${archivoStore}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporalStore, JSON.stringify(store, null, 2), { encoding: "utf8", mode: 0o600 });
    const { rename } = await import("node:fs/promises");
    await rename(temporalStore, archivoStore);
    console.log(`Creadas/actualizadas ${cuentas.length} cuentas ilimitadas en .data/auth.json.`);
  }

  await guardarCsv(cuentas);
  console.log(`Credenciales: ${archivoCsv}`);
  console.table(cuentas.map(({ nombre, email, password }) => ({ nombre, email, password })));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
