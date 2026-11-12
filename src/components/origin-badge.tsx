import { Leaf, Package } from "lucide-react";
import type { OrigenTipo } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export function OriginBadge({ origen, compact = false }: { origen: OrigenTipo; compact?: boolean }) {
  const criollo = origen === "CRIOLLO";
  return <span title={criollo ? "Clasificación editorial de origen tradicional/local" : "Variedad foránea, industrial o sin clasificación criolla"} className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", criollo ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300")}>
    {criollo ? <Leaf className="h-3 w-3" /> : <Package className="h-3 w-3" />}{compact ? (criollo ? "Criollo" : "No criollo") : (criollo ? "Origen criollo" : "No criollo")}
  </span>;
}
