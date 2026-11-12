# Arquitectura MacrOrigen

## Flujo híbrido

```mermaid
flowchart LR
  UI[Next.js / React] -->|Zod + rate limit| API[API Routes]
  API --> CALC[TMB + TDEE + macros]
  CALC --> EXC[Motor de intercambios UdeA/GABA\noptimización entera + distribución]
  EXC --> IA{¿Proveedor IA configurado?}
  IA -->|sí| TOOLS[Gemini → Groq → OpenRouter\nelige IDs por grupo requerido]
  TOOLS --> CAT[(Catálogo PostgreSQL / semilla)]
  IA -->|no o falla| SEL[Selector local por grupo]
  TOOLS --> EXC
  SEL --> EXC
  CAT --> EXC
  EXC --> VAL[Multiplicar gramos + validar ±3%]
  VAL --> PLAN[Plan + intercambios + lista de compras]
  CAT --> EXPLORER[Explorador texto/filtros]
  CAT -. pgvector + RRF .-> EXPLORER
  PLAN --> SWAP[/api/diet/swap\nmismo subgrupo, sin IA]
  SWAP --> VAL
```

## Acceso y monetización local

- Un invitado recibe una cookie UUID firmada con HMAC (`HttpOnly`, `SameSite=Lax`) y puede generar exactamente **3 planes**. El contador se incrementa atómicamente en el servidor, incluso si la respuesta viene de caché.
- Al llegar a cero se bloquean generación, regeneración e intercambio con `SUBSCRIPTION_REQUIRED`. Se ofrece registro/inicio de sesión.
- Las contraseñas se derivan con `scrypt` + salt. La sesión de 7 días también viaja firmada en cookie HttpOnly. `AUTH_SECRET` es obligatorio en producción.
- La cuenta nace con suscripción `PENDIENTE`; solo `ACTIVA` no vencida permite generar. El checkout local activa 30 días **sin cobro**, está restringido a localhost (o a `ALLOW_DEMO_CHECKOUT=true` para una demo explícita) y nunca pide datos bancarios.
- El demo guarda usuarios hash y usos en `.data/auth.json`, ignorado por Git. No es almacenamiento adecuado para múltiples instancias/Vercel: para producción se modelaron `Suscripcion` y `UsoGratuito` en Prisma y debe migrarse este repositorio a PostgreSQL.
- Un proveedor real debe activar la suscripción exclusivamente después de validar su webhook/transacción en servidor; jamás desde un `success` del navegador.

## Separación estricta

- **Determinístico:** ecuaciones, objetivos, gramos, nutrientes, sustituciones, agregación y validación.
- **LLM opcional:** propone únicamente listas de IDs por comida. No puede guardar números ni salida directa al cliente.
- **Persistencia:** el modo demo lee el catálogo semilla. En producción se siembra el mismo catálogo en PostgreSQL; los planes pueden persistirse con las relaciones Prisma existentes.
- **RAG:** búsqueda local de texto exacto/ranking. Si hay `DATABASE_URL` y clave Gemini, combina resultados textuales y vectoriales con Reciprocal Rank Fusion.

## Carpetas principales

```text
MacrOrigen/
├── prisma/
│   ├── schema.prisma              # usuarios, biometría, alimentos, intercambios, planes y compras
│   ├── seed.ts                    # upsert transaccional con fuentes e intercambios
│   └── migrations/                # extensión pgvector
├── data/
│   ├── intercambios-gaba-2015.csv # 44 registros trazables
│   └── intercambios-gaba-2015.json
├── scripts/
│   ├── etl-alimentos.ts           # CSV → JSON validado
│   ├── import-intercambios.ts     # importador JSON/CSV de intercambios
│   ├── crear-cuentas-demo.mjs     # 10 cuentas ilimitadas locales
│   ├── smoke-test.mjs             # generar/regenerar/swap
│   ├── test:auth                  # cupo, registro y suscripción
│   └── demo-accounts-smoke.mjs    # valida las 10 cuentas
├── src/
│   ├── app/
│   │   ├── api/alimentos/         # búsqueda + equivalentes
│   │   ├── api/diet/swap/         # GET equivalentes, POST swap determinístico
│   │   ├── api/planes/            # generar/regenerar/intercambiar
│   │   ├── api/estado/            # diagnóstico sin secretos
│   │   ├── page.tsx               # identidad visual y Home
│   │   └── layout.tsx
│   ├── components/                # onboarding, explorador, plan, swap-dialog y Shadcn/UI
│   ├── data/                      # semilla + intercambios + repositorio híbrido
│   └── lib/
│       ├── ai/service.ts          # proveedores, keys, tools, JSON + Zod
│       ├── nutrition/             # cálculo, intercambios, optimización y auditoría
│       ├── security/rate-limit.ts
│       ├── validation/            # entradas estrictas
│       └── cache.ts               # Upstash opcional
└── docs/ARQUITECTURA.md
```

## Despliegue Free Tier

1. Base en Neon/Supabase con `DATABASE_URL`; ejecutar Prisma, extensión vector y seed.
2. Upstash para rate limiting distribuido y caché; sin estas variables se usa memoria por instancia.
3. Variables IA solo en Vercel Server/Functions, jamás con prefijo `NEXT_PUBLIC_`.
4. `AUTH_SECRET` de al menos 32 caracteres en Vercel.
5. `npm run build` como comprobación y despliegue en Vercel.

**Importante:** Vercel no permite persistir `.data/auth.json`. Sin PostgreSQL/Upstash, el login, el registro y el cupo gratuito pueden fallar o reiniciarse entre instancias. Las 10 cuentas ilimitadas se crean en `.data/` para ejecución local; para producción se deben migrar a la tabla `Usuario`/`Suscripcion` de Prisma y configurar el checkout real. Nunca se deben versionar `.env.local`, `.data/` ni las contraseñas demo.

## Límites deliberados

La semilla no permite afirmar exhaustividad nacional ni exactitud documental TCAC. Antes de publicar para uso asistivo se requiere completar la ingesta autorizada, homologar estados/porciones y hacer revisión profesional. La tolerancia ±3% comprueba coherencia matemática interna, no adecuación clínica.
