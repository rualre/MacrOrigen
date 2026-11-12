"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, CreditCard, Eye, EyeOff, LoaderCircle, LockKeyhole, LogIn, Mail, ShieldCheck, UserPlus, X } from "lucide-react";
import type { AccessState } from "@/lib/auth/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { SubscriptionWall, precioVisible } from "./subscription-wall";

export type AuthDialogMode = "OPTIONS" | "LOGIN" | "REGISTRO" | "CHECKOUT";

export function AuthDialog({ mode, access, onMode, onClose, onSuccess }: { mode: AuthDialogMode | null; access: AccessState; onMode: (mode: AuthDialogMode) => void; onClose: () => void; onSuccess: (access: AccessState) => void }) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [activada, setActivada] = useState(false);

  useEffect(() => { setError(""); setCargando(false); if (mode !== "CHECKOUT") setActivada(false); }, [mode]);
  useEffect(() => {
    if (!mode) return;
    const cerrar = (event: KeyboardEvent) => { if (event.key === "Escape" && !cargando) onClose(); };
    document.addEventListener("keydown", cerrar); document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", cerrar); document.body.style.overflow = ""; };
  }, [mode, cargando, onClose]);
  if (!mode) return null;

  async function enviar(event: React.FormEvent) {
    event.preventDefault(); setCargando(true); setError("");
    const registro = mode === "REGISTRO";
    try {
      const response = await fetch(`/api/auth/${registro ? "registro" : "login"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(registro ? { nombre, email, password } : { email, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No fue posible continuar");
      onSuccess(data.access);
    } catch (e) { setError((e as Error).message); }
    finally { setCargando(false); }
  }

  async function activarDemo() {
    setCargando(true); setError("");
    try {
      const response = await fetch("/api/suscripcion/demo", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No fue posible activar el acceso");
      setActivada(true); setTimeout(() => onSuccess(data.access), 850);
    } catch (e) { setError((e as Error).message); }
    finally { setCargando(false); }
  }

  const cerrarDesdeFondo = (event: React.MouseEvent<HTMLDivElement>) => { if (event.target === event.currentTarget && !cargando) onClose(); };
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={cerrarDesdeFondo} role="dialog" aria-modal="true" aria-label="Acceso y suscripción">
    <div className={`relative max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-card sm:rounded-3xl ${mode === "OPTIONS" ? "sm:max-w-3xl" : "sm:max-w-lg"}`}>
      <Button variant="ghost" size="icon" onClick={onClose} disabled={cargando} className="absolute right-3 top-3 z-20 bg-background/80" aria-label="Cerrar"><X className="h-5 w-5" /></Button>
      {mode === "OPTIONS" ? <SubscriptionWall access={access} compact onRegister={() => onMode("REGISTRO")} onLogin={() => onMode("LOGIN")} onCheckout={() => onMode("CHECKOUT")} /> : mode === "CHECKOUT" ? <div className="p-6 md:p-8">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950"><CreditCard className="h-5 w-5" /></span><h2 className="mt-5 text-2xl font-extrabold">{activada ? "¡Acceso activado!" : "Suscripción MacrOrigen"}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{activada ? "Tu suscripción demo ya está activa. Preparando tu espacio..." : `Cuenta: ${access.user?.email}. Al continuar se activarán 30 días de acceso demostrativo.`}</p>
        {!activada ? <><div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"><strong className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Simulación local, sin cobro real</strong><p className="mt-1 text-xs leading-relaxed opacity-85">No se conectará con un banco ni se solicitará información de tarjeta. El precio de {precioVisible(access.priceCOP)} COP/mes es solo de configuración demostrativa.</p></div><div className="mt-5 rounded-xl bg-muted p-4 text-xs"><div className="flex justify-between"><span>MacrOrigen Premium · 30 días</span><strong>{precioVisible(access.priceCOP)}</strong></div><div className="mt-2 flex justify-between text-emerald-600"><span>Descuento demostración</span><strong>−{precioVisible(access.priceCOP)}</strong></div><div className="mt-3 flex justify-between border-t pt-3 text-sm"><strong>Total a cobrar hoy</strong><strong>{precioVisible(0)}</strong></div></div>{error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}<Button className="mt-5 w-full" size="lg" onClick={activarDemo} disabled={cargando}>{cargando ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}Activar 30 días de demostración</Button><p className="mt-3 text-center text-[10px] text-muted-foreground">Para cobros reales se debe integrar una pasarela y validar sus webhooks en el servidor.</p></> : <div className="my-8 flex justify-center"><CheckCircle2 className="h-16 w-16 text-emerald-500" /></div>}
      </div> : <div className="p-6 md:p-8"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950">{mode === "LOGIN" ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}</span><h2 className="mt-5 text-2xl font-extrabold">{mode === "LOGIN" ? "Bienvenido de nuevo" : "Crea tu cuenta"}</h2><p className="mt-2 text-sm text-muted-foreground">{mode === "LOGIN" ? "Inicia sesión para revisar tu suscripción y continuar." : "Después de crearla podrás activar tu suscripción para desbloquear nuevos planes."}</p><form onSubmit={enviar} className="mt-6 space-y-4">{mode === "REGISTRO" && <Field label="Nombre"><div className="relative"><UserPlus className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={nombre} onChange={(e) => setNombre(e.target.value)} minLength={2} maxLength={50} autoComplete="name" required /></div></Field>}<Field label="Correo electrónico"><div className="relative"><Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="email" placeholder="tu@correo.com" required /></div></Field><Field label="Contraseña" hint={mode === "REGISTRO" ? "Mínimo 8 caracteres, una letra y un número." : undefined}><div className="relative"><LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9 pr-11" type={mostrar ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} minLength={mode === "REGISTRO" ? 8 : 1} maxLength={72} autoComplete={mode === "REGISTRO" ? "new-password" : "current-password"} required /><button type="button" className="absolute right-3 top-3 text-muted-foreground" onClick={() => setMostrar(!mostrar)} aria-label={mostrar ? "Ocultar contraseña" : "Mostrar contraseña"}>{mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></Field>{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}<Button type="submit" className="w-full" size="lg" disabled={cargando}>{cargando ? <LoaderCircle className="h-4 w-4 animate-spin" /> : mode === "LOGIN" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}{mode === "LOGIN" ? "Iniciar sesión" : "Crear cuenta y continuar"}</Button></form><div className="mt-5 text-center text-xs text-muted-foreground">{mode === "LOGIN" ? <>¿No tienes cuenta? <button className="font-bold text-emerald-600 hover:underline" onClick={() => onMode("REGISTRO")}>Regístrate</button></> : <>¿Ya tienes cuenta? <button className="font-bold text-emerald-600 hover:underline" onClick={() => onMode("LOGIN")}>Inicia sesión</button></>}</div><p className="mt-5 border-t pt-4 text-center text-[10px] leading-relaxed text-muted-foreground">Demo local: contraseñas almacenadas con scrypt y sesiones firmadas en cookies HttpOnly. No uses una contraseña que uses en otros servicios.</p></div>}
    </div>
  </div>;
}
