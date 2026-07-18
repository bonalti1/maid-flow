// Render the Pauleza sales guide (ES + EN) to PDF via headless Chromium.
import { chromium } from "playwright-core";
const OUT = "/tmp/claude-0/-home-user-maid-flow/2a6b3e11-ecc4-5329-bf13-608a2afc3111/scratchpad";
const BASE = "https://maid-flow.onrender.com";

const CSS = `
*{box-sizing:border-box;margin:0;font-family:Arial,Helvetica,sans-serif}
body{color:#16295F;font-size:11.5px;line-height:1.55}
.page{page-break-after:always;padding:44px 48px}
.page:last-child{page-break-after:auto}
.cover{height:100vh;background:linear-gradient(150deg,#16295F 0%,#1E3A8A 55%,#5B4FA8 100%);color:#fff;display:flex;flex-direction:column;justify-content:center;padding:70px}
.wm{font-size:40px;font-weight:800;letter-spacing:1px;background:linear-gradient(90deg,#A7E8C8,#7ED6D9,#8EA6E6,#A971E8);-webkit-background-clip:text;background-clip:text;color:transparent}
.cover h1{font-size:44px;line-height:1.08;margin:26px 0 14px;font-weight:800}
.cover p{color:#B9C4E2;font-size:15px;max-width:480px;line-height:1.6}
.tag{display:inline-block;background:rgba(126,214,217,.18);border:1px solid #7ED6D9;color:#A7E8C8;border-radius:99px;padding:6px 16px;font-weight:700;font-size:12px;margin-top:30px}
h2{font-size:22px;font-weight:800;color:#1E3A8A;margin-bottom:4px}
h2 .n{color:#7ED6D9;margin-right:6px}
.sub{color:#67718A;font-weight:600;font-size:12px;margin-bottom:16px}
h3{font-size:13.5px;font-weight:800;margin:16px 0 5px;color:#16295F}
p{color:#3A4560;margin-bottom:8px}
ul{margin:0 0 10px 16px;color:#3A4560}
li{margin-bottom:5px}
b{color:#16295F}
.msg{background:#ECF9F2;border-left:4px solid #7ED6D9;border-radius:0 10px 10px 0;padding:10px 14px;margin:8px 0;color:#1E3A8A;font-weight:600}
.msg .who{display:block;font-size:9.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#4FAF9B;margin-bottom:3px}
table{width:100%;border-collapse:collapse;margin:10px 0}
th{background:#1E3A8A;color:#fff;text-align:left;padding:8px 10px;font-size:11px}
td{border:1px solid #E3E8F2;padding:8px 10px;vertical-align:top}
tr:nth-child(even) td{background:#F7F9FD}
.hot td{background:#ECF9F2!important;font-weight:700}
.two{display:flex;gap:16px}
.two>div{flex:1}
.box{background:#F5F7FC;border:1px solid #E3E8F2;border-radius:12px;padding:12px 14px;margin:8px 0}
.warn{background:#FFF8E6;border:1px solid #F0D48A;border-radius:12px;padding:12px 14px;margin:8px 0;color:#7A5A00;font-weight:600}
.big{background:#1E3A8A;color:#fff;border-radius:12px;padding:14px 16px;margin:10px 0;font-size:13px;font-weight:700}
.big em{color:#A7E8C8;font-style:normal}
.kbd{display:inline-block;background:#16295F;color:#fff;border-radius:5px;padding:1px 8px;font-weight:800;font-size:11px}
.foot{position:fixed;bottom:16px;left:48px;right:48px;display:flex;justify-content:space-between;color:#9AA3B8;font-size:9px;font-weight:600}
.obj{margin-bottom:10px}
.obj .q{font-weight:800;color:#B3261E}
.obj .a{color:#3A4560}
.check li{list-style:none;margin-left:-16px}
`;

const es = {
  file: "Pauleza-Guia-de-Ventas-ES.pdf",
  cover: `<div class="wm">pauleza</div>
    <h1>Guía de ventas<br>Setter + Closer</h1>
    <p>Todo lo que necesitas para entender el producto, el dolor que resuelve, cómo agendar citas y cómo cerrar — en llamada o por mensaje.</p>
    <div class="tag">Uso interno · Julio 2026</div>`,
  pages: [
  // 1 — producto + clienta + dolor
  `<h2><span class="n">01</span>Qué es Pauleza</h2>
   <p class="sub">Si solo memorizas una frase, que sea esta:</p>
   <div class="big">"Tu página web te consigue clientas de limpieza <em>sola</em> — el dueño de casa pone su dirección, ve su precio al instante, y su teléfono te llega a tu WhatsApp."</div>
   <p>Pauleza es una suscripción mensual para <b>limpiadoras de casas hispanas</b>. No es un software de organización — es una <b>máquina de conseguir y cerrar clientes</b>:</p>
   <ul>
     <li><b>La app 🛰️</b> — la limpiadora escribe una dirección y la app escanea la casa por satélite: imagen aérea, foto de la fachada, recámaras, baños, pies cuadrados y año de construcción. En 60 segundos tiene un precio profesional con SU marca y SUS tarifas, listo para mandar por WhatsApp. También cotiza locales comerciales (modo 🏢).</li>
     <li><b>El cotizador (widget) 🧼</b> — un link/botón que pone en su página de Facebook, Instagram o su web. El dueño de casa se cotiza solo; para ver el precio deja nombre y teléfono → ese lead cae directo al WhatsApp de ella.</li>
     <li><b>La página web 🌐</b> — profesional, con su logo, sus fotos y su asistente de IA que contesta a cualquier hora. Su dominio (sunombre.com) es de ella por contrato.</li>
     <li><b>Link de cotización 🔗</b> — cada cotización se convierte en una página hosteada con su marca que la clienta abre y desde ahí aparta por WhatsApp.</li>
   </ul>
   <h3>Quién es la clienta</h3>
   <p>Limpiadora hispana, sola o con un equipo chico. Vive en su teléfono, TODO lo hace por WhatsApp, cobra en efectivo o Zelle, y su agenda es una libreta o su memoria. Español primero. No tiene paciencia para software complicado — <b>la simplicidad es el producto</b>.</p>
   <h3>El dolor que resolvemos (dilo con sus palabras)</h3>
   <ul>
     <li>"Pierdo trabajos porque contesto tarde" — cotiza a mano, por mensaje, cuando puede.</li>
     <li>"No sé cuánto cobrar" — cada precio es una adivinanza y una pena decirlo. <b>La app lo dice por ella: 'es lo que marca el sistema'.</b></li>
     <li>"Thumbtack me cobra $10–25 por un lead que le venden a 5 más."</li>
     <li>"No tengo página y mi competencia sí" — se ve informal frente a la clienta americana.</li>
     <li>"Me piden precio en Facebook y para cuando contesto, ya contrataron a otra."</li>
   </ul>`,
  // 2 — planes + anclas
  `<h2><span class="n">02</span>Los 3 planes</h2>
   <p class="sub">Sin cargo de inicio · sin contratos largos · cancela cuando quiera · su dominio es suyo</p>
   <table>
     <tr><th>Plan</th><th>Precio</th><th>Qué incluye</th><th>Para quién</th></tr>
     <tr><td><b>PRO</b></td><td><b>$49/mes</b></td><td>La app: escaneo satelital, cotiza en 60 seg, sus tarifas, sus clientes y leads, WhatsApp</td><td>Cualquier limpiadora — la puerta de entrada</td></tr>
     <tr class="hot"><td><b>WIDGET</b> ⭐</td><td><b>$149/mes</b></td><td>Todo PRO + el cotizador en SU Facebook, Instagram o página — los leads caen a su WhatsApp</td><td>La que ya tiene página de Facebook o redes (casi todas)</td></tr>
     <tr><td><b>COMPLETO</b></td><td><b>$249/mes</b></td><td>Todo WIDGET + página web profesional + asistente IA + dominio propio</td><td>La que tiene equipo o quiere verse grande</td></tr>
   </table>
   <div class="warn">⚠️ <b>Regla de oro:</b> NUNCA compares Pauleza con apps de organización (ZenMaid $19, Jobber $39). Esas organizan las citas que YA tiene. Pauleza le CONSIGUE clientas. Competimos contra lo que gasta en anuncios y Thumbtack, no contra software.</div>
   <h3>Las 3 anclas de precio (memorízalas)</h3>
   <ul>
     <li><b>Thumbtack:</b> "¿Cuánto gastas en Thumbtack? ¿$200, $300 al mes? Y esos leads se los venden a 5 limpiadoras más. Aquí los leads son SOLO tuyos, en tu propia página."</li>
     <li><b>Dos limpiezas:</b> "Una limpieza te deja $120–$300. Con 2 trabajos extra al mes ya pagaste el plan COMPLETO."</li>
     <li><b>Una clienta recurrente:</b> "Una sola clienta de cada 2 semanas vale ~$3,000 al año. Si la página te trae UNA, pagó todo el año."</li>
   </ul>
   <h3>Cómo se cobra</h3>
   <p>La página de ventas <b>no tiene botones de pago</b> — todo se cierra con un humano (tú). El link de pago de Stripe lo mandas TÚ por WhatsApp durante la llamada (tecla <span class="kbd">P</span> en la presentación). Al pagar, la clienta cae en la página de bienvenida y le mandamos su acceso.</p>`,
  // 3 — setter
  `<h2><span class="n">03</span>Rol 1 · Agendar citas (setter)</h2>
   <p class="sub">Los leads llegan del quiz de la página de ventas, con nombre, teléfono, negocio y sus respuestas.</p>
   <div class="big">La regla de oro: <em>marcar en menos de 5 minutos.</em> El lead acaba de dejar su número — cada minuto que pasa, se enfría.</div>
   <h3>La cadencia (mensajes + llamadas)</h3>
   <div class="msg"><span class="who">M1 · instantáneo (sale automático)</span>Hola {{nombre}} 👋 Soy del equipo de Pauleza. Vi que pediste info para {{negocio}}. Te marcamos en unos minutos de este número 📞 — contéstanos y en 5 minutos te enseñamos cómo tus clientes reciben su precio de limpieza solos, desde tu propia página. 🧼📲</div>
   <p><b>Llamada 1 (tú, en ≤5 min).</b> Objetivo único: agendar la demo — o pasarla en caliente al cierre si tienes espacio en ese momento.</p>
   <div class="msg"><span class="who">M2 · si no contesta</span>Te acabo de marcar 📞 Soy de Pauleza (lo de tu página y la app que cotiza). Te vuelvo a marcar al rato — o dime a qué hora te cae bien. 👍</div>
   <p><b>Llamada 2</b> ~1 hora después.</p>
   <div class="msg"><span class="who">M3 · a la mañana siguiente (el demo vende solo)</span>Hola {{nombre}}, para que lo veas tú misma: escribe una dirección aquí y mira lo que verían TUS clientes 👉 ${BASE}/w/alto-demo — ¿te marco hoy en la tarde o mañana temprano?</div>
   <p><b>Llamada 3</b> al día 2. Después pasa a seguimiento semanal.</p>
   <h3>Reglas del setter</h3>
   <ul>
     <li>Cada mensaje termina en <b>pregunta binaria</b>: "¿tarde o mañana?" — nunca "¿te interesa?"</li>
     <li>El calendario es puerta lateral; tu meta es la llamada, no el link.</li>
     <li>Si dice "no me interesa": <b>se detiene todo</b>. Nunca textear después de un no.</li>
     <li>Tú no vendes el precio — vendes la DEMO. "En 5 minutos te lo enseño en vivo" cierra más citas que cualquier explicación.</li>
   </ul>
   <h3>Calificación en 30 segundos (las 4 del quiz)</h3>
   <ul><li>¿En qué te enfocas? (casas / Airbnb / oficinas)</li><li>¿Cuánto llevas limpiando?</li><li>¿Cuántos trabajos por semana?</li><li>¿Cuánto inviertes en marketing al mes?</li></ul>
   <p>Con equipo o gasto en marketing → apunta a COMPLETO. Empezando → PRO/WIDGET.</p>`,
  // 4 — demo/closer
  `<h2><span class="n">04</span>Rol 2 · La demo y el cierre (closer)</h2>
   <p class="sub">Todo vive en tu portal: ${BASE}/closer — de ahí abres la presentación, das de alta y copias links.</p>
   <h3>El flujo de la llamada (láminas de /demo)</h3>
   <ul>
     <li><b>1. Bienvenida</b> — "estas herramientas van a trabajar PARA ti".</li>
     <li><b>2. El problema</b> — los trabajos se pierden dando precios tarde, a mano, por WhatsApp.</li>
     <li><b>3. Tu página (EN VIVO)</b> — abre el sitio de ejemplo, haz scroll real: "así se vería la tuya".</li>
     <li><b>4. Tu app (EN VIVO)</b> — cotiza una dirección REAL de ella ahí mismo. El escaneo satelital es el momento "wow" #1.</li>
     <li><b>5. El asistente IA (EN VIVO)</b> — llena el cotizador como si fueras dueño de casa y deja un teléfono… <b>el lead cae frente a ella</b>. El momento más fuerte de la llamada: "así te van a llegar a TI".</li>
     <li><b>6. La inversión</b> — di el precio… <b>y cállate</b>. El que habla primero, pierde.</li>
   </ul>
   <h3>Teclas rápidas (en la presentación)</h3>
   <p><span class="kbd">P</span> copia el link de pago · <span class="kbd">B</span> copia la bienvenida · <span class="kbd">D</span> copia el mensaje demo · <span class="kbd">O</span> abre el pago · <span class="kbd">←→</span> navegan láminas</p>
   <h3>Jugadas de cierre</h3>
   <ul>
     <li><b>ROI:</b> "Una limpieza te deja $120–$300 — dos trabajos extra al mes pagan todo el plan."</li>
     <li><b>Rescate:</b> si $249 duele → "Empecemos con tu app a $49 y la página se agrega cuando estés lista." Un $49 rescatado vale más que un $249 perdido — el upgrade llega solo.</li>
     <li><b>Cierre de hoy:</b> "Te lo dejo funcionando HOY en la misma llamada — ¿empezamos?"</li>
   </ul>
   <h3>Después del SÍ (misma llamada, nunca "luego te mando")</h3>
   <ul class="check">
     <li>☑ 1. <span class="kbd">P</span> → link de pago por WhatsApp → paga en Stripe ahí mismo.</li>
     <li>☑ 2. Alta en /closer: nombre + teléfono (el MISMO que usó en Stripe) → copia su link de acceso.</li>
     <li>☑ 3. <span class="kbd">B</span> → mensaje de bienvenida + su link de acceso → "hoy mismo ya estás cotizando".</li>
     <li>☑ 4. Agenda su onboarding ANTES de colgar.</li>
   </ul>`,
  // 5 — objeciones
  `<h2><span class="n">05</span>Objeciones — qué contestar</h2>
   <div class="obj"><p class="q">"Está caro."</p><p class="a">"¿Comparado con qué? ZenMaid a $19 te organiza las citas que ya tienes — no te trae NI UNA clienta. Aquí hablamos de conseguirte clientas: ¿cuánto te deja UNA limpieza? ¿$150? Dos trabajos extra al mes y el plan se pagó solo."</p></div>
   <div class="obj"><p class="q">"Ya tengo mis clientas."</p><p class="a">"¡Perfecto — eso dice que limpias bien! ¿Y qué pasa cuando una se muda o cancela? Esta página trabaja mientras tú limpias: cada semana te va metiendo clientas nuevas a la fila, sin que pagues por lead."</p></div>
   <div class="obj"><p class="q">"No soy buena con la tecnología."</p><p class="a">"Por eso existe esto. Todo pasa en WhatsApp, que ya usas todos los días. Escribes una dirección y la app hace el resto — y te lo dejamos instalado y configurado nosotros, juntas, en la llamada de bienvenida."</p></div>
   <div class="obj"><p class="q">"Déjame pensarlo."</p><p class="a">"Claro. ¿Qué es lo que te hace dudar — el precio o si te va a funcionar? [escucha] Mira, empecemos con la app a $49 este mes; si te consigue un solo trabajo ya salió gratis, y la página la agregamos cuando quieras."</p></div>
   <div class="obj"><p class="q">"¿Y si el precio que da la app está mal?"</p><p class="a">"El precio sale de TUS tarifas — tú las pones. Y siempre sale como rango estimado: el precio fino se confirma con fotos o visita, como siempre lo has hecho. La diferencia es que ahora la clienta ve un número al instante y te deja su teléfono — sin eso, se va con la que sí contestó."</p></div>
   <div class="obj"><p class="q">"Mis clientes hablan inglés."</p><p class="a">"Todo es bilingüe: tu app en español y lo que ve el cliente en inglés o español. La cotización le llega en su idioma."</p></div>
   <div class="obj"><p class="q">"Yo limpio oficinas, no casas."</p><p class="a">"La app tiene modo Comercial 🏢: pones los pies cuadrados del local (vienen en el contrato de renta) y sale el precio igual de rápido, con tarifas de oficina."</p></div>
   <div class="obj"><p class="q">"¿Thumbtack no es lo mismo?"</p><p class="a">"En Thumbtack pagas $10–25 por cada lead… que le venden a 5 limpiadoras más, y a pelear el precio. Aquí el lead llega de TU página, con TU marca, y es solo tuyo."</p></div>`,
  // 6 — cheat sheet
  `<h2><span class="n">06</span>Hoja rápida (imprime esta página)</h2>
   <h3>Links que vas a usar todos los días</h3>
   <table>
     <tr><th>Qué</th><th>Link</th><th>Cuándo</th></tr>
     <tr><td>Página de ventas</td><td>${BASE}/ventas</td><td>Lo que vio el lead antes de dejar sus datos</td></tr>
     <tr><td>Demo del cotizador</td><td>${BASE}/w/alto-demo</td><td>Mándalo por mensaje — "pruébalo tú misma"</td></tr>
     <tr><td>Página de ejemplo</td><td>${BASE}/ejemplo</td><td>"Así se vería TU página"</td></tr>
     <tr><td>Tu portal (closer)</td><td>${BASE}/closer</td><td>Presentación, altas, links de pago</td></tr>
     <tr><td>La app</td><td>${BASE}/</td><td>Demo en vivo del escaneo satelital</td></tr>
   </table>
   <h3>Precios</h3>
   <p><b>PRO $49</b> (la app) · <b>WIDGET $149</b> ⭐ el más vendido (app + cotizador en su Facebook/Instagram) · <b>COMPLETO $249</b> (todo: página + IA + dominio). Sin cargo de inicio, cancela cuando quiera.</p>
   <h3>Frases que cierran</h3>
   <ul>
     <li>"El dueño pone su dirección, ve su precio, y su teléfono te llega a ti."</li>
     <li>"No es para organizarte — es para conseguirte clientas."</li>
     <li>"Es lo que marca el sistema" — la app da el precio para que ella no tenga que pelearlo.</li>
     <li>"Dos trabajos extra al mes y se pagó solo."</li>
     <li>"Te lo dejo funcionando hoy, en esta misma llamada."</li>
   </ul>
   <h3>Los 5 nunca</h3>
   <ul>
     <li>Nunca compares con ZenMaid/Jobber — cambia el marco a conseguir clientas.</li>
     <li>Nunca mandes el link de pago sin haber hecho la demo en vivo.</li>
     <li>Nunca textees después de un "no me interesa".</li>
     <li>Nunca prometas medidas exactas — es rango estimado; el precio fino se confirma en sitio.</li>
     <li>Nunca cuelgues sin el onboarding agendado (si compró) o la siguiente llamada (si no).</li>
   </ul>`,
  ],
  footer: "Pauleza · Guía de ventas · uso interno",
};

const en = {
  file: "Pauleza-Sales-Guide-EN.pdf",
  cover: `<div class="wm">pauleza</div>
    <h1>Sales Guide<br>Setter + Closer</h1>
    <p>Everything you need to understand the product, the pain it solves, how to book appointments and how to close — on a call or over text.</p>
    <div class="tag">Internal use · July 2026</div>`,
  pages: [
  `<h2><span class="n">01</span>What Pauleza is</h2>
   <p class="sub">If you memorize one sentence, make it this one:</p>
   <div class="big">"Your website gets you cleaning clients <em>by itself</em> — the homeowner types their address, sees their price instantly, and their phone number lands in your WhatsApp."</div>
   <p>Pauleza is a monthly subscription for <b>Hispanic house cleaners</b>. It is not organizer software — it's a <b>machine for getting and closing clients</b>:</p>
   <ul>
     <li><b>The app 🛰️</b> — the cleaner types an address and the app scans the home by satellite: aerial image, street photo, bedrooms, baths, square footage, year built. In 60 seconds she has a professional quote with HER brand and HER rates, ready to send on WhatsApp. It also quotes commercial spaces (🏢 mode).</li>
     <li><b>The quote widget 🧼</b> — a link/button she puts on her Facebook page, Instagram or website. Homeowners quote themselves; to see the price they leave name + phone → that lead lands straight in her WhatsApp.</li>
     <li><b>The website 🌐</b> — professional, with her logo, her photos, and an AI assistant that answers around the clock. Her domain (hername.com) is hers by contract.</li>
     <li><b>Shareable quote link 🔗</b> — every quote becomes a hosted branded page the customer opens and books from via WhatsApp.</li>
   </ul>
   <h3>Who the customer is</h3>
   <p>A Hispanic cleaner, solo or with a small crew. Lives on her phone, runs EVERYTHING through WhatsApp, gets paid in cash or Zelle, keeps her schedule in a notebook or her head. Spanish first. Zero patience for complicated software — <b>simplicity IS the product</b>.</p>
   <h3>The pain we solve (say it in her words)</h3>
   <ul>
     <li>"I lose jobs because I answer late" — she quotes by hand, over text, when she can.</li>
     <li>"I don't know what to charge" — every price is a guess and it's awkward to say it. <b>The app says it for her: "that's what the system shows."</b></li>
     <li>"Thumbtack charges me $10–25 for a lead they sell to 5 other cleaners."</li>
     <li>"I don't have a website and my competition does" — she looks informal to American clients.</li>
     <li>"They ask for a price on Facebook and by the time I answer, they hired someone else."</li>
   </ul>`,
  `<h2><span class="n">02</span>The 3 plans</h2>
   <p class="sub">No setup fee · no long contracts · cancel anytime · her domain is hers</p>
   <table>
     <tr><th>Plan</th><th>Price</th><th>What's included</th><th>Who it's for</th></tr>
     <tr><td><b>PRO</b></td><td><b>$49/mo</b></td><td>The app: satellite scan, 60-second quotes, her rates, her clients & leads, WhatsApp</td><td>Any cleaner — the entry door</td></tr>
     <tr class="hot"><td><b>WIDGET</b> ⭐</td><td><b>$149/mo</b></td><td>Everything in PRO + the quote widget on HER Facebook, Instagram or page — leads land in her WhatsApp</td><td>Anyone with a Facebook page or socials (almost everyone)</td></tr>
     <tr><td><b>COMPLETO</b></td><td><b>$249/mo</b></td><td>Everything in WIDGET + professional website + AI assistant + her own domain</td><td>Cleaners with a crew, or who want to look big</td></tr>
   </table>
   <div class="warn">⚠️ <b>Golden rule:</b> NEVER let Pauleza be compared to organizer apps (ZenMaid $19, Jobber $39). Those organize the appointments she ALREADY has. Pauleza GETS her clients. We compete with her ad/Thumbtack spend, not with software.</div>
   <h3>The 3 price anchors (memorize them)</h3>
   <ul>
     <li><b>Thumbtack:</b> "How much do you spend on Thumbtack? $200, $300 a month? And those leads get sold to 5 other cleaners. Here the leads are YOURS ONLY, from your own page."</li>
     <li><b>Two cleanings:</b> "One cleaning nets you $120–$300. Two extra jobs a month pays for the COMPLETO plan."</li>
     <li><b>One recurring client:</b> "A single every-2-weeks client is worth ~$3,000 a year. If the page brings you ONE, it paid for the whole year."</li>
   </ul>
   <h3>How payment works</h3>
   <p>The sales landing has <b>no payment buttons</b> — every sale closes with a human (you). YOU send the Stripe payment link over WhatsApp during the call (press <span class="kbd">P</span> in the deck). After paying, the client lands on the welcome page and we send her access link.</p>`,
  `<h2><span class="n">03</span>Role 1 · Appointment setting</h2>
   <p class="sub">Leads arrive from the sales page quiz with name, phone, business and their answers.</p>
   <div class="big">The golden rule: <em>call within 5 minutes.</em> The lead just left their number — every passing minute, it goes cold.</div>
   <h3>The cadence (messages + calls)</h3>
   <div class="msg"><span class="who">M1 · instant (sent automatically)</span>Hi {{name}} 👋 I'm with the Pauleza team. I saw you asked for info for {{business}}. We'll call you in a few minutes from this number 📞 — pick up and in 5 minutes we'll show you how your clients get their cleaning price on their own, from your own page. 🧼📲</div>
   <p><b>Call 1 (you, within 5 min).</b> Single goal: book the demo — or hand it off hot if the closer is free right then.</p>
   <div class="msg"><span class="who">M2 · after a missed call</span>Just called you 📞 It's Pauleza (the website + the app that quotes). I'll try again in a bit — or tell me what time works. 👍</div>
   <p><b>Call 2</b> ~1 hour later.</p>
   <div class="msg"><span class="who">M3 · next morning (the demo sells itself)</span>Hi {{name}}, so you can see it yourself: type an address here and see what YOUR clients would see 👉 ${BASE}/w/alto-demo — should I call you this afternoon or tomorrow morning?</div>
   <p><b>Call 3</b> on day 2. Then weekly nurture.</p>
   <h3>Setter rules</h3>
   <ul>
     <li>Every message ends in a <b>binary question</b>: "afternoon or morning?" — never "are you interested?"</li>
     <li>The calendar link is a side door; your goal is the call, not the link.</li>
     <li>If they say "not interested": <b>everything stops</b>. Never text after a no.</li>
     <li>You don't sell the price — you sell the DEMO. "Give me 5 minutes and I'll show you live" books more appointments than any explanation.</li>
   </ul>
   <h3>30-second qualification (the 4 quiz questions)</h3>
   <ul><li>What do you focus on? (homes / Airbnb / offices)</li><li>How long have you been cleaning?</li><li>How many jobs per week?</li><li>How much do you spend on marketing monthly?</li></ul>
   <p>Has a crew or marketing spend → aim at COMPLETO. Just starting → PRO/WIDGET.</p>`,
  `<h2><span class="n">04</span>Role 2 · The demo and the close</h2>
   <p class="sub">Everything lives in your portal: ${BASE}/closer — open the deck, create accounts, copy links from there.</p>
   <h3>The call flow (the /demo slides)</h3>
   <ul>
     <li><b>1. Welcome</b> — "these tools are going to work FOR you".</li>
     <li><b>2. The problem</b> — jobs are lost quoting late, by hand, over WhatsApp.</li>
     <li><b>3. Your website (LIVE)</b> — open the example site, scroll it for real: "this is what yours would look like".</li>
     <li><b>4. Your app (LIVE)</b> — quote HER real address right there. The satellite scan is wow moment #1.</li>
     <li><b>5. The AI assistant (LIVE)</b> — fill the widget like a homeowner and leave a phone number… <b>the lead drops in front of her</b>. Strongest moment of the call: "this is how they'll reach YOU".</li>
     <li><b>6. The investment</b> — say the price… <b>and go silent</b>. Whoever talks first, loses.</li>
   </ul>
   <h3>Hotkeys (inside the deck)</h3>
   <p><span class="kbd">P</span> copies the payment link · <span class="kbd">B</span> copies the welcome message · <span class="kbd">D</span> copies the demo message · <span class="kbd">O</span> opens the payment · <span class="kbd">←→</span> navigate slides</p>
   <h3>Closing plays</h3>
   <ul>
     <li><b>ROI:</b> "One cleaning nets you $120–$300 — two extra jobs a month pays the whole plan."</li>
     <li><b>The rescue:</b> if $249 stings → "Let's start with your app at $49 and we add the page whenever you're ready." A saved $49 beats a lost $249 — the upgrade comes naturally.</li>
     <li><b>Today close:</b> "I'll have it working for you TODAY, on this same call — shall we start?"</li>
   </ul>
   <h3>After the YES (same call — never "I'll send it later")</h3>
   <ul class="check">
     <li>☑ 1. <span class="kbd">P</span> → payment link via WhatsApp → she pays on Stripe right there.</li>
     <li>☑ 2. Create her account in /closer: name + phone (the SAME one she used on Stripe) → copy her access link.</li>
     <li>☑ 3. <span class="kbd">B</span> → welcome message + her access link → "you're quoting today".</li>
     <li>☑ 4. Book her onboarding BEFORE hanging up.</li>
   </ul>`,
  `<h2><span class="n">05</span>Objections — what to answer</h2>
   <div class="obj"><p class="q">"It's expensive."</p><p class="a">"Compared to what? ZenMaid at $19 organizes the appointments you already have — it doesn't bring you a single client. This is about GETTING you clients: what does ONE cleaning net you? $150? Two extra jobs a month and the plan paid for itself."</p></div>
   <div class="obj"><p class="q">"I already have my clients."</p><p class="a">"Perfect — that means you clean well! And what happens when one moves away or cancels? This page works while you clean: it keeps feeding new clients into your pipeline every week, without paying per lead."</p></div>
   <div class="obj"><p class="q">"I'm not good with technology."</p><p class="a">"That's exactly why this exists. Everything happens in WhatsApp, which you already use every day. You type an address and the app does the rest — and we set it all up WITH you on the welcome call."</p></div>
   <div class="obj"><p class="q">"Let me think about it."</p><p class="a">"Of course. What's making you hesitate — the price, or whether it'll work for you? [listen] Look, let's start with the app at $49 this month; if it gets you one job it already paid for itself, and we add the page whenever you want."</p></div>
   <div class="obj"><p class="q">"What if the app's price is wrong?"</p><p class="a">"The price comes from YOUR rates — you set them. And it always shows as an estimated range: the final price is confirmed with photos or a visit, like you've always done. The difference is the client sees a number instantly and leaves you their phone — without that, they go with whoever answered first."</p></div>
   <div class="obj"><p class="q">"My clients speak English."</p><p class="a">"Everything is bilingual: your app in Spanish, and what the client sees in English or Spanish. The quote reaches them in their language."</p></div>
   <div class="obj"><p class="q">"I clean offices, not houses."</p><p class="a">"The app has a Commercial 🏢 mode: you enter the square footage of the space (it's on the lease) and the price comes out just as fast, with office rates."</p></div>
   <div class="obj"><p class="q">"Isn't Thumbtack the same thing?"</p><p class="a">"On Thumbtack you pay $10–25 per lead… which gets sold to 5 other cleaners, and then you fight on price. Here the lead comes from YOUR page, with YOUR brand, and it's yours alone."</p></div>`,
  `<h2><span class="n">06</span>Cheat sheet (print this page)</h2>
   <h3>Links you'll use every day</h3>
   <table>
     <tr><th>What</th><th>Link</th><th>When</th></tr>
     <tr><td>Sales landing</td><td>${BASE}/ventas</td><td>What the lead saw before leaving their info</td></tr>
     <tr><td>Quote-widget demo</td><td>${BASE}/w/alto-demo</td><td>Send it by text — "try it yourself"</td></tr>
     <tr><td>Example website</td><td>${BASE}/ejemplo</td><td>"This is what YOUR page would look like"</td></tr>
     <tr><td>Your portal (closer)</td><td>${BASE}/closer</td><td>Deck, account creation, payment links</td></tr>
     <tr><td>The app</td><td>${BASE}/</td><td>Live demo of the satellite scan</td></tr>
   </table>
   <h3>Prices</h3>
   <p><b>PRO $49</b> (the app) · <b>WIDGET $149</b> ⭐ best seller (app + widget on her Facebook/Instagram) · <b>COMPLETO $249</b> (everything: page + AI + domain). No setup fee, cancel anytime.</p>
   <h3>Lines that close</h3>
   <ul>
     <li>"The homeowner types their address, sees their price, and their phone lands with you."</li>
     <li>"It's not for organizing — it's for getting clients."</li>
     <li>"That's what the system shows" — the app says the price so she doesn't have to fight for it.</li>
     <li>"Two extra jobs a month and it paid for itself."</li>
     <li>"I'll have it working today, on this very call."</li>
   </ul>
   <h3>The 5 nevers</h3>
   <ul>
     <li>Never compare with ZenMaid/Jobber — reframe to getting clients.</li>
     <li>Never send the payment link before doing the live demo.</li>
     <li>Never text after a "not interested".</li>
     <li>Never promise exact measurements — it's an estimated range; final price is confirmed on site.</li>
     <li>Never hang up without onboarding booked (if she bought) or the next call booked (if not).</li>
   </ul>`,
  ],
  footer: "Pauleza · Sales guide · internal use",
};

const html = (d) => `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
<div class="page cover" style="padding:0"><div class="cover" style="width:100%">${d.cover}</div></div>
${d.pages.map((p) => `<div class="page">${p}</div>`).join("")}
</body></html>`;

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome", args: ["--no-sandbox"] });
for (const d of [es, en]) {
  const page = await browser.newPage();
  await page.setContent(html(d), { waitUntil: "networkidle" });
  await page.pdf({
    path: `${OUT}/${d.file}`, format: "Letter", printBackground: true,
    margin: { top: "0", bottom: "28px", left: "0", right: "0" },
    displayHeaderFooter: true, headerTemplate: "<span></span>",
    footerTemplate: `<div style="width:100%;display:flex;justify-content:space-between;padding:0 48px;font-size:8px;color:#9AA3B8;font-family:Arial"><span>${d.footer}</span><span class="pageNumber"></span></div>`,
  });
  console.log("pdf:", d.file);
  await page.close();
}
await browser.close();
process.exit(0);
