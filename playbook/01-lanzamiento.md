# 🚀 Lanzar Paulbeza (y portar desde ALTO)

Paulbeza es el **caso B** del playbook de ALTO: producto/marca distinta, repo
propio (`bonalti1/maid-flow`), base de datos propia. Se copiaron los PATRONES del
motor de ALTO + este playbook. **ALTO siempre es el maestro**; los arreglos se
portan de allá hacia acá, patrón por patrón (no archivos enteros).

## Checklist de propiedad (caso B — ya hecho)

1. ☑ Repo propio (`bonalti1/maid-flow`, ramas `claude/gracious-einstein-2xrkht`
   y `main`; Render deploya `main`).
2. ☐ Cuentas propias: subcuenta GHL, cuenta/links de Stripe, dominio, servicio
   en Render (`paulbeza`) + su `DATABASE_URL` propia en Supabase (`maid-flow-db`).
3. ☑ Catálogo de env adaptado (05-env.md) — cada marca tiene sus llaves.
4. ☐ Portar la lista "últimas mejoras" de ALTO: revisar el git log de ALTO desde
   la última sincronización y copiar patrón por patrón.
5. ☑ Mismos 4 roles del equipo (02-equipo.md) — los VAs pueden ser los mismos;
   los guiones cambian de producto, no de estructura.

## Portar un patrón nuevo desde ALTO (la disciplina)

Un ítem por commit, el cambio más chico que funcione, probado en vivo antes de
commitear, sin romper una pantalla viva:

1. ☐ Abrir el patrón en el código de ALTO; entender qué hace, no copiar ciego.
2. ☐ Adaptar el vocabulario al público de Paulbeza (limpiadoras, español).
3. ☐ `npm test` (6 en verde) + `npm run build` + arrancar local y manejar el
   flujo afectado en un navegador real.
4. ☐ Commit chico y descriptivo → push a ambas ramas → Render deploya `main`.
5. ☐ Actualizar este playbook en el mismo commit si cambió un proceso.

## Orden de porte (del playbook de ALTO) — COMPLETADO 1–10

1. ☑ Docs (`CLAUDE.md` + `playbook/`).
2. ☑ Catálogo de env: `.env.example` reescrito + `REQUIRE_DB`.
3. ☑ Puente GHL entrada: dedupe de teléfono 24 h (por últimos 10 dígitos).
4. ☑ `DEMO_PASS` (pase ilimitado para el staff en el deck).
5. ☑ Respaldo: `/api/admin/backup` (JSON con fecha, sin tokens de sesión).
6. ☑ Suite de regresión `scripts/regression.mjs` (19 flujos dorados; `npm run regression`).
7. ☑ Máquina de leads: pipeline 5 etapas + notas + export CSV + tags de fuente +
   campo compañía.
8. ☑ Instalación: Android un toque + guía iOS + aviso del navegador de WhatsApp.
9. ☑ Notificaciones push (`notifyLead` + VAPID).
10. ☑ **Stripe 3 niveles** ($49/$149/$249) — `STRIPE_LINK_*` + `planByAmount` (los montos viejos $67/$197/$297 siguen reconocidos).
11. ☐ (opcional, no pedido) Cockpit del dueño `/hq`.

### Lo que falta hacer EN LOS DASHBOARDS (el dueño, cuando pueda)

El código ya está; estos son valores/llaves que viven fuera de git:
- **Stripe:** crear 3 Payment Links ($49, $149, $249), con `client_reference_id`
  = id de la cuenta, y pegarlos en Render como `STRIPE_LINK_PRO` /
  `STRIPE_LINK_WIDGET` / `STRIPE_LINK_COMPLETE` + `STRIPE_WEBHOOK_SECRET`.
- **Push:** `npx web-push generate-vapid-keys` → `VAPID_PUBLIC_KEY` /
  `VAPID_PRIVATE_KEY` en Render.
- **GHL:** conectar los webhooks (03-ghl.md) y poner `HL_WEBHOOK_SECRET`.
- **APIs:** `GOOGLE_MAPS_API_KEY`, `RENTCAST_API_KEY`, `ANTHROPIC_API_KEY`.
- **Producción:** `REQUIRE_DB=1` + `DATABASE_URL` de Supabase; `DEMO_PASS` fuerte.

## La meta operativa

Un lanzamiento = **4 VAs + presupuesto de anuncios**: closer, appointment setter,
onboarding, customer service. Todo lo que necesitan ya existe (o se está
portando): portal del closer, onboarding guiado, /cs con tareas, panel de leads,
webhook a GHL. El dueño solo vigila el ad-spend y que el equipo ejecute.
