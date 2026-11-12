import { PrismaClient } from '@prisma/client';
import type { GrupoAlimenticio, OrigenTipo } from '@prisma/client';
import { alimentosColombia } from '../src/data/alimentos';
import { GRUPOS_INTERCAMBIO_DEF, SUBGRUPOS_INTERCAMBIO_DEF } from '../src/data/intercambios';

const prisma = new PrismaClient();

type AlimentoSeed = (typeof alimentosColombia)[number];

function nutrientesDe(alimento: AlimentoSeed) {
  return {
    ...alimento.nutrientes,
  };
}

function fechaDe(actualizacion: string, id: string): Date {
  const fecha = new Date(actualizacion);

  if (Number.isNaN(fecha.getTime())) {
    throw new Error(
      `El alimento "${id}" tiene una fechaActualizacion inválida: "${actualizacion}".`,
    );
  }

  return fecha;
}

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error(
      'Falta DATABASE_URL. Define DATABASE_URL con la cadena de conexión de PostgreSQL antes de ejecutar el seed.',
    );
  }

  let procesados = 0;
  let intercambiosProcesados = 0;

  for (const grupo of GRUPOS_INTERCAMBIO_DEF) {
    await prisma.grupoIntercambio.upsert({
      where: { id: grupo.id },
      update: {
        nombre: grupo.nombre,
        orden: grupo.orden,
        descripcion: grupo.descripcion,
        energiaKcal: grupo.perfilOperativo.energiaKcal,
        proteinaG: grupo.perfilOperativo.proteinaG,
        carbohidratosG: grupo.perfilOperativo.carbohidratosG,
        grasasG: grupo.perfilOperativo.grasasG,
        fibraG: grupo.perfilOperativo.fibraG,
      },
      create: {
        id: grupo.id,
        nombre: grupo.nombre,
        orden: grupo.orden,
        descripcion: grupo.descripcion,
        energiaKcal: grupo.perfilOperativo.energiaKcal,
        proteinaG: grupo.perfilOperativo.proteinaG,
        carbohidratosG: grupo.perfilOperativo.carbohidratosG,
        grasasG: grupo.perfilOperativo.grasasG,
        fibraG: grupo.perfilOperativo.fibraG,
      },
    });
  }

  for (const subgrupo of SUBGRUPOS_INTERCAMBIO_DEF) {
    await prisma.subgrupoIntercambio.upsert({
      where: { id: subgrupo.id },
      update: {
        grupoId: subgrupo.grupoId,
        nombre: subgrupo.nombre,
        orden: subgrupo.orden,
        poblacionObjetivo: subgrupo.poblacionObjetivo,
        energiaKcal: subgrupo.perfil.energiaKcal,
        proteinaG: subgrupo.perfil.proteinaG,
        carbohidratosG: subgrupo.perfil.carbohidratosG,
        grasasG: subgrupo.perfil.grasasG,
        fibraG: subgrupo.perfil.fibraG,
        fuenteNombre: subgrupo.fuente.nombre,
        fuenteDocumento: subgrupo.fuente.documento,
        fuenteUrl: subgrupo.fuente.url,
        fuenteAnio: subgrupo.fuente.anio,
      },
      create: {
        id: subgrupo.id,
        grupoId: subgrupo.grupoId,
        nombre: subgrupo.nombre,
        orden: subgrupo.orden,
        poblacionObjetivo: subgrupo.poblacionObjetivo,
        energiaKcal: subgrupo.perfil.energiaKcal,
        proteinaG: subgrupo.perfil.proteinaG,
        carbohidratosG: subgrupo.perfil.carbohidratosG,
        grasasG: subgrupo.perfil.grasasG,
        fibraG: subgrupo.perfil.fibraG,
        fuenteNombre: subgrupo.fuente.nombre,
        fuenteDocumento: subgrupo.fuente.documento,
        fuenteUrl: subgrupo.fuente.url,
        fuenteAnio: subgrupo.fuente.anio,
      },
    });
  }

  for (const alimento of alimentosColombia) {
    if (!alimento.id?.trim()) {
      throw new Error('Todo alimento debe tener un id no vacío para usarlo como slug.');
    }

    try {
      await prisma.$transaction(async (tx) => {
        const fuente = await tx.fuenteNutricional.upsert({
          where: {
            nombre_documento_anio: {
              nombre: alimento.fuente.nombre,
              documento: alimento.fuente.documento,
              anio: alimento.fuente.anio,
            },
          },
          update: {
            url: alimento.fuente.url,
          },
          create: {
            nombre: alimento.fuente.nombre,
            documento: alimento.fuente.documento,
            url: alimento.fuente.url,
            anio: alimento.fuente.anio,
          },
          select: { id: true },
        });

        const datos = {
          nombre: alimento.nombre,
          nombreCientifico: alimento.nombreCientifico ?? null,
          grupo: alimento.grupo as GrupoAlimenticio,
          subgrupo: alimento.subgrupo,
          origenTipo: alimento.origenTipo as OrigenTipo,
          detalleOrigen: alimento.detalleOrigen,
          marca: alimento.marca ?? null,
          descripcion: alimento.descripcion,
          unidadBase: alimento.unidadBase,
          porcionComun: alimento.porcionComun.gramos,
          porcionComunDescripcion: alimento.porcionComun.descripcion,
          ...nutrientesDe(alimento),
          alergenos: [...alimento.alergenos],
          etiquetas: [...alimento.etiquetas],
          fuenteId: fuente.id,
          fechaActualizacion: fechaDe(alimento.fechaActualizacion, alimento.id),
        };

        const alimentoDb = await tx.alimentoColombiano.upsert({
          where: { slug: alimento.id },
          update: datos,
          create: {
            slug: alimento.id,
            ...datos,
          },
          select: { id: true },
        });

        if (alimento.intercambio) {
          const intercambio = alimento.intercambio;
          await tx.intercambioAlimento.upsert({
            where: {
              alimentoId_subgrupoId_poblacionObjetivo: {
                alimentoId: alimentoDb.id,
                subgrupoId: intercambio.subgrupoId,
                poblacionObjetivo: intercambio.poblacionObjetivo,
              },
            },
            update: {
              gramosPorIntercambio: intercambio.gramosPorIntercambio,
              medidaCasera: intercambio.medidaCasera,
              estado: intercambio.estado,
              fuenteNombre: intercambio.fuente.nombre,
              fuenteDocumento: intercambio.fuente.documento,
              fuenteUrl: intercambio.fuente.url,
              fuenteAnio: intercambio.fuente.anio,
              nota: intercambio.nota ?? null,
            },
            create: {
              alimentoId: alimentoDb.id,
              subgrupoId: intercambio.subgrupoId,
              poblacionObjetivo: intercambio.poblacionObjetivo,
              gramosPorIntercambio: intercambio.gramosPorIntercambio,
              medidaCasera: intercambio.medidaCasera,
              estado: intercambio.estado,
              fuenteNombre: intercambio.fuente.nombre,
              fuenteDocumento: intercambio.fuente.documento,
              fuenteUrl: intercambio.fuente.url,
              fuenteAnio: intercambio.fuente.anio,
              nota: intercambio.nota ?? null,
            },
          });
          intercambiosProcesados += 1;
        }
      });

      procesados += 1;
    } catch (error) {
      const detalle = error instanceof Error ? error.message : String(error);
      throw new Error(`No se pudo sembrar el alimento "${alimento.id}": ${detalle}`);
    }
  }

  console.log(`Seed completado: ${procesados} alimentos colombianos y ${intercambiosProcesados} intercambios procesados.`);
}

main()
  .catch((error) => {
    console.error('Error durante el seed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
