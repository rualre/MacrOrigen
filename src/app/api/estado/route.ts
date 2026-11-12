import { NextResponse } from "next/server";
import { alimentosColombia } from "@/data/alimentos";
import { INTERCAMBIOS_POR_ALIMENTO } from "@/data/intercambios";
import { proveedoresDisponibles } from "@/lib/ai/service";

export async function GET() {
  const conIntercambio = alimentosColombia.filter((a) => a.intercambio);
  const estados = ["VERIFICADO", "HOMOLOGADO", "DERIVADO", "PENDIENTE"] as const;
  return NextResponse.json({
    estado: "operativo", version: "0.1.0", alimentos: alimentosColombia.length,
    clasificacion: {
      criollos: alimentosColombia.filter((a) => a.origenTipo === "CRIOLLO").length,
      noCriollos: alimentosColombia.filter((a) => a.origenTipo === "NO_CRIOLLO").length,
    },
    intercambios: {
      alimentos: conIntercambio.length,
      registros: Object.keys(INTERCAMBIOS_POR_ALIMENTO).length,
      porEstado: Object.fromEntries(estados.map((estado) => [
        estado, conIntercambio.filter((a) => a.intercambio?.estado === estado).length,
      ])),
      fuente: "GABA 2015 ICBF/FAO, lista nacional basada en UdeA/GIANH",
      poblaciones: ["ADULTOS", "NINOS"],
    },
    almacenamiento: process.env.DATABASE_URL ? "POSTGRESQL_CONFIGURADO" : "CATALOGO_LOCAL",
    cache: Boolean(process.env.UPSTASH_REDIS_REST_URL),
    proveedoresIA: proveedoresDisponibles(),
  });
}
