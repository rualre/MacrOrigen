# Despliegue de MacrOrigen

## Estado actual

- La aplicación compila y funciona localmente con `npm start`.
- La autenticación, el cupo gratuito y las 10 cuentas demo se guardan en `.data/auth.json`.
- **Vercel no conserva `.data/`**: es un sistema de archivos efímero y no apto para escritura multiusuario.
- Por eso el despliegue público queda bloqueado hasta configurar PostgreSQL (Neon/Supabase) y migrar el almacén local a Prisma. Upstash es opcional para rate limiting/caché distribuidos.
- No hay credenciales de GitHub, Vercel, PostgreSQL ni Upstash en este equipo. No se inventaron.

## 1. Verificación local

```bash
npm ci
npm run typecheck
npx vitest run
npm run build
npm start
```

En otra terminal:

```bash
npm run test:smoke
npm run test:auth
npm run test:cuentas
```

## 2. Crear las 10 cuentas demo

```bash
npm run cuentas:demo
```

Genera/actualiza 10 usuarios `demo01@macrorigen.app` … `demo10@macrorigen.app`, con suscripción `ACTIVA`, referencia `ILIMITADO-DEMO-01…10` y fin de periodo `2099-12-31`.

Las contraseñas únicas quedan en `.data/cuentas-demo.csv`, que está ignorado por Git. No se deben pegar en el README, en el PDF ni en un repositorio público.

```bash
npm run test:cuentas
```

Comprueba 10/10 inicios de sesión, estado ACTIVA, cupo ilimitado y un plan/swap representativo.

## 3. Base de datos

1. Crear PostgreSQL en Neon o Supabase.
2. Copiar la cadena a `DATABASE_URL` en `.env.local` y en Vercel.
3. Aplicar el esquema y la semilla:

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

4. Importar los intercambios autorizados:

```bash
npm run import:intercambios -- --archivo data/intercambios-gaba-2015.csv --formato csv
npm run import:intercambios -- --archivo data/intercambios-gaba-2015.csv --formato csv --aplicar
```

El primer comando es dry-run. El segundo escribe. El importador es idempotente por alimento/subgrupo/población.

> Mientras `src/lib/auth/local-store.ts` siga usando `.data/auth.json`, las cuentas creadas con `npm run cuentas:demo` **no existen en PostgreSQL**. Para producción hay que implementar el repositorio Prisma de usuarios/cupos o mantener el demo en un servidor con disco persistente (no Vercel serverless).

## 4. Variables en Vercel

| Variable | Obligatoria | Uso |
|---|---|---|
| `AUTH_SECRET` | Sí | Firma de sesiones; mínimo 32 caracteres. |
| `DATABASE_URL` | Para producción multiusuario | PostgreSQL/Neon/Supabase. |
| `UPSTASH_REDIS_REST_URL` | Recomendada | Rate limiting/caché distribuidos. |
| `UPSTASH_REDIS_REST_TOKEN` | Recomendada | Token de Upstash. |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Opcional | Gemini gratuito. |
| `GROQ_API_KEY` | Opcional | Groq gratuito. |
| `OPENROUTER_API_KEY` | Opcional | OpenRouter free. |
| `SUBSCRIPTION_PRICE_COP` | Opcional | Precio mostrado; por defecto 29900. |
| `ALLOW_DEMO_CHECKOUT` | Solo demo | Habilita el checkout local sin cobro. |

Nunca usar prefijo `NEXT_PUBLIC_` para secretos.

## 5. GitHub

```bash
git init -b main
git add .
git commit -m "feat: intercambios UdeA/GABA, motor determinístico y cuentas demo"
```

Crear un repositorio vacío y enlazarlo:

```bash
git remote add origin https://github.com/USUARIO/MacrOrigen.git
git push -u origin main
```

El workflow `.github/workflows/ci.yml` ejecuta typecheck, pruebas y build. No requiere base de datos real.

## 6. Vercel

```bash
npm i -g vercel
vercel login
vercel
vercel --prod
```

O importar el repositorio desde el panel de Vercel. `vercel.json` ya define el framework y el build. `.vercelignore` excluye `.data`, `.env.local`, `.next`, `node_modules` y archivos de cobertura.

Antes del primer despliegue hay que cargar las variables de entorno en Vercel. Sin `AUTH_SECRET`, el login falla en producción. Sin PostgreSQL/Upstash, el cupo y las cuentas no son persistentes.

## 7. Checklist de salida a producción

- [ ] `DATABASE_URL` y migración Prisma aplicadas.
- [ ] Repositorio Prisma de usuarios/cupos/suscripciones implementado y probado.
- [ ] 10 cuentas creadas en la base de datos de producción.
- [ ] `AUTH_SECRET` de producción configurado.
- [ ] Upstash configurado si habrá más de una instancia.
- [ ] Proveedor de pago y webhooks reales (hoy es checkout demo).
- [ ] Disclaimer médico y política de privacidad revisados.
- [ ] Tabla UdeA 2023 autorizada cargada, si se va a citar como oficial.
- [ ] Pesos pediátricos autorizados cargados antes de prometer población `NINOS`.
- [ ] PDF de pruebas actualizado tras el despliegue.
