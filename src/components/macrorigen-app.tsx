"use client";
import { useCallback, useEffect, useState } from "react";
import { BookOpen, CalendarRange, ChevronRight, CheckCircle2, Gift, LoaderCircle, LockKeyhole, LogIn, LogOut, UserRound } from "lucide-react";
import type { PlanNutricional } from "@/lib/domain/types";
import type { AccessState } from "@/lib/auth/types";
import { FoodExplorer } from "./food-explorer";
import { Onboarding, type IAInfo } from "./onboarding";
import { PlanDashboard } from "./plan-dashboard";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { AuthDialog, type AuthDialogMode } from "./auth/auth-dialog";
import { SubscriptionWall } from "./auth/subscription-wall";

export function MacrOrigenApp() {
  const [vista, setVista] = useState<"plan" | "explorador">("plan");
  const [plan, setPlan] = useState<PlanNutricional | null>(null);
  const [iaInfo, setIaInfo] = useState<IAInfo>();
  const [editando, setEditando] = useState(false);
  const [access, setAccess] = useState<AccessState | null>(null);
  const [authMode, setAuthMode] = useState<AuthDialogMode | null>(null);

  const actualizarAcceso = useCallback((nuevo: AccessState) => setAccess(nuevo), []);
  const refrescarAcceso = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/estado", { cache: "no-store" });
      const data = await response.json();
      if (response.ok) setAccess(data.access);
    } catch { /* El formulario volverá a consultar el acceso al generar */ }
  }, []);
  useEffect(() => {
    const abrirExplorador = () => { if (window.location.hash === "#explorar") setVista("explorador"); };
    abrirExplorador(); window.addEventListener("hashchange", abrirExplorador); refrescarAcceso();
    return () => window.removeEventListener("hashchange", abrirExplorador);
  }, [refrescarAcceso]);

  function generado(nuevo: PlanNutricional, ia: IAInfo, nuevoAcceso?: AccessState) {
    if (nuevoAcceso) setAccess(nuevoAcceso);
    setPlan(nuevo); setIaInfo(ia); setEditando(false); setVista("plan");
    setTimeout(() => document.getElementById("aplicacion")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }
  function requerirSuscripcion(nuevoAcceso?: AccessState) {
    if (nuevoAcceso) setAccess(nuevoAcceso);
    setAuthMode(nuevoAcceso?.authenticated || access?.authenticated ? "CHECKOUT" : "OPTIONS");
  }
  function autenticado(nuevo: AccessState) {
    setAccess(nuevo); setAuthMode(nuevo.canGenerate ? null : "CHECKOUT");
  }
  async function cerrarSesion() {
    await fetch("/api/auth/logout", { method: "POST" });
    setPlan(null); setIaInfo(undefined); setEditando(false); setAuthMode(null);
    await refrescarAcceso();
  }
  function editarPerfil() {
    if (access?.canGenerate) setEditando(true); else requerirSuscripcion();
  }

  return <section id="aplicacion" className="relative mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8"><span id="explorar" className="absolute -top-20" aria-hidden="true" />
    {access && <AccessBar access={access} onLogin={() => setAuthMode("LOGIN")} onSubscribe={() => setAuthMode("OPTIONS")} onLogout={cerrarSesion} />}
    <div className="mb-8 flex w-fit rounded-xl border bg-card p-1 shadow-sm" role="tablist"><button role="tab" aria-selected={vista === "plan"} onClick={() => setVista("plan")} className={cn("flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition", vista === "plan" ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground")}><CalendarRange className="h-4 w-4" />Mi plan</button><button role="tab" aria-selected={vista === "explorador"} onClick={() => setVista("explorador")} className={cn("flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition", vista === "explorador" ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground")}><BookOpen className="h-4 w-4" />Explorar alimentos<ChevronRight className="h-3 w-3" /></button></div>
    <div role="tabpanel">{vista === "explorador" ? <FoodExplorer /> : !access ? <div className="flex min-h-72 items-center justify-center rounded-3xl border bg-card text-sm text-muted-foreground"><LoaderCircle className="mr-2 h-5 w-5 animate-spin text-emerald-600" />Preparando tu acceso gratuito...</div> : plan && !editando ? <PlanDashboard plan={plan} onChange={setPlan} iaInfo={iaInfo} onEditProfile={editarPerfil} access={access} onNeedSubscription={requerirSuscripcion} /> : !access.canGenerate ? <SubscriptionWall access={access} onRegister={() => setAuthMode("REGISTRO")} onLogin={() => setAuthMode("LOGIN")} onCheckout={() => setAuthMode("CHECKOUT")} /> : <Onboarding onGenerated={generado} perfilInicial={plan?.perfil} onNeedSubscription={requerirSuscripcion} />}</div>
    {access && <AuthDialog mode={authMode} access={access} onMode={setAuthMode} onClose={() => setAuthMode(null)} onSuccess={autenticado} />}
  </section>;
}

function AccessBar({ access, onLogin, onSubscribe, onLogout }: { access: AccessState; onLogin: () => void; onSubscribe: () => void; onLogout: () => void }) {
  return <div className="mb-5 flex flex-col items-start justify-between gap-3 rounded-2xl border bg-card p-3.5 shadow-sm sm:flex-row sm:items-center"><div className="flex items-center gap-3"><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${access.canGenerate ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950" : "bg-amber-50 text-amber-600 dark:bg-amber-950"}`}>{access.user ? <UserRound className="h-4 w-4" /> : access.canGenerate ? <Gift className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}</span><div>{access.user ? <><span className="block text-xs font-bold">{access.user.nombre}</span><span className={`flex items-center gap-1 text-[11px] ${access.canGenerate ? "text-emerald-600" : "text-amber-600"}`}>{access.canGenerate ? <CheckCircle2 className="h-3 w-3" /> : <LockKeyhole className="h-3 w-3" />}{access.canGenerate ? "Suscripción demo activa · planes ilimitados" : "Suscripción pendiente de activación"}</span></> : <><span className="block text-xs font-bold">Prueba gratuita</span><span className="text-[11px] text-muted-foreground">{access.remainingFree} de {access.totalFree} planes disponibles · no necesitas cuenta</span></>}</div></div><div className="flex items-center gap-2">{access.user ? <>{!access.canGenerate && <Button size="sm" onClick={onSubscribe}>Activar acceso</Button>}<Button variant="ghost" size="sm" onClick={onLogout}><LogOut className="h-3.5 w-3.5" />Cerrar sesión</Button></> : <><Button variant="ghost" size="sm" onClick={onLogin}><LogIn className="h-3.5 w-3.5" />Iniciar sesión</Button>{access.canGenerate && <Button variant="outline" size="sm" onClick={onSubscribe}>Ver Premium</Button>}</>}</div></div>;
}
