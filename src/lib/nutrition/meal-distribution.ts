export interface DistribucionComida {
  tipo: string;
  fraccion: number;
}

export const DISTRIBUCIONES: Record<number, DistribucionComida[]> = {
  3: [
    { tipo: "DESAYUNO", fraccion: 0.3 },
    { tipo: "ALMUERZO", fraccion: 0.4 },
    { tipo: "CENA", fraccion: 0.3 },
  ],
  4: [
    { tipo: "DESAYUNO", fraccion: 0.25 },
    { tipo: "ALMUERZO", fraccion: 0.35 },
    { tipo: "MERIENDA", fraccion: 0.12 },
    { tipo: "CENA", fraccion: 0.28 },
  ],
  5: [
    { tipo: "DESAYUNO", fraccion: 0.22 },
    { tipo: "MEDIA_MANANA", fraccion: 0.1 },
    { tipo: "ALMUERZO", fraccion: 0.32 },
    { tipo: "MERIENDA", fraccion: 0.1 },
    { tipo: "CENA", fraccion: 0.26 },
  ],
  6: [
    { tipo: "DESAYUNO", fraccion: 0.2 },
    { tipo: "MEDIA_MANANA", fraccion: 0.08 },
    { tipo: "ALMUERZO", fraccion: 0.3 },
    { tipo: "MERIENDA", fraccion: 0.08 },
    { tipo: "MEDIA_TARDE", fraccion: 0.08 },
    { tipo: "CENA", fraccion: 0.26 },
  ],
};

export function distribucionPara(comidasAlDia: number): DistribucionComida[] {
  return DISTRIBUCIONES[comidasAlDia] ?? DISTRIBUCIONES[4];
}

export const ES_COLACION = new Set(["MERIENDA", "MEDIA_MANANA", "MEDIA_TARDE"]);
