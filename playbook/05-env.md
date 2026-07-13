# 🔑 Catálogo de variables de entorno

Los VALORES nunca van en git — viven en Render (producción) y en el administrador
de contraseñas del dueño. Este catálogo dice qué es cada llave y qué se rompe si
falta. Refleja lo que **este código realmente lee** hoy.

## Acceso a portales (SECRETOS — únicos y fuertes)

| Var | Qué abre |
|---|---|
| `ADMIN_KEY` | /admin — todo el negocio. La más sensible. |
| `CS_KEY` | /cs (ADMIN_KEY también entra) |
| `CLOSER_KEY` | /closer + /onboarding (ADMIN_KEY también entra) |

⚠️ Las tres distintas entre sí, distintas de cualquier otra contraseña, y
rotadas si alguna aparece en un screenshot. *(Pendiente de portar de ALTO:
`DEMO_PASS` para demos ilimitadas del staff, y `HQ_KEY` para el cockpit del
dueño — playbook/01.)*

## Datos

| Var | Notas |
|---|---|
| `DATABASE_URL` | Postgres de Supabase (`maid-flow-db`). Sin ella: archivo JSON local, solo para desarrollo (SE BORRA en cada deploy). En producción, si está puesta y falla la conexión, el server **se niega a arrancar** (no cae al archivo). |

## Dinero (Stripe)

| Var | Notas |
|---|---|
| `STRIPE_PAYMENT_LINK` | Payment Link actual (un solo plan). *(Portando: `STRIPE_LINK_PRO`/`STRIPE_LINK_WIDGET`/`STRIPE_LINK_COMPLETE` para $49/$149/$249 + mapa `planByAmount` en el webhook.)* |
| `STRIPE_WEBHOOK_SECRET` | Firma del webhook `/api/stripe/webhook` (activa la cuenta y, al portar niveles, etiqueta el plan por monto). |

## APIs del producto

| Var | Notas |
|---|---|
| `GOOGLE_MAPS_API_KEY` | Server-side: Places (autocompletar dirección) + Geocoding. |
| `GOOGLE_MAPS_BROWSER_KEY` | Llave restringida por dominio para el mapa del navegador (`/api/mapconfig` NUNCA cae a la llave server). |
| `ANTHROPIC_API_KEY` | El asistente IA (bots de sitios, copywriter, CEO advisor). |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | Fallback del asistente. |
| `RENTCAST_API_KEY` | Datos de la propiedad (recámaras, baños, sqft). Sin ella el widget pide los pies² a mano. |
| `REGRID_API_KEY` | Solo lo usa `/api/diag` (vestigio del motor; el código de parcelas se removió). |

## Dominios de clientas (Cloudflare)

| Var | Notas |
|---|---|
| `CF_API_TOKEN` | Cloudflare: Zone Read + DNS Edit para subdominios/conexiones. |
| `CF_ZONE_ID` / `CF_CNAME_TARGET` | Zona del dominio raíz para `<slug>.DOMINIO`. |

## Host / marketing

| Var | Notas |
|---|---|
| `ROOT_DOMAIN` | El dominio propio. En blanco = todo sirve en onrender/localhost. Puesto (ej. `maidflow.com`) enciende la landing en el dominio pelón, subdominios `<slug>.ROOT_DOMAIN` y links canónicos. |
| `APP_HOST` | Dónde vive la app/dashboard (default `app.ROOT_DOMAIN`). |
| `HL_WEBHOOK_SECRET` | Secreto compartido del puente GHL→motor (`/api/hl/lead`, header `x-alto-key`). |
| `META_PIXEL_ID` | Pixel de Meta en páginas públicas. |
| `PORT` | Puerto local (Render lo inyecta). |

## Pendientes de portar de ALTO

`DEMO_PASS`, `HQ_KEY`, `REQUIRE_DB`, `STRIPE_LINK_*`, `VAPID_PUBLIC_KEY` /
`VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` (web push), `GHL_BOOKING_URL`. Ver
playbook/01 para el orden.

## Desarrollo local

Arrancar desde `tradetechpro/`:

```
(ADMIN_KEY=testadmin CS_KEY=testcs CLOSER_KEY=testcloser PORT=8890 node server/index.mjs > /tmp/srv.log 2>&1 &)
```

Luego `npm test` (6 en verde antes de commitear).
