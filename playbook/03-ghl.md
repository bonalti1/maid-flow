# 🔌 GoHighLevel — recetas exactas

GHL son los rieles de teléfono/SMS/WhatsApp y el tablero de los setters. El motor
manda y recibe leads por dos puentes. **Regla:** el sitio web SIEMPRE vive en el
motor (nunca copiar páginas a GHL — se vuelven copias muertas); GHL pone el
número, el A2P y las automatizaciones.

## Puente 1 — SALIDA: leads del sitio → GHL

Cada cuenta del motor tiene un webhook opcional (`data.webhook`). En la cuenta
**alto-ventas** ese webhook manda TODOS los leads de venta (quiz, formularios de
la landing) a GHL.

**Receta (workflow "LANDING PAGE WEBHOOK"):**
1. GHL → Automations → Create Workflow → trigger **Inbound Webhook** → copiar la
   URL.
2. Admin del motor → cuenta Pauleza Ventas → botón **🤖 GHL** → pegar la URL
   (debe empezar `https://`) → debe decir "✓ Guardado" y quedar "(conectado)".
3. Disparar un lead de prueba desde la landing → en GHL, Mapping Reference →
   "Check for new requests" → seleccionar el request → Save trigger.
4. Acciones, en este orden:
   - **Create/Update Contact** — campos DESDE EL PAYLOAD del trigger: First name
     = `{{inboundWebhookRequest.name}}`, Phone = `{{inboundWebhookRequest.phone}}`,
     Company = `{{inboundWebhookRequest.biz}}`. ⚠️ NUNCA `{{user.*}}` ni
     `{{contact.*}}` dentro del paso que crea el contacto (circular = vacío).
   - **Add Tag** `maidflow-landing`.
   - **Assign to user** (setters, round-robin).
   - **Internal Notification** — aquí sí sirven `{{contact.name}}` /
     `{{contact.phone}}` + las líneas del quiz:
     `Fuente: {{inboundWebhookRequest.src}}` ·
     `Trabajo: {{inboundWebhookRequest.work}}` ·
     `Equipo: {{inboundWebhookRequest.crew}}` ·
     `Ingreso: {{inboundWebhookRequest.revenue}}` ·
     `Marketing: {{inboundWebhookRequest.marketing}}`.
   - **Send SMS** = el mensaje M1 (ver 02-equipo).
5. **Publish** (el clásico olvido: en Draft recibe y no hace nada).

**Payload que manda el motor:** `{source:"pauleza",
contractor:"alto-ventas", id, name, phone, address, src:"landing"|"trial-app",
biz, work, crew, revenue, marketing}` (los campos del quiz solo vienen de
src=landing). Si se agrega un campo nuevo, GHL no lo muestra en el picker hasta
re-seleccionar un request nuevo como Mapping Reference (o escribir el tag a mano).

## Puente 2 — ENTRADA: canales de GHL → panel del motor

WhatsApp / IG / Messenger nacen en GHL; un workflow los empuja al panel:
- Trigger: Contact Created (o el evento del canal).
- Acción: **Webhook POST** a `https://<dominio>/api/hl/lead` con el header/secret
  `HL_WEBHOOK_SECRET` (`x-alto-key`) y custom data `channel` =
  whatsapp|instagram|facebook.
- El motor deduplica por teléfono (últimos dígitos) y crea una reunión.
- Estos leads NO se re-reenvían a GHL (sin loop, por diseño).
- ⚠️ Deuda conocida: la ventana de dedupe hoy es **10 min**; ALTO usa **24 h** —
  pendiente de portar (playbook/01, ítem 3).

## Calendario

- `GHL_BOOKING_URL` (env) = Scheduling Link → la landing lo muestra al terminar
  el quiz, prefilled con nombre y teléfono.
- Disponibilidad amplia (Lu–Sa 8–18, slots de 30 min, aviso mínimo 1h).
- Gotcha: si el bot se calla tras agendar → ajustes del bot: desmarcar "pausar
  tras cita" y re-encender el bot de la conversación.

## La correa del bot (pegar en las instrucciones del bot de GHL)

> Eres el asistente de Pauleza. El equipo YA tiene el teléfono de la clienta y
> le va a MARCAR — tu único trabajo es mantenerla interesada hasta esa llamada.
> REGLAS: (1) Solo puedes afirmar esto: Pauleza le da a la limpiadora su propia
> app que cotiza limpiezas al instante, una página web profesional con IA que
> contesta a sus clientes 24/7, y los leads le llegan directo a su teléfono;
> planes desde $49/mes, sin cargo de inicio. (2) A CUALQUIER otra pregunta
> (precios exactos, detalles): responde que justo eso se lo enseñan en la llamada
> con una demostración en vivo, y pregunta a qué hora le marcamos. (3) Nunca
> inventes datos, nunca prometas fechas, nunca des la demo completa por chat.
> (4) Si pide agendar ella misma, manda el link del calendario. (5) Máximo 40
> palabras por respuesta, tono de texto, cálido y directo.

## SMS / A2P para clientas (visión)

- **Hoy:** subcuenta GHL por clienta que quiera SMS; su A2P vive en GHL; el
  webhook por clienta (botón 🤖 GHL en su cuenta) alimenta sus automatizaciones.
- **Fase 2:** pestaña "Mensajes" dentro de la app usando la API de GHL.
- **Fase 3 (100+ clientas con SMS):** Twilio Trust Hub directo. No antes.
