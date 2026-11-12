import type { ReactNode } from "react";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block space-y-1.5"><span className="text-xs font-semibold text-foreground/80">{label}</span>{children}{hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}</label>;
}
