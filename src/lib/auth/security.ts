import "server-only";
import { createHash, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { NextResponse } from "next/server";

const scrypt = promisify(scryptCallback);
const SESSION_DIAS = 7;
const GUEST_DIAS = 365;

function secreto() {
  const valor = process.env.AUTH_SECRET;
  if (!valor || valor.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET de al menos 32 caracteres es obligatorio");
    return "macrorigen-solo-desarrollo-local-cambiar-auth-secret";
  }
  return valor;
}

function firma(payload: string) { return createHmac("sha256", secreto()).update(payload).digest("base64url"); }
function codificar(data: object) { return Buffer.from(JSON.stringify(data)).toString("base64url"); }
function tokenFirmado(data: object) { const payload = codificar(data); return `${payload}.${firma(payload)}`; }
function verificar(token: string | undefined, tipo: "u" | "g", idKey: "uid" | "gid") {
  if (!token) return null;
  const [payload, recibida] = token.split(".");
  if (!payload || !recibida) return null;
  const esperada = firma(payload);
  if (recibida.length !== esperada.length || !timingSafeEqual(Buffer.from(recibida), Buffer.from(esperada))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { t?: string; exp?: number; uid?: string; gid?: string };
    if (data.t !== tipo || !data.exp || data.exp < Date.now()) return null;
    return data[idKey] ?? null;
  } catch { return null; }
}

export function crearSesion(userId: string) { return tokenFirmado({ t: "u", uid: userId, exp: Date.now() + SESSION_DIAS * 86_400_000 }); }
export function leerSesion(request: Request) { return verificar(leerCookie(request, "macrorigen_session"), "u", "uid"); }
export function crearGuestToken(guestId: string) { return tokenFirmado({ t: "g", gid: guestId, exp: Date.now() + GUEST_DIAS * 86_400_000 }); }
export function leerGuest(request: Request) { return verificar(leerCookie(request, "macrorigen_guest"), "g", "gid"); }

export function leerCookie(request: Request, nombre: string) {
  for (const parte of request.headers.get("cookie")?.split(";") ?? []) {
    const indice = parte.indexOf("=");
    if (indice > 0 && parte.slice(0, indice).trim() === nombre) return decodeURIComponent(parte.slice(indice + 1).trim());
  }
  return undefined;
}

function opciones(maxAge: number) {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge };
}
export function insertarSesion(response: NextResponse, userId: string) { response.cookies.set("macrorigen_session", crearSesion(userId), opciones(SESSION_DIAS * 86_400)); }
export function borrarSesion(response: NextResponse) { response.cookies.set("macrorigen_session", "", opciones(0)); }
export function insertarGuest(response: NextResponse, guestId: string) { response.cookies.set("macrorigen_guest", crearGuestToken(guestId), opciones(GUEST_DIAS * 86_400)); }

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `$scrypt$${salt}$${hash.toString("hex")}`;
}
export async function verificarPassword(password: string, almacenado: string) {
  const [algoritmo, salt, esperadoHex] = almacenado.split("$").filter(Boolean);
  if (algoritmo !== "scrypt" || !salt || !esperadoHex || !/^[a-f0-9]{128}$/.test(esperadoHex)) return false;
  const recibido = (await scrypt(password, salt, 64)) as Buffer;
  const esperado = Buffer.from(esperadoHex, "hex");
  return timingSafeEqual(recibido, esperado);
}
export function identificadorPrivado(valor: string) { return createHash("sha256").update(valor).digest("hex"); }
