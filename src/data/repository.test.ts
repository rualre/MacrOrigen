import { describe, expect, it } from "vitest";
import { buscarAlimentosLocal } from "./repository";

 describe("buscador bromatológico", () => {
  it("busca sin depender de tildes", () => { expect(buscarAlimentosLocal({ q: "papa criolla" })[0]?.id).toBe("papa-criolla-cocida"); });
  it("combina grupo y origen", () => {
    const aceites = buscarAlimentosLocal({ grupo: "ACEITES_GRASAS", origen: "CRIOLLO" });
    expect(aceites.length).toBeGreaterThan(0); expect(aceites.every((a) => a.grupo === "ACEITES_GRASAS" && a.origenTipo === "CRIOLLO")).toBe(true);
  });
  it("no devuelve el alérgeno excluido", () => { expect(buscarAlimentosLocal({ alergiasExcluidas: ["LACTEOS"] }).every((a) => !a.alergenos.includes("LACTEOS"))).toBe(true); });
  it("distingue papa criolla de pastusa", () => {
    const criolla = buscarAlimentosLocal({ q: "papa criolla" })[0]; const pastusa = buscarAlimentosLocal({ q: "papa pastusa" })[0];
    expect(criolla.id).not.toBe(pastusa.id); expect(criolla.nutrientes.energiaKcal).not.toBe(pastusa.nutrientes.energiaKcal);
  });
 });
