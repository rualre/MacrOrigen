const base = process.env.BASE_URL ?? "http://localhost:3000";
const perfil = { nombre: "Prueba local", edad: 32, sexo: "FEMENINO", pesoKg: 70, alturaCm: 165, nivelActividad: "MODERADO", objetivo: "MANTENIMIENTO", formula: "MIFFLIN", preferenciaOrigen: "PRIORIZAR_CRIOLLOS", alergias: [], comidasAlDia: 4, dias: 1 };

async function pedir(ruta, opciones) {
  const response = await fetch(base + ruta, opciones);
  const tipo = response.headers.get("content-type") ?? "";
  const data = tipo.includes("json") ? await response.json() : await response.text();
  if (!response.ok) throw new Error(`${ruta} → HTTP ${response.status}: ${JSON.stringify(data).slice(0, 400)}`);
  return data;
}
function post(body) { return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }; }
function afirmar(condicion, mensaje) { if (!condicion) throw new Error(mensaje); }

const home = await pedir("/");
afirmar(home.includes("Macr"), "La Home no contiene la identidad MacrOrigen");
const estado = await pedir("/api/estado");
afirmar(estado.alimentos >= 30, "La semilla no tiene el mínimo esperado");
const busqueda = await pedir("/api/alimentos?q=aceite&origen=CRIOLLO&grupo=ACEITES_GRASAS");
afirmar(busqueda.alimentos.length > 0 && busqueda.alimentos.every((a) => a.origenTipo === "CRIOLLO"), "Filtro de origen incorrecto");
const generado = await pedir("/api/planes", post({ perfil, usarIA: false }));
afirmar(generado.plan.validacion.valido, `Plan fuera de tolerancia: ${generado.plan.validacion.alertas}`);
afirmar(generado.plan.dias[0].comidas.length === 4, "Número de comidas incorrecto");
const original = generado.plan;
const comida = original.dias[0].comidas[1];
const regenerado = await pedir("/api/planes/regenerar", post({ plan: original, comidaId: comida.id }));
afirmar(regenerado.plan.validacion.valido, "Regeneración fuera de tolerancia");
const ingrediente = regenerado.plan.dias[0].comidas[1].ingredientes[0];
const intercambiado = await pedir("/api/planes/intercambiar", post({ plan: regenerado.plan, comidaId: comida.id, alimentoId: ingrediente.alimentoId }));
afirmar(intercambiado.plan.validacion.valido, "Intercambio fuera de tolerancia");
afirmar(!intercambiado.plan.dias[0].comidas[1].ingredientes.some((i) => i.alimentoId === ingrediente.alimentoId), "No se intercambió el ingrediente");

const catalogo = await pedir("/api/alimentos?limite=60");
const idsConIntercambio = new Set(catalogo.alimentos.filter((a) => a.intercambio).map((a) => a.id));
const comidaSwap = intercambiado.plan.dias[0].comidas.find((c) => c.ingredientes.some((i) => idsConIntercambio.has(i.alimentoId)));
afirmar(comidaSwap, "El plan no contiene ingredientes con intercambio verificable");
const ingredienteSwap = comidaSwap.ingredientes.find((i) => idsConIntercambio.has(i.alimentoId));
const equivalencias = await pedir(`/api/diet/swap?alimentoId=${encodeURIComponent(ingredienteSwap.alimentoId)}&intercambios=1`);
afirmar(equivalencias.equivalentes.length > 0, "El endpoint de intercambio no devolvió equivalentes");
afirmar(equivalencias.equivalentes.every((e) => e.gramos > 0 && e.medidaCasera), "Equivalentes sin gramaje o medida casera");
let swap = null;
for (const equivalente of equivalencias.equivalentes) {
  const candidato = await pedir("/api/diet/swap", post({ plan: intercambiado.plan, comidaId: comidaSwap.id, alimentoId: ingredienteSwap.alimentoId, reemplazoId: equivalente.id }));
  if (candidato.plan.validacion.valido && !candidato.plan.dias[0].comidas.find((c) => c.id === comidaSwap.id).ingredientes.some((i) => i.alimentoId === ingredienteSwap.alimentoId)) {
    swap = candidato;
    break;
  }
}
afirmar(swap, "Ningún equivalente del subgrupo mantuvo el plan dentro de ±3%");
afirmar(swap.plan.validacion.valido, "El swap determinístico desbalanceó el plan");

console.log(JSON.stringify({ resultado: "OK", home: 200, alimentosSemilla: estado.alimentos, busqueda: busqueda.alimentos.map((a) => a.nombre), calorias: swap.plan.dias[0].nutrientes.energiaKcal, meta: swap.plan.metas.caloriasObjetivoKcal, desviaciones: swap.plan.validacion.desviaciones, intercambios: swap.plan.intercambiosDiarios, acciones: ["generar", "regenerar", "intercambiar", "swap-deterministico"] }, null, 2));
