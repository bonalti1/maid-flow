# 🚀 Lanzar Maid Flow (y portar desde ALTO)

Maid Flow es el **caso B** del playbook de ALTO: producto/marca distinta, repo
propio (`bonalti1/maid-flow`), base de datos propia. Se copiaron los PATRONES del
motor de ALTO + este playbook. **ALTO siempre es el maestro**; los arreglos se
portan de allá hacia acá, patrón por patrón (no archivos enteros).

## Checklist de propiedad (caso B — ya hecho)

1. ☑ Repo propio (`bonalti1/maid-flow`, ramas `claude/gracious-einstein-2xrkht`
   y `main`; Render deploya `main`).
2. ☐ Cuentas propias: subcuenta GHL, cuenta/links de Stripe, dominio, servicio
   en Render (`maid-flow`) + su `DATABASE_URL` propia en Supabase (`maid-flow-db`).
3. ☑ Catálogo de env adaptado (05-env.md) — cada marca tiene sus llaves.
4. ☐ Portar la lista "últimas mejoras" de ALTO: revisar el git log de ALTO desde
   la última sincronización y copiar patrón por patrón.
5. ☑ Mismos 4 roles del equipo (02-equipo.md) — los VAs pueden ser los mismos;
   los guiones cambian de producto, no de estructura.

## Portar un patrón nuevo desde ALTO (la disciplina)

Un ítem por commit, el cambio más chico que funcione, probado en vivo antes de
commitear, sin romper una pantalla viva:

1. ☐ Abrir el patrón en el código de ALTO; entender qué hace, no copiar ciego.
2. ☐ Adaptar el vocabulario al público de Maid Flow (limpiadoras, español).
3. ☐ `npm test` (6 en verde) + `npm run build` + arrancar local y manejar el
   flujo afectado en un navegador real.
4. ☐ Commit chico y descriptivo → push a ambas ramas → Render deploya `main`.
5. ☐ Actualizar este playbook en el mismo commit si cambió un proceso.

## Orden de porte pendiente (decidido)

1. ☑ Docs (`CLAUDE.md` + `playbook/`).
2. ☐ Catálogo de env: reescribir `.env.example` para este producto + `REQUIRE_DB`.
3. ☐ Puente GHL entrada: dedupe de teléfono 10 min → 24 h.
4. ☐ `DEMO_PASS` (pase ilimitado para el staff en el deck).
5. ☐ Respaldo: descarga de JSON en /admin (con fecha, sin tokens de sesión).
6. ☐ Suite de regresión `scripts/regression.mjs` (flujos dorados).
7. ☐ Máquina de leads: pipeline 5 etapas + notas + export CSV + tags de fuente +
   campo compañía en los formularios.
8. ☐ Instalación: Android un toque (`beforeinstallprompt`) + aviso del navegador
   de WhatsApp ("abre en Safari/Chrome").
9. ☐ Notificaciones push (`notifyLead` + VAPID).
10. ☐ **Stripe 3 niveles** ($67/$197/$297) — 3 Payment Links + `planByAmount`.
11. ☐ (opcional) Cockpit del dueño `/hq`.

## La meta operativa

Un lanzamiento = **4 VAs + presupuesto de anuncios**: closer, appointment setter,
onboarding, customer service. Todo lo que necesitan ya existe (o se está
portando): portal del closer, onboarding guiado, /cs con tareas, panel de leads,
webhook a GHL. El dueño solo vigila el ad-spend y que el equipo ejecute.
