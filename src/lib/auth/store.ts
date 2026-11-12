import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { actualizarStore, buscarUsuarioPorEmail as buscarLocalPorEmail, buscarUsuarioPorId as buscarLocalPorId } from "./local-store";
import { INTENTOS_GRATIS, type EstadoSuscripcion, type UsuarioLocal } from "./types";

const globalPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalPrisma.prisma = prisma;

export const usaPostgres = Boolean(process.env.DATABASE_URL);

type UsuarioPrisma = Prisma.UsuarioGetPayload<{ include: { suscripcion: true } }>;

const ESTADOS: EstadoSuscripcion[] = ["PENDIENTE", "ACTIVA", "CANCELADA", "VENCIDA"];

function estado(valor: string | undefined): EstadoSuscripcion {
  return ESTADOS.includes(valor as EstadoSuscripcion) ? valor as EstadoSuscripcion : "PENDIENTE";
}

function mapearUsuario(usuario: UsuarioPrisma): UsuarioLocal {
  return {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre ?? usuario.email.split("@")[0],
    passwordHash: usuario.passwordHash ?? "",
    creadoEn: usuario.createdAt.toISOString(),
    suscripcion: {
      estado: estado(usuario.suscripcion?.estado),
      proveedor: usuario.suscripcion?.proveedor === "DEMO" ? "DEMO" : "POR_CONFIGURAR",
      referenciaExterna: usuario.suscripcion?.referenciaExterna ?? undefined,
      precioCOP: usuario.suscripcion?.precioCOP ?? 29900,
      finPeriodo: usuario.suscripcion?.finPeriodo?.toISOString(),
    },
  };
}

export async function buscarUsuarioPorEmail(email: string): Promise<UsuarioLocal | undefined> {
  if (!usaPostgres) return buscarLocalPorEmail(email);
  const usuario = await prisma.usuario.findUnique({ where: { email: email.toLowerCase() }, include: { suscripcion: true } });
  return usuario ? mapearUsuario(usuario) : undefined;
}

export async function buscarUsuarioPorId(id: string): Promise<UsuarioLocal | undefined> {
  if (!usaPostgres) return buscarLocalPorId(id);
  const usuario = await prisma.usuario.findUnique({ where: { id }, include: { suscripcion: true } });
  return usuario ? mapearUsuario(usuario) : undefined;
}

export async function crearUsuario(datos: { email: string; nombre: string; passwordHash: string; precioCOP: number }): Promise<UsuarioLocal> {
  if (!usaPostgres) {
    const nuevo: UsuarioLocal = {
      id: randomUUID(),
      email: datos.email,
      nombre: datos.nombre,
      passwordHash: datos.passwordHash,
      creadoEn: new Date().toISOString(),
      suscripcion: { estado: "PENDIENTE", proveedor: "POR_CONFIGURAR", precioCOP: datos.precioCOP },
    };
    await actualizarStore((store) => {
      if (store.usuarios.some((user) => user.email === nuevo.email)) throw new Error("EMAIL_EXISTS");
      store.usuarios.push(nuevo);
    });
    return nuevo;
  }

  try {
    const usuario = await prisma.usuario.create({
      data: {
        email: datos.email,
        nombre: datos.nombre,
        passwordHash: datos.passwordHash,
        suscripcion: { create: { estado: "PENDIENTE", proveedor: "POR_CONFIGURAR", precioCOP: datos.precioCOP } },
      },
      include: { suscripcion: true },
    });
    return mapearUsuario(usuario);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new Error("EMAIL_EXISTS");
    throw error;
  }
}

export async function obtenerUso(guestId: string): Promise<number> {
  if (!usaPostgres) {
    return actualizarStore((store) => {
      const actual = store.usosGratuitos[guestId];
      if (actual) return actual.usados;
      store.usosGratuitos[guestId] = { usados: 0, creadoEn: new Date().toISOString(), actualizadoEn: new Date().toISOString() };
      return 0;
    });
  }
  const uso = await prisma.usoGratuito.upsert({ where: { id: guestId }, create: { id: guestId, intentos: 0 }, update: {} });
  return uso.intentos;
}

export async function consumirUso(guestId: string): Promise<{ permitido: boolean; usados: number }> {
  if (!usaPostgres) {
    return actualizarStore((store) => {
      const ahora = new Date().toISOString();
      const uso = store.usosGratuitos[guestId] ?? { usados: 0, creadoEn: ahora, actualizadoEn: ahora };
      if (uso.usados >= INTENTOS_GRATIS) return { permitido: false, usados: uso.usados };
      uso.usados += 1;
      uso.actualizadoEn = ahora;
      store.usosGratuitos[guestId] = uso;
      return { permitido: true, usados: uso.usados };
    });
  }

  // Transacción serializable: evita superar el cupo con dos peticiones simultáneas.
  return prisma.$transaction(async (tx) => {
    const actual = await tx.usoGratuito.findUnique({ where: { id: guestId } });
    if (actual && actual.intentos >= INTENTOS_GRATIS) return { permitido: false, usados: actual.intentos };
    const actualizado = await tx.usoGratuito.upsert({
      where: { id: guestId },
      create: { id: guestId, intentos: 1 },
      update: { intentos: { increment: 1 } },
    });
    return { permitido: true, usados: actualizado.intentos };
  }, { isolationLevel: "Serializable" });
}

export async function activarSuscripcionDemo(userId: string, precioCOP: number): Promise<UsuarioLocal> {
  const fin = new Date(Date.now() + 30 * 86_400_000);
  const referencia = `DEMO-${randomUUID()}`;

  if (!usaPostgres) {
    let actualizado: UsuarioLocal | undefined;
    await actualizarStore((store) => {
      const user = store.usuarios.find((item) => item.id === userId);
      if (!user) throw new Error("USER_NOT_FOUND");
      user.suscripcion = {
        ...user.suscripcion,
        estado: "ACTIVA",
        proveedor: "DEMO",
        referenciaExterna: referencia,
        finPeriodo: fin.toISOString(),
      };
      actualizado = { ...user };
    });
    if (!actualizado) throw new Error("USER_NOT_FOUND");
    return actualizado;
  }

  const existente = await prisma.usuario.findUnique({ where: { id: userId }, include: { suscripcion: true } });
  if (!existente) throw new Error("USER_NOT_FOUND");
  const suscripcion = await prisma.suscripcion.upsert({
    where: { usuarioId: userId },
    create: {
      usuarioId: userId,
      estado: "ACTIVA",
      proveedor: "DEMO",
      referenciaExterna: referencia,
      precioCOP: existente.suscripcion?.precioCOP ?? precioCOP,
      finPeriodo: fin,
    },
    update: {
      estado: "ACTIVA",
      proveedor: "DEMO",
      referenciaExterna: referencia,
      finPeriodo: fin,
    },
  });
  return mapearUsuario({ ...existente, suscripcion });
}
