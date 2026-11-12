import { formatNumber } from "@/lib/utils";

export function MacroCard({ label, value, target, unit, color, note }: { label: string; value: number; target: number; unit: string; color: string; note?: string }) {
  const porcentaje = target ? value / target * 100 : 0;
  return <div className="rounded-2xl border bg-card p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-muted-foreground">{label}</span><span className="text-[10px] font-medium text-muted-foreground">{note ?? `Meta ${formatNumber(target)} ${unit}`}</span></div><div className="mt-2"><strong className="text-2xl font-extrabold">{formatNumber(value)}</strong><span className="ml-1 text-xs text-muted-foreground">{unit}</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, porcentaje))}%` }} /></div><div className="mt-1 text-right text-[10px] text-muted-foreground">{formatNumber(porcentaje)}% de la meta</div></div>;
}
