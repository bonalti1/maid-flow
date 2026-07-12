# 💾 Propiedad y respaldos — que nadie te lo pueda quitar

El negocio son 4 cosas: **código, secretos, datos, cuentas.** Cada una con su
respaldo y su dueño (tú).

## 1) Código (git)

- Repo: GitHub `bonalti1/maid-flow` (ramas `claude/gracious-einstein-2xrkht` y
  `main`; Render deploya `main`).
- **Clon local en TU computadora** (una vez, refrescar cada mes):
  ```
  git clone https://github.com/bonalti1/maid-flow.git paulbeza-backup
  cd paulbeza-backup && git fetch --all
  ```
  Con el clon local, el código existe aunque GitHub desaparezca.

## 2) Secretos (.env)

- NO están en git (a propósito). Viven en Render → Environment.
- Copia de cada valor en un administrador de contraseñas (1Password/Bitwarden)
  en una bóveda "Paulbeza — ENV". Actualizar cada vez que se agrega o rota una
  variable. El catálogo de qué es cada una: `05-env.md`.

## 3) Datos (el botón)

- Las clientas, leads, trabajos y pagos viven en Postgres. El código se
  reconstruye; los datos NO.
- **Mensual, 1 clic:** /admin → Mantenimiento → **⬇️ Descargar respaldo (todos
  los datos)** → guarda el `paulbeza-respaldo-AAAA-MM-DD.json` junto al clon
  local. Incluye clientas, estados de app, leads, reuniones y tareas; excluye a
  propósito tokens de sesión e invites. *(Estado: el botón de respaldo se está
  portando de ALTO — playbook/01, ítem 5.)*
- Supabase además hace backups automáticos, pero el JSON es TU copia en TUS manos.

## 4) Inventario de cuentas (todas a nombre del dueño)

| Cuenta | Para qué |
|---|---|
| GitHub | El código (`bonalti1/maid-flow`) |
| Render | Hosting + env vars (servicio `maid-flow`) |
| Supabase | Base de datos (`maid-flow-db`) |
| Cloudflare | DNS del dominio + subdominios de clientas |
| Stripe | Cobros y Payment Links ($67/$197/$297) |
| GoHighLevel | Teléfono/SMS/WhatsApp, setters, calendario |
| Google Cloud | Llaves de Maps |
| Anthropic / OpenAI | IA |
| Meta Business | Anuncios + pixel |

Regla: ningún VA es owner de ninguna cuenta; accesos de miembro/colaborador con
lo mínimo necesario.

## 5) Deuda de seguridad abierta (hasta que se haga)

- ☐ Regenerar los Payment Links de Stripe con `client_reference_id` = id de la
  cuenta (emparejamiento determinístico en el webhook).
- ☐ `ADMIN_KEY` / `CS_KEY` / `CLOSER_KEY` únicos y fuertes (no compartir entre
  productos ni con ALTO).
- ☐ Después de rotar: actualizar la bóveda del punto 2.
