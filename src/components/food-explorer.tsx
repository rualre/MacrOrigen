"use client";
import { useCallback, useEffect, useState } from "react";
import { BookOpen, ExternalLink, Filter, Info, LoaderCircle, Search, SlidersHorizontal, X } from "lucide-react";
import type { AlimentoColombiano, GrupoAlimenticio, OrigenTipo } from "@/lib/domain/types";
import { GRUPOS } from "@/lib/domain/types";
import { formatNumber, nombreGrupo } from "@/lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { OriginBadge } from "./origin-badge";

export function FoodExplorer() {
  const [q, setQ] = useState("");
  const [consulta, setConsulta] = useState("");
  const [grupo, setGrupo] = useState("TODOS");
  const [origen, setOrigen] = useState("TODOS");
  const [alimentos, setAlimentos] = useState<AlimentoColombiano[]>([]);
  const [modo, setModo] = useState("TEXTO");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [seleccionado, setSeleccionado] = useState<AlimentoColombiano | null>(null);

  useEffect(() => { const id = setTimeout(() => setConsulta(q), 300); return () => clearTimeout(id); }, [q]);
  useEffect(() => {
    const controller = new AbortController();
    async function cargar() {
      setCargando(true); setError("");
      try {
        const params = new URLSearchParams({ q: consulta, grupo, origen, limite: "60" });
        const response = await fetch(`/api/alimentos?${params}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "No fue posible consultar");
        setAlimentos(data.alimentos); setModo(data.modo);
      } catch (e) { if ((e as Error).name !== "AbortError") setError((e as Error).message); }
      finally { if (!controller.signal.aborted) setCargando(false); }
    }
    cargar(); return () => controller.abort();
  }, [consulta, grupo, origen]);

  return <section className="space-y-6" aria-label="Explorador de tablas nutricionales">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-600"><BookOpen className="h-4 w-4" /> Conocimiento bromatológico</div><h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">Explora los alimentos de Colombia</h2><p className="mt-1 text-sm text-muted-foreground">Consulta valores por 100 g/ml, preparación y clasificación de origen.</p></div>
      <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-xs text-muted-foreground"><SlidersHorizontal className="h-4 w-4 text-emerald-600" /> Búsqueda: <strong className="text-foreground">{modo.replaceAll("_", " ").toLowerCase()}</strong></div>
    </div>
    <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-3 text-xs leading-relaxed text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"><Info className="mr-2 inline h-4 w-4" /><strong>Semilla funcional, no catálogo exhaustivo.</strong> Los valores son de referencia para esta versión local y deben homologarse documentalmente con TCAC/etiquetas antes de uso asistivo. Abre cada ficha para revisar su fuente.</div>
    <div className="grid gap-3 rounded-2xl border bg-card p-4 shadow-sm md:grid-cols-[1fr_220px_210px]">
      <div className="relative"><Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca aceite, papa criolla, tilapia..." className="pl-10" aria-label="Buscar alimento" /></div>
      <Select value={grupo} onChange={(e) => setGrupo(e.target.value)} aria-label="Filtrar por grupo"><option value="TODOS">Todos los grupos</option>{GRUPOS.map((g) => <option key={g} value={g}>{nombreGrupo(g)}</option>)}</Select>
      <Select value={origen} onChange={(e) => setOrigen(e.target.value)} aria-label="Filtrar por origen"><option value="TODOS">Cualquier origen</option><option value="CRIOLLO">🌱 Criollo</option><option value="NO_CRIOLLO">📦 No criollo</option></Select>
    </div>
    <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{alimentos.length} resultados en esta consulta</span>{(q || grupo !== "TODOS" || origen !== "TODOS") && <button className="font-semibold text-emerald-600 hover:underline" onClick={() => { setQ(""); setGrupo("TODOS"); setOrigen("TODOS"); }}>Limpiar filtros</button>}</div>
    {cargando ? <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground"><LoaderCircle className="mr-2 h-5 w-5 animate-spin text-emerald-600" />Consultando catálogo...</div> : error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : alimentos.length === 0 ? <div className="rounded-2xl border border-dashed p-12 text-center"><Filter className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><h3 className="font-bold">No encontramos ese alimento</h3><p className="mt-1 text-sm text-muted-foreground">Prueba otro nombre o elimina alguno de los filtros.</p></div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{alimentos.map((alimento, index) => <FoodCard key={alimento.id} alimento={alimento} onClick={() => setSeleccionado(alimento)} index={index} />)}</div>}
    {seleccionado && <FoodDetail alimento={seleccionado} onClose={() => setSeleccionado(null)} />}
  </section>;
}

function FoodCard({ alimento, onClick, index }: { alimento: AlimentoColombiano; onClick: () => void; index: number }) {
  return <button onClick={onClick} style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }} className="group animate-fade-up rounded-2xl border bg-card p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-soft focus:outline-none focus:ring-2 focus:ring-emerald-500">
    <div className="mb-3 flex items-start justify-between gap-2"><span className="rounded-lg bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{nombreGrupo(alimento.grupo)}</span><OriginBadge origen={alimento.origenTipo} compact /></div>
    <h3 className="min-h-12 text-base font-bold leading-snug group-hover:text-emerald-700 dark:group-hover:text-emerald-300">{alimento.nombre}</h3>
    <p className="mt-1 line-clamp-2 h-9 text-xs leading-relaxed text-muted-foreground">{alimento.subgrupo}</p>
    <div className="mt-5 flex items-end justify-between border-t pt-4"><div><strong className="text-2xl font-extrabold text-emerald-600">{formatNumber(alimento.nutrientes.energiaKcal)}</strong><span className="ml-1 text-xs text-muted-foreground">kcal</span><div className="text-[10px] text-muted-foreground">por 100 {alimento.unidadBase}</div></div><div className="text-right text-[11px] leading-5 text-muted-foreground"><div><b className="text-foreground">{formatNumber(alimento.nutrientes.proteinaG, 1)} g</b> proteína</div><div><b className="text-foreground">{formatNumber(alimento.nutrientes.carbohidratosG, 1)} g</b> carbos</div><div><b className="text-foreground">{formatNumber(alimento.nutrientes.grasasTotalesG, 1)} g</b> grasa</div></div></div>
  </button>;
}

function FoodDetail({ alimento, onClose }: { alimento: AlimentoColombiano; onClose: () => void }) {
  const cerrar = useCallback((e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }, [onClose]);
  useEffect(() => { document.addEventListener("keydown", cerrar); document.body.style.overflow = "hidden"; return () => { document.removeEventListener("keydown", cerrar); document.body.style.overflow = ""; }; }, [cerrar]);
  const n = alimento.nutrientes;
  const filas: Array<[string, string | number, string]> = [
    ["Energía", n.energiaKcal, "kcal"], ["Energía", n.energiaKj, "kJ"], ["Agua", n.aguaG, "g"], ["Proteína", n.proteinaG, "g"], ["Carbohidratos disponibles", n.carbohidratosG, "g"], ["Fibra dietaria", n.fibraG, "g"], ["Azúcares", n.azucaresG, "g"], ["Grasas totales", n.grasasTotalesG, "g"], ["├ Saturadas", n.grasasSaturadasG, "g"], ["├ Monoinsaturadas", n.grasasMonoinsaturadasG, "g"], ["└ Poliinsaturadas", n.grasasPoliinsaturadasG, "g"], ["Colesterol", n.colesterolMg, "mg"], ["Sodio", n.sodioMg, "mg"], ["Potasio", n.potasioMg, "mg"], ["Calcio", n.calcioMg, "mg"], ["Hierro", n.hierroMg, "mg"], ["Magnesio", n.magnesioMg, "mg"], ["Fósforo", n.fosforoMg, "mg"], ["Zinc", n.zincMg, "mg"], ["Vitamina A", n.vitaminaAMcg, "µg RAE"], ["Vitamina C", n.vitaminaCMg, "mg"], ["Vitamina B12", n.vitaminaB12Mcg, "µg"], ["Folato", n.folatoMcg, "µg"],
  ];
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true" aria-label={`Ficha de ${alimento.nombre}`}>
    <div className="scrollbar-thin max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-card p-5 shadow-2xl sm:rounded-3xl md:p-7">
      <div className="flex items-start justify-between gap-4"><div><div className="mb-2 flex flex-wrap gap-2"><OriginBadge origen={alimento.origenTipo} /><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">{nombreGrupo(alimento.grupo)}</span></div><h2 className="text-2xl font-extrabold">{alimento.nombre}</h2>{alimento.nombreCientifico && <em className="text-xs text-muted-foreground">{alimento.nombreCientifico}</em>}</div><Button variant="ghost" size="icon" onClick={onClose} aria-label="Cerrar ficha"><X className="h-5 w-5" /></Button></div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{alimento.descripcion}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-emerald-50 p-4 text-sm dark:bg-emerald-950/40"><strong className="mb-1 block text-emerald-800 dark:text-emerald-200">Clasificación de origen</strong><p className="text-xs leading-relaxed text-emerald-900/75 dark:text-emerald-100/75">{alimento.detalleOrigen}</p></div><div className="rounded-xl bg-muted p-4 text-sm"><strong className="mb-1 block">Porción común de referencia</strong><p className="text-xs text-muted-foreground">{alimento.porcionComun.descripcion}: {formatNumber(alimento.porcionComun.gramos)} {alimento.unidadBase}</p><p className="mt-2 text-[11px] text-muted-foreground">La tabla siguiente siempre está normalizada por 100 {alimento.unidadBase}.</p></div></div>
      {alimento.intercambio && <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50/60 p-4 text-xs dark:border-teal-900 dark:bg-teal-950/30">
        <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-teal-900 dark:text-teal-100">Intercambio UdeA/GABA</strong><span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800 dark:bg-teal-900 dark:text-teal-200">{alimento.intercambio.estado}</span></div>
        <p className="mt-2 text-muted-foreground">1 intercambio = <strong className="text-foreground">{formatNumber(alimento.intercambio.gramosPorIntercambio)} {alimento.unidadBase}</strong> · {alimento.intercambio.medidaCasera}</p>
        <p className="mt-1 text-muted-foreground">Grupo: <strong className="text-foreground">{alimento.intercambio.grupoId.replaceAll("_", " ").toLowerCase()}</strong> · Subgrupo: <strong className="text-foreground">{alimento.intercambio.subgrupoId.replaceAll("-", " ")}</strong></p>
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{alimento.intercambio.fuente.documento} {alimento.intercambio.nota}</p>
      </div>}
      <div className="mt-6 overflow-hidden rounded-xl border"><div className="grid grid-cols-2 border-b bg-muted/60 px-4 py-3 text-xs font-bold"><span>Nutriente</span><span className="text-right">Por 100 {alimento.unidadBase}</span></div><div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-x-8">{filas.map(([nombre, valor, unidad]) => <div key={`${nombre}-${unidad}`} className="grid grid-cols-2 border-b px-4 py-2.5 text-xs last:border-0"><span className="text-muted-foreground">{nombre}</span><span className="text-right font-semibold">{formatNumber(Number(valor), 2)} {unidad}</span></div>)}</div></div>
      {alimento.alergenos.length > 0 && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200"><strong>Alérgenos registrados:</strong> {alimento.alergenos.join(", ")}</p>}
      <div className="mt-5 rounded-xl border p-4 text-xs"><strong className="block text-sm">Trazabilidad de la fuente</strong><p className="mt-1 text-muted-foreground">{alimento.fuente.nombre}</p><p className="mt-1 text-amber-700 dark:text-amber-300">{alimento.fuente.documento}</p><a href={alimento.fuente.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 font-semibold text-emerald-600 hover:underline">Consultar fuente general <ExternalLink className="h-3 w-3" /></a><p className="mt-2 text-[10px] text-muted-foreground">Año de referencia: {alimento.fuente.anio} · Registro actualizado: {alimento.fechaActualizacion}</p></div>
    </div>
  </div>;
}
