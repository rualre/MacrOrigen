# MacrOrigen — Inteligencia nutricional

Aplicación local funcional en Next.js para explorar una semilla bromatológica colombiana y generar planes diarios/semanales mediante cálculo determinístico e IA opcional con Tool Calling.

## Ejecutar localmente

Requisitos: **Node.js 20.12+** (las dependencias runtime seleccionadas admiten Node 20) y npm.

```bash
cd C:\Users\HP\MacrOrigen
npm install
npm run dev
```

Abrir **http://localhost:3000**. No hacen falta API keys, PostgreSQL ni Redis para el demo: se usa `src/data/alimentos.ts` y el motor local. Puedes generar **3 planes sin registrarte**; después se solicita cuenta y suscripción. El checkout es una simulación local sin cargos reales. Los planes se mantienen en memoria en la página y no se guardan datos biométricos; usuarios, hashes de contraseña y usos gratuitos se almacenan localmente en `.data/auth.json`.

```bash
npm run typecheck   # TypeScript estricto
npm test            # fórmulas, grounding, filtros, acciones y tolerancia
npm run build       # compilación de producción
npm run test:auth   # con servidor activo: cupo, registro, suscripción y sesión
```

## Funcionalidad incluida

- Acceso con 3 planes gratuitos por invitado, registro/inicio de sesión, contraseñas `scrypt`, sesiones HttpOnly firmadas y suscripción demo de 30 días.
- **Intercambios UdeA/GABA:** 8 grupos, subgrupos, población `ADULTOS`/`NINOS`, gramos por intercambio, medida casera, nutrientes por 100 g y origen `CRIOLLO`/`NO_CRIOLLO` por alimento.
- Motor determinístico de intercambios: optimización entera, distribución por comida, gramajes exactos, reequilibrio tras un swap y validación ±3%; no delega equivalencias al LLM.
- Onboarding biométrico adulto con Mifflin-St Jeor/Harris-Benedict, actividad, objetivo, alergias y preferencias de origen.
- Plan de 1 o 7 días, 3–6 comidas/día, gramos optimizados y validación ±3%.
- Regeneración de comida e intercambio por el mismo subgrupo (`/api/diet/swap`), con recálculo y sin llamadas a IA para equivalentes.
- Lista de compras consolidada, casillas y descarga CSV.
- Explorador con texto sin tildes, grupo, Criollo/No Criollo y ficha de 23 nutrientes con la ficha de intercambio.
- Modo claro/oscuro, responsive, identidad esmeralda/turquesa y aviso médico visible.
- IA opcional Gemini → Groq → OpenRouter, rotación de claves, fallback y JSON validado con Zod. La IA solo elige IDs de alimentos; los gramos los multiplica el motor.
- Caché Redis y rate limiting distribuido opcionales; en local hay límite en memoria.
- `pgvector` + Reciprocal Rank Fusion cuando se configura DB/embeddings.

## Intercambios de alimentos

La fuente inicial es la **lista nacional de las GABA 2015 (ICBF/FAO)**, que adoptó por consenso la lista de intercambios de la Universidad de Antioquia (GIANH). La 5.ª edición UdeA 2023 no está disponible en acceso abierto: no se inventaron valores. Cada alimento declara `VERIFICADO`, `HOMOLOGADO`, `DERIVADO` o `PENDIENTE`, y la UI muestra la fuente y la nota.

- `src/data/intercambios.ts`: grupos, subgrupos, perfiles y mapeo de los 45 alimentos del catálogo. El café sin azúcar queda fuera porque no aporta energía ni macros relevantes.
- `src/lib/nutrition/exchanges.ts`: optimización entera de intercambios, distribución por comidas, equivalentes del mismo subgrupo y reequilibrio.
- `data/intercambios-gaba-2015.csv` y `.json`: 44 registros exportados; 30 verificados, 12 homologados y 2 derivados.
- `scripts/import-intercambios.ts`: importador JSON/CSV con validación Zod y `--dry-run` por defecto.

```bash
# Validar sin escribir en PostgreSQL (por defecto)
npm run import:intercambios -- --archivo data/intercambios-gaba-2015.csv --formato csv

# Aplicar a PostgreSQL ya migrado y sembrado
npm run import:intercambios -- --archivo data/intercambios-gaba-2015.json --formato json --aplicar

# Exportar la semilla TS actual
npx tsx scripts/import-intercambios.ts --exportar data/intercambios-gaba-2015.csv
```

El seed de Prisma crea grupos, subgrupos y relaciones de intercambio mediante upsert. El esquema admite población infantil aunque el dataset actual solo contiene filas de adultos: no se inventaron pesos pediátricos.

### Cuentas demo ilimitadas

```bash
npm run cuentas:demo   # 10 cuentas ACTIVAS hasta 2099; escribe .data/cuentas-demo.csv
npm run test:cuentas   # inicia sesión en las 10 y valida un plan/swap representativo
```

`.data/` está ignorado por Git. Las credenciales no se versionan; entrégalas por un canal privado. En Vercel el sistema de archivos no es persistente: para producción real hay que configurar PostgreSQL/Upstash y migrar el almacén local (ver más abajo).

## Configuración

Copiar `.env.example` a `.env.local` y completar solo los servicios deseados. Ninguna clave se expone al navegador.

### IA gratuita (sujeta a disponibilidad/cuotas del proveedor)

- `GOOGLE_GENERATIVE_AI_API_KEY` (o `..._KEYS` separadas por comas).
- `GROQ_API_KEY`.
- `OPENROUTER_API_KEY` y un modelo `:free` disponible.

Sin claves o si todos fallan, la UI informa que el menú es **determinístico**. Con IA, el LLM solo devuelve IDs verificados; cualquier ID desconocido, alérgeno o estructura incorrecta hace fallar ese proveedor y activa el siguiente.

### PostgreSQL (Neon/Supabase)

```bash
cp .env.example .env.local
# Completar DATABASE_URL en .env.local
npm run db:generate
npm run db:push
npm run db:seed
```

Aplicar `prisma/migrations/20261112000000_pgvector/migration.sql` para habilitar vectores. El seed preserva fuentes y realiza upsert por slug. Los endpoints siguen usando la semilla como respaldo; antes de producción se recomienda mover la lectura de alimentos al repositorio Prisma.

La etiqueta `origenTipo` es editorial, no certifica raza, denominación de origen ni país de fabricación. `detalleOrigen` explica cada clasificación.

### Upstash

Configurar `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`. Se cachean búsquedas/planes y se reemplaza el rate limit en memoria por una ventana distribuida.

## ETL

`scripts/etl-alimentos.ts` valida un CSV normalizado por 100 g/ml (incluidas las 23 columnas de nutrientes), detecta IDs duplicados y genera `.data/alimentos-validados.json`:

```bash
npx tsx scripts/etl-alimentos.ts data/entrada.csv
```

Consultar `data/fuentes/README.md` para reglas de homologación. **La semilla es representativa, no exhaustiva**: los documentos enlazados son generales y el propio registro indica si falta homologación TCAC/etiqueta. No debe presentarse como base clínica nacional sin completar ese trabajo.

## Privacidad y seguridad

Validación Zod de perfil, filtros y planes recibidos; filtro de patrones de prompt injection; límite de payload; rate limiting por IP; outputs React escapados; recálculo de cualquier nutriente recibido; secretos exclusivamente server-side. Para múltiples instancias use Upstash, no el limitador en memoria.

## Rigor médico

MacrOrigen es orientativo. La validación matemática no demuestra suficiencia clínica, calidad de fuente ni idoneidad individual. No sustituye la valoración de un nutricionista dietista profesional en Colombia. No usar en menores, embarazo o patologías sin supervisión.

## Documentación de entrega

- [`docs/PRUEBAS-Y-RESULTADOS.pdf`](docs/PRUEBAS-Y-RESULTADOS.pdf): pruebas automatizadas, evidencia real, protocolo manual y limitaciones.
- [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md): GitHub, Vercel, PostgreSQL, Upstash y checklist de producción.
- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md): flujo híbrido y estructura del proyecto.

Más detalle en [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).
