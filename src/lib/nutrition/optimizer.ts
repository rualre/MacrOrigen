import type { AlimentoColombiano, MetasNutricionales, Nutrientes } from "@/lib/domain/types";

interface EntradaOptimizacion {
  alimento: AlimentoColombiano;
  comida: number;
  fraccionComida: number;
}

const metricas = [
  { key: "energiaKcal", target: "caloriasObjetivoKcal", peso: 1.4 },
  { key: "proteinaG", target: "proteinaObjetivoG", peso: 1.2 },
  { key: "carbohidratosG", target: "carbohidratosObjetivoG", peso: 1 },
  { key: "grasasTotalesG", target: "grasasObjetivoG", peso: 1.1 },
] as const;

function limites(alimento: AlimentoColombiano): [number, number] {
  if (alimento.grupo === "ACEITES_GRASAS") return [0, 0.35]; // hasta 35 g/día por registro
  if (alimento.grupo === "FRUTOS_SECOS") return [0, 0.6];
  if (alimento.grupo === "VERDURAS") return [0, 3];
  if (alimento.id === "cafe-tinto-sin-azucar") return [1.5, 1.5];
  return [0, 5];
}

/** Descenso de gradiente proyectado (Adam) sobre gramos/100; jamás permite gramos negativos. */
export function optimizarGramajes(entrada: EntradaOptimizacion[], metas: MetasNutricionales) {
  const x0 = entrada.map(({ alimento }) => Math.min(Math.max(alimento.porcionComun.gramos / 100, 0.1), 3));
  const x = [...x0];
  const m = x.map(() => 0);
  const v = x.map(() => 0);
  const bounds = entrada.map(({ alimento }) => limites(alimento));
  const totalComidas = Math.max(...entrada.map((item) => item.comida)) + 1;

  for (let iter = 1; iter <= 1500; iter++) {
    const totales = metricas.map(() => 0);
    const energiaComida = Array.from({ length: totalComidas }, () => 0);
    entrada.forEach(({ alimento, comida }, j) => {
      metricas.forEach((metrica, k) => { totales[k] += alimento.nutrientes[metrica.key] * x[j]; });
      energiaComida[comida] += alimento.nutrientes.energiaKcal * x[j];
    });

    const residuales = metricas.map((metrica, k) => ({
      valor: (totales[k] - metas[metrica.target]) / metas[metrica.target],
      target: metas[metrica.target], peso: metrica.peso,
    }));
    const residualesComida = energiaComida.map((valor, comida) => {
      const target = metas.caloriasObjetivoKcal * (entrada.find((item) => item.comida === comida)?.fraccionComida ?? 1 / totalComidas);
      return { valor: (valor - target) / target, target, peso: 0.22 };
    });

    entrada.forEach(({ alimento, comida }, j) => {
      let gradiente = 0;
      metricas.forEach((metrica, k) => {
        gradiente += 2 * residuales[k].peso * residuales[k].valor * alimento.nutrientes[metrica.key] / residuales[k].target;
      });
      const residualComida = residualesComida[comida];
      gradiente += 2 * residualComida.peso * residualComida.valor * alimento.nutrientes.energiaKcal / residualComida.target;
      gradiente += 0.00002 * (x[j] - x0[j]);
      m[j] = 0.9 * m[j] + 0.1 * gradiente;
      v[j] = 0.999 * v[j] + 0.001 * gradiente * gradiente;
      const mHat = m[j] / (1 - 0.9 ** iter);
      const vHat = v[j] / (1 - 0.999 ** iter);
      const tasa = 0.025 * (1 - 0.75 * iter / 1500);
      x[j] = Math.min(bounds[j][1], Math.max(bounds[j][0], x[j] - tasa * mHat / (Math.sqrt(vHat) + 1e-8)));
    });
  }
  return refinarEnteros(entrada, metas, x.map((valor) => Math.round(valor * 100)));
}

/** Refinamiento de la solución ya redondeada: evita perder la tolerancia por gramos residuales. */
function refinarEnteros(entrada: EntradaOptimizacion[], metas: MetasNutricionales, inicial: number[]) {
  const gramos = [...inicial];
  const minimos = entrada.map(({ alimento }) => Math.ceil(limites(alimento)[0] * 100));
  const maximos = entrada.map(({ alimento }) => Math.floor(limites(alimento)[1] * 100));
  const totalComidas = Math.max(...entrada.map((item) => item.comida)) + 1;

  function costo(valores: number[]) {
    const totales = metricas.map(() => 0);
    const energiaComida = Array.from({ length: totalComidas }, () => 0);
    entrada.forEach(({ alimento, comida }, j) => {
      metricas.forEach((metrica, k) => { totales[k] += alimento.nutrientes[metrica.key] * valores[j] / 100; });
      energiaComida[comida] += alimento.nutrientes.energiaKcal * valores[j] / 100;
    });
    let error = metricas.reduce((suma, metrica, k) => {
      const residual = (totales[k] - metas[metrica.target]) / metas[metrica.target];
      return suma + metrica.peso * residual * residual;
    }, 0);
    energiaComida.forEach((valor, comida) => {
      const target = metas.caloriasObjetivoKcal * (entrada.find((item) => item.comida === comida)?.fraccionComida ?? 1 / totalComidas);
      const residual = (valor - target) / target;
      error += 0.22 * residual * residual;
    });
    return error;
  }

  let actual = costo(gramos);
  for (const paso of [50, 20, 10, 5, 2, 1]) {
    for (let pasada = 0; pasada < 8; pasada++) {
      let cambio = false;
      for (let j = 0; j < gramos.length; j++) {
        for (const direccion of [-1, 1]) {
          const candidato = Math.min(maximos[j], Math.max(minimos[j], gramos[j] + direccion * paso));
          if (candidato === gramos[j]) continue;
          const anterior = gramos[j]; gramos[j] = candidato;
          const nuevoCosto = costo(gramos);
          if (nuevoCosto + 1e-12 < actual) { actual = nuevoCosto; cambio = true; }
          else gramos[j] = anterior;
        }
      }
      if (!cambio) break;
    }
  }
  return gramos;
}

export function nutrientesRelevantes(nutrientes: Nutrientes) {
  return { kcal: nutrientes.energiaKcal, proteina: nutrientes.proteinaG, carbohidratos: nutrientes.carbohidratosG, grasa: nutrientes.grasasTotalesG };
}
