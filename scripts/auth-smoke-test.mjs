const base = process.env.BASE_URL ?? "http://localhost:3000";
const cookies = new Map();
const perfil = { nombre: "Prueba acceso", edad: 32, sexo: "FEMENINO", pesoKg: 70, alturaCm: 165, nivelActividad: "MODERADO", objetivo: "MANTENIMIENTO", formula: "MIFFLIN", preferenciaOrigen: "PRIORIZAR_CRIOLLOS", alergias: [], comidasAlDia: 4, dias: 1 };

function cookieHeader() { return [...cookies].map(([k, v]) => `${k}=${v}`).join("; "); }
async function solicitar(ruta, { method = "GET", body, esperado = 200 } = {}) {
  const response = await fetch(base + ruta, { method, headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(cookies.size ? { Cookie: cookieHeader() } : {}) }, body: body ? JSON.stringify(body) : undefined });
  for (const cookie of response.headers.getSetCookie()) {
    const [par, ...atributos] = cookie.split(";"); const indice = par.indexOf("="); const nombre = par.slice(0, indice).trim(); const valor = par.slice(indice + 1).trim();
    if (!valor || atributos.some((a) => a.trim().toLowerCase() === "max-age=0")) cookies.delete(nombre); else cookies.set(nombre, valor);
  }
  const data = (response.headers.get("content-type") ?? "").includes("json") ? await response.json() : await response.text();
  if (response.status !== esperado) throw new Error(`${method} ${ruta}: esperado ${esperado}, recibido ${response.status}: ${JSON.stringify(data).slice(0, 400)}`);
  return data;
}
function afirmar(valor, mensaje) { if (!valor) throw new Error(mensaje); }
const post = (body) => ({ method: "POST", body });

const estadoInicial = await solicitar("/api/auth/estado");
afirmar(estadoInicial.access.remainingFree === 3 && estadoInicial.access.canGenerate, "La prueba no inicia con 3 intentos");
let ultimoPlan;
for (let intento = 1; intento <= 3; intento++) {
  const data = await solicitar("/api/planes", post({ perfil, usarIA: false }));
  afirmar(data.access.remainingFree === 3 - intento, `Cupo incorrecto tras intento ${intento}`);
  afirmar(data.plan.validacion.valido, `Plan ${intento} fuera de tolerancia`);
  ultimoPlan = data.plan;
}
const cuarto = await solicitar("/api/planes", { ...post({ perfil, usarIA: false }), esperado: 403 });
afirmar(cuarto.code === "SUBSCRIPTION_REQUIRED" && cuarto.access.remainingFree === 0, "El cuarto intento no exige suscripción");
const comida = ultimoPlan.dias[0].comidas[0];
await solicitar("/api/planes/regenerar", { ...post({ plan: ultimoPlan, comidaId: comida.id }), esperado: 403 });
await solicitar("/api/suscripcion/demo", { ...post({}), esperado: 401 });
const email = `prueba-${Date.now()}@macrorigen.local`;
const password = "PruebaSegura2026";
const registro = await solicitar("/api/auth/registro", { ...post({ nombre: "Prueba MacrOrigen", email, password }), esperado: 201 });
afirmar(registro.access.authenticated && !registro.access.canGenerate && registro.access.user.estadoSuscripcion === "PENDIENTE", "El registro no deja suscripción pendiente");
await solicitar("/api/planes", { ...post({ perfil, usarIA: false }), esperado: 403 });
const activacion = await solicitar("/api/suscripcion/demo", post({}));
afirmar(activacion.access.canGenerate && activacion.access.user.estadoSuscripcion === "ACTIVA", "La suscripción demo no quedó activa");
afirmar(activacion.payment.charged === false, "El demo no debe reportar cobros");
const premium = await solicitar("/api/planes", post({ perfil, usarIA: false }));
afirmar(premium.access.remainingFree === null && premium.plan.validacion.valido, "La cuenta activa no genera planes ilimitados");
await solicitar("/api/auth/logout", post({}));
const trasSalir = await solicitar("/api/auth/estado");
afirmar(!trasSalir.access.authenticated && trasSalir.access.remainingFree === 0, "Cerrar sesión no debe reiniciar la prueba del invitado");
await solicitar("/api/auth/login", { ...post({ email, password: "incorrecta1" }), esperado: 401 });
const login = await solicitar("/api/auth/login", post({ email, password }));
afirmar(login.access.canGenerate && login.access.user.email === email, "No se recuperó la suscripción al iniciar sesión");
await solicitar("/api/auth/logout", post({}));
console.log(JSON.stringify({ resultado: "OK", secuenciaGratis: [2, 1, 0], cuartoIntento: 403, registro: "PENDIENTE", suscripcion: "ACTIVA_DEMO_SIN_COBRO", sesionPersistente: true, reinicioPruebaAlSalir: false }, null, 2));
