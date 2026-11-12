"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, CheckCircle2, LoaderCircle, ShieldCheck, X } from "lucide-react";
import type { AlimentoColombiano, PlanNutricional } from "@/lib/domain/types";
import { alimentoPorId } from "@/data/alimentos";
import type { AccessState } from "@/lib/auth/types";
import { formatNumber } from "@/lib/utils";
import { OriginBadge } from "./origin-badge";
import { Button } from "./ui/button";

interface EquivalenteApi {
  id: string;
  nombre: string;
  grupo: string;
  origenTipo: AlimentoColombiano["origenTipo"];
  gramos: number;
  medidaCasera: string;
  cantidadIntercambios: number;
  nutrientes: AlimentoColombiano["nutrientes"];
}

interface RespuestaApi {
  alimento: { id: string; nombre: string; intercambio: NonNullable<AlimentoColombiano["intercambio"]> };
  subgrupo: { id: string; nombre: string; grupoId: string } | null;
  cantidad: number;
  equivalentes: EquivalenteApi[];
  regla: string;
  error?: string;
}

const ESTADO_TEXTO: Record<string, string> = {
  VERIFICADO: "Peso verificado en tabla",
  HOMOLOGADO: "Homologado por grupo",
  DERIVADO: "Derivado por preparación",
  PENDIENTE: "Pendiente de verificación",
};

export function SwapDialog({
  plan,
  comidaId,
  alimentoId,
  cantidad,
  onClose,
  onApplied,
  onNeedSubscription,
}: {
  plan: PlanNutricional;
  comidaId: string;
  alimentoId: string;
  cantidad: number;
  onClose: () => void;
  onApplied: (plan: PlanNutricional) => void;
  onNeedSubscription: (access?: AccessState) => void;
}) {
  const [data, setData] = useState<RespuestaApi | null>(null);
  const [cargando, setCargando] = useState(true);
  const [aplicando, setAplicando] = useState("");
  const [error, setError] = useState("");
  const actual = alimentoPorId.get(alimentoId);
  const comida = plan.dias.flatMap((dia) => dia.comidas).find((item) => item.id === comidaId);
  const yaEnComida = useMemo(() => new Set(comida?.ingredientes.map((item) => item.alimentoId) ?? []), [comida]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      alimentoId,
      intercambios: String(cantidad),
      alergias: plan.perfil.alergias.join(","),
      poblacion: "ADULTOS",
      origen: plan.perfil.preferenciaOrigen,
    });
    setCargando(true);
    setError("");
    fetch(`/api/diet/swap?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const json = await response.json() as RespuestaApi;
        if (!response.ok) throw new Error(json.error ?? "No fue posible cargar los equivalentes");
        setData(json);
      })
      .catch((e) => {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      })
      .finally(() => setCargando(false));
    return () => controller.abort();
  }, [alimentoId, cantidad, plan.perfil.alergias, plan.perfil.preferenciaOrigen]);

  async function aplicar(reemplazoId: string) {
    setAplicando(reemplazoId);
    setError("");
    try {
      const response = await fetch("/api/diet/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, comidaId, alimentoId, reemplazoId }),
      });
      const json = await response.json() as { plan?: PlanNutricional; error?: string; code?: string; access?: AccessState };
      if (json.code === "SUBSCRIPTION_REQUIRED") { onNeedSubscription(json.access); return; }
      if (!response.ok || !json.plan) throw new Error(json.error ?? "No fue posible aplicar el intercambio");
      onApplied(json.plan);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAplicando("");
    }
  }

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Intercambiar alimento">
    <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border bg-card shadow-2xl sm:rounded-2xl">
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b bg-card/95 p-4 backdrop-blur">
        <div>
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-600"><ShieldCheck className="h-3.5 w-3.5" />Intercambio determinístico · sin IA</span>
          <h3 className="mt-1 text-lg font-extrabold">Cambiar {actual?.nombre ?? "alimento"}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{formatNumber(cantidad, 1)} intercambio(s) de <strong>{actual?.intercambio?.medidaCasera}</strong> · {ESTADO_TEXTO[actual?.intercambio?.estado ?? ""] ?? "Sin estado"}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar"><X className="h-4 w-4" /></Button>
      </div>
      <div className="p-4">
        {actual?.intercambio && <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-[11px] leading-relaxed text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          <strong>{actual.intercambio.fuente.nombre}</strong>. {actual.intercambio.fuente.alcance}
          {actual.intercambio.nota && <span className="mt-1 block opacity-80">{actual.intercambio.nota}</span>}
        </div>}
        {error && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</div>}
        {cargando ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Buscando equivalentes del mismo subgrupo…</div>
          : data?.equivalentes.length ? <div className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground">{data.regla} Subgrupo: <strong>{data.subgrupo?.nombre ?? data.alimento.intercambio.subgrupoId}</strong>.</p>
            {data.equivalentes.map((equivalente) => {
              const usado = yaEnComida.has(equivalente.id);
              const estado = alimentoPorId.get(equivalente.id)?.intercambio?.estado;
              return <div key={equivalente.id} className="flex flex-col gap-3 rounded-xl border bg-muted/20 p-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">{equivalente.nombre}</span><OriginBadge origen={equivalente.origenTipo} compact /></div>
                  <p className="mt-1 text-[11px] text-muted-foreground"><strong className="text-emerald-600">{formatNumber(equivalente.gramos)} g</strong> · {equivalente.medidaCasera} · {formatNumber(equivalente.cantidadIntercambios, 1)} intercambio(s) · {formatNumber(equivalente.nutrientes.energiaKcal)} kcal</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{ESTADO_TEXTO[estado ?? ""] ?? "Trazabilidad pendiente"}</p>
                </div>
                <Button size="sm" variant={usado ? "outline" : "default"} disabled={usado || Boolean(aplicando)} onClick={() => aplicar(equivalente.id)}>
                  {aplicando === equivalente.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : usado ? <CheckCircle2 className="h-3.5 w-3.5" /> : <ArrowLeftRight className="h-3.5 w-3.5" />}
                  {usado ? "Ya está en la comida" : "Elegir"}
                </Button>
              </div>;
            })}
            <p className="pt-1 text-[10px] text-muted-foreground">El gramaje se recalcula multiplicando los intercambios por el peso del nuevo alimento. No se consulta ningún modelo de lenguaje.</p>
          </div> : <p className="py-10 text-center text-sm text-muted-foreground">No hay otros alimentos verificados en este subgrupo con los filtros actuales.</p>}
      </div>
    </div>
  </div>;
}
