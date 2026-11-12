import "server-only";
import { randomUUID } from "node:crypto";
import type { NextResponse } from "next/server";
import { buscarUsuarioPorId, consumirUso, obtenerUso } from "./store";
import { insertarGuest, leerGuest, leerSesion } from "./security";
import { INTENTOS_GRATIS, type AccessResolution, type AccessState, type UsuarioLocal } from "./types";

export function precioSuscripcion() {
  const valor = Number(process.env.SUBSCRIPTION_PRICE_COP ?? 29900);
  return Number.isInteger(valor) && valor >= 1000 && valor <= 100_000_000 ? valor : 29900;
}

function suscripcionActiva(user: UsuarioLocal) {
  return user.suscripcion.estado === "ACTIVA" && Boolean(user.suscripcion.finPeriodo && new Date(user.suscripcion.finPeriodo).getTime() > Date.now());
}

export function estadoUsuario(user: UsuarioLocal): AccessState {
  const activa = suscripcionActiva(user);
  return {
    authenticated: true,
    user: { id: user.id, nombre: user.nombre, email: user.email, estadoSuscripcion: activa ? "ACTIVA" : user.suscripcion.estado === "ACTIVA" ? "VENCIDA" : user.suscripcion.estado },
    remainingFree: null, totalFree: INTENTOS_GRATIS, canGenerate: activa,
    requiresSubscription: !activa, demoMode: true, priceCOP: user.suscripcion.precioCOP || precioSuscripcion(),
  };
}

export async function resolverAcceso(request: Request, crearGuest = true): Promise<AccessResolution> {
  const userId = leerSesion(request);
  if (userId) {
    const user = await buscarUsuarioPorId(userId);
    if (user) return { state: estadoUsuario(user), user, guestId: leerGuest(request) ?? undefined };
  }
  let guestId = leerGuest(request) ?? undefined;
  const nuevoGuestId = !guestId && crearGuest ? randomUUID() : undefined;
  if (nuevoGuestId) guestId = nuevoGuestId;
  const usados = guestId ? await obtenerUso(guestId) : 0;
  const restantes = Math.max(0, INTENTOS_GRATIS - usados);
  return {
    guestId, nuevoGuestId,
    state: { authenticated: false, remainingFree: restantes, totalFree: INTENTOS_GRATIS, canGenerate: restantes > 0, requiresSubscription: restantes === 0, demoMode: true, priceCOP: precioSuscripcion() },
  };
}

/** Incremento atómico y con segunda comprobación para evitar superar el cupo en paralelo. */
export async function consumirIntento(guestId: string) {
  return consumirUso(guestId);
}

export function estadoDesdeResolucion(resolucion: AccessResolution, usados?: number): AccessState {
  if (resolucion.user || usados === undefined) return resolucion.state;
  const restantes = Math.max(0, INTENTOS_GRATIS - usados);
  return { ...resolucion.state, remainingFree: restantes, canGenerate: restantes > 0, requiresSubscription: restantes === 0 };
}

export function aplicarCookiesAcceso(response: NextResponse, resolucion: AccessResolution) {
  if (resolucion.nuevoGuestId) insertarGuest(response, resolucion.nuevoGuestId);
  return response;
}
