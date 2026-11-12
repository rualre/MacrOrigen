import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { UsuarioLocal } from "./types";

interface UsoLocal { usados: number; creadoEn: string; actualizadoEn: string }
interface StoreLocal { version: 1; usuarios: UsuarioLocal[]; usosGratuitos: Record<string, UsoLocal> }
const VACIO: StoreLocal = { version: 1, usuarios: [], usosGratuitos: {} };
const ARCHIVO = path.join(process.cwd(), ".data", "auth.json");
let cadena: Promise<unknown> = Promise.resolve();

async function leer(): Promise<StoreLocal> {
  try {
    const data = JSON.parse(await readFile(ARCHIVO, "utf8")) as StoreLocal;
    return { version: 1, usuarios: Array.isArray(data.usuarios) ? data.usuarios : [], usosGratuitos: data.usosGratuitos ?? {} };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.warn("[MacrOrigen] Almacenamiento local de acceso no legible; se usará uno nuevo en memoria");
    return structuredClone(VACIO);
  }
}

/** Serializa escrituras del demo local y reemplaza el archivo de forma atómica. */
export async function actualizarStore<T>(mutacion: (store: StoreLocal) => T | Promise<T>): Promise<T> {
  const operacion = cadena.then(async () => {
    const store = await leer();
    const resultado = await mutacion(store);
    await mkdir(path.dirname(ARCHIVO), { recursive: true });
    const temporal = `${ARCHIVO}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temporal, JSON.stringify(store, null, 2), { encoding: "utf8", mode: 0o600 });
    await rename(temporal, ARCHIVO);
    return resultado;
  });
  cadena = operacion.catch(() => undefined);
  return operacion;
}

export async function buscarUsuarioPorEmail(email: string) {
  const store = await leer();
  return store.usuarios.find((user) => user.email === email.toLowerCase());
}

export async function buscarUsuarioPorId(id: string) {
  const store = await leer();
  return store.usuarios.find((user) => user.id === id);
}
