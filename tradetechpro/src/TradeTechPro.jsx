import React, { useState, useRef, useEffect } from "react";
// Single source of truth for pricing — the same engine the server uses for the
// public widget. Pure JS, no node deps, so Vite bundles it for the browser.
import { quote as priceQuote, mergeRates, DEFAULTS } from "../server/pricing.mjs";

/* ─── Brand tokens (Paulbeza: mint · aqua · light blue · purple · dark blue) ─── */
const C = {
  teal: "#1E3A8A",       // primary — header bar, dark cards, headings (Dark Blue)
  tealDeep: "#16295F",   // deepest — gradients, deep panels
  gold: "#7ED6D9",       // aqua accent
  goldSoft: "#ECF9F2",   // mint tint
  bg: "#F4F7FB",
  card: "#FFFFFF",
  line: "#E3E9F4",
  slate: "#5A7488",
  green: "#1E9E5A",
  greenSoft: "#E6F5EC",
  red: "#D64545",
  redSoft: "#FBEAEA",
  navy: "#1E2A4A",       // dark text
};
// Scoped visual language for the app screens.
const M = {
  teal: "#1E3A8A", tealDeep: "#16295F",
  purple: "#A971E8", mint: "#A7E8C8", aqua: "#7ED6D9", lblue: "#8EA6E6",
  cardGrad: "linear-gradient(135deg,#1E3A8A 0%,#3B4FA0 55%,#7B5BD6 100%)",
  headGrad: "linear-gradient(135deg,#16295F 0%,#1E3A8A 62%,#5B4FA8 100%)",
  brandGrad: "linear-gradient(90deg,#A7E8C8 0%,#7ED6D9 35%,#8EA6E6 68%,#A971E8 100%)",
  gold: "#A971E8", goldHi: "#A7E8C8", goldSoft: "#ECF9F2",
  bg: "#F4F7FB", line: "#E3E9F4", line2: "#D9E2F2",
  muted: "#8FA6B6", muted2: "#5A7488", body: "#324A5C",
  green: "#1E9E5A", red: "#E8442E",
};
/* Lowercase gradient wordmark, per the brand mockup. */
const Wordmark = ({ size = 20 }) => (
  <span style={{ fontWeight: 900, fontSize: size, letterSpacing: "-0.02em", background: M.brandGrad, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>paulbeza</span>
);

/* ─── Catalogs (Spanish-first) ─── */
const CLEANING_TYPES = [
  ["regular", "🧹", "Limpieza regular", "Regular cleaning"],
  ["deep", "✨", "Limpieza profunda", "Deep cleaning"],
  ["move_in", "📦", "Mudanza (entrada)", "Move-in"],
  ["move_out", "🚪", "Mudanza (salida)", "Move-out"],
  ["airbnb", "🏨", "Rotación Airbnb", "Airbnb turnover"],
  ["post_construction", "🏗️", "Post-construcción", "Post-construction"],
  ["office", "🏢", "Oficina", "Office"],
];
const TYPE_ES = { regular: "regular", deep: "profunda", move_in: "mudanza (entrada)", move_out: "mudanza (salida)", airbnb: "rotación Airbnb", post_construction: "post-construcción", office: "de oficina" };
const TYPE_EN = { regular: "regular", deep: "deep", move_in: "move-in", move_out: "move-out", airbnb: "Airbnb turnover", post_construction: "post-construction", office: "office" };

const CONDITIONS = [
  ["light", "🌿", "Ligera", "Light", "Casa bien mantenida", "Well kept"],
  ["normal", "🏠", "Normal", "Normal", "Uso diario normal", "Everyday use"],
  ["heavy", "🧼", "Pesada", "Heavy", "Mucha acumulación", "Lots of buildup"],
  ["very_heavy", "⚠️", "Muy pesada", "Very heavy", "Requiere cotización personalizada", "Custom quote recommended"],
];
const PETS = [
  ["none", "🚫", "Sin mascotas", "No pets"],
  ["light", "🐾", "Poco pelo", "Light hair"],
  ["heavy", "🐕", "Mucho pelo", "Heavy hair"],
  ["stains", "💧", "Manchas / olor", "Stains / smell"],
];
const FREQUENCIES = [
  ["one_time", "Una vez", "One-time", ""],
  ["weekly", "Semanal", "Weekly", "−20%"],
  ["biweekly", "Quincenal", "Biweekly", "−15%"],
  ["monthly", "Mensual", "Monthly", "−10%"],
];
const FURNISHED = [
  ["empty", "Vacía", "Empty"],
  ["partial", "Parcial", "Partial"],
  ["full", "Amueblada", "Furnished"],
];
const ADDONS = [
  ["fridge", "🧊", "Refrigerador", "Fridge"],
  ["oven", "🔥", "Horno", "Oven"],
  ["cabinets", "🚪", "Gabinetes por dentro", "Inside cabinets"],
  ["windows", "🪟", "Ventanas", "Windows"],
  ["blinds", "🎚️", "Persianas", "Blinds"],
  ["baseboards", "📏", "Zócalos", "Baseboards"],
  ["laundry", "🧺", "Lavar ropa", "Laundry"],
  ["dishes", "🍽️", "Lavar trastes", "Dishes"],
  ["garage", "🚗", "Garaje", "Garage"],
  ["patio", "🪴", "Patio", "Patio"],
  ["trash", "🗑️", "Sacar basura", "Trash haul-out"],
  ["organization", "🗂️", "Organización", "Organization"],
];

/* ─── Translations ─── */
const TR = {
  es: {
    demoBanner: "🧪 Modo demo — tus datos no se guardan en la nube. ¿Cliente? Entra con tu link de WhatsApp.",
    demoLimit: "El modo demo incluye 6 búsquedas de prueba y ya las usaste. Las limpiadoras de Paulbeza cotizan sin límite.",
    nav: { home: "Inicio", cobros: "Cobros", quote: "Cotizar", clients: "Clientes", prices: "Mis precios", account: "Ajustes" },
    measuring1: "Buscando la propiedad…", measuring2: "Midiendo el trabajo…", measuring3: "Calculando tu cotización…",
    beds: "Recámaras", baths: "Baños", sqft: "pies²", builtIn: "Construida",
    useMyLocation: "Usar mi ubicación", myLocation: "Mi ubicación", locating: "Buscando tu ubicación…",
    locErr: "No pude obtener tu ubicación. Activa el GPS y permite el acceso.",
    next: "Siguiente", back: "Atrás", skip: "Omitir", optional: "opcional",
  },
  en: {
    demoBanner: "🧪 Demo mode — your data isn't saved to the cloud. Client? Enter with your WhatsApp link.",
    demoLimit: "The demo includes 6 trial lookups and you've used them. Paulbeza cleaners quote with no limits.",
    nav: { home: "Home", cobros: "Payments", quote: "Quote", clients: "Clients", prices: "My prices", account: "Settings" },
    measuring1: "Finding the property…", measuring2: "Sizing the job…", measuring3: "Calculating your quote…",
    beds: "Bedrooms", baths: "Baths", sqft: "sq ft", builtIn: "Built",
    useMyLocation: "Use my location", myLocation: "My location", locating: "Finding your location…",
    locErr: "Couldn't get your location. Turn on GPS and allow access.",
    next: "Next", back: "Back", skip: "Skip", optional: "optional",
  },
};

/* ─── Seed data ─── */
const seedCustomers = [
  { id: 1, name: "María Garza", phone: "(956) 555-0143", addr: "456 Oak Dr, Rio Grande City, TX" },
  { id: 2, name: "José Pérez", phone: "(956) 555-0188", addr: "210 Mesquite Ln, Roma, TX" },
  { id: 3, name: "Ana Ríos", phone: "(956) 555-0102", addr: "88 Palma St, La Grulla, TX" },
];

const MOCK_PROPERTIES = [
  { addr: "456 Oak Dr, Rio Grande City, TX", beds: 3, baths: 2, sqft: 1850 },
  { addr: "210 Mesquite Ln, Roma, TX", beds: 4, baths: 2, sqft: 2400 },
  { addr: "88 Palma St, La Grulla, TX", beds: 2, baths: 1, sqft: 1240 },
  { addr: "1204 Cenizo Ct, Rio Grande City, TX", beds: 4, baths: 3, sqft: 2980 },
];
const hashAddr = (s) => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 99991; return h; };
// Offline/demo property lookup, shaped like the live /api/lookup response.
const mockLookup = (addr) => new Promise((resolve) => {
  setTimeout(() => {
    const known = MOCK_PROPERTIES.find((p) => p.addr.toLowerCase() === addr.toLowerCase());
    if (known) { resolve({ found: true, source: "demo", addr, sqft: known.sqft, beds: known.beds, baths: known.baths }); return; }
    const h = hashAddr(addr.toLowerCase());
    resolve({ found: true, source: "demo", addr, sqft: 1400 + (h % 1600), beds: 2 + (h % 3), baths: 1 + (h % 3) });
  }, 1800);
});

const fmt = (n) => "$" + Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
const num = (n) => Number(n || 0).toLocaleString("en-US");

/* ─── Shared UI ─── */
const Card = ({ children, style = {} }) => (
  <div className="rounded-2xl p-4 mb-3" style={{ background: "#fff", border: `1px solid ${M.line}`, boxShadow: "0 2px 8px rgba(10,92,76,0.06)", ...style }}>{children}</div>
);

const PrimaryBtn = ({ children, onClick, disabled, style = {} }) => (
  <button onClick={onClick} disabled={disabled} className="w-full active:translate-y-px transition-transform"
    style={{ background: disabled ? M.line : M.teal, color: disabled ? M.muted : "#fff", border: "none", borderRadius: 12, padding: 15, fontSize: 16, fontWeight: 800, letterSpacing: "0.01em", boxShadow: disabled ? "none" : "0 4px 14px rgba(14,140,114,0.3)", ...style }}>
    {children}
  </button>
);

const TextInput = ({ value, onChange, placeholder, type = "text", inputMode }) => (
  <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} inputMode={inputMode}
    className="w-full rounded-xl px-3.5 py-3 mb-2 font-semibold outline-none" style={{ background: M.bg, border: `1.5px solid ${M.line}`, color: M.navy, fontSize: 15 }} />
);

const OptionGrid = ({ options, value, onChange, cols = 2 }) => (
  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
    {options.map((o) => {
      const on = value === o.key;
      return (
        <button key={o.key} onClick={() => onChange(o.key)} className="text-left active:scale-[0.98] transition-transform"
          style={{ background: on ? M.teal : "#fff", color: on ? "#fff" : M.navy, border: `1.5px solid ${on ? M.teal : M.line}`, borderRadius: 14, padding: "13px 14px" }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>{o.icon}</div>
          <div className="font-extrabold" style={{ fontSize: 14, lineHeight: 1.2 }}>{o.title}</div>
          {o.sub && <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2, color: on ? "rgba(255,255,255,0.82)" : M.muted2 }}>{o.sub}</div>}
        </button>
      );
    })}
  </div>
);

/* Saved cleaner profile — survives closing the app */
const savedProfile = (() => {
  try { return JSON.parse(localStorage.getItem("maidflow_profile") || "null") || {}; } catch { return {}; }
})();

/* Demo entrance for the sales deck (/?demo=...): open straight into the quote
 * flow with an ephemeral demo profile — nothing is saved. */
const WANT_DEMO = /[?&]demo=/.test(window.location.search);
const DEMO_ON = WANT_DEMO && !savedProfile.biz;

/* Unlimited-demo pass (?pass=…) — injected by the /demo deck for logged-in staff.
 * Persisted so the sales-call device stays uncapped for the whole session. */
const DEMO_PASS = (() => {
  try {
    const m = /[?&]pass=([^&]+)/.exec(window.location.search);
    if (m) { const v = decodeURIComponent(m[1]); localStorage.setItem("maidflow_pass", v); return v; }
    return localStorage.getItem("maidflow_pass") || "";
  } catch { return ""; }
})();

/* Platform detection for the install flow. */
const UA = (typeof navigator !== "undefined" && navigator.userAgent) || "";
const IS_IOS = /iphone|ipad|ipod/i.test(UA);
// In-app browsers (WhatsApp/Instagram/Facebook) can't install a PWA — the user
// must reopen the link in the real browser first.
const IS_INAPP = /WhatsApp|FBAN|FBAV|FB_IAB|Instagram|Line\//i.test(UA);
const IS_STANDALONE = typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true);

/* ─── Main App ─── */
export default function TradeTechPro() {
  const [lang, setLang] = useState(savedProfile.lang === "en" ? "en" : "es");
  const t = TR[lang] || TR.es;
  const welcomedInit = (() => { try { return !!localStorage.getItem("maidflow_welcomed"); } catch { return false; } })();
  const [screen, setScreen] = useState(WANT_DEMO ? "quote" : (welcomedInit ? "home" : "welcome"));

  const [userName, setUserName] = useState(savedProfile.name || (DEMO_ON ? "María" : ""));
  const [bizName, setBizName] = useState(savedProfile.biz || (DEMO_ON ? "Brillo Cleaning (Demo)" : ""));
  const [userPhone, setUserPhone] = useState(savedProfile.phone || "");
  const [logo, setLogo] = useState(savedProfile.logo || null);
  const [bizEmail, setBizEmail] = useState(savedProfile.email || "");
  const [zelle, setZelle] = useState(savedProfile.zelle || "");
  const [myRates, setMyRates] = useState(savedProfile.rates || {});
  const logoIdRef = useRef(null);

  const saveProfile = (patch) => {
    try {
      const cur = JSON.parse(localStorage.getItem("maidflow_profile") || "{}");
      localStorage.setItem("maidflow_profile", JSON.stringify({ ...cur, ...patch }));
    } catch { /* private mode */ }
  };

  const onLogoFile = (file) => {
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 240 / img.width, 120 / img.height);
      const cv = document.createElement("canvas");
      cv.width = Math.round(img.width * scale);
      cv.height = Math.round(img.height * scale);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      let data = cv.toDataURL("image/png");
      if (data.length > 120000) data = cv.toDataURL("image/jpeg", 0.82);
      setLogo(data);
      logoIdRef.current = null;
      saveProfile({ logo: data });
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  };

  const [customers, setCustomers] = useState(DEMO_ON ? seedCustomers : []);
  const [savedQuotes, setSavedQuotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem("maidflow_quotes") || "[]"); } catch { return []; }
  });
  const [toast, setToast] = useState(null);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2400); };

  /* ── Cloud account (invite link → everything saved on the server) ── */
  const [session, setSession] = useState(() => {
    const m = /[#&]session=([^&]+)/.exec(window.location.hash || "");
    if (m) {
      try { localStorage.setItem("maidflow_session", m[1]); } catch { /* private mode */ }
      window.history.replaceState(null, "", window.location.pathname);
      return m[1];
    }
    try { return localStorage.getItem("maidflow_session"); } catch { return null; }
  });
  const [cloudReady, setCloudReady] = useState(false);
  const [netNonce, setNetNonce] = useState(0); // bumped on "online" to retry hydration
  const [leads, setLeads] = useState([]); // homeowner leads from the public widget
  const [mySlug, setMySlug] = useState(null); // her page slug (from /api/me)
  const [pageModal, setPageModal] = useState(false); // "Mi página web" sheet
  const [aiMsgs, setAiMsgs] = useState([]); // Pregúntale a Paulbeza chat
  const [aiBusy, setAiBusy] = useState(false);
  const [housePos, setHousePos] = useState(null); // {lat,lng} for the house photo
  const [openAcc, setOpenAcc] = useState(null); // Ajustes accordion
  const [openMonth, setOpenMonth] = useState(null); // Cobros month expand
  const [installPrompt, setInstallPrompt] = useState(null); // Android beforeinstallprompt event
  const [installOverlay, setInstallOverlay] = useState(null); // null | "ios" | "wa" | "generic"
  useEffect(() => {
    const onBIP = (e) => { e.preventDefault(); setInstallPrompt(e); };
    const onInstalled = () => { setInstallPrompt(null); setInstallOverlay(null); try { localStorage.setItem("maidflow_inst", "1"); } catch { /* ignore */ } };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onBIP); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  // One tap does the right thing per platform: native prompt on Android, an
  // instructions overlay on iOS, or the "open in the real browser" warning
  // when we're trapped inside WhatsApp/Instagram's in-app browser.
  const doInstall = () => {
    if (IS_INAPP) return setInstallOverlay("wa");
    if (installPrompt) { installPrompt.prompt(); Promise.resolve(installPrompt.userChoice).finally(() => setInstallPrompt(null)); return; }
    if (IS_IOS) return setInstallOverlay("ios");
    return setInstallOverlay("generic");
  };
  const canInstall = !IS_STANDALONE; // hide once installed/running as an app

  // Web push ("lead buzz"): subscribe this device to new-lead notifications.
  const [pushOn, setPushOn] = useState(() => typeof Notification !== "undefined" && Notification.permission === "granted");
  const subscribePush = async (interactive) => {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || typeof Notification === "undefined") return;
      const cfg = await api("/api/push/key").then((r) => (r.ok ? r.json() : null));
      if (!cfg || !cfg.enabled || !cfg.key) { if (interactive) showToast(lang === "es" ? "Avisos aún no disponibles" : "Alerts not available yet"); return; }
      if (Notification.permission === "denied") { if (interactive) showToast(lang === "es" ? "Activa las notificaciones en ajustes" : "Enable notifications in settings"); return; }
      if (Notification.permission !== "granted") { if (!interactive) return; if ((await Notification.requestPermission()) !== "granted") return; }
      const reg = await navigator.serviceWorker.ready;
      const b64 = (s) => { const pad = "=".repeat((4 - (s.length % 4)) % 4); const raw = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from([...raw].map((c) => c.charCodeAt(0))); };
      const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(cfg.key) }));
      await api("/api/push/subscribe", { method: "POST", body: JSON.stringify({ subscription: sub }) });
      setPushOn(true);
      if (interactive) showToast(lang === "es" ? "Avisos de leads activados 🔔" : "Lead alerts on 🔔");
    } catch { if (interactive) showToast(lang === "es" ? "No se pudo activar" : "Couldn't enable"); }
  };
  // Silently re-subscribe on load if already granted (keeps the token fresh).
  useEffect(() => { if (session && cloudReady && typeof Notification !== "undefined" && Notification.permission === "granted") subscribePush(false); /* eslint-disable-next-line */ }, [session, cloudReady]);

  const api = (path, opts = {}) => fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Authorization: `Bearer ${session}` } : {}),
      ...(opts.headers || {}),
    },
  });

  // On startup with a session: load my account + saved data
  useEffect(() => {
    if (!session || cloudReady) return;
    (async () => {
      try {
        const r = await api("/api/me");
        if (r.status === 401) { try { localStorage.removeItem("maidflow_session"); } catch { /* ignore */ } setSession(null); return; }
        if (!r.ok) return;
        const j = await r.json();
        const p = j.contractor?.data?.profile || {};
        if (j.contractor?.slug) setMySlug(j.contractor.slug);
        setBizName(p.biz || j.contractor.name || "");
        setUserName(p.name || "");
        setUserPhone(p.phone || j.contractor.phone || "");
        if (p.logo) setLogo(p.logo);
        if (p.lang) setLang(p.lang);
        if (p.email) setBizEmail(p.email);
        if (p.zelle) setZelle(p.zelle);
        if (p.rates) setMyRates(p.rates);
        // Merge local (pre-login / offline) data with the server copy by id so a
        // fresh account never wipes quotes made before the invite link was opened.
        const mergeById = (a, b) => {
          const m = new Map();
          [...(a || []), ...(b || [])].forEach((x) => { if (x && x.id != null && !m.has(x.id)) m.set(x.id, x); });
          return [...m.values()].sort((x, y) => (y.ts || 0) - (x.ts || 0));
        };
        setCustomers((local) => mergeById(local, j.state?.customers));
        setSavedQuotes((local) => mergeById(local, j.state?.quotes));
        if (!WANT_DEMO && welcomedInit) setScreen("home");
        setCloudReady(true);
      } catch { /* offline — local data keeps working; retried when back online */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, netNonce]);

  // Retry cloud hydration when connectivity returns (only if it never succeeded).
  useEffect(() => {
    const onOnline = () => setNetNonce((n) => n + 1);
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  // Pull homeowner leads (captured by the public widget) when viewing Clients.
  useEffect(() => {
    if (!session || screen !== "clients") return;
    api("/api/leads").then((r) => (r.ok ? r.json() : null)).then((j) => { if (j && Array.isArray(j.leads)) setLeads(j.leads); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, screen]);

  // Save to the cloud shortly after anything changes. Profile (incl. rates) is
  // nested under data.profile so the same shape round-trips with the server.
  useEffect(() => {
    if (!session || !cloudReady) return;
    const id = setTimeout(() => {
      api("/api/state", {
        method: "PUT",
        body: JSON.stringify({
          state: { customers, quotes: savedQuotes },
          profile: { profile: { name: userName, biz: bizName, phone: userPhone, logo, lang, email: bizEmail, zelle, rates: myRates } },
        }),
      }).then((r) => {
        if (r && r.status === 401) { // session died server-side — stop pretending it's saved
          try { localStorage.removeItem("maidflow_session"); } catch { /* ignore */ }
          setSession(null); setCloudReady(false);
          showToast(lang === "es" ? "Sesión terminada — abre tu link de invitación 🔑" : "Session ended — open your invite link 🔑");
        } else if (r && !r.ok) { // 413/500/etc — don't fail silently
          showToast(lang === "es" ? "No se pudo guardar en la nube ⚠️" : "Couldn't save to the cloud ⚠️");
        }
      }).catch(() => { /* offline — retried on next change */ });
    }, 1500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, cloudReady, customers, savedQuotes, userName, bizName, userPhone, logo, lang, bizEmail, zelle, myRates]);

  /* ── Questionnaire state ── */
  const blankQ = { name: "", phone: "", address: "", company: "", placeId: null, sqft: "", beds: "", baths: "", propertyType: "", cleaningType: "regular", condition: "normal", pets: "none", addOns: [], frequency: "one_time", furnished: "partial", photos: [] };
  const [q, setQ] = useState(blankQ);
  const setField = (k, v) => setQ((prev) => ({ ...prev, [k]: v }));
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);

  const [addrQ, setAddrQ] = useState("");
  const [placeSugs, setPlaceSugs] = useState(null);
  const placesSeq = useRef(0);
  const [measuring, setMeasuring] = useState(false);
  const [measurePhase, setMeasurePhase] = useState(0);

  // voice + location for the address field
  const [listening, setListening] = useState(false);
  const hasVoice = typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const startVoice = (onResult) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = lang === "es" ? "es-US" : "en-US";
    r.onresult = (e) => { setListening(false); onResult(e.results[0][0].transcript); };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    setListening(true);
    r.start();
  };

  const onAddrInput = (v) => {
    setAddrQ(v);
    setField("address", v);
    const query = v.trim();
    placesSeq.current += 1;
    const seq = placesSeq.current;
    if (!query) { setPlaceSugs(null); return; }
    fetch(`/api/places?q=${encodeURIComponent(query)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (seq === placesSeq.current && j && Array.isArray(j.suggestions)) setPlaceSugs(j.suggestions); })
      .catch(() => {});
  };

  // Look up the home's details (sqft/beds/baths) to pre-fill the confirm step.
  const lookupProperty = async (addr, placeId = null, gps = null) => {
    if (!session && !DEMO_PASS) {
      let used = 0;
      try { used = parseInt(localStorage.getItem("maidflow_demo_meas") || "0", 10) || 0; } catch { /* private mode */ }
      if (used >= 6) { showToast("🔒 " + t.demoLimit); setField("address", addr); setStep(1); return; }
    }
    setField("address", addr);
    setMeasuring(true);
    setMeasurePhase(0);
    const t0 = Date.now();
    const p1 = setTimeout(() => setMeasurePhase(1), 800);
    const p2 = setTimeout(() => setMeasurePhase(2), 1600);
    let res = null, answered = false;
    try {
      const r = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(session ? { Authorization: `Bearer ${session}` } : {}), ...(DEMO_PASS ? { "x-demo-pass": DEMO_PASS } : {}) },
        body: JSON.stringify(gps ? { lat: gps.lat, lng: gps.lng } : { address: addr, placeId }),
      });
      if (r.status === 429) { clearTimeout(p1); clearTimeout(p2); setMeasuring(false); showToast("🔒 " + t.demoLimit); return; }
      if (r.ok) {
        const j = await r.json();
        answered = true;
        if (!session && j.found) {
          try { localStorage.setItem("maidflow_demo_meas", String((parseInt(localStorage.getItem("maidflow_demo_meas") || "0", 10) || 0) + 1)); } catch { /* private mode */ }
        }
        if (Number.isFinite(j.lat) && Number.isFinite(j.lng)) setHousePos({ lat: j.lat, lng: j.lng }); else setHousePos(null);
        res = j.found ? { addr: j.addr || addr, sqft: j.sqft ?? null, beds: j.beds ?? null, baths: j.baths ?? null, propertyType: j.propertyType || "" } : null;
      }
    } catch { /* backend unreachable */ }
    // Only invent property data in demo mode. For a real (logged-in) cleaner a
    // lookup failure must NOT fabricate a house — land on manual entry instead,
    // so she never unknowingly quotes off made-up square footage.
    if (!answered) {
      if (!session) res = await mockLookup(addr);
      else showToast(lang === "es" ? "No encontramos la casa — escribe los datos 👇" : "Couldn't find the home — enter the details 👇");
    }
    await new Promise((rs) => setTimeout(rs, Math.max(0, 1700 - (Date.now() - t0))));
    clearTimeout(p1); clearTimeout(p2);
    setMeasuring(false);
    if (res) {
      setQ((prev) => ({
        ...prev,
        address: res.addr || addr,
        sqft: res.sqft != null ? String(res.sqft) : prev.sqft,
        beds: res.beds != null ? String(res.beds) : prev.beds,
        baths: res.baths != null ? String(res.baths) : prev.baths,
        propertyType: res.propertyType || prev.propertyType,
      }));
    }
    setStep(1); // → confirm home details
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) { showToast("⚠️ " + t.locErr); return; }
    showToast("📍 " + t.locating);
    navigator.geolocation.getCurrentPosition(
      (pos) => lookupProperty(t.myLocation, null, { lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => showToast("⚠️ " + t.locErr),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  // Compute the quote with the cleaner's saved rates (same engine as the widget).
  const computeQuote = () => {
    const rates = mergeRates(myRates);
    const out = priceQuote({
      sqft: Number(q.sqft) || 0, beds: Number(q.beds) || 0, baths: Number(q.baths) || 0,
      cleaningType: q.cleaningType, condition: q.condition, pets: q.pets,
      furnished: q.furnished, frequency: q.frequency, addOns: q.addOns,
    }, rates);
    setResult(out);
    setScreen("result");
    // remember the quote
    const item = { id: Date.now(), name: q.name, phone: q.phone, address: q.address, sqft: q.sqft, beds: q.beds, baths: q.baths, cleaningType: q.cleaningType, recommended: out.recommended, ts: Date.now() };
    setSavedQuotes((prev) => {
      const next = [item, ...prev].slice(0, 30);
      try { localStorage.setItem("maidflow_quotes", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const resetQuote = () => { setQ(blankQ); setAddrQ(""); setPlaceSugs(null); setStep(0); setResult(null); setHousePos(null); setScreen("quote"); };

  const toggleAddon = (key) => setQ((prev) => ({ ...prev, addOns: prev.addOns.includes(key) ? prev.addOns.filter((a) => a !== key) : [...prev.addOns, key] }));

  /* WhatsApp quote message (Spanish-first), per the handoff template. */
  const quoteMessage = (out) => {
    const name = q.name || (lang === "es" ? "cliente" : "there");
    const business = bizName || (lang === "es" ? "su limpiadora" : "your cleaner");
    const sqft = q.sqft || "—", beds = q.beds || "—", baths = q.baths || "—";
    const low = out.range[0], high = out.range[1];
    const ti = out.time;
    if (lang === "es") {
      const ct = TYPE_ES[out.cleaningType] || "regular";
      return `Hola ${name} 👋 Le saluda ${business}. Según su casa de ${sqft} pies² (${beds} rec / ${baths} baños) y la limpieza ${ct} solicitada, el precio estimado es $${out.recommended} (rango $${low}–$${high}). Incluye cocina, baños, pisos, sacudido y los detalles de una limpieza ${ct}. Tiempo estimado: ${ti.cleaners} persona(s), ${ti.low}–${ti.high} hrs. El precio final puede cambiar si hay mucha acumulación, pelo de mascota o extras no mostrados en fotos. ¿Le aparto su cita?`;
    }
    const ct = TYPE_EN[out.cleaningType] || "regular";
    return `Hi ${name} 👋 This is ${business}. Based on your ${sqft} sqft home (${beds} bed / ${baths} bath) and the ${ct} cleaning requested, your estimated price is $${out.recommended} (range $${low}–$${high}). It includes kitchen, bathrooms, floors, dusting and standard ${ct} details. Estimated time: ${ti.cleaners} cleaner(s), ${ti.low}–${ti.high} hrs. Final price may change if there's heavy buildup, pet hair, or extras not shown in photos. Want me to book you in?`;
  };

  /* ── Shell pieces ── */
  const LangToggle = ({ onDark = false }) => (
    <div className="flex rounded-full overflow-hidden" style={{ border: `1.5px solid ${onDark ? "rgba(255,255,255,.28)" : M.line}` }}>
      {["es", "en"].map((l) => (
        <button key={l} onClick={() => { setLang(l); saveProfile({ lang: l }); }} className="px-3 py-1 text-xs font-bold uppercase"
          style={{ background: lang === l ? (onDark ? M.goldHi : M.teal) : (onDark ? "transparent" : "#fff"), color: lang === l ? (onDark ? M.tealDeep : "#fff") : (onDark ? "rgba(255,255,255,.8)" : M.muted2), border: "none" }}>{l}</button>
      ))}
    </div>
  );

  /* ── Home dashboard (ALTO-Pro style: hero + leads + tiles + AI row) ── */
  const shareUrl = mySlug ? `${window.location.origin}/w/${mySlug}` : null;
  const Home = () => (
    <div className="flex-1 overflow-y-auto pb-6" style={{ background: M.bg }}>
      <div className="px-5 pt-4">
        {/* Hero action — quote a cleaning */}
        <button onClick={resetQuote} className="w-full text-center active:translate-y-px transition-transform mb-3"
          style={{ background: "#fff", border: `2px solid ${M.aqua}`, borderRadius: 22, padding: "30px 20px", boxShadow: "0 10px 30px rgba(30,58,138,0.08)" }}>
          <div style={{ fontSize: 34, marginBottom: 6 }}>🧼</div>
          <div className="font-extrabold" style={{ color: M.teal, fontSize: 26, letterSpacing: "-0.01em" }}>{lang === "es" ? "Cotizar limpieza" : "Quote a cleaning"}</div>
          <div style={{ color: M.muted2, fontSize: 15, fontWeight: 600, marginTop: 2 }}>{lang === "es" ? "Escribe la dirección…" : "Enter the address…"}</div>
        </button>

        {/* Leads bar */}
        <button onClick={() => setScreen("clients")} className="w-full flex items-center gap-3 active:translate-y-px transition-transform mb-3"
          style={{ background: "#fff", border: `1px solid ${M.line}`, borderRadius: 18, padding: "18px 18px" }}>
          <span style={{ fontSize: 22 }}>📥</span>
          <span className="flex-1 text-left font-extrabold" style={{ color: M.teal, fontSize: 18 }}>Leads{leads.length ? ` · ${leads.length}` : ""}</span>
          <span style={{ color: M.muted, fontSize: 20 }}>→</span>
        </button>

        {/* 2×2 tiles */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {[
            ["🌐", lang === "es" ? "Mi página web" : "My website", lang === "es" ? "Mándala — el cliente cotiza solo" : "Share it — clients self-quote", () => setPageModal(true)],
            ["💲", lang === "es" ? "Mis precios" : "My prices", lang === "es" ? "Ajusta tus tarifas" : "Set your rates", () => setScreen("prices")],
            ["👥", lang === "es" ? "Mis clientes" : "My clients", lang === "es" ? "Leads, historial y notas" : "Leads, history & notes", () => setScreen("clients")],
            ["📄", lang === "es" ? "Cotización nueva" : "New quote", lang === "es" ? "Arma y manda por WhatsApp" : "Build & send on WhatsApp", () => resetQuote()],
          ].map(([ic, title, sub, onClick], i) => (
            <button key={i} onClick={onClick} className="text-left active:translate-y-px transition-transform"
              style={{ background: "#fff", border: `1px solid ${M.line}`, borderRadius: 18, padding: "18px 16px", minHeight: 132 }}>
              <div style={{ fontSize: 26, marginBottom: 10 }}>{ic}</div>
              <div className="font-extrabold" style={{ color: M.teal, fontSize: 16, lineHeight: 1.15 }}>{title}</div>
              <div style={{ color: M.muted2, fontSize: 12.5, fontWeight: 600, marginTop: 4, lineHeight: 1.35 }}>{sub}</div>
            </button>
          ))}
        </div>

        {/* AI assistant row */}
        <button onClick={() => setScreen("ai")} className="w-full flex items-center gap-3 active:translate-y-px transition-transform"
          style={{ background: "#fff", border: `1px solid ${M.line}`, borderRadius: 18, padding: "18px 18px" }}>
          <span style={{ fontSize: 22 }}>💬</span>
          <span className="flex-1 text-left">
            <span className="block font-extrabold" style={{ color: M.teal, fontSize: 17 }}>{lang === "es" ? "Pregúntale a Paulbeza" : "Ask Paulbeza"}</span>
            <span className="block" style={{ color: M.muted2, fontSize: 12.5, fontWeight: 600 }}>{lang === "es" ? "Tu asistente de limpieza" : "Your cleaning assistant"}</span>
          </span>
          <span style={{ color: M.muted, fontSize: 20 }}>→</span>
        </button>
      </div>
    </div>
  );

  /* ── "Mi página web" share sheet ── */
  const PageSheet = () => (
    <div className="absolute inset-0 flex items-end justify-center" style={{ background: "rgba(16,27,48,0.55)", zIndex: 50 }} onClick={() => setPageModal(false)}>
      <div className="w-full" style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "22px 20px 28px", maxWidth: 448 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <p className="font-extrabold" style={{ color: M.teal, fontSize: 17 }}>🌐 {lang === "es" ? "Tu página web" : "Your website"}</p>
          <button onClick={() => setPageModal(false)} style={{ background: "none", border: "none", color: M.muted2, fontSize: 22, fontWeight: 800 }}>×</button>
        </div>
        <p style={{ color: M.body, fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>{lang === "es" ? "Mándala a tus clientes — ellos escriben su dirección y reciben su precio de limpieza solos. Tú recibes el lead." : "Send it to clients — they enter their address and get a cleaning price on their own. You get the lead."}</p>
        {shareUrl ? (<>
          <div className="flex items-center gap-2 mb-2" style={{ background: M.bg, border: `1.5px solid ${M.line}`, borderRadius: 12, padding: "12px 14px" }}>
            <span className="flex-1 min-w-0 truncate font-semibold" style={{ color: M.teal, fontSize: 13 }}>{shareUrl}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { try { navigator.clipboard.writeText(shareUrl); showToast(lang === "es" ? "Link copiado ✓" : "Link copied ✓"); } catch { /* ignore */ } }} className="flex-1" style={{ background: "#fff", color: M.teal, border: `1.5px solid ${M.line}`, borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 800 }}>📋 {lang === "es" ? "Copiar" : "Copy"}</button>
            <a href={`https://wa.me/?text=${encodeURIComponent((lang === "es" ? "Cotiza tu limpieza aquí 👉 " : "Get your cleaning quote here 👉 ") + shareUrl)}`} target="_blank" rel="noreferrer" className="flex-1 text-center" style={{ background: "#25D366", color: "#fff", borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 800, textDecoration: "none" }}>🟢 WhatsApp</a>
          </div>
        </>) : (
          <p style={{ color: M.muted2, fontSize: 13, fontWeight: 600 }}>{lang === "es" ? "Tu página se activa cuando tu cuenta esté lista. Pídele a tu equipo de onboarding que la publique." : "Your website turns on once your account is set up. Ask your onboarding team to publish it."}</p>
        )}
      </div>
    </div>
  );

  /* ── Pregúntale a Paulbeza (AI chat) ── */
  const sendAi = async (text) => {
    if (!text.trim() || aiBusy) return;
    const next = [...aiMsgs, { role: "user", content: text }];
    setAiMsgs(next); setAiBusy(true);
    try {
      const r = await api("/api/ai", { method: "POST", body: JSON.stringify({ messages: next, lang, bizName, data: { rates: myRates } }) }).then((x) => x.json());
      setAiMsgs([...next, { role: "assistant", content: r.text || (lang === "es" ? "…" : "…") }]);
    } catch { setAiMsgs([...next, { role: "assistant", content: lang === "es" ? "No pude responder ahora. Intenta otra vez." : "Couldn't answer right now. Try again." }]); }
    setAiBusy(false);
  };
  const AiChat = () => {
    const [draft, setDraft] = useState("");
    return (
      <div className="flex-1 flex flex-col" style={{ background: M.bg }}>
        <TopBar title={lang === "es" ? "💬 Pregúntale a Paulbeza" : "💬 Ask Paulbeza"} back={() => setScreen("home")} />
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {aiMsgs.length === 0 && (
            <div className="text-center px-6" style={{ color: M.muted2, marginTop: 30 }}>
              <div style={{ fontSize: 34, marginBottom: 8 }}>💬</div>
              <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.6 }}>{lang === "es" ? "Pregúntame cómo cobrar una limpieza, qué decirle a un cliente, o cómo conseguir más trabajos." : "Ask me how to price a cleaning, what to tell a client, or how to get more jobs."}</p>
            </div>
          )}
          {aiMsgs.map((m, i) => (
            <div key={i} className={`mb-2 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div style={{ maxWidth: "82%", padding: "10px 13px", borderRadius: 14, fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap", background: m.role === "user" ? M.teal : "#fff", color: m.role === "user" ? "#fff" : M.body, border: m.role === "user" ? "none" : `1px solid ${M.line}` }}>{m.content}</div>
            </div>
          ))}
          {aiBusy && <div className="mb-2 flex justify-start"><div style={{ padding: "10px 13px", borderRadius: 14, background: "#fff", border: `1px solid ${M.line}`, color: M.muted }}>…</div></div>}
        </div>
        <div className="flex items-center gap-2 px-3 py-3" style={{ background: "#fff", borderTop: `1px solid ${M.line}` }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { sendAi(draft); setDraft(""); } }}
            placeholder={lang === "es" ? "Escribe tu pregunta…" : "Type your question…"} className="flex-1 min-w-0" style={{ background: M.bg, border: `1.5px solid ${M.line}`, borderRadius: 12, padding: "12px 14px", fontSize: 15, color: M.navy }} />
          <button onClick={() => { sendAi(draft); setDraft(""); }} disabled={aiBusy} style={{ background: M.teal, color: "#fff", border: "none", borderRadius: 12, padding: "12px 16px", fontSize: 15, fontWeight: 800 }}>➤</button>
        </div>
      </div>
    );
  };

  const BrandHeader = () => (
    <div className="relative flex items-center justify-center px-5 pt-4 pb-3" style={{ background: M.teal }}>
      <Wordmark size={22} />
      <div className="absolute" style={{ right: 16, top: "50%", transform: "translateY(-50%)" }}><LangToggle onDark /></div>
    </div>
  );

  const TopBar = ({ title, back }) => (
    <div className="flex items-center gap-3 px-5 pt-4 pb-3" style={{ background: M.teal }}>
      {back && <button onClick={back} className="text-2xl font-bold" style={{ color: "#fff", background: "none", border: "none" }}>‹</button>}
      <span className="flex-1 font-extrabold text-lg truncate" style={{ color: "#fff" }}>{title}</span>
      <LangToggle onDark />
    </div>
  );

  const navItems = [
    ["home", "🏠", t.nav.home],
    ["cobros", "💵", t.nav.cobros],
    ["account", "⚙️", t.nav.account],
  ];
  const BottomNav = () => (
    <div className="flex justify-around items-center gap-1.5 px-2 py-2" style={{ background: "#fff", borderTop: `1px solid ${M.line}` }}>
      {navItems.map(([s, icon, label]) => {
        const on = screen === s;
        return (
          <button key={s} onClick={() => { if (s === "quote") resetQuote(); else setScreen(s); }}
            className="flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-2xl" style={{ background: on ? M.teal : "transparent", border: "none" }}>
            <span style={{ fontSize: 17 }}>{icon}</span>
            <span className="text-[11px] font-bold uppercase truncate" style={{ color: on ? "#fff" : M.muted2, letterSpacing: 0.5 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );

  /* ── Questionnaire steps ── */
  const STEPS = [
    "customer", "confirm", "type", "condition", "pets", "addons", "frequency", "furnished", "photos",
  ];
  // Furnished step only matters for move-in/move-out.
  const visibleSteps = STEPS.filter((s) => s !== "furnished" || ["move_in", "move_out"].includes(q.cleaningType));
  const curStepKey = visibleSteps[Math.min(step, visibleSteps.length - 1)];
  const goNext = () => { if (step < visibleSteps.length - 1) setStep(step + 1); else computeQuote(); };
  const goBack = () => { if (step > 0) setStep(step - 1); };

  const StepFrame = ({ kicker, title, children, canNext = true, nextLabel }) => (
    <div className="flex-1 overflow-y-auto pb-6" style={{ background: M.bg }}>
      <div className="px-5 pt-3">
        {/* progress */}
        <div className="flex gap-1 mb-4">
          {visibleSteps.map((s, i) => (
            <div key={s} className="flex-1 rounded-full" style={{ height: 4, background: i <= step ? M.teal : M.line }} />
          ))}
        </div>
        <p style={{ color: M.gold, fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>{kicker}</p>
        <p className="font-extrabold mb-3" style={{ color: M.tealDeep, fontSize: 20, lineHeight: 1.2 }}>{title}</p>
        {children}
      </div>
      <div className="px-5 pt-2 flex gap-2">
        {step > 0 && <button onClick={goBack} className="active:translate-y-px" style={{ background: "#fff", color: M.teal, border: `1.5px solid ${M.line}`, borderRadius: 12, padding: "14px 20px", fontSize: 15, fontWeight: 800 }}>‹ {t.back}</button>}
        <PrimaryBtn onClick={goNext} disabled={!canNext}>{nextLabel || t.next + " →"}</PrimaryBtn>
      </div>
    </div>
  );

  const QuoteFlow = () => {
    if (measuring) {
      const phases = [t.measuring1, t.measuring2, t.measuring3];
      return (
        <div className="flex-1 flex flex-col items-center justify-center px-7 text-center" style={{ background: M.bg }}>
          <span className="text-5xl mb-4" style={{ animation: "ttpPulse 1.2s ease-in-out infinite" }}>🧽</span>
          <p className="font-extrabold mb-1" style={{ color: M.tealDeep, fontSize: 20 }}>{q.address}</p>
          <p className="mb-6" style={{ color: M.gold, fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>{lang === "es" ? "Preparando tu cotización" : "Preparing your quote"}</p>
          <div className="text-left">
            {phases.map((ph, i) => (
              <p key={ph} className="py-1 font-semibold" style={{ color: i < measurePhase ? M.green : i === measurePhase ? M.teal : M.line }}>{i < measurePhase ? "✓ " : i === measurePhase ? "● " : "○ "}{ph}</p>
            ))}
          </div>
        </div>
      );
    }

    if (curStepKey === "customer") {
      const query = addrQ.trim().toLowerCase();
      const localPool = [...new Set([...MOCK_PROPERTIES.map((p) => p.addr), ...customers.map((c) => c.addr).filter(Boolean)])];
      const matches = placeSugs !== null ? placeSugs : localPool.filter((a) => !query || a.toLowerCase().includes(query)).map((a) => ({ text: a, placeId: null }));
      const custom = addrQ.trim() && !matches.some((m) => m.text.toLowerCase() === query) ? addrQ.trim() : null;
      const canGo = !!(addrQ.trim());
      const go = () => { if (!canGo) return; if (custom) lookupProperty(custom); else if (matches[0]) lookupProperty(matches[0].text, matches[0].placeId); };
      return (
        <div className="flex-1 overflow-y-auto pb-6" style={{ background: M.bg }}>
          <div className="px-5 py-4" style={{ background: M.headGrad, borderBottom: `2px solid ${M.gold}` }}>
            <p className="text-center" style={{ color: M.goldHi, fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>{lang === "es" ? "Cotización de limpieza" : "Cleaning quote"}</p>
            <p className="text-center font-extrabold text-white mt-0.5" style={{ fontSize: 18 }}>{lang === "es" ? "Cotiza un trabajo en segundos" : "Quote a job in seconds"}</p>
          </div>
          <div className="px-5 pt-3">
            <Card>
              <p style={{ color: M.muted2, fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>{lang === "es" ? "Datos del cliente" : "Customer details"}</p>
              <TextInput value={q.name} onChange={(v) => setField("name", v)} placeholder={lang === "es" ? "Nombre del cliente" : "Customer name"} />
              <TextInput value={q.phone} onChange={(v) => setField("phone", v)} placeholder={lang === "es" ? "Teléfono (WhatsApp)" : "Phone (WhatsApp)"} inputMode="tel" />
              <TextInput value={q.company} onChange={(v) => setField("company", v)} placeholder={lang === "es" ? "Empresa / edificio (opcional)" : "Company / building (optional)"} />
              <p style={{ color: M.muted2, fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", margin: "6px 0 8px" }}>{lang === "es" ? "Dirección de la casa" : "Home address"}</p>
              <div className="flex gap-2">
                <button onClick={useMyLocation} title={t.useMyLocation} className="flex items-center justify-center shrink-0 active:scale-95 transition-transform" style={{ width: 48, height: 48, background: M.bg, border: `1.5px solid ${M.line}`, borderRadius: 12, color: M.teal, fontSize: 18 }}>🧭</button>
                <div className="flex-1 flex items-center gap-2 rounded-xl px-3" style={{ background: M.bg, border: `1.5px solid ${M.line}` }}>
                  <input value={addrQ} onChange={(e) => onAddrInput(e.target.value)} placeholder={lang === "es" ? "Escribe una dirección…" : "Enter an address…"} onKeyDown={(e) => e.key === "Enter" && go()}
                    className="flex-1 py-3 text-base font-semibold outline-none bg-transparent" style={{ color: M.navy }} />
                  {hasVoice && <button onClick={() => startVoice(onAddrInput)} className="text-xl active:scale-90 transition-transform" style={{ background: "none", border: "none", opacity: listening ? 1 : 0.6 }}>{listening ? "🔴" : "🎤"}</button>}
                </div>
              </div>
              {(custom || matches.length > 0) && (
                <div className="rounded-xl mt-2 overflow-hidden" style={{ border: `1.5px solid ${M.line}` }}>
                  {custom && (
                    <button onClick={() => lookupProperty(custom)} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left active:opacity-80" style={{ background: "#fff", borderBottom: matches.length ? `1px solid ${M.bg}` : "none" }}>
                      <span style={{ color: M.teal }}>📍</span><span className="font-bold truncate" style={{ color: M.navy, fontSize: 13 }}>{custom}</span>
                    </button>
                  )}
                  {matches.map((m, i) => (
                    <button key={m.text} onClick={() => lookupProperty(m.text, m.placeId)} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left active:opacity-80" style={{ background: "#fff", borderBottom: i < matches.length - 1 ? `1px solid ${M.bg}` : "none" }}>
                      <span style={{ color: M.teal }}>📍</span><span className="font-semibold truncate" style={{ color: M.navy, fontSize: 13 }}>{m.text}</span>
                    </button>
                  ))}
                </div>
              )}
            </Card>
            <PrimaryBtn onClick={go} disabled={!canGo}>{lang === "es" ? "Buscar la casa →" : "Find the home →"}</PrimaryBtn>
            <p className="text-center mt-3" style={{ color: M.muted, fontSize: 11, fontWeight: 600 }}>{lang === "es" ? "Buscamos el tamaño de la casa automáticamente" : "We auto-find the home size"}</p>
          </div>
        </div>
      );
    }

    if (curStepKey === "confirm") {
      const canNext = Number(q.sqft) > 0;
      return (
        <StepFrame kicker={lang === "es" ? "Paso 2 · Confirma la casa" : "Step 2 · Confirm the home"} title={lang === "es" ? "¿Estos datos están bien?" : "Does this look right?"} canNext={canNext}>
          <Card>
            <p className="font-bold mb-3" style={{ color: M.tealDeep, fontSize: 14 }}>{q.address}</p>
            <label className="block mb-2"><span style={{ color: M.muted2, fontSize: 11, fontWeight: 700 }}>{t.sqft}</span>
              <TextInput value={q.sqft} onChange={(v) => setField("sqft", v.replace(/[^0-9]/g, ""))} placeholder="1500" inputMode="numeric" /></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block"><span style={{ color: M.muted2, fontSize: 11, fontWeight: 700 }}>{t.beds}</span>
                <TextInput value={q.beds} onChange={(v) => setField("beds", v.replace(/[^0-9]/g, ""))} placeholder="3" inputMode="numeric" /></label>
              <label className="block"><span style={{ color: M.muted2, fontSize: 11, fontWeight: 700 }}>{t.baths}</span>
                <TextInput value={q.baths} onChange={(v) => setField("baths", v.replace(/[^0-9.]/g, ""))} placeholder="2" inputMode="decimal" /></label>
            </div>
          </Card>
          {!canNext && <p style={{ color: M.red, fontSize: 12, fontWeight: 600 }}>{lang === "es" ? "Pon los pies cuadrados para continuar." : "Enter the square footage to continue."}</p>}
        </StepFrame>
      );
    }

    if (curStepKey === "type") {
      const opts = CLEANING_TYPES.map(([key, icon, es, en]) => ({ key, icon, title: lang === "es" ? es : en }));
      return (
        <StepFrame kicker={lang === "es" ? "Paso 3 · Tipo de limpieza" : "Step 3 · Cleaning type"} title={lang === "es" ? "¿Qué limpieza necesita?" : "What cleaning is needed?"}>
          <OptionGrid options={opts} value={q.cleaningType} onChange={(v) => setField("cleaningType", v)} />
        </StepFrame>
      );
    }

    if (curStepKey === "condition") {
      const opts = CONDITIONS.map(([key, icon, es, en, esS, enS]) => ({ key, icon, title: lang === "es" ? es : en, sub: lang === "es" ? esS : enS }));
      return (
        <StepFrame kicker={lang === "es" ? "Paso 4 · Condición" : "Step 4 · Condition"} title={lang === "es" ? "¿Cómo está la casa?" : "What condition is it in?"}>
          <OptionGrid options={opts} value={q.condition} onChange={(v) => setField("condition", v)} />
          {q.condition === "very_heavy" && <p className="mt-3" style={{ color: "#8A6A00", fontSize: 12, fontWeight: 700, background: "#FFF8E6", border: "1px solid #ffe08a", borderRadius: 10, padding: "10px 12px" }}>⚠️ {lang === "es" ? "Recomendamos cotización personalizada después de ver fotos o la casa." : "We recommend a custom quote after seeing photos or the home."}</p>}
        </StepFrame>
      );
    }

    if (curStepKey === "pets") {
      const opts = PETS.map(([key, icon, es, en]) => ({ key, icon, title: lang === "es" ? es : en }));
      return (
        <StepFrame kicker={lang === "es" ? "Paso 5 · Mascotas" : "Step 5 · Pets"} title={lang === "es" ? "¿Hay mascotas?" : "Any pets?"}>
          <OptionGrid options={opts} value={q.pets} onChange={(v) => setField("pets", v)} />
        </StepFrame>
      );
    }

    if (curStepKey === "addons") {
      return (
        <StepFrame kicker={lang === "es" ? "Paso 6 · Extras" : "Step 6 · Add-ons"} title={lang === "es" ? "¿Algún extra?" : "Any add-ons?"} nextLabel={t.next + " →"}>
          <div className="grid grid-cols-2 gap-2">
            {ADDONS.map(([key, icon, es, en]) => {
              const on = q.addOns.includes(key);
              return (
                <button key={key} onClick={() => toggleAddon(key)} className="flex items-center gap-2 text-left active:scale-[0.98] transition-transform"
                  style={{ background: on ? M.teal : "#fff", color: on ? "#fff" : M.navy, border: `1.5px solid ${on ? M.teal : M.line}`, borderRadius: 12, padding: "12px 12px" }}>
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <span className="font-bold" style={{ fontSize: 13 }}>{lang === "es" ? es : en}</span>
                  {on && <span className="ml-auto">✓</span>}
                </button>
              );
            })}
          </div>
        </StepFrame>
      );
    }

    if (curStepKey === "frequency") {
      return (
        <StepFrame kicker={lang === "es" ? "Paso 7 · Frecuencia" : "Step 7 · Frequency"} title={lang === "es" ? "¿Cada cuánto?" : "How often?"}>
          <div className="grid grid-cols-2 gap-2">
            {FREQUENCIES.map(([key, es, en, badge]) => {
              const on = q.frequency === key;
              return (
                <button key={key} onClick={() => setField("frequency", key)} className="text-left active:scale-[0.98] transition-transform"
                  style={{ background: on ? M.teal : "#fff", color: on ? "#fff" : M.navy, border: `1.5px solid ${on ? M.teal : M.line}`, borderRadius: 14, padding: "14px 14px" }}>
                  <div className="font-extrabold" style={{ fontSize: 15 }}>{lang === "es" ? es : en}</div>
                  {badge && <div style={{ fontSize: 12, fontWeight: 800, marginTop: 3, color: on ? M.goldHi : M.green }}>{badge}</div>}
                </button>
              );
            })}
          </div>
        </StepFrame>
      );
    }

    if (curStepKey === "furnished") {
      const opts = FURNISHED.map(([key, es, en]) => ({ key, icon: key === "empty" ? "📭" : key === "full" ? "🛋️" : "🪑", title: lang === "es" ? es : en }));
      return (
        <StepFrame kicker={lang === "es" ? "Paso 8 · Mobiliario" : "Step 8 · Furnishing"} title={lang === "es" ? "¿Vacía o amueblada?" : "Empty or furnished?"}>
          <OptionGrid options={opts} value={q.furnished} onChange={(v) => setField("furnished", v)} cols={3} />
        </StepFrame>
      );
    }

    if (curStepKey === "photos") {
      return (
        <StepFrame kicker={lang === "es" ? `Paso ${visibleSteps.length} · Fotos` : `Step ${visibleSteps.length} · Photos`} title={lang === "es" ? "Fotos (opcional)" : "Photos (optional)"} nextLabel={lang === "es" ? "Ver cotización →" : "See quote →"}>
          <Card>
            <p style={{ color: M.body, fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>{lang === "es" ? "Sube fotos del trabajo. Te protegen si el precio cambia después." : "Add photos of the job. They protect you if the price changes later."}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {q.photos.map((p, i) => (
                <div key={i} className="relative">
                  <img src={p} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 10, border: `1px solid ${M.line}` }} />
                  <button onClick={() => setField("photos", q.photos.filter((_, k) => k !== i))} className="absolute" style={{ top: -6, right: -6, width: 22, height: 22, borderRadius: 11, background: M.red, color: "#fff", border: "2px solid #fff", fontSize: 12 }}>×</button>
                </div>
              ))}
              <label className="flex items-center justify-center cursor-pointer" style={{ width: 72, height: 72, borderRadius: 10, background: M.bg, border: `1.5px dashed ${M.line}`, color: M.muted2, fontSize: 24 }}>
                ＋
                <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => {
                  const files = Array.from(e.target.files || []).slice(0, 6);
                  files.forEach((f) => { const rd = new FileReader(); rd.onload = () => setQ((prev) => ({ ...prev, photos: [...prev.photos, rd.result].slice(0, 6) })); rd.readAsDataURL(f); });
                }} />
              </label>
            </div>
          </Card>
        </StepFrame>
      );
    }
    return null;
  };

  /* ── Result: branded quote + WhatsApp ── */
  const ResultScreen = () => {
    const out = result;
    if (!out) return null;
    const msg = quoteMessage(out);
    const waPhone = String(q.phone || "").replace(/\D/g, "");
    const waHref = `https://wa.me/${waPhone.length >= 10 ? (waPhone.length === 10 ? "1" + waPhone : waPhone) : ""}?text=${encodeURIComponent(msg)}`;
    const sendWhatsApp = () => {
      if (waPhone.length < 10) { showToast(lang === "es" ? "Agrega el teléfono del cliente 📱" : "Add the customer's phone 📱"); return; }
      // Save the customer if new
      if (q.name && q.phone && !customers.some((c) => c.phone === q.phone)) {
        setCustomers((prev) => [{ id: Date.now(), name: q.name, phone: q.phone, addr: q.address }, ...prev]);
      }
      // Record the lead on the server (shows in leads + fires the webhook).
      if (session) api("/api/lead", { method: "POST", body: JSON.stringify({ name: q.name, phone: q.phone, address: q.address, company: q.company, info: { recommended: out.recommended, low: out.range[0], high: out.range[1], cleaningType: out.cleaningType, sqft: q.sqft, beds: q.beds, baths: q.baths } }) }).catch(() => {});
      window.open(waHref, "_blank");
    };
    const copyMsg = async () => { try { await navigator.clipboard.writeText(msg); showToast(lang === "es" ? "Mensaje copiado ✓" : "Message copied ✓"); } catch { /* ignore */ } };
    const ct = CLEANING_TYPES.find((c) => c[0] === out.cleaningType);
    return (
      <div className="flex-1 overflow-y-auto pb-6" style={{ background: M.bg }}>
        <div className="px-5 pt-4">
          {/* The wow factor: a real photo of the client's house */}
          {housePos && (
            <div className="rounded-2xl mb-3 overflow-hidden" style={{ border: `1px solid ${M.line}`, boxShadow: "0 10px 30px rgba(30,58,138,0.12)" }}>
              <img src={`/api/housephoto?lat=${housePos.lat}&lng=${housePos.lng}`} alt="" onError={(e) => { e.currentTarget.parentNode.style.display = "none"; }}
                style={{ width: "100%", height: 170, objectFit: "cover", display: "block", background: M.line }} />
            </div>
          )}
          {/* Branded hero quote card */}
          <div className="rounded-2xl p-5 mb-3" style={{ background: M.cardGrad, boxShadow: "0 18px 38px rgba(10,69,55,0.20)" }}>
            <div className="flex items-center gap-2 mb-2">
              {logo && <img src={logo} alt="" style={{ height: 30, maxWidth: 90, objectFit: "contain", background: "#fff", borderRadius: 6, padding: 3 }} />}
              <div className="min-w-0">
                <p style={{ color: M.goldHi, fontSize: 8, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" }}>{lang === "es" ? "Cotización de" : "Quote from"}</p>
                <p className="text-white font-extrabold truncate" style={{ fontSize: 14 }}>{bizName || (lang === "es" ? "Tu negocio" : "Your business")}</p>
              </div>
            </div>
            <p style={{ color: M.goldHi, fontSize: 11, fontWeight: 900, letterSpacing: "0.11em", textTransform: "uppercase" }}>{lang === "es" ? "Precio recomendado" : "Recommended price"}</p>
            <p className="text-white" style={{ fontSize: 46, lineHeight: 1, fontWeight: 900, margin: "8px 0" }}>{fmt(out.recommended)}</p>
            <div className="rounded-xl mt-1 mb-2.5" style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.12)", padding: "10px 14px" }}>
              <p style={{ color: M.goldHi, fontSize: 9, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 3 }}>{lang === "es" ? "Rango estimado" : "Estimated range"}</p>
              <p className="text-white" style={{ fontSize: 22, fontWeight: 800 }}>{fmt(out.range[0])} – {fmt(out.range[1])}</p>
            </div>
            {out.recurring != null && (
              <p style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{lang === "es" ? "Precio recurrente:" : "Recurring price:"} {fmt(out.recurring)} <span style={{ color: M.goldHi }}>/{FREQUENCIES.find((f) => f[0] === out.frequency)?.[lang === "es" ? 1 : 2]?.toLowerCase()}</span></p>
            )}
            <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 13, lineHeight: 1.5, fontWeight: 600, marginTop: 6 }}>
              {ct?.[1]} {lang === "es" ? `Limpieza ${TYPE_ES[out.cleaningType]}` : `${TYPE_EN[out.cleaningType]} cleaning`} · {out.time.cleaners} {lang === "es" ? "persona(s)" : "cleaner(s)"}, {out.time.low}–{out.time.high} {lang === "es" ? "hrs" : "hrs"}
            </p>
          </div>

          {out.customQuote && <p className="mb-3" style={{ color: "#8A6A00", fontSize: 12, fontWeight: 700, background: "#FFF8E6", border: "1px solid #ffe08a", borderRadius: 10, padding: "10px 12px" }}>⚠️ {lang === "es" ? "Casa muy pesada — confirma el precio después de ver la casa." : "Very heavy home — confirm the price after seeing it in person."}</p>}

          {/* Job summary */}
          <Card>
            <p style={{ color: M.muted2, fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>{lang === "es" ? "Resumen del trabajo" : "Job summary"}</p>
            <div className="grid grid-cols-3 gap-2">
              {[["📐", q.sqft ? num(q.sqft) : "—", t.sqft], ["🛏️", q.beds || "—", t.beds], ["🛁", q.baths || "—", t.baths]].map(([icon, v, label]) => (
                <div key={label} style={{ background: M.bg, border: `1px solid ${M.line}`, borderRadius: 10, padding: "10px 6px", textAlign: "center" }}>
                  <p className="font-extrabold" style={{ color: M.teal, fontSize: 15 }}>{v}</p>
                  <p style={{ color: M.muted, fontSize: 8, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 3 }}>{icon} {label}</p>
                </div>
              ))}
            </div>
            {q.addOns.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {q.addOns.map((a) => { const ad = ADDONS.find((x) => x[0] === a); return <span key={a} style={{ background: M.bg, border: `1px solid ${M.line}`, borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: M.body }}>{ad?.[1]} {lang === "es" ? ad?.[2] : ad?.[3]}</span>; })}
              </div>
            )}
          </Card>

          {/* WhatsApp message preview */}
          <Card>
            <p style={{ color: M.gold, fontSize: 10, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8 }}>{lang === "es" ? "Mensaje para el cliente" : "Message for the customer"}</p>
            <p style={{ color: M.body, fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{msg}</p>
          </Card>

          <p className="mb-3" style={{ color: M.muted2, fontSize: 11, fontWeight: 600, lineHeight: 1.5 }}>⚠️ {lang === "es" ? "El precio final puede cambiar después de ver fotos o la casa si está más sucia de lo descrito." : "Final price may change after photos/walkthrough if the home is heavier than described."}</p>

          <button onClick={sendWhatsApp} className="w-full active:translate-y-px transition-transform mb-2.5" style={{ background: "#25D366", color: "#fff", border: "none", borderRadius: 12, padding: 15, fontSize: 16, fontWeight: 800, boxShadow: "0 4px 14px rgba(37,211,102,0.35)" }}>
            🟢 {lang === "es" ? "Enviar por WhatsApp" : "Send on WhatsApp"}
          </button>
          <div className="flex gap-2">
            <button onClick={copyMsg} className="flex-1 active:translate-y-px transition-transform" style={{ background: "#fff", color: M.teal, border: `1.5px solid ${M.line}`, borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 800 }}>📋 {lang === "es" ? "Copiar" : "Copy"}</button>
            <button onClick={resetQuote} className="flex-1 active:translate-y-px transition-transform" style={{ background: M.teal, color: "#fff", border: "none", borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 800 }}>{lang === "es" ? "Nueva cotización" : "New quote"}</button>
          </div>
        </div>
      </div>
    );
  };

  /* ── Clients ── */
  const LEAD_STAGES = ["new", "contacted", "quoted", "won", "lost"];
  const stageLabel = (s) => (({ es: { new: "Nuevo", contacted: "Contactado", quoted: "Cotizado", won: "Ganado", lost: "Perdido" }, en: { new: "New", contacted: "Contacted", quoted: "Quoted", won: "Won", lost: "Lost" } })[lang === "es" ? "es" : "en"][s] || s);
  const setLeadStage = (id, status) => { setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l))); api("/api/leads/" + id, { method: "POST", body: JSON.stringify({ status }) }).catch(() => {}); };
  const setLeadNote = (id, note) => { setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, info: { ...(l.info || {}), note } } : l))); api("/api/leads/" + id, { method: "POST", body: JSON.stringify({ note }) }).catch(() => {}); };
  const waLink = (p) => { const d = String(p || "").replace(/\D/g, ""); return `https://wa.me/${d.length === 10 ? "1" + d : d}`; };
  const exportLeadsCSV = () => {
    api("/api/leads.csv").then((r) => (r.ok ? r.blob() : null)).then((b) => {
      if (!b) return;
      const u = URL.createObjectURL(b); const a = document.createElement("a");
      a.href = u; a.download = "paulbeza-leads.csv"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u);
    }).catch(() => showToast(lang === "es" ? "No se pudo exportar" : "Export failed"));
  };

  const Clients = () => (
    <div className="flex-1 overflow-y-auto pb-6" style={{ background: M.bg }}>
      <div className="px-5 pt-4">
        <div className="rounded-2xl p-5 mb-3" style={{ background: M.cardGrad, boxShadow: "0 18px 38px rgba(10,69,55,0.18)" }}>
          <p style={{ color: M.goldHi, fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>{lang === "es" ? "Tus clientes" : "Your customers"}</p>
          <p className="text-white font-extrabold" style={{ fontSize: 26, margin: "4px 0 0" }}>{customers.length}</p>
        </div>
        {leads.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-2">
              <p style={{ color: M.tealDeep, fontSize: 14, fontWeight: 800 }}>Leads</p>
              <button onClick={exportLeadsCSV} style={{ background: "#fff", color: M.teal, border: `1.5px solid ${M.line}`, borderRadius: 9, padding: "5px 11px", fontSize: 12, fontWeight: 800 }}>⬇️ CSV</button>
            </div>
            {leads.slice(0, 30).map((ld) => (
              <Card key={ld.id} style={{ marginBottom: 8 }}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-bold truncate" style={{ color: M.navy, fontSize: 14 }}>{ld.name || (lang === "es" ? "Sin nombre" : "No name")}
                      {ld.info?.source ? <span style={{ marginLeft: 6, background: M.bg, border: `1px solid ${M.line}`, borderRadius: 6, padding: "1px 6px", fontSize: 9, fontWeight: 800, color: M.muted2, textTransform: "uppercase" }}>{ld.info.source}</span> : null}</p>
                    <p className="truncate" style={{ color: M.muted2, fontSize: 11, fontWeight: 600 }}>{ld.phone || "—"}{ld.info?.company ? ` · ${ld.info.company}` : ""}{ld.address ? ` · ${ld.address}` : ""}</p>
                  </div>
                  {ld.phone ? <a href={waLink(ld.phone)} target="_blank" rel="noreferrer" className="shrink-0 font-extrabold" style={{ color: "#fff", background: M.teal, borderRadius: 10, padding: "8px 12px", fontSize: 13, textDecoration: "none" }}>WhatsApp</a> : null}
                </div>
                <div className="flex items-center gap-2">
                  <select value={ld.status || "new"} onChange={(e) => setLeadStage(ld.id, e.target.value)} style={{ background: M.bg, border: `1.5px solid ${M.line}`, borderRadius: 9, padding: "6px 8px", fontSize: 12, fontWeight: 700, color: M.navy }}>
                    {LEAD_STAGES.map((s) => <option key={s} value={s}>{stageLabel(s)}</option>)}
                  </select>
                  <input defaultValue={ld.info?.note || ""} onBlur={(e) => setLeadNote(ld.id, e.target.value)} placeholder={lang === "es" ? "Nota…" : "Note…"} className="flex-1 min-w-0" style={{ background: M.bg, border: `1.5px solid ${M.line}`, borderRadius: 9, padding: "6px 8px", fontSize: 12, color: M.navy }} />
                </div>
              </Card>
            ))}
          </>
        )}
        {savedQuotes.length > 0 && (
          <>
            <p className="mb-2 mt-3" style={{ color: M.tealDeep, fontSize: 14, fontWeight: 800 }}>{lang === "es" ? "Cotizaciones recientes" : "Recent quotes"}</p>
            {savedQuotes.slice(0, 8).map((sq) => (
              <Card key={sq.id} style={{ marginBottom: 8 }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold truncate" style={{ color: M.navy, fontSize: 14 }}>{sq.name || sq.address || "—"}</p>
                    <p className="truncate" style={{ color: M.muted2, fontSize: 11, fontWeight: 600 }}>{sq.address}</p>
                  </div>
                  <p className="shrink-0 font-extrabold" style={{ color: M.teal, fontSize: 18 }}>{fmt(sq.recommended)}</p>
                </div>
              </Card>
            ))}
          </>
        )}
        <p className="mb-2 mt-3" style={{ color: M.tealDeep, fontSize: 14, fontWeight: 800 }}>{lang === "es" ? "Directorio" : "Directory"}</p>
        {customers.map((c) => (
          <Card key={c.id} style={{ marginBottom: 8 }}>
            <p className="font-bold" style={{ color: M.navy, fontSize: 14 }}>{c.name}</p>
            <p style={{ color: M.muted2, fontSize: 12, fontWeight: 600 }}>{c.phone}{c.addr ? ` · ${c.addr}` : ""}</p>
          </Card>
        ))}
      </div>
    </div>
  );

  /* ── My prices (rate editor) ── */
  const Prices = () => {
    const rates = mergeRates(myRates);
    // Keep the raw (comma→dot) string while typing so decimals like "0.15" and
    // Latin-American "0,15" survive; mergeRates coerces & validates numbers.
    const cleanNum = (val) => { const s = String(val).replace(",", ".").replace(/[^0-9.]/g, ""); return s === "" ? undefined : s; };
    const setRate = (type, field, val) => {
      setMyRates((prev) => {
        const next = { ...prev, RATE: { ...(prev.RATE || {}) } };
        const v = cleanNum(val);
        next.RATE[type] = { ...(next.RATE[type] || {}) };
        if (v === undefined) delete next.RATE[type][field]; else next.RATE[type][field] = v;
        saveProfile({ rates: next });
        return next;
      });
    };
    const setAddon = (key, val) => setMyRates((prev) => {
      const next = { ...prev, ADDON: { ...(prev.ADDON || {}) } };
      const v = cleanNum(val);
      if (v === undefined) delete next.ADDON[key]; else next.ADDON[key] = v;
      saveProfile({ rates: next });
      return next;
    });
    const resetRates = () => { setMyRates({}); saveProfile({ rates: {} }); showToast(lang === "es" ? "Precios restablecidos ✓" : "Prices reset ✓"); };
    return (
      <div className="flex-1 overflow-y-auto pb-6" style={{ background: M.bg }}>
        <div className="px-5 pt-4">
          <div className="rounded-2xl p-5 mb-3" style={{ background: M.cardGrad }}>
            <p style={{ color: M.goldHi, fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>{lang === "es" ? "Mis precios" : "My prices"}</p>
            <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 13, fontWeight: 600, lineHeight: 1.5, marginTop: 4 }}>{lang === "es" ? "Ajusta tus tarifas. Cada cotización usa las tuyas." : "Set your rates. Every quote uses yours."}</p>
          </div>
          <Card>
            <p style={{ color: M.gold, fontSize: 10, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 10 }}>{lang === "es" ? "Tarifas por tipo de limpieza" : "Rates by cleaning type"}</p>
            <div className="flex items-center gap-2 mb-1" style={{ paddingLeft: 110 }}>
              <span className="flex-1 text-center" style={{ color: M.muted2, fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>$/{t.sqft}</span>
              <span className="flex-1 text-center" style={{ color: M.muted2, fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>{lang === "es" ? "Mínimo" : "Minimum"}</span>
            </div>
            {CLEANING_TYPES.map(([key, icon, es, en]) => (
              <div key={key} className="flex items-center gap-2 mb-2">
                <span className="shrink-0 font-bold" style={{ width: 102, fontSize: 12, color: M.navy }}>{icon} {lang === "es" ? es : en}</span>
                <input value={myRates.RATE?.[key]?.perSqft ?? ""} onChange={(e) => setRate(key, "perSqft", e.target.value)} placeholder={String(rates.RATE[key].perSqft)} inputMode="decimal"
                  className="flex-1 min-w-0 rounded-lg px-2 py-2 font-semibold outline-none text-center" style={{ background: M.bg, border: `1.5px solid ${M.line}`, color: M.navy, fontSize: 13 }} />
                <input value={myRates.RATE?.[key]?.min ?? ""} onChange={(e) => setRate(key, "min", e.target.value)} placeholder={String(rates.RATE[key].min)} inputMode="numeric"
                  className="flex-1 min-w-0 rounded-lg px-2 py-2 font-semibold outline-none text-center" style={{ background: M.bg, border: `1.5px solid ${M.line}`, color: M.navy, fontSize: 13 }} />
              </div>
            ))}
          </Card>
          <Card>
            <p style={{ color: M.gold, fontSize: 10, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 10 }}>{lang === "es" ? "Precio de extras" : "Add-on prices"}</p>
            <div className="grid grid-cols-2 gap-2">
              {ADDONS.map(([key, icon, es, en]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span className="shrink-0" style={{ fontSize: 13, color: M.navy, width: 92 }}>{icon} {lang === "es" ? es : en}</span>
                  <input value={myRates.ADDON?.[key] ?? ""} onChange={(e) => setAddon(key, e.target.value)} placeholder={String(rates.ADDON[key])} inputMode="numeric"
                    className="flex-1 min-w-0 rounded-lg px-2 py-2 font-semibold outline-none text-center" style={{ background: M.bg, border: `1.5px solid ${M.line}`, color: M.navy, fontSize: 12 }} />
                </div>
              ))}
            </div>
          </Card>
          <button onClick={resetRates} className="w-full active:translate-y-px transition-transform" style={{ background: "#fff", color: M.red, border: `1.5px solid ${M.line}`, borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 800 }}>{lang === "es" ? "Restablecer a precios por defecto" : "Reset to default prices"}</button>
        </div>
      </div>
    );
  };

  /* Shared light header for secondary screens (back to Inicio + wordmark). */
  const ScreenHead = ({ icon, title }) => (
    <div className="flex items-center gap-2 px-4 py-3" style={{ background: "#fff", borderBottom: `1px solid ${M.line}` }}>
      <button onClick={() => setScreen("home")} className="shrink-0 flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: 99, border: `1px solid ${M.line}`, background: "#fff", color: M.teal, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>‹</button>
      <div className="flex-1 flex items-center justify-center gap-2"><Wordmark size={15} /><span className="font-extrabold" style={{ color: M.navy, fontSize: 16 }}>{icon} {title}</span></div>
      <span style={{ width: 36 }} />
    </div>
  );

  /* ── Cobros / Pagos (ALTO-Pro style money tracker, from saved quotes) ── */
  const monthKey = (ts) => { const d = new Date(ts || Date.now()); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
  const cap = (x) => (x ? x.charAt(0).toUpperCase() + x.slice(1) : x);
  const monthName = (key) => { const [y, m] = key.split("-").map(Number); return cap(new Date(y, m - 1, 1).toLocaleDateString(lang === "es" ? "es-MX" : "en-US", { month: "long", year: "numeric", timeZone: "UTC" })); };
  const setQuotePaid = (id, paid) => setSavedQuotes((prev) => {
    const next = prev.map((q) => (q.id === id ? { ...q, collected: paid ? (q.recommended || 0) : 0 } : q));
    try { localStorage.setItem("maidflow_quotes", JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });
  const Cobros = () => {
    const byMonth = {};
    [...savedQuotes].sort((a, b) => (b.ts || 0) - (a.ts || 0)).forEach((q) => { const k = monthKey(q.ts); (byMonth[k] = byMonth[k] || []).push(q); });
    const keys = Object.keys(byMonth).sort().reverse();
    const nowKey = monthKey(Date.now());
    const agg = (arr) => { const sold = arr.reduce((s, q) => s + (q.recommended || 0), 0); const col = arr.reduce((s, q) => s + (q.collected || 0), 0); return { sold, col, owe: sold - col, n: arr.length }; };
    const cur = agg(byMonth[nowKey] || []);
    const prevKey = keys.find((k) => k < nowKey);
    const prev = prevKey ? agg(byMonth[prevKey]) : null;
    const upper = { fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" };
    return (
      <div className="flex-1 overflow-y-auto pb-6" style={{ background: M.bg }}>
        <ScreenHead icon="💵" title={lang === "es" ? "Cobros / Pagos" : "Payments"} />
        <div className="px-5 pt-4">
          <div className="rounded-2xl p-5 mb-3" style={{ background: M.cardGrad }}>
            <div className="flex items-center justify-between mb-3">
              <span style={{ color: M.mint, fontSize: 13, ...upper }}>📅 {monthName(nowKey)}</span>
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 700 }}>{cur.n} {lang === "es" ? "trabajos" : "jobs"}</span>
            </div>
            <div className="flex gap-4">
              <div className="flex-1 min-w-0">
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 10.5, ...upper }}>{lang === "es" ? "Cotizado" : "Quoted"}</p>
                <p className="text-white font-extrabold" style={{ fontSize: 29, lineHeight: 1.1 }}>{fmt(cur.sold)}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 10.5, ...upper }}>{lang === "es" ? "Cobrado" : "Collected"}</p>
                <p style={{ color: M.mint, fontWeight: 900, fontSize: 29, lineHeight: 1.1 }}>{fmt(cur.col)}</p>
              </div>
            </div>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 800, marginTop: 12, letterSpacing: "0.04em" }}>{lang === "es" ? "TE DEBEN: " : "OWED: "}<span className="text-white">{fmt(cur.owe)}</span></p>
          </div>
          {prev && (
            <Card>
              <p className="text-right mb-2" style={{ color: M.muted2, fontSize: 12, ...upper }}>{lang === "es" ? "Cotizado" : "Quoted"} · <span style={{ color: M.green }}>{lang === "es" ? "Cobrado" : "Collected"}</span></p>
              <div className="flex items-center justify-between" style={{ borderTop: `1px solid ${M.line}`, paddingTop: 10 }}>
                <span style={{ color: M.muted2, fontSize: 15, fontWeight: 700 }}>{monthName(prevKey)}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color: M.navy }}>{fmt(prev.sold)} · <span style={{ color: M.green }}>{fmt(prev.col)}</span></span>
              </div>
            </Card>
          )}
          {keys.length === 0 && <p className="text-center px-6" style={{ color: M.muted2, fontSize: 14, fontWeight: 600, marginTop: 34, lineHeight: 1.6 }}>{lang === "es" ? "Aún no tienes cotizaciones. Arma una y aparecerá aquí para llevar tus cobros." : "No quotes yet. Make one and it shows up here to track payments."}</p>}
          {keys.map((k) => {
            const a = agg(byMonth[k]); const open = openMonth === k;
            return (
              <div key={k} className="mb-2">
                <button onClick={() => setOpenMonth(open ? null : k)} className="w-full flex items-center gap-3" style={{ background: "#fff", border: `1px solid ${M.line}`, borderRadius: 16, padding: "16px 16px" }}>
                  <span style={{ fontSize: 20 }}>📁</span>
                  <span className="flex-1 text-left font-extrabold" style={{ color: M.navy, fontSize: 16 }}>{monthName(k)} <span style={{ color: M.muted, fontWeight: 700 }}>· {a.n}</span></span>
                  <span style={{ color: a.owe > 0 ? M.red : M.green, fontWeight: 900, fontSize: 16 }}>{a.owe > 0 ? fmt(a.owe) : "✓ " + fmt(a.col)}</span>
                  <span style={{ color: M.muted, fontSize: 15 }}>{open ? "▾" : "▸"}</span>
                </button>
                {open && byMonth[k].map((q) => {
                  const paid = (q.collected || 0) >= (q.recommended || 0) && (q.recommended || 0) > 0;
                  return (
                    <div key={q.id} className="flex items-center gap-2 mx-2 mt-1" style={{ background: M.bg, borderRadius: 12, padding: "11px 12px" }}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold" style={{ color: M.navy, fontSize: 13 }}>{q.name || q.address || "—"}</p>
                        <p className="truncate" style={{ color: M.muted2, fontSize: 11, fontWeight: 600 }}>{q.address || ""}</p>
                      </div>
                      <span className="font-extrabold" style={{ color: M.teal, fontSize: 14 }}>{fmt(q.recommended)}</span>
                      <button onClick={() => setQuotePaid(q.id, !paid)} style={{ background: paid ? M.green : "#fff", color: paid ? "#fff" : M.muted2, border: `1.5px solid ${paid ? M.green : M.line}`, borderRadius: 9, padding: "6px 9px", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>{paid ? "✓" : "○"} {lang === "es" ? "Cobrado" : "Paid"}</button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ── Account / branding (Ajustes — ALTO-Pro sectioned list) ── */
  const AccRow = ({ id, icon, title, onTap, children }) => {
    const open = openAcc === id;
    return (
      <div className="mb-2.5">
        <button onClick={() => (onTap ? onTap() : setOpenAcc(open ? null : id))} className="w-full flex items-center gap-3 active:translate-y-px transition-transform" style={{ background: "#fff", border: `1px solid ${M.line}`, borderRadius: 16, padding: "17px 16px" }}>
          <span style={{ fontSize: 19 }}>{icon}</span>
          <span className="flex-1 text-left font-extrabold" style={{ color: M.navy, fontSize: 15.5, letterSpacing: "0.02em" }}>{title}</span>
          <span style={{ color: M.muted, fontSize: 15 }}>{onTap ? "▸" : open ? "▾" : "▸"}</span>
        </button>
        {open && children && <div className="mt-1" style={{ background: "#fff", border: `1px solid ${M.line}`, borderRadius: 16, padding: "14px 16px" }}>{children}</div>}
      </div>
    );
  };
  const Account = () => (
    <div className="flex-1 overflow-y-auto pb-8" style={{ background: M.bg }}>
      <ScreenHead icon="⚙️" title={lang === "es" ? "Ajustes" : "Settings"} />
      <div className="px-5 pt-4">
        {session && typeof Notification !== "undefined" && (pushOn
          ? <div className="mb-2.5 flex items-center gap-3" style={{ background: M.greenSoft, border: `1.5px solid ${M.green}55`, borderRadius: 16, padding: "15px 16px" }}><span style={{ fontSize: 18 }}>✅</span><span className="flex-1 font-extrabold" style={{ color: M.green, fontSize: 15 }}>{lang === "es" ? "Avisos activados" : "Alerts on"}</span></div>
          : <button onClick={() => subscribePush(true)} className="w-full mb-2.5 flex items-center gap-3" style={{ background: "#fff", border: `1px solid ${M.line}`, borderRadius: 16, padding: "15px 16px" }}><span style={{ fontSize: 18 }}>🔔</span><span className="flex-1 text-left font-extrabold" style={{ color: M.navy, fontSize: 15 }}>{lang === "es" ? "Activar avisos de leads" : "Turn on lead alerts"}</span></button>)}
        {canInstall && <button onClick={doInstall} className="w-full mb-2.5 flex items-center gap-3" style={{ background: "#fff", border: `1px solid ${M.line}`, borderRadius: 16, padding: "15px 16px" }}><span style={{ fontSize: 18 }}>📲</span><span className="flex-1 text-left font-extrabold" style={{ color: M.navy, fontSize: 15 }}>{lang === "es" ? "Instalar la app" : "Install the app"}</span></button>}

        <AccRow id="negocio" icon="🧑‍💼" title={lang === "es" ? "MI NEGOCIO" : "MY BUSINESS"}>
          <TextInput value={bizName} onChange={(v) => { setBizName(v); saveProfile({ biz: v }); }} placeholder={lang === "es" ? "Nombre del negocio" : "Business name"} />
          <TextInput value={userName} onChange={(v) => { setUserName(v); saveProfile({ name: v }); }} placeholder={lang === "es" ? "Tu nombre" : "Your name"} />
          <TextInput value={userPhone} onChange={(v) => { setUserPhone(v); saveProfile({ phone: v }); }} placeholder={lang === "es" ? "Teléfono (WhatsApp)" : "Phone (WhatsApp)"} inputMode="tel" />
          <TextInput value={bizEmail} onChange={(v) => { setBizEmail(v); saveProfile({ email: v }); }} placeholder="Email" inputMode="email" />
        </AccRow>
        <AccRow id="marca" icon="🎨" title={lang === "es" ? "TU MARCA" : "YOUR BRAND"}>
          <p style={{ color: M.muted2, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{lang === "es" ? "Tu logo aparece en cada cotización." : "Your logo shows on every quote."}</p>
          {logo
            ? (<div className="flex items-center gap-3"><img src={logo} alt="" style={{ height: 44, maxWidth: 120, objectFit: "contain", borderRadius: 8, background: "#fff", border: `1px solid ${M.line}`, padding: 4 }} /><button onClick={() => { setLogo(null); logoIdRef.current = null; saveProfile({ logo: null }); }} style={{ background: "#fff", color: M.teal, border: `1.5px solid ${M.line}`, borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13 }}>{lang === "es" ? "Quitar" : "Remove"}</button></div>)
            : (<label className="block rounded-xl px-3.5 py-3 text-center cursor-pointer font-semibold" style={{ background: M.bg, border: `1.5px dashed ${M.line}`, color: M.muted2, fontSize: 13 }}>{lang === "es" ? "＋ Subir logo" : "＋ Upload logo"}<input type="file" accept="image/*" onChange={(e) => onLogoFile(e.target.files?.[0])} style={{ display: "none" }} /></label>)}
        </AccRow>
        <AccRow icon="💲" title={lang === "es" ? "MIS PRECIOS" : "MY PRICES"} onTap={() => setScreen("prices")} />
        <AccRow icon="🌐" title={lang === "es" ? "MI PÁGINA WEB" : "MY WEBSITE"} onTap={() => setPageModal(true)} />
        <AccRow id="pagos" icon="🏦" title={lang === "es" ? "PAGOS" : "PAYMENTS"}>
          <p style={{ color: M.muted2, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{lang === "es" ? "Cómo te pagan tus clientes." : "How your clients pay you."}</p>
          <TextInput value={zelle} onChange={(v) => { setZelle(v); saveProfile({ zelle: v }); }} placeholder={lang === "es" ? "Zelle / pago (opcional)" : "Zelle / payment (optional)"} />
        </AccRow>
        <AccRow icon="🛠️" title={lang === "es" ? "¿NECESITAS UN CAMBIO?" : "NEED A CHANGE?"} onTap={() => window.open(`https://wa.me/?text=${encodeURIComponent(lang === "es" ? "Hola, necesito un cambio en mi cuenta de Paulbeza" : "Hi, I need a change to my Paulbeza account")}`, "_blank")} />
        <AccRow id="cuenta" icon="⚙️" title={lang === "es" ? "MI CUENTA" : "MY ACCOUNT"}>
          <div className="flex items-center justify-between mb-2"><span style={{ color: M.body, fontWeight: 700, fontSize: 14 }}>{lang === "es" ? "Idioma" : "Language"}</span><LangToggle /></div>
          {session
            ? <button onClick={() => { try { localStorage.removeItem("maidflow_session"); } catch { /* ignore */ } setSession(null); setCloudReady(false); showToast(lang === "es" ? "Sesión cerrada" : "Signed out"); }} style={{ background: "#fff", color: M.red, border: `1.5px solid ${M.line}`, borderRadius: 10, padding: "10px 14px", fontWeight: 800, fontSize: 13 }}>{lang === "es" ? "Cerrar sesión" : "Sign out"}</button>
            : <p style={{ color: M.muted, fontSize: 12, fontWeight: 600 }}>{lang === "es" ? "Modo demo · entra con tu link de WhatsApp para guardar en la nube." : "Demo mode · open your WhatsApp link to save to the cloud."}</p>}
        </AccRow>

        <button onClick={() => showToast(lang === "es" ? "Guardado ✓" : "Saved ✓")} className="w-full mt-2 active:translate-y-px transition-transform" style={{ background: M.teal, color: "#fff", border: "none", borderRadius: 14, padding: 16, fontSize: 16, fontWeight: 900, letterSpacing: "0.05em", boxShadow: "0 6px 18px rgba(30,58,138,0.28)" }}>{lang === "es" ? "GUARDAR" : "SAVE"}</button>
      </div>
    </div>
  );

  /* ── First-login welcome (captures name + business for branding) ── */
  const Welcome = () => {
    const finish = () => {
      saveProfile({ name: userName, biz: bizName });
      try { localStorage.setItem("maidflow_welcomed", "1"); } catch { /* private mode */ }
      resetQuote();
    };
    const feats = [
      ["🧹", lang === "es" ? "Cotiza en segundos" : "Quote in seconds", lang === "es" ? "Una dirección y unas preguntas" : "An address and a few questions"],
      ["💲", lang === "es" ? "Tus precios" : "Your prices", lang === "es" ? "Ajusta tus tarifas y mínimos" : "Set your rates and minimums"],
      ["🟢", lang === "es" ? "Envía por WhatsApp" : "Send on WhatsApp", lang === "es" ? "Mensaje listo con tu marca" : "Branded message, ready to send"],
    ];
    return (
      <div className="flex-1 overflow-y-auto" style={{ background: M.bg }}>
        <div className="px-6 pt-8 pb-6 text-center" style={{ background: M.headGrad }}>
          <div className="mb-3"><Wordmark size={34} /></div>
          <p className="text-white font-extrabold" style={{ fontSize: 22, lineHeight: 1.2 }}>{lang === "es" ? "Bienvenida a Paulbeza" : "Welcome to Paulbeza"}</p>
          <p style={{ color: "rgba(255,255,255,0.82)", fontSize: 13, fontWeight: 600, marginTop: 6 }}>{lang === "es" ? "Cotiza cualquier limpieza en minutos." : "Quote any cleaning in minutes."}</p>
        </div>
        <div className="px-5 pt-5">
          <Card>
            <p style={{ color: M.gold, fontSize: 10, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 4 }}>{lang === "es" ? "Tu negocio" : "Your business"}</p>
            <p className="font-bold mb-3" style={{ color: M.tealDeep, fontSize: 14 }}>{lang === "es" ? "Aparece en las cotizaciones que envías." : "Shown on the quotes you send."}</p>
            <TextInput value={bizName} onChange={(v) => setBizName(v)} placeholder={lang === "es" ? "Nombre del negocio (ej. Brillo Cleaning)" : "Business name (e.g. Sparkle Maids)"} />
            <TextInput value={userName} onChange={(v) => setUserName(v)} placeholder={lang === "es" ? "Tu nombre" : "Your name"} />
          </Card>
          <Card>
            <p style={{ color: M.muted2, fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>{lang === "es" ? "Cómo funciona" : "How it works"}</p>
            {feats.map(([icon, name, desc], i) => (
              <div key={name} className="flex items-center gap-3 py-2" style={{ borderTop: i ? `1px solid ${M.line}` : "none" }}>
                <span className="flex items-center justify-center shrink-0" style={{ width: 34, height: 34, borderRadius: 10, background: M.bg, fontSize: 16 }}>{icon}</span>
                <span className="min-w-0"><span className="block font-bold" style={{ color: M.tealDeep, fontSize: 14 }}>{name}</span><span className="block" style={{ color: M.muted2, fontSize: 11, fontWeight: 600 }}>{desc}</span></span>
              </div>
            ))}
          </Card>
          <PrimaryBtn onClick={finish} style={{ marginBottom: 24 }}>{lang === "es" ? "Empezar →" : "Get started →"}</PrimaryBtn>
        </div>
      </div>
    );
  };

  /* ── Router ── */
  const tabScreens = ["home", "cobros", "quote", "clients", "prices", "account", "ai"];
  const titles = { result: lang === "es" ? "📄 Cotización" : "📄 Quote" };

  return (
    <div className="min-h-screen flex justify-center" style={{ background: M.tealDeep }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Nunito', ui-rounded, sans-serif; -webkit-tap-highlight-color: transparent; }
        input::placeholder { color: #9DB0A8; }
        @keyframes ttpPulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.18); opacity: .65; } }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }`}</style>
      <div className="w-full max-w-md flex flex-col relative" style={{ background: M.bg, minHeight: "100vh" }}>
        {!session && screen !== "welcome" && (
          <div className="px-4 py-2 text-center" style={{ background: M.goldSoft, borderBottom: `1.5px solid ${M.gold}` }}>
            <span className="text-xs font-bold" style={{ color: "#7A5A00" }}>{t.demoBanner}</span>
          </div>
        )}
        {["home", "clients", "prices"].includes(screen) && <BrandHeader />}
        {screen === "quote" && step === 0 && !measuring && <BrandHeader />}
        {/* Back returns to the questionnaire (state intact) to tweak an answer;
            "Nueva cotización" on the result screen is the destructive reset. */}
        {screen === "result" && <div><TopBar title={titles.result} back={() => setScreen("quote")} /></div>}

        {screen === "welcome" && Welcome()}
        {screen === "home" && Home()}
        {screen === "cobros" && Cobros()}
        {screen === "quote" && QuoteFlow()}
        {screen === "result" && ResultScreen()}
        {screen === "clients" && Clients()}
        {screen === "prices" && Prices()}
        {screen === "ai" && AiChat()}
        {screen === "account" && Account()}
        {pageModal && <PageSheet />}

        {tabScreens.includes(screen) && <BottomNav />}
        {toast && (
          <div className="absolute left-0 right-0 flex justify-center" style={{ bottom: 80, pointerEvents: "none" }}>
            <span className="rounded-full px-5 py-2.5 font-bold text-sm text-white" style={{ background: M.tealDeep, boxShadow: "0 8px 20px rgba(0,0,0,.3)" }}>{toast}</span>
          </div>
        )}
        {installOverlay && (
          <div className="absolute inset-0 flex items-end justify-center" style={{ background: "rgba(9,20,16,0.55)", zIndex: 50 }} onClick={() => setInstallOverlay(null)}>
            <div className="w-full" style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "22px 20px 28px", maxWidth: 448 }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-extrabold" style={{ color: M.navy, fontSize: 17 }}>📲 {lang === "es" ? "Instalar Paulbeza" : "Install Paulbeza"}</p>
                <button onClick={() => setInstallOverlay(null)} style={{ background: "none", border: "none", color: M.muted2, fontSize: 22, fontWeight: 800 }}>×</button>
              </div>
              {installOverlay === "wa" ? (
                <p style={{ color: M.body, fontSize: 14, lineHeight: 1.6 }}>{lang === "es"
                  ? "Estás dentro de WhatsApp. Toca los 3 puntos ⋮ arriba a la derecha → \"Abrir en Chrome\" (o Safari) — y ahí vuelve a tocar Instalar."
                  : "You're inside WhatsApp. Tap the 3 dots ⋮ at the top right → \"Open in Chrome\" (or Safari) — then tap Install again there."}</p>
              ) : installOverlay === "ios" ? (
                <p style={{ color: M.body, fontSize: 14, lineHeight: 1.6 }}>{lang === "es"
                  ? "En Safari: toca el botón Compartir ⬆️ (abajo al centro) → baja y toca \"Añadir a pantalla de inicio\" → Añadir. Listo, queda como app."
                  : "In Safari: tap the Share ⬆️ button (bottom center) → scroll down and tap \"Add to Home Screen\" → Add. Done — it lives like an app."}</p>
              ) : (
                <p style={{ color: M.body, fontSize: 14, lineHeight: 1.6 }}>{lang === "es"
                  ? "Abre el menú de tu navegador (⋮ o compartir) y toca \"Instalar app\" o \"Añadir a pantalla de inicio\"."
                  : "Open your browser menu (⋮ or share) and tap \"Install app\" or \"Add to Home Screen\"."}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
