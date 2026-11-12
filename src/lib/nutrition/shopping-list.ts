import type { DiaPlan, ItemListaCompras } from "@/lib/domain/types";
import { alimentoPorId } from "@/data/alimentos";

export function generarListaCompras(dias: DiaPlan[]): ItemListaCompras[] {
  const totales = new Map<string, number>();
  for (const dia of dias) for (const comida of dia.comidas) for (const ingrediente of comida.ingredientes) {
    totales.set(ingrediente.alimentoId, (totales.get(ingrediente.alimentoId) ?? 0) + ingrediente.gramos);
  }
  return [...totales.entries()].flatMap(([id, gramos]) => {
    const alimento = alimentoPorId.get(id);
    if (!alimento) return [];
    const kg = gramos / 1000;
    const cantidadCompra = kg >= 1 ? `${(Math.ceil(kg * 10) / 10).toLocaleString("es-CO")} kg/L` : `${Math.ceil(gramos / 50) * 50} ${alimento.unidadBase}`;
    return [{ alimentoId: id, nombre: alimento.nombre, grupo: alimento.grupo, origenTipo: alimento.origenTipo, gramos: Math.round(gramos), cantidadCompra }];
  }).sort((a, b) => a.grupo.localeCompare(b.grupo) || a.nombre.localeCompare(b.nombre, "es"));
}
