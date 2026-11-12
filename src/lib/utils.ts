import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number, digits = 0) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
}

export function nombreGrupo(grupo: string) {
  const nombres: Record<string, string> = {
    CARNES: "Carnes", PESCADOS: "Pescados", HUEVOS: "Huevos", LACTEOS: "Lácteos",
    ACEITES_GRASAS: "Aceites y grasas", TUBERCULOS: "Tubérculos", CEREALES: "Cereales",
    FRUTAS: "Frutas", VERDURAS: "Verduras", LEGUMINOSAS: "Leguminosas",
    PROCESADOS: "Procesados", BEBIDAS: "Bebidas", FRUTOS_SECOS: "Frutos secos", AZUCARES: "Azúcares",
  };
  return nombres[grupo] ?? grupo;
}
