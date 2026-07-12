# 👥 El equipo de 4 y sus guiones

Estructura mínima para operar Paulbeza: **closer, appointment setter,
onboarding, customer service.** Todos trabajan dentro de las herramientas del
motor — nada vive en hojas sueltas.

## 1) Appointment setter (velocidad = todo)

**Su tablero:** GHL (contactos + conversaciones) y el panel "Leads de venta" en
/admin. Cada lead nuevo le llega por notificación de GHL con nombre, teléfono,
negocio y respuestas del quiz.

**La regla de oro: marcar en menos de 5 minutos.** El lead ya dio su número — el
bot NO vende; solo mantiene el lead tibio hasta que un humano marca.

**Cadencia (los mensajes salen automáticos del workflow; el setter marca):**
- **M1 · instantáneo (automático):**
  > Hola {{nombre}} 👋 Soy del equipo de Paulbeza. Vi que pediste info para
  > {{negocio}}. Te marcamos en unos minutos de este número 📞 — contéstanos y en
  > 5 minutos te enseñamos cómo tus clientes reciben su precio de limpieza solos,
  > desde tu propia página. 🧼📲
- **Llamada 1 (setter, ≤5 min).** Objetivo: agendar la demo con el closer (o
  pasarla en caliente si el closer está libre).
- **M2 · tras llamada perdida:**
  > Te acabo de marcar 📞 Soy de Paulbeza (lo de tu página y la app que cotiza).
  > Te vuelvo a marcar al rato — o dime a qué hora te cae bien. 👍
- **Llamada 2 · ~1 hora después.**
- **M3 · a la mañana siguiente:**
  > Hola {{nombre}}, para que lo veas tú misma: escribe una dirección aquí y mira
  > lo que verían TUS clientes 👉 [dominio]/w/alto-demo — ¿te marco hoy en la
  > tarde o mañana temprano? (Si prefieres apartar tu hora: [link del calendario])
- **Llamada 3 · día 2.** Después pasa a nutrición semanal.

**Reglas:** cada mensaje termina en pregunta binaria ("¿tarde o mañana?"). El
calendario es puerta lateral, nunca el pitch. Si dice que no le interesa: se
detiene la cadencia (goal del workflow) — nunca textear tras un no.

## 2) Closer

**Su tablero:** /closer (alta de clientas, deck, links de pago, toolkit).

**Flujo de la llamada:** abre `/demo` desde el portal → corre las láminas (ver
04-ventas) → cierra con el link de pago → crea la cuenta (alta con nombre +
teléfono, el MISMO que usa en Stripe) → manda el link de acceso → agenda el
onboarding ANTES de colgar.

**Rescate si $297 duele:** "Empecemos con tu app a $67 y le agregamos la página y
el cotizador cuando estés lista." Un $67 rescatado > un $297 perdido; el upgrade
es natural.

## 3) Onboarding

**Su tablero:** /onboarding (elige la clienta → wizard guiado).

**Guion de la llamada (30–45 min):**
1. Datos del negocio + tipos de limpieza (chips) + garantía.
2. "Cuéntame tu historia" → botón ✨ Escribir con IA → revisar juntas.
3. Elegir template (los 3 en vivo, en teléfono y computadora).
4. Logo + colores. Pedir 3–5 fotos REALES por WhatsApp (la galería queda vacía
   hasta que lleguen — nunca fotos de stock como "trabajos recientes").
5. Entrenar el bot: horarios, precios, FAQs (✨ generar con IA).
6. Dominio: buscar + comprar en un clic, o conectar el suyo.
7. En la app: confirmar su nombre (saludo), sus precios en "Mis precios", e
   **instalarla juntas** — botón 📲 INSTALAR (Android nativo; iPhone guía paso a
   paso; si abrió desde WhatsApp: primero "Abrir en Safari").
8. Publicar en 24–48h — nunca prometer publicación en la misma llamada.

## 4) Customer service

**Su tablero:** /cs — tareas que caen solas cuando la clienta pide cambios (bot
🤖, página 🌐, quejas 😕), "Arreglar en automático" con vista previa + confirmación,
y "Avisarle" que manda push a la clienta. Revisa el tablero 2× día.

## El bot de conversación (la correa)

El bot de GHL NUNCA vende ni agenda por su cuenta. Instrucciones completas para
pegarle en GHL: ver **03-ghl.md → "La correa del bot"**.
