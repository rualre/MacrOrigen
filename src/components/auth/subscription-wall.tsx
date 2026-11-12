"use client";
import { Check, CreditCard, Infinity, LockKeyhole, LogIn, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import type { AccessState } from "@/lib/auth/types";
import { Button } from "@/components/ui/button";

export function precioVisible(valor: number | undefined) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(valor ?? 29900);
}

export function SubscriptionWall({ access, onRegister, onLogin, onCheckout, compact = false }: { access: AccessState; onRegister: () => void; onLogin: () => void; onCheckout: () => void; compact?: boolean }) {
  return <div className={`overflow-hidden rounded-3xl border border-emerald-200 bg-card shadow-soft ${compact ? "" : "mx-auto max-w-3xl"}`}>
    <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-700 p-6 text-white md:p-8">
      <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10"><LockKeyhole className="h-5 w-5 text-emerald-200" /></span>
      <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-emerald-100"><Sparkles className="h-3.5 w-3.5" />{access.user ? "Tu cuenta está a un paso" : access.requiresSubscription ? "Completaste tus 3 planes gratuitos" : "Tres planes gratis para comenzar"}</div>
      <h2 className="mt-4 text-2xl font-extrabold tracking-tight md:text-3xl">Continúa con MacrOrigen Premium</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-emerald-100/75">Para seguir creando planes necesitas una cuenta y una suscripción activa. Tus resultados anteriores no se han vendido ni compartido.</p>
    </div>
    <div className="grid gap-6 p-6 md:grid-cols-[1fr_0.85fr] md:p-8">
      <div><h3 className="text-sm font-bold">Acceso sin límites de generación</h3><div className="mt-4 space-y-3">{["Crea planes diarios y semanales", "Regenera comidas e intercambia ingredientes", "Genera y descarga tus listas de compras", "Conserva tu cuenta con sesión segura"].map((item) => <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground"><Check className="h-4 w-4 shrink-0 text-emerald-500" />{item}</div>)}</div><div className="mt-5 rounded-xl bg-muted p-3 text-[11px] leading-relaxed text-muted-foreground"><ShieldCheck className="mr-1.5 inline h-4 w-4 text-emerald-600" />El plan alimentario sigue siendo orientativo y no sustituye la valoración de un nutricionista dietista.</div></div>
      <div className="rounded-2xl border bg-muted/30 p-5"><div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><CreditCard className="h-4 w-4 text-emerald-600" />Suscripción mensual · precio demo</div><div className="mt-2"><strong className="text-3xl font-extrabold">{precioVisible(access.priceCOP)}</strong><span className="ml-1 text-xs text-muted-foreground">COP/mes</span></div><div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300"><Infinity className="h-3.5 w-3.5" />Checkout demostrativo: no habrá cargos reales.</div>{access.user ? <Button className="mt-5 w-full" onClick={onCheckout}><CreditCard className="h-4 w-4" />Continuar a la suscripción</Button> : <Button className="mt-5 w-full" onClick={onRegister}><UserPlus className="h-4 w-4" />Crear cuenta y suscribirme</Button>}<Button variant="outline" className="mt-2 w-full" onClick={onLogin}><LogIn className="h-4 w-4" />Ya tengo cuenta</Button><p className="mt-3 text-center text-[10px] leading-relaxed text-muted-foreground">Entorno local. La activación simula una suscripción para probar el flujo; no solicita datos bancarios.</p></div>
    </div>
  </div>;
}
