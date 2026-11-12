export const INTENTOS_GRATIS = 3;

export type EstadoSuscripcion = "PENDIENTE" | "ACTIVA" | "CANCELADA" | "VENCIDA";

export interface SuscripcionLocal {
  estado: EstadoSuscripcion;
  proveedor: "DEMO" | "POR_CONFIGURAR";
  referenciaExterna?: string;
  precioCOP: number;
  finPeriodo?: string;
}

export interface UsuarioLocal {
  id: string;
  email: string;
  nombre: string;
  passwordHash: string;
  creadoEn: string;
  suscripcion: SuscripcionLocal;
}

export interface AccessState {
  authenticated: boolean;
  user?: { id: string; nombre: string; email: string; estadoSuscripcion: EstadoSuscripcion };
  remainingFree: number | null;
  totalFree: number;
  canGenerate: boolean;
  requiresSubscription: boolean;
  demoMode: true;
  priceCOP: number;
}

export interface AccessResolution {
  state: AccessState;
  guestId?: string;
  nuevoGuestId?: string;
  user?: UsuarioLocal;
}
