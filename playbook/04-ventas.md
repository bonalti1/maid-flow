# 🎤 La presentación (/demo) y el cierre

## Antes de la llamada

- Abrir `/demo` **desde el portal del closer**. (Pendiente de portar: el pase
  ilimitado `DEMO_PASS` — hoy el mockup comparte el tope de 6 cotizaciones; ver
  playbook/01, ítem 4. El /demo público topado es momento de conversión.)
- Idioma con el botón EN/ES.

## Las láminas (qué es cada una)

1. **Bienvenida** — "las herramientas que van a trabajar PARA ti… una limpieza
   cotizada en 60 segundos, aquí mismo".
2. **Quiénes somos** — historia de la fundadora. (La foto del equipo aparece sola
   cuando exista `landing/team.jpg`.)
3. **El problema** — los trabajos se pierden dando precios a mano, tarde, por
   WhatsApp.
4. **Tu página** — el sitio de ejemplo VIVO (scroll real, cotizador real:
   `/ejemplo`).
5. **Tu app** — mockup EN VIVO: cotizar una dirección real ahí mismo.
6. **Tu asistente IA** — TODO en vivo: abrir el chat y dejar un teléfono, **o
   llenar el cotizador como dueña de casa** — de las dos formas el lead cae en el
   teléfono del mockup frente a la prospecta. El momento más fuerte de la llamada.
7. **Tu inversión** — lo que costaría por separado → los 3 planes.
8. **Empecemos** — los 4 pasos, cerrando HOY en la llamada.

## Teclas rápidas del closer

- **P** → copia el link de pago (mandarlo por WhatsApp en el paso 1 del cierre).
- **B** → copia el mensaje de bienvenida (pegarle el link de acceso de la clienta).
- **D** → copia el mensaje con el demo del cotizador para prospectas.
- **O** → abre el link de pago.
- Flechas ← → para navegar láminas.

## Los precios (la escalera de 3)

| Plan | Precio | Qué incluye | Para quién |
|---|---|---|---|
| PRO | **$49/mes** | Solo la app (su cotizador instantáneo) | Cualquier limpiadora |
| WIDGET | **$149/mes** | App + cotizador en su página, Facebook o Instagram | Ya tiene página o redes |
| COMPLETO | **$249/mes** | Todo hecho: página + IA + dominio + app + cotizador | La que tiene equipo o empieza de cero |

Sin cargo de inicio en ninguno. Stripe etiqueta el plan por el **monto exacto**
pagado — un precio nuevo = Payment Link nuevo + monto en el mapa `planByAmount`
del webhook (`server/index.mjs`). *(Nota de estado: el motor hoy tiene un solo
link; los 3 niveles se están portando — playbook/01, ítem 10.)*

## Jugadas de cierre

- **ROI:** "Una limpieza promedio te deja $120–$300 — un par de trabajos extra al
  mes pagan tu plan completo."
- **Rescate del $249:** bajar a PRO **$49** ("y la página se agrega cuando
  quieras") en vez de perder la venta.
- **Objeción "el precio final puede cambiar":** la app es una MÁQUINA DE LEADS y
  cotizador instantáneo — la clienta ve su precio en 60 segundos y te deja su
  teléfono; el precio fino se confirma tras las fotos/inspección, como siempre.
- **Silencio después del precio.** Decir la inversión y callarse — el que habla
  primero pierde.

## Después del sí (misma llamada)

1. P → link de pago por WhatsApp → paga con Stripe.
2. Alta en /closer (nombre + teléfono, el MISMO de Stripe) → copiar link de acceso.
3. B → bienvenida + link de acceso → "hoy mismo ya estás cotizando".
4. Agendar onboarding antes de colgar.
