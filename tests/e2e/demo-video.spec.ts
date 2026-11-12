import { test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const CURSOR_SCRIPT = `
(() => {
  const style = document.createElement("style");
  style.textContent = "__CURSOR_CSS__";
  const init = () => {
    if (document.getElementById("__demo_cursor")) return;
    document.head.appendChild(style);
    const cursor = document.createElement("div"); cursor.id = "__demo_cursor"; document.body.appendChild(cursor);
    const ring = document.createElement("div"); ring.id = "__demo_ring"; document.body.appendChild(ring);
    window.addEventListener("mousemove", (e) => { cursor.style.left = e.clientX + "px"; cursor.style.top = e.clientY + "px"; });
    window.addEventListener("mousedown", (e) => { cursor.style.width = "34px"; cursor.style.height = "34px"; ring.style.left = e.clientX + "px"; ring.style.top = e.clientY + "px"; ring.classList.remove("active"); void ring.offsetWidth; ring.classList.add("active"); });
    window.addEventListener("mouseup", () => { cursor.style.width = "24px"; cursor.style.height = "24px"; });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
})();
`;

const CURSOR_CSS = `
  #__demo_cursor { position: fixed; left: 0; top: 0; width: 24px; height: 24px; border-radius: 50%; border: 2px solid #0f766e; background: rgba(15,118,110,0.18); transform: translate(-50%, -50%); pointer-events: none; z-index: 2147483647; transition: width .12s, height .12s, background .12s; }
  #__demo_ring { position: fixed; left: 0; top: 0; width: 14px; height: 14px; border-radius: 50%; border: 3px solid #f59e0b; transform: translate(-50%, -50%) scale(1); pointer-events: none; z-index: 2147483646; opacity: 0; }
  #__demo_ring.active { animation: __demo_click .55s ease-out; }
  @keyframes __demo_click { 0% { opacity: .95; transform: translate(-50%, -50%) scale(1); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(3.2); } }
`;

test("demo funcional MacrOrigen 60s", async ({ page }) => {
  await page.addInitScript(CURSOR_SCRIPT.replace("__CURSOR_CSS__", CURSOR_CSS));
  await page.goto("/");
  await page.locator("#aplicacion").scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500);

  await page.getByRole("button", { name: /Iniciar sesión/i }).click();
  await page.getByLabel("Correo electrónico").pressSequentially("demo01@macrorigen.app", { delay: 40 });
  await page.locator('input[type="password"]').pressSequentially("MR-01-W3xsQke4LT6p-2026", { delay: 40 });
  await page.getByRole("button", { name: /Iniciar sesión/i }).last().click();
  await page.waitForTimeout(2000);

  await page.getByLabel("Nombre (opcional)").pressSequentially("Paciente Demo", { delay: 40 });
  await page.getByLabel("Edad").pressSequentially("32", { delay: 40 });
  await page.getByLabel("Sexo para la fórmula").selectOption("MASCULINO");
  await page.getByLabel("Peso (kg)").pressSequentially("74.5", { delay: 40 });
  await page.getByLabel("Estatura (cm)").pressSequentially("176", { delay: 40 });
  await page.getByLabel("Fórmula de TMB").selectOption("MIFFLIN");
  await page.getByLabel("Nivel de actividad física").selectOption("MODERADO");
  await page.getByLabel("Comidas al día").selectOption("4");
  await page.getByRole("button", { name: /Mantener/i }).click();
  await page.getByRole("button", { name: /Un día/i }).click();
  await page.getByLabel("Preferencia de origen").selectOption("PRIORIZAR_CRIOLLOS");
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: /Crear mi plan nutricional/i }).click();
  await page.waitForTimeout(7000);

  await page.evaluate(() => window.scrollTo({ top: 420, behavior: "smooth" }));
  await page.waitForTimeout(3000);
  await page.evaluate(() => window.scrollTo({ top: 900, behavior: "smooth" }));
  await page.waitForTimeout(3000);

  await page.getByRole("tab", { name: /Explorar alimentos/i }).click();
  await page.waitForTimeout(2000);
  await page.getByLabel("Buscar alimento").pressSequentially("Arepa", { delay: 40 });
  await page.waitForTimeout(2000);
  const tarjeta = page.locator("button").filter({ hasText: /Arepa/i }).first();
  if (await tarjeta.count()) {
    await tarjeta.click();
    await page.waitForTimeout(2500);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(2000);
  }

  await page.getByRole("tab", { name: /^Mi plan$/i }).click();
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollTo({ top: 700, behavior: "smooth" }));
  await page.waitForTimeout(2000);
  const intercambiar = page.getByRole("button", { name: /^Intercambiar /i }).first();
  if (await intercambiar.count()) {
    await intercambiar.click();
    await page.waitForTimeout(2500);
    const equivalente = page.locator("button").filter({ hasText: /g$/ }).nth(1);
    if (await equivalente.count()) await equivalente.click();
    await page.waitForTimeout(2000);
    const aplicar = page.getByRole("button", { name: /Aplicar|Intercambiar/i }).last();
    if (await aplicar.count()) await aplicar.click();
    await page.waitForTimeout(3000);
  }

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await page.waitForTimeout(17000);

  const video = page.video();
  await page.close();
  if (video) {
    const origen = await video.path();
    const destinoDir = path.resolve("demo-videos");
    fs.mkdirSync(destinoDir, { recursive: true });
    const destino = path.join(destinoDir, "prueba-funcional-60s.webm");
    fs.copyFileSync(origen, destino);
    console.log("VIDEO_WEBM=" + destino);
  }
});
