"use client";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeftRight, CheckCircle2, ChevronDown, ClipboardList, Download, LoaderCircle, LockKeyhole, RefreshCw, ShoppingBasket, Sparkles, UtensilsCrossed } from "lucide-react";
import type { ComidaPlan, ItemListaCompras, PlanNutricional } from "@/lib/domain/types";
import { alimentoPorId } from "@/data/alimentos";
import { generarListaCompras } from "@/lib/nutrition/shopping-list";
import { formatNumber, nombreGrupo } from "@/lib/utils";
import { OriginBadge } from "./origin-badge";
import { MacroCard } from "./macro-card";
import { Button } from "./ui/button";
import type { IAInfo } from "./onboarding";
import type { AccessState } from "@/lib/auth/types";
import { MedicalNotice } from "./onboarding";
import { SwapDialog } from "./swap-dialog";

interface ObjetivoIntercambio {
  comidaId: string;
  alimentoId: string;
  cantidad: number;
}

export function PlanDashboard({ plan, onChange, iaInfo, onEditProfile, access, onNeedSubscription }: { plan: PlanNutricional; onChange: (plan: PlanNutricional) => void; iaInfo?: IAInfo; onEditProfile: () => void; access: AccessState; onNeedSubscription: (access?: AccessState) => void }) {
  const [diaActivo, setDiaActivo] = useState(1);
  const [cargando, setCargando] = useState("");
  const [error, setError] = useState("");
  const [mostrarCompras, setMostrarCompras] = useState(false);
  const [intercambio, setIntercambio] = useState<ObjetivoIntercambio | null>(null);
  useEffect(() => { if (diaActivo > plan.dias.length) setDiaActivo(1); }, [plan.dias.length, diaActivo]);
  const dia = plan.dias.find((d) => d.dia === diaActivo) ?? plan.dias[0];
  const lista = useMemo(() => generarListaCompras(plan.dias), [plan.dias]);
  const resumenDia = dia.intercambios ?? plan.intercambiosDiarios ?? [];
  const promedio = useMemo(() => ({
    energiaKcal: plan.dias.reduce((s, d) => s + d.nutrientes.energiaKcal, 0) / plan.dias.length,
    proteinaG: plan.dias.reduce((s, d) => s + d.nutrientes.proteinaG, 0) / plan.dias.length,
    carbohidratosG: plan.dias.reduce((s, d) => s + d.nutrientes.carbohidratosG, 0) / plan.dias.length,
    grasasTotalesG: plan.dias.reduce((s, d) => s + d.nutrientes.grasasTotalesG, 0) / plan.dias.length,
  }), [plan.dias]);

  async function accion(comidaId: string, tipo: "regenerar") {
    if (!access.canGenerate) { onNeedSubscription(); return; }
    setCargando(`${comidaId}-${tipo}`); setError("");
    try {
      const response = await fetch(`/api/planes/${tipo}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, comidaId }) });
      const data = await response.json();
      if (data.code === "SUBSCRIPTION_REQUIRED") { onNeedSubscription(data.access); return; }
      if (!response.ok) throw new Error(data.error ?? "No fue posible completar la acción");
      onChange(data.plan);
    } catch (e) { setError((e as Error).message); }
    finally { setCargando(""); }
  }

  function abrirIntercambio(comidaId: string, alimentoId: string, cantidad: number) {
    if (!access.canGenerate) { onNeedSubscription(); return; }
    setIntercambio({ comidaId, alimentoId, cantidad });
  }

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-600"><Sparkles className="h-4 w-4" />{plan.dias.length === 1 ? "Tu plan de hoy" : "Tu plan semanal"}</div>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">Hola, {plan.perfil.nombre || "Invitado"}. Este es tu plan.</h2>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">{plan.metodo === "IA_HIBRIDA" ? <><Sparkles className="h-3.5 w-3.5" /> Menú asistido por {plan.proveedorIA} · gramos calculados con intercambios</> : <><CheckCircle2 className="h-3.5 w-3.5" /> Selección local determinística · gramos calculados con intercambios</>}</p>
      </div>
      <div className="flex gap-2"><Button variant="outline" size="sm" onClick={onEditProfile}>Ajustar perfil</Button><Button size="sm" variant="secondary" onClick={() => setMostrarCompras(!mostrarCompras)}><ShoppingBasket className="h-4 w-4" />Lista de compras<ChevronDown className={`h-3 w-3 transition ${mostrarCompras ? "rotate-180" : ""}`} /></Button></div>
    </div>

    {!access.canGenerate && <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100 sm:flex-row sm:items-center"><div className="flex items-start gap-2"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" /><div><strong className="block">Agotaste tu acceso gratuito</strong><span className="mt-1 block opacity-80">Puedes revisar este plan y su lista. Para crear otro, regenerar o intercambiar necesitas una suscripción activa.</span></div></div><Button size="sm" className="shrink-0" onClick={() => onNeedSubscription()}>Suscribirme</Button></div>}
    {iaInfo && <div className={`rounded-xl border px-4 py-3 text-xs ${iaInfo.utilizada ? "border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-200" : "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200"}`}>{iaInfo.mensaje}{iaInfo.errores && iaInfo.errores.length > 0 && <details className="mt-1"><summary className="cursor-pointer font-semibold">Detalle del fallback</summary><p className="mt-1 break-all opacity-80">{iaInfo.errores.join(" · ")}</p></details>}</div>}

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><MacroCard label="Energía" value={promedio.energiaKcal} target={plan.metas.caloriasObjetivoKcal} unit="kcal" color="bg-emerald-500" /><MacroCard label="Proteína" value={promedio.proteinaG} target={plan.metas.proteinaObjetivoG} unit="g" color="bg-teal-500" /><MacroCard label="Carbohidratos" value={promedio.carbohidratosG} target={plan.metas.carbohidratosObjetivoG} unit="g" color="bg-amber-400" /><MacroCard label="Grasas" value={promedio.grasasTotalesG} target={plan.metas.grasasObjetivoG} unit="g" color="bg-indigo-400" /></div>

    <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border bg-card p-4 text-xs sm:flex-row sm:items-center"><div className="flex flex-wrap gap-x-5 gap-y-2 text-muted-foreground"><span>TMB <strong className="text-foreground">{formatNumber(plan.metas.tmbKcal)} kcal</strong></span><span>TDEE <strong className="text-foreground">{formatNumber(plan.metas.tdeeKcal)} kcal</strong></span><span>Fibra objetivo <strong className="text-foreground">{formatNumber(plan.metas.fibraObjetivoG)} g</strong></span><span>{plan.perfil.formula === "MIFFLIN" ? "Mifflin-St Jeor" : "Harris-Benedict"}</span></div><div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-bold ${plan.validacion.valido ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>{plan.validacion.valido ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}{plan.validacion.valido ? (plan.dias.length === 1 ? "Día dentro de ±3%" : "Todos los días dentro de ±3%") : "Revisar desviación"}</div></div>
    {!plan.validacion.valido && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100"><strong>Validación matemática:</strong> {plan.validacion.alertas.join(" · ")}. El sistema no presenta esta combinación como calibración exacta; puedes regenerar o ajustar el perfil.</div>}

    {resumenDia.length > 0 && <section className="rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-bold">Intercambios del día {dia.dia}</h3><p className="mt-0.5 text-[11px] text-muted-foreground">Conteo determinístico por grupo; cada alimento muestra su peso y medida casera oficial.</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">UdeA/GABA · sin IA</span></div>
      <div className="mt-3 flex flex-wrap gap-2">{resumenDia.map((item) => <span key={item.grupoId} className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/30 px-2.5 py-1.5 text-[11px]"><strong>{formatNumber(item.cantidad, 1)}</strong><span className="text-muted-foreground">{item.grupoNombre}</span></span>)}</div>
    </section>}

    {plan.dias.length > 1 && <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-2">{plan.dias.map((item) => <button onClick={() => setDiaActivo(item.dia)} key={item.dia} className={`min-w-24 rounded-xl border px-3 py-2.5 text-left transition ${item.dia === dia.dia ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50" : "bg-card hover:bg-muted"}`}><span className="block text-[10px] font-bold uppercase text-muted-foreground">Día</span><span className="text-sm font-bold">{item.dia}</span><span className="float-right text-[10px] text-muted-foreground">{formatNumber(item.nutrientes.energiaKcal)} kcal</span></button>)}</div>}
    {mostrarCompras && <ShoppingList items={lista} dias={plan.dias.length} />}
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</div>}

    <div className="grid items-start gap-4 lg:grid-cols-2">{dia.comidas.map((comida) => <MealCard key={comida.id} comida={comida} cargando={cargando} onRegenerate={() => accion(comida.id, "regenerar")} onSwap={(alimentoId, cantidad) => abrirIntercambio(comida.id, alimentoId, cantidad)} />)}</div>

    <div className="rounded-2xl border bg-muted/40 p-4 text-xs leading-relaxed text-muted-foreground">
      <UtensilsCrossed className="mr-2 inline h-4 w-4 text-emerald-600" /><strong className="text-foreground">Cómo leer las porciones:</strong> los gramos se refieren al estado indicado en el nombre del alimento (crudo o cocido). “ml” aplica a líquidos. El número de intercambios multiplica el peso oficial del alimento; “medida casera” es la referencia de la tabla.
      <div className="mt-2 border-t pt-2"><strong className="text-foreground">Fuente:</strong> 44 alimentos con pesos de las tablas 26-45 de las GABA 2015 (ICBF/FAO), lista nacional basada en la UdeA: 30 verificados directos, 12 homologados por grupo y 2 derivados por preparación. La 5.ª edición UdeA 2023 no está en acceso abierto y no se inventaron sus valores; el importador queda listo para cargarla cuando exista el archivo autorizado.</div>
    </div>
    <MedicalNotice />

    {intercambio && <SwapDialog plan={plan} comidaId={intercambio.comidaId} alimentoId={intercambio.alimentoId} cantidad={intercambio.cantidad} onClose={() => setIntercambio(null)} onApplied={onChange} onNeedSubscription={onNeedSubscription} />}
  </div>;
}

function MealCard({ comida, cargando, onRegenerate, onSwap }: { comida: ComidaPlan; cargando: string; onRegenerate: () => void; onSwap: (alimentoId: string, cantidad: number) => void }) {
  const [abierto, setAbierto] = useState(false);
  return <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
    <div className="flex items-start justify-between gap-3 border-b bg-muted/30 p-4"><div><span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">{comida.tipo.replaceAll("_", " ")}</span><h3 className="mt-1 text-base font-bold capitalize">{comida.nombre || comida.tipo}</h3></div><div className="text-right"><strong className="block text-lg font-extrabold">{formatNumber(comida.nutrientes.energiaKcal)} <span className="text-xs font-normal">kcal</span></strong><span className="text-[10px] text-muted-foreground">P {formatNumber(comida.nutrientes.proteinaG)} · C {formatNumber(comida.nutrientes.carbohidratosG)} · G {formatNumber(comida.nutrientes.grasasTotalesG)}</span></div></div>
    <div className="divide-y">{comida.ingredientes.length ? comida.ingredientes.map((ingrediente) => {
      const alimento = alimentoPorId.get(ingrediente.alimentoId);
      if (!alimento) return null;
      const intercambio = alimento.intercambio;
      const cantidad = ingrediente.intercambios;
      const idCarga = `${comida.id}-${ingrediente.alimentoId}`;
      return <div key={ingrediente.alimentoId} className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-semibold">{alimento.nombre}</span><OriginBadge origen={alimento.origenTipo} compact />{intercambio && <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${intercambio.estado === "VERIFICADO" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`} title={`${intercambio.fuente.nombre}. ${intercambio.nota ?? ""}`}>{intercambio.estado}</span>}</div>
          <div className="mt-1 text-[11px] text-muted-foreground"><strong className="text-emerald-600">{formatNumber(ingrediente.gramos)} {alimento.unidadBase}</strong> · {formatNumber(ingrediente.nutrientes.energiaKcal)} kcal · P {formatNumber(ingrediente.nutrientes.proteinaG, 1)} / C {formatNumber(ingrediente.nutrientes.carbohidratosG, 1)} / G {formatNumber(ingrediente.nutrientes.grasasTotalesG, 1)}</div>
          {intercambio && <div className="mt-1 rounded-md bg-muted/60 px-2 py-1 text-[10px] text-muted-foreground"><strong className="text-foreground">{formatNumber(cantidad ?? ingrediente.gramos / intercambio.gramosPorIntercambio, 1)} intercambio(s)</strong> · {intercambio.medidaCasera} · {intercambio.grupoId.replaceAll("_", " ").toLowerCase()}</div>}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => onSwap(ingrediente.alimentoId, cantidad ?? ingrediente.gramos / (intercambio?.gramosPorIntercambio ?? ingrediente.gramos))} disabled={Boolean(cargando) || !intercambio} title="Intercambiar por equivalente del mismo subgrupo" aria-label={`Intercambiar ${alimento.nombre}`}>{cargando === idCarga ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ArrowLeftRight className="h-3.5 w-3.5" />}</Button>
      </div>;
    }) : <p className="p-4 text-xs text-muted-foreground">No hay ingredientes suficientes para esta comida.</p>}</div>
    <button className="w-full border-t px-4 py-2 text-left text-[11px] text-muted-foreground hover:bg-muted" onClick={() => setAbierto(!abierto)}>{abierto ? "Ocultar" : "Ver"} indicaciones<ChevronDown className={`ml-1 inline h-3 w-3 transition ${abierto ? "rotate-180" : ""}`} /></button>{abierto && <p className="border-t bg-muted/20 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">{comida.preparacion}</p>}
    <div className="flex items-center justify-between border-t px-4 py-3"><span className="flex items-center gap-1 text-[10px] text-muted-foreground"><CheckCircle2 className="h-3 w-3 text-emerald-500" />Gramos y nutrientes trazados al catálogo</span><Button variant="ghost" size="sm" onClick={onRegenerate} disabled={Boolean(cargando)}>{cargando === `${comida.id}-regenerar` ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}Regenerar</Button></div>
  </article>;
}

function ShoppingList({ items, dias }: { items: ItemListaCompras[]; dias: number }) {
  const [comprados, setComprados] = useState<Set<string>>(new Set());
  const grupos = [...new Set(items.map((item) => item.grupo))];
  function alternar(id: string) { setComprados((previo) => { const nuevo = new Set(previo); if (nuevo.has(id)) nuevo.delete(id); else nuevo.add(id); return nuevo; }); }
  function descargar() {
    const encabezado = "Grupo;Alimento;Origen;Cantidad;Gramos/ml\n";
    const filas = items.map((item) => [nombreGrupo(item.grupo), item.nombre, item.origenTipo, item.cantidadCompra, item.gramos].map((v) => `"${String(v).replaceAll('"', '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + encabezado + filas], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const enlace = document.createElement("a"); enlace.href = url; enlace.download = "macrorigen-lista-compras.csv"; enlace.click(); URL.revokeObjectURL(url);
  }
  return <section className="rounded-2xl border border-teal-200 bg-teal-50/50 p-5 dark:border-teal-900 dark:bg-teal-950/30"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h3 className="flex items-center gap-2 font-bold"><ClipboardList className="h-5 w-5 text-teal-600" />Lista de compras · {dias} {dias === 1 ? "día" : "días"}</h3><p className="mt-1 text-xs text-muted-foreground">{items.length} alimentos consolidados; cantidades redondeadas para compra.</p></div><Button variant="outline" size="sm" onClick={descargar}><Download className="h-4 w-4" />Descargar CSV</Button></div><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{grupos.map((grupo) => <div key={grupo} className="rounded-xl border bg-card p-4"><h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">{nombreGrupo(grupo)}</h4><div className="space-y-3">{items.filter((item) => item.grupo === grupo).map((item) => <label key={item.alimentoId} className="flex cursor-pointer items-start gap-2"><input type="checkbox" checked={comprados.has(item.alimentoId)} onChange={() => alternar(item.alimentoId)} className="mt-1 accent-emerald-600" /><span className={comprados.has(item.alimentoId) ? "line-through opacity-50" : ""}><span className="block text-xs font-semibold">{item.nombre}</span><span className="text-[11px] text-muted-foreground">{item.cantidadCompra}</span></span></label>)}</div></div>)}</div></section>;
}
