#!/usr/bin/env node
const base = process.env.BASE_URL ?? "http://localhost:3000";
const perfil = { nombre: "Cuenta ilimitada", edad: 32, sexo: "FEMENINO", pesoKg: 70, alturaCm: 165, nivelActividad: "MODERADO", objetivo: "MANTENIMIENTO", formula: "MIFFLIN", preferenciaOrigen: "PRIORIZAR_CRIOLLOS", alergias: [], comidasAlDia: 4, dias: 1 };

async function leerCuentas() {
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const texto = await readFile(path.join(raiz, ".data", "cuentas-demo.csv"), "utf8");
  const lineas = texto.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const separar = (linea) => {
    const campos = [];
    let actual = "";
    let comillas = false;
    for (let i = 0; i < linea.length; i += 1) {
      const c = linea[i];
      if (c === '"' && comillas && linea[i + 1] === '"') { actual += '"'; i += 1; }
      else if (c === '"') comillas = !comillas;
      else if (c === "," && !comillas) { campos.push(actual); actual = ""; }
      else actual += c;
    }
    campos.push(actual);
    return campos;
  };
  const encabezados = separar(lineas[0]);
  return lineas.slice(1).map((linea) => Object.fromEntries(separar(linea).map((valor, i) => [encabezados[i], valor])));
}

async function main() {
  const cuentas = await leerCuentas();
  if (cuentas.length !== 10) throw new Error(`Se esperaban 10 cuentas y hay ${cuentas.length}`);

  const resultados = [];
  for (const cuenta of cuentas) {
    const cookies = new Map();
    const cookieHeader = () => [...cookies].map(([k, v]) => `${k}=${v}`).join("; ");
    const solicitar = async (ruta, { method = "GET", body, esperado = 200 } = {}) => {
      const response = await fetch(base + ruta, {
        method,
        headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(cookies.size ? { Cookie: cookieHeader() } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      for (const cookie of response.headers.getSetCookie()) {
        const [par, ...atributos] = cookie.split(";");
        const indice = par.indexOf("=");
        const nombre = par.slice(0, indice).trim();
        const valor = par.slice(indice + 1).trim();
        if (!valor || atributos.some((a) => a.trim().toLowerCase() === "max-age=0")) cookies.delete(nombre);
        else cookies.set(nombre, valor);
      }
      const data = (response.headers.get("content-type") ?? "").includes("json") ? await response.json() : await response.text();
      if (response.status !== esperado) throw new Error(`${cuenta.email} ${ruta}: esperado ${esperado}, recibido ${response.status}: ${JSON.stringify(data).slice(0, 300)}`);
      return data;
    };

    const login = await solicitar("/api/auth/login", { method: "POST", body: { email: cuenta.email, password: cuenta.password } });
    if (!login.access?.authenticated || !login.access.canGenerate || login.access.remainingFree !== null) {
      throw new Error(`${cuenta.email}: no quedó como cuenta ilimitada`);
    }

    // El plan completo y el swap se ejecutan con una cuenta representativa para
    // no agotar el límite de 12 solicitudes/minuto al validar las 10 sesiones.
    let planEstado = "SESION_VALIDADA";
    let swap = "NO_EJECUTADO";
    if (resultados.length === 0) {
      const plan = await solicitar("/api/planes", { method: "POST", body: { perfil: { ...perfil, nombre: cuenta.nombre }, usarIA: false } });
      if (!plan.plan?.validacion?.valido) throw new Error(`${cuenta.email}: plan inválido: ${plan.plan?.validacion?.alertas?.join(", ")}`);
      if (plan.access?.remainingFree !== null) throw new Error(`${cuenta.email}: el plan consumió cupo gratuito`);
      planEstado = "VALIDO";
      const comida = plan.plan.dias[0].comidas[1];
      swap = "SIN_INGREDIENTE_CON_INTERCAMBIO";
      for (const ingrediente of comida.ingredientes) {
        const response = await fetch(`${base}/api/diet/swap?alimentoId=${encodeURIComponent(ingrediente.alimentoId)}&intercambios=1`);
        if (!response.ok) continue;
        const equivalentes = await response.json();
        if (!equivalentes.equivalentes?.length) continue;
        for (const equivalente of equivalentes.equivalentes) {
          try {
            const aplicado = await solicitar("/api/diet/swap", {
              method: "POST",
              body: { plan: plan.plan, comidaId: comida.id, alimentoId: ingrediente.alimentoId, reemplazoId: equivalente.id },
            });
            if (aplicado.plan?.validacion?.valido) {
              swap = `OK:${equivalente.id}`;
              break;
            }
          } catch {
            // Algunos equivalentes pueden desbalancear la meta; se prueban los siguientes.
          }
        }
        if (swap.startsWith("OK:")) break;
      }
      if (!swap.startsWith("OK:")) throw new Error(`${cuenta.email}: ningún swap mantuvo ±3%`);
    }

    await solicitar("/api/auth/logout", { method: "POST", body: {} });
    resultados.push({ email: cuenta.email, login: "OK", estado: "ACTIVA", cupo: "ILIMITADO", plan: planEstado, swap });
  }

  console.log(JSON.stringify({ resultado: "OK", cuentas: resultados.length, detalle: resultados }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
