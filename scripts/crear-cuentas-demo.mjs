#!/usr/bin/env node
/**
 * Crea 10 cuentas demo con suscripción activa de larga duración.
 *
 * - Escribe de forma atómica en .data/auth.json (ignorado por Git).
 * - Guarda las credenciales en .data/cuentas-demo.csv (también ignorado).
 * - No versiona contraseñas ni modifica las cuentas existentes.
 *
 * Uso: npm run cuentas:demo
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

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64);
  return `$scrypt$${salt}$${hash.toString("hex")}`;
}

async function leerStore() {
  try {
    const data = JSON.parse(await readFile(archivoStore, "utf8"));
    return {
      version: 1,
      usuarios: Array.isArray(data.usuarios) ? data.usuarios : [],
      usosGratuitos: data.usosGratuitos ?? {},
    };
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

async function main() {
  const store = await leerStore();
  const ahora = new Date().toISOString();
  const cuentas = [];

  for (let indice = 1; indice <= TOTAL; indice += 1) {
    const numero = String(indice).padStart(2, "0");
    const email = `demo${numero}@macrorigen.app`;
    const nombre = `Cuenta ilimitada ${numero}`;
    const password = crearPassword(indice);
    const passwordHash = await hashPassword(password);
    const suscripcion = {
      estado: "ACTIVA",
      proveedor: "DEMO",
      precioCOP: 29900,
      referenciaExterna: `ILIMITADO-DEMO-${numero}`,
      finPeriodo: FIN_PERIODO,
    };
    const existente = store.usuarios.find((usuario) => usuario.email === email);
    if (existente) {
      existente.nombre = nombre;
      existente.passwordHash = passwordHash;
      existente.suscripcion = suscripcion;
    } else {
      store.usuarios.push({
        id: randomUUID(),
        email,
        nombre,
        passwordHash,
        creadoEn: ahora,
        suscripcion,
      });
    }
    cuentas.push({ numero, nombre, email, password });
  }

  await mkdir(path.dirname(archivoStore), { recursive: true });
  const temporalStore = `${archivoStore}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporalStore, JSON.stringify(store, null, 2), { encoding: "utf8", mode: 0o600 });
  await rename(temporalStore, archivoStore);

  const encabezado = ["nombre", "email", "password", "estado", "finPeriodo", "referencia"].join(",");
  const filas = cuentas.map((cuenta) => [
    cuenta.nombre,
    cuenta.email,
    cuenta.password,
    "ACTIVA",
    FIN_PERIODO,
    `ILIMITADO-DEMO-${cuenta.numero}`,
  ].map(escaparCsv).join(","));
  const temporalCsv = `${archivoCsv}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporalCsv, `\uFEFF${[encabezado, ...filas].join("\r\n")}`, { encoding: "utf8", mode: 0o600 });
  await rename(temporalCsv, archivoCsv);

  console.log(`Creadas/actualizadas ${cuentas.length} cuentas ilimitadas.`);
  console.log(`Credenciales: ${archivoCsv}`);
  console.table(cuentas.map(({ nombre, email, password }) => ({ nombre, email, password })));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
