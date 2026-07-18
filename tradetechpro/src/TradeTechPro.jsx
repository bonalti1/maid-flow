import React, { useState, useRef, useEffect } from "react";
// Single source of truth for pricing — the same engine the server uses for the
// public widget. Pure JS, no node deps, so Vite bundles it for the browser.
import { quote as priceQuote, mergeRates, DEFAULTS } from "../server/pricing.mjs";

/* ─── Brand tokens (Pauleza: mint · aqua · light blue · purple · dark blue) ─── */
const C = {
  teal: "#6B3FA0",       // primary — buttons, headers, headings (brand violet)
  tealDeep: "#2A2352",   // deepest — gradients, deep panels
  gold: "#76C7C0",       // aqua accent
  goldSoft: "#F1ECFA",   // mint tint
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
// Pauleza brand palette (mint→teal→blue→purple, per the logo).
const M = {
  teal: "#6B3FA0", tealDeep: "#2A2352",
  purple: "#9355C1", mint: "#A1E9BD", aqua: "#76C7C0", lblue: "#7FA6C5",
  cardGrad: "linear-gradient(135deg,#6B3FA0 0%,#7D5AB5 55%,#9355C1 100%)",
  headGrad: "linear-gradient(135deg,#2A2352 0%,#6B3FA0 62%,#7738AA 100%)",
  brandGrad: "linear-gradient(90deg,#A1E9BD 0%,#76C7C0 35%,#7FA6C5 68%,#9355C1 100%)",
  gold: "#9355C1", goldHi: "#A1E9BD", goldSoft: "#F1ECFA",
  bg: "#F4F7FB", line: "#E3E9F4", line2: "#D9E2F2",
  muted: "#8FA6B6", muted2: "#5A7488", body: "#324A5C",
  green: "#1E9E5A", red: "#E8442E",
};
/* Lowercase gradient wordmark, per the brand mockup. */
const Wordmark = ({ size = 20 }) => (
  <span style={{ fontWeight: 900, fontSize: size, letterSpacing: "-0.02em", background: M.brandGrad, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>pauleza</span>
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
    demoLimit: "El modo demo incluye 6 búsquedas de prueba y ya las usaste. Las limpiadoras de Pauleza cotizan sin límite.",
    nav: { home: "Inicio", cobros: "Cobros", quote: "Cotizar", clients: "Clientes", prices: "Mis precios", account: "Ajustes" },
    measuring1: "Buscando imagen satelital…", measuring2: "Midiendo la casa…", measuring3: "Calculando el tamaño…",
    beds: "Recámaras", baths: "Baños", sqft: "pies²", builtIn: "Construida",
    useMyLocation: "Usar mi ubicación", myLocation: "Mi ubicación", locating: "Buscando tu ubicación…",
    locErr: "No pude obtener tu ubicación. Activa el GPS y permite el acceso.",
    next: "Siguiente", back: "Atrás", skip: "Omitir", optional: "opcional",
  },
  en: {
    demoBanner: "🧪 Demo mode — your data isn't saved to the cloud. Client? Enter with your WhatsApp link.",
    demoLimit: "The demo includes 6 trial lookups and you've used them. Pauleza cleaners quote with no limits.",
    nav: { home: "Home", cobros: "Payments", quote: "Quote", clients: "Clients", prices: "My prices", account: "Settings" },
    measuring1: "Finding satellite image…", measuring2: "Measuring the home…", measuring3: "Calculating the size…",
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
    if (known) { resolve({ found: true, source: "demo", addr, sqft: known.sqft, beds: known.beds, baths: known.baths, yearBuilt: known.yearBuilt || 1998 }); return; }
    const h = hashAddr(addr.toLowerCase());
    resolve({ found: true, source: "demo", addr, sqft: 1400 + (h % 1600), beds: 2 + (h % 3), baths: 1 + (h % 3), yearBuilt: 1975 + (h % 48) });
  }, 1800);
});

const fmt = (n) => "$" + Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
const num = (n) => Number(n || 0).toLocaleString("en-US");

/* ─── Google Maps loader (browser key from /api/mapconfig; one script, shared) ─── */
let _gmapsPromise = null;
function loadGoogleMaps() {
  if (_gmapsPromise) return _gmapsPromise;
  _gmapsPromise = fetch("/api/mapconfig")
    .then((r) => r.json())
    .then(({ key }) => {
      if (!key) throw new Error("no-map-key");
      if (window.google?.maps) return window.google.maps;
      return new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=quarterly`;
        s.async = true;
        s.onload = () => (window.google?.maps ? resolve(window.google.maps) : reject(new Error("gmaps-load")));
        s.onerror = () => reject(new Error("gmaps-load"));
        document.head.appendChild(s);
      });
    });
  return _gmapsPromise;
}

/* ─── In-app drive map: route from the cleaner's location to the job.
 * Keeps her inside the PWA — external Maps only via the explicit button. ─── */
function DriveMap({ dest, label, lang, onClose }) {
  const elRef = useRef(null);
  const [status, setStatus] = useState("loading"); // loading | route | noloc | failed
  const [info, setInfo] = useState(null); // { dist, dur }
  const es = lang === "es";

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then(async (maps) => {
      if (cancelled || !elRef.current) return;
      const map = new maps.Map(elRef.current, {
        center: { lat: 26.2, lng: -98.2 }, zoom: 11,
        disableDefaultUI: true, zoomControl: true, gestureHandling: "greedy", clickableIcons: false,
      });
      // Resolve the job's position: coords if we have them, else geocode the address.
      let target = Number.isFinite(dest?.lat) && Number.isFinite(dest?.lng) ? { lat: dest.lat, lng: dest.lng } : null;
      if (!target && dest?.address) {
        target = await new Promise((rs) => new maps.Geocoder().geocode({ address: dest.address }, (r, st) =>
          rs(st === "OK" && r?.[0] ? { lat: r[0].geometry.location.lat(), lng: r[0].geometry.location.lng() } : null)));
      }
      if (cancelled) return;
      if (!target) { setStatus("failed"); return; }
      const pin = new maps.Marker({ position: target, map, title: label || "",
        icon: { path: maps.SymbolPath.CIRCLE, scale: 12, fillColor: "#E8442E", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 } });
      map.setCenter(target); map.setZoom(15);
      const pinOnly = () => { if (!cancelled) { pin.setMap(map); setStatus("noloc"); } };
      if (!navigator.geolocation) { pinOnly(); return; }
      navigator.geolocation.getCurrentPosition((pos) => {
        if (cancelled) return;
        const origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        new maps.DirectionsService().route(
          { origin, destination: target, travelMode: maps.TravelMode.DRIVING },
          (res, st) => {
            if (cancelled) return;
            if (st !== "OK" || !res?.routes?.[0]) { pinOnly(); return; }
            new maps.DirectionsRenderer({ map, suppressMarkers: false, polylineOptions: { strokeColor: "#6B3FA0", strokeWeight: 5 } }).setDirections(res);
            const leg = res.routes[0].legs?.[0];
            if (leg) setInfo({ dist: leg.distance?.text || "", dur: leg.duration?.text || "" });
            setStatus("route");
          });
      }, pinOnly, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
    }).catch(() => { if (!cancelled) setStatus("failed"); });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const gmapsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    Number.isFinite(dest?.lat) && Number.isFinite(dest?.lng) ? `${dest.lat},${dest.lng}` : (dest?.address || ""))}`;
  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#fff", zIndex: 60, maxWidth: 448, margin: "0 auto" }}>
      <div className="flex items-center gap-2 px-3 py-3" style={{ background: M.tealDeep }}>
        <button onClick={onClose} className="shrink-0 active:scale-95 transition-transform" style={{ background: "rgba(255,255,255,0.14)", color: "#fff", border: "none", borderRadius: 10, width: 36, height: 36, fontSize: 20, fontWeight: 800 }}>‹</button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-extrabold truncate" style={{ fontSize: 14 }}>{label || (es ? "Cómo llegar" : "Directions")}</p>
          {info && <p style={{ color: M.goldHi, fontSize: 12, fontWeight: 800 }}>🚗 {info.dur} · {info.dist}</p>}
        </div>
      </div>
      <div className="flex-1 relative" style={{ background: "#EEF1F8" }}>
        <div ref={elRef} className="absolute inset-0" />
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "#EEF1F8" }}>
            <span style={{ color: M.muted2, fontWeight: 700, fontSize: 14 }}>{es ? "Cargando mapa…" : "Loading map…"}</span>
          </div>
        )}
        {status === "failed" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center" style={{ background: "#EEF1F8" }}>
            <span style={{ fontSize: 34 }}>🗺️</span>
            <p style={{ color: M.muted2, fontWeight: 700, fontSize: 14, marginTop: 8 }}>{es ? "No se pudo cargar el mapa." : "Couldn't load the map."}</p>
          </div>
        )}
      </div>
      {status === "noloc" && (
        <p className="text-center px-4 py-2" style={{ background: "#FFF8E6", color: "#7A5A00", fontSize: 12, fontWeight: 700 }}>
          📍 {es ? "Activa tu ubicación para ver el tiempo de manejo" : "Turn on location for drive time"}
        </p>
      )}
      <div className="px-4 py-3" style={{ background: "#fff", borderTop: `1px solid ${M.line}` }}>
        <a href={gmapsHref} target="_blank" rel="noreferrer" className="block text-center" style={{ background: M.teal, color: "#fff", borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 800, textDecoration: "none" }}>
          {es ? "Abrir en Google Maps ↗" : "Open in Google Maps ↗"}
        </a>
      </div>
    </div>
  );
}

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
  const [reviewLink, setReviewLink] = useState(savedProfile.reviewLink || ""); // where a good review gets posted (Google/Facebook)
  const [resultFrom, setResultFrom] = useState("quote"); // where the result screen's back button returns to
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
  const [driveTo, setDriveTo] = useState(null); // in-app drive map overlay {lat,lng,address}
  const [newExtra, setNewExtra] = useState({ name: "", price: "" }); // Mis precios: add-custom-extra draft
  const [aiMsgs, setAiMsgs] = useState([]); // Pregúntale a Pauleza chat
  const [aiBusy, setAiBusy] = useState(false);
  // NOTE: kept at this (parent) level on purpose — the screen below is called
  // as a plain function ({screen === "ai" && AiChat()}), not mounted as its own
  // <AiChat/> component, so a useState called *inside* it would be a
  // conditional hook call (only made while screen === "ai") and corrupt React's
  // hook order every time she navigated in and out — that was the "it kicks me
  // out" bug. All screen-local state in this file must live up here.
  const [aiInput, setAiInput] = useState("");
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

  // Testing switch: when DEMO_UNLIMITED=1 on the server, the anonymous demo caps
  // are lifted. Fetched once on mount so the client counter is skipped too.
  const [demoUnlimited, setDemoUnlimited] = useState(false);
  useEffect(() => { fetch("/api/mapconfig").then((r) => r.json()).then((c) => setDemoUnlimited(!!c.demoUnlimited)).catch(() => {}); }, []);

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
        if (p.reviewLink) setReviewLink(p.reviewLink);
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
          profile: { profile: { name: userName, biz: bizName, phone: userPhone, logo, lang, email: bizEmail, zelle, reviewLink, rates: myRates } },
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
  const blankQ = { name: "", phone: "", address: "", company: "", placeId: null, propKind: "home", sqft: "", beds: "", baths: "", yearBuilt: "", propertyType: "", cleaningType: "regular", condition: "normal", pets: "none", addOns: [], frequency: "one_time", furnished: "partial", photos: [] };
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
    if (!session && !DEMO_PASS && !demoUnlimited) {
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
        res = j.found ? { addr: j.addr || addr, sqft: j.sqft ?? null, beds: j.beds ?? null, baths: j.baths ?? null, yearBuilt: j.yearBuilt ?? null, propertyType: j.propertyType || "" } : null;
      }
    } catch { /* backend unreachable */ }
    // Only invent property data in demo mode. For a real (logged-in) cleaner a
    // lookup failure must NOT fabricate a house — land on manual entry instead,
    // so she never unknowingly quotes off made-up square footage.
    if (!res) {
      if (!session) res = await mockLookup(addr); // demo may invent a home; a real cleaner never gets fabricated data
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
        yearBuilt: res.yearBuilt != null ? String(res.yearBuilt) : prev.yearBuilt,
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
    setResultFrom("quote");
    setScreen("result");
    // Remember the quote. Store the full input snapshot (minus heavy photo
    // data-URIs) + the computed result so tapping it later re-opens the exact
    // same quote screen, not just a summary.
    const item = { id: Date.now(), name: q.name, phone: q.phone, address: q.address, sqft: q.sqft, beds: q.beds, baths: q.baths, cleaningType: q.cleaningType, recommended: out.recommended, ts: Date.now(), q: { ...q, photos: [] }, out, housePos };
    setSavedQuotes((prev) => {
      const next = [item, ...prev].slice(0, 30);
      try { localStorage.setItem("maidflow_quotes", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  // Re-open a past quote's full result screen. New quotes carry the whole
  // snapshot (q + out); older/summary-only ones are recomputed from what we
  // saved so they still open.
  const openQuote = (sq) => {
    if (sq.q && sq.out) {
      setQ({ ...blankQ, ...sq.q });
      setResult(sq.out);
      setHousePos(sq.housePos || null);
    } else {
      const out = priceQuote({ sqft: Number(sq.sqft) || 0, beds: Number(sq.beds) || 0, baths: Number(sq.baths) || 0, cleaningType: sq.cleaningType || "regular" }, mergeRates(myRates));
      setQ({ ...blankQ, name: sq.name || "", phone: sq.phone || "", address: sq.address || "", sqft: sq.sqft || "", beds: sq.beds || "", baths: sq.baths || "", cleaningType: sq.cleaningType || "regular" });
      setResult(out);
      setHousePos(null);
    }
    setResultFrom("clients");
    setScreen("result");
  };

  const resetQuote = () => { setQ(blankQ); setAddrQ(""); setPlaceSugs(null); setStep(0); setResult(null); setHousePos(null); setScreen("quote"); };

  /* Repeat / recurring business: start a new quote for a client already on
   * file — her name, phone and address are prefilled and, if she has a saved
   * address, the satellite scan kicks off immediately so a second visit is a
   * couple of taps, not a from-scratch address lookup. */
  const startQuoteForClient = (c) => {
    resetQuote();
    setQ((prev) => ({ ...prev, name: c.name || "", phone: c.phone || "" }));
    if (c.addr) { setAddrQ(c.addr); lookupProperty(c.addr); }
  };

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
      const lugar = q.propKind === "commercial" ? `su local de ${sqft} pies² (${baths} baños)` : `su casa de ${sqft} pies² (${beds} rec / ${baths} baños)`;
      return `Hola ${name} 👋 Le saluda ${business}. Según ${lugar} y la limpieza ${ct} solicitada, el precio estimado es $${out.recommended} (rango $${low}–$${high}). Incluye cocina, baños, pisos, sacudido y los detalles de una limpieza ${ct}. Tiempo estimado: ${ti.cleaners} persona(s), ${ti.low}–${ti.high} hrs. El precio final puede cambiar si hay mucha acumulación, pelo de mascota o extras no mostrados en fotos. ¿Le aparto su cita?`;
    }
    const ct = TYPE_EN[out.cleaningType] || "regular";
    const place = q.propKind === "commercial" ? `your ${sqft} sqft space (${baths} bath)` : `your ${sqft} sqft home (${beds} bed / ${baths} bath)`;
    return `Hi ${name} 👋 This is ${business}. Based on ${place} and the ${ct} cleaning requested, your estimated price is $${out.recommended} (range $${low}–$${high}). It includes kitchen, bathrooms, floors, dusting and standard ${ct} details. Estimated time: ${ti.cleaners} cleaner(s), ${ti.low}–${ti.high} hrs. Final price may change if there's heavy buildup, pet hair, or extras not shown in photos. Want me to book you in?`;
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
          <div style={{ fontSize: 34, marginBottom: 6 }}>🛰️</div>
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
            ["🔁", lang === "es" ? "Cotizar de nuevo" : "Quote again", lang === "es" ? "Elige un cliente — trabajo recurrente" : "Pick a client — recurring work", () => setScreen("clients")],
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
            <span className="block font-extrabold" style={{ color: M.teal, fontSize: 17 }}>{lang === "es" ? "Pregúntale a Pauleza" : "Ask Pauleza"}</span>
            <span className="block" style={{ color: M.muted2, fontSize: 12.5, fontWeight: 600 }}>{lang === "es" ? "Tu asistente de limpieza" : "Your cleaning assistant"}</span>
          </span>
          <span style={{ color: M.muted, fontSize: 20 }}>→</span>
        </button>
      </div>
    </div>
  );

  /* ── "Mi página web" share sheet — quote widget + review-gate, same
   * structure as ALTO Pro's WebShare: each link has a preview, WhatsApp/SMS
   * send, and copy. The review card only sends GOOD reviews public (the
   * /opina gate below asks stars first); a bad one comes to her privately. ── */
  const opinaUrl = mySlug ? `${window.location.origin}/opina/${mySlug}` : null;
  const PageSheet = () => {
    const [rlDraft, setRlDraft] = useState(reviewLink);
    const saveReviewLink = () => {
      const v = rlDraft.trim();
      if (v && !/^https:\/\//.test(v)) { showToast(lang === "es" ? "El link debe empezar con https://" : "The link must start with https://"); return; }
      setReviewLink(v); saveProfile({ reviewLink: v });
      showToast(lang === "es" ? "Guardado ✓" : "Saved ✓");
    };
    const sendMsg = (url, text, sms) => {
      if (sms) { window.location.href = "sms:?&body=" + encodeURIComponent(text + " " + url); }
      else { window.open("https://wa.me/?text=" + encodeURIComponent(text + " " + url), "_blank"); }
    };
    return (
    <div className="absolute inset-0 flex items-end justify-center" style={{ background: "rgba(16,27,48,0.55)", zIndex: 50 }} onClick={() => setPageModal(false)}>
      <div className="w-full overflow-y-auto" style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "22px 20px 28px", maxWidth: 448, maxHeight: "88vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <p className="font-extrabold" style={{ color: M.teal, fontSize: 17 }}>🌐 {lang === "es" ? "Tu página web" : "Your website"}</p>
          <button onClick={() => setPageModal(false)} style={{ background: "none", border: "none", color: M.muted2, fontSize: 22, fontWeight: 800 }}>×</button>
        </div>
        <p style={{ color: M.body, fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>{lang === "es" ? "Mándala a tus clientes — ellos escriben su dirección y reciben su precio de limpieza solos. Tú recibes el lead." : "Send it to clients — they enter their address and get a cleaning price on their own. You get the lead."}</p>
        {shareUrl ? (<>
          <div className="flex items-center gap-2 mb-2" style={{ background: M.bg, border: `1.5px solid ${M.line}`, borderRadius: 12, padding: "12px 14px" }}>
            <span className="flex-1 min-w-0 truncate font-semibold" style={{ color: M.teal, fontSize: 13 }}>{shareUrl}</span>
          </div>
          <div className="flex gap-2 mb-1">
            <button onClick={() => { try { navigator.clipboard.writeText(shareUrl); showToast(lang === "es" ? "Link copiado ✓" : "Link copied ✓"); } catch { /* ignore */ } }} className="flex-1" style={{ background: "#fff", color: M.teal, border: `1.5px solid ${M.line}`, borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 800 }}>📋 {lang === "es" ? "Copiar" : "Copy"}</button>
            <a href={`https://wa.me/?text=${encodeURIComponent((lang === "es" ? "Cotiza tu limpieza aquí 👉 " : "Get your cleaning quote here 👉 ") + shareUrl)}`} target="_blank" rel="noreferrer" className="flex-1 text-center" style={{ background: "#25D366", color: "#fff", borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 800, textDecoration: "none" }}>🟢 WhatsApp</a>
          </div>
        </>) : (
          <p style={{ color: M.muted2, fontSize: 13, fontWeight: 600 }}>{lang === "es" ? "Tu página se activa cuando tu cuenta esté lista. Pídele a tu equipo de onboarding que la publique." : "Your website turns on once your account is set up. Ask your onboarding team to publish it."}</p>
        )}

        {/* Divider: same either/or framing as ALTO Pro's Pedir reseña section */}
        <div className="flex items-center gap-3 my-4">
          <span className="flex-1" style={{ height: 1.5, background: M.line }} />
          <span className="text-xs font-extrabold text-center" style={{ color: M.muted2, maxWidth: 190, lineHeight: 1.3 }}>{lang === "es" ? "Y cuando termines el trabajo…" : "And once the job is done…"}</span>
          <span className="flex-1" style={{ height: 1.5, background: M.line }} />
        </div>

        <p className="font-extrabold mb-1" style={{ color: M.teal, fontSize: 16 }}>⭐ {lang === "es" ? "Pedir reseña" : "Ask for a review"}</p>
        <p style={{ color: M.body, fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>{lang === "es" ? "Mándalo cuando termines un trabajo. Cliente feliz → deja 5 estrellas donde tengas presencia (Google, Facebook). Descontento → te lo dice en privado, no en público." : "Send it once a job is done. Happy client → leaves 5 stars wherever you're listed (Google, Facebook). Unhappy → tells you privately, never in public."}</p>

        {opinaUrl && (<>
          <div className="flex items-center gap-2 mb-2" style={{ background: M.bg, border: `1.5px solid ${M.line}`, borderRadius: 12, padding: "12px 14px" }}>
            <span className="flex-1 min-w-0 truncate font-semibold" style={{ color: M.teal, fontSize: 13 }}>{opinaUrl}</span>
            <a href={opinaUrl + "?app=1"} target="_blank" rel="noreferrer" className="shrink-0 font-extrabold" style={{ background: M.tealDeep, color: "#fff", borderRadius: 9, padding: "6px 11px", fontSize: 12, textDecoration: "none" }}>👁 {lang === "es" ? "Ver" : "View"}</a>
          </div>
          <div className="flex gap-2 mb-2">
            <button onClick={() => sendMsg(opinaUrl, lang === "es" ? "¿Cómo estuvo tu limpieza? Cuéntanos en 30 segundos 👇" : "How was your cleaning? Tell us in 30 seconds 👇", false)} className="flex-1" style={{ background: "#25D366", color: "#fff", border: "none", borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 800 }}>💬 {lang === "es" ? "Enviar por WhatsApp" : "Send on WhatsApp"}</button>
            <button onClick={() => sendMsg(opinaUrl, lang === "es" ? "¿Cómo estuvo tu limpieza? Cuéntanos en 30 segundos 👇" : "How was your cleaning? Tell us in 30 seconds 👇", true)} className="flex-1" style={{ background: M.tealDeep, color: "#fff", border: "none", borderRadius: 12, padding: 13, fontSize: 14, fontWeight: 800 }}>✉️ {lang === "es" ? "Enviar por mensaje" : "Send by text"}</button>
          </div>
          <button onClick={() => { try { navigator.clipboard.writeText(opinaUrl); showToast(lang === "es" ? "Link copiado ✓" : "Link copied ✓"); } catch { /* ignore */ } }} className="w-full text-center mb-3" style={{ background: "none", border: "none", color: M.muted2, fontSize: 13, fontWeight: 700 }}>🔗 {lang === "es" ? "Copiar link" : "Copy link"}</button>
        </>)}

        <div style={{ background: M.bg, border: `1px solid ${M.line}`, borderRadius: 12, padding: "12px 14px" }}>
          <p style={{ color: M.muted2, fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>{lang === "es" ? "Link de reseñas (Google o Facebook)" : "Review link (Google or Facebook)"}</p>
          <div className="flex gap-2">
            <input value={rlDraft} onChange={(e) => setRlDraft(e.target.value)} placeholder="https://g.page/r/..." className="flex-1 min-w-0" style={{ background: "#fff", border: `1.5px solid ${M.line}`, borderRadius: 10, padding: "10px 12px", fontSize: 13, color: M.navy }} />
            <button onClick={saveReviewLink} style={{ background: M.teal, color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 800 }}>{lang === "es" ? "Guardar" : "Save"}</button>
          </div>
          <p style={{ color: M.muted2, fontSize: 11, fontWeight: 600, marginTop: 6, lineHeight: 1.5 }}>{lang === "es" ? "El cliente con 4-5★ verá el botón para dejarlo ahí — con 1-3★ nunca sale de tu bandeja." : "A 4-5★ client sees the button to post it there — 1-3★ never leaves your inbox."}</p>
        </div>
      </div>
    </div>
    );
  };

  /* ── Pregúntale a Pauleza (AI chat) — same structure as ALTO Pro's AI screen:
   * a centered welcome with tap-to-ask question chips that collapses into a
   * normal chat thread once she asks something (adapted to cleaning). ── */
  const AI_CHIPS = lang === "es" ? [
    "¿Cuánto debo cobrar por una casa de 1,800 pies²?",
    "¿Cómo le doy un descuento por limpieza recurrente?",
    "Redacta un mensaje de seguimiento para un cliente que no contesta",
    "¿Cuánto cobro extra por limpiar dentro del refrigerador y horno?",
    "¿Qué le digo a un cliente que dice que está muy caro?",
  ] : [
    "How much should I charge for a 1,800 sq ft home?",
    "How do I give a discount for recurring cleaning?",
    "Draft a follow-up message for a client who isn't answering",
    "How much extra should I charge for inside the fridge and oven?",
    "What do I say to a client who says it's too expensive?",
  ];
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
  const askAi = (text) => { setAiInput(""); sendAi(text); };
  const AiChat = () => (
    <div className="flex-1 flex flex-col" style={{ background: M.bg }}>
      <TopBar title={lang === "es" ? "💬 Pregúntale a Pauleza" : "💬 Ask Pauleza"} back={() => setScreen("home")} />
      {aiMsgs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <span style={{ fontSize: 44, marginBottom: 6 }}>💬</span>
          <p className="font-extrabold" style={{ color: M.navy, fontSize: 20 }}>{lang === "es" ? "Pregúntale a Pauleza" : "Ask Pauleza"}</p>
          <p style={{ color: M.muted2, fontSize: 13, fontWeight: 600, margin: "4px 0 18px" }}>{lang === "es" ? "Pregúntame lo que sea de tu negocio de limpieza" : "Ask me anything about your cleaning business"}</p>
          <div className="w-full grid gap-2" style={{ maxWidth: 380 }}>
            {AI_CHIPS.map((chip) => (
              <button key={chip} onClick={() => askAi(chip)} className="text-left active:scale-[0.98] transition-transform" style={{ background: "#fff", border: `1.5px solid ${M.line}`, borderRadius: 12, padding: "12px 14px", fontSize: 13.5, fontWeight: 700, color: M.navy }}>💬 {chip}</button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {aiMsgs.map((m, i) => (
            <div key={i} className={`mb-2 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div style={{ maxWidth: "82%", padding: "10px 13px", borderRadius: 14, fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap", background: m.role === "user" ? M.teal : "#fff", color: m.role === "user" ? "#fff" : M.body, border: m.role === "user" ? "none" : `1px solid ${M.line}` }}>{m.content}</div>
            </div>
          ))}
          {aiBusy && <div className="mb-2 flex justify-start"><div style={{ padding: "10px 13px", borderRadius: 14, background: "#fff", border: `1px solid ${M.line}`, color: M.muted }}>{lang === "es" ? "Pensando…" : "Thinking…"}</div></div>}
        </div>
      )}
      <div className="flex items-center gap-2 px-3 py-3" style={{ background: "#fff", borderTop: `1px solid ${M.line}` }}>
        {hasVoice && <button onClick={() => startVoice((txt) => askAi(txt))} aria-label="speak" className="shrink-0 flex items-center justify-center active:scale-90 transition-transform" style={{ width: 44, height: 44, borderRadius: 12, background: listening ? M.red : M.bg, border: `1.5px solid ${listening ? M.red : M.line}`, fontSize: 18 }}>{listening ? "🔴" : "🎤"}</button>}
        <input value={aiInput} onChange={(e) => setAiInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") askAi(aiInput); }}
          placeholder={lang === "es" ? "Escribe tu pregunta…" : "Type your question…"} className="flex-1 min-w-0" style={{ background: M.bg, border: `1.5px solid ${M.line}`, borderRadius: 12, padding: "12px 14px", fontSize: 15, color: M.navy }} />
        <button onClick={() => askAi(aiInput)} disabled={aiBusy || !aiInput.trim()} style={{ background: aiBusy || !aiInput.trim() ? M.line : M.teal, color: "#fff", border: "none", borderRadius: 12, padding: "12px 16px", fontSize: 15, fontWeight: 800 }}>➤</button>
      </div>
    </div>
  );

  const BrandHeader = () => (
    <div className="flex items-center justify-center px-5 pt-3 pb-3" style={{ background: "#fff", borderBottom: `1px solid ${M.line}` }}>
      <img src="/pauleza-logo.png" alt="Pauleza" style={{ height: 62, width: "auto", objectFit: "contain" }} />
    </div>
  );

  const TopBar = ({ title, back }) => (
    <div className="flex items-center gap-3 px-5 pt-4 pb-3" style={{ background: M.teal }}>
      {back && <button onClick={back} className="text-2xl font-bold" style={{ color: "#fff", background: "none", border: "none" }}>‹</button>}
      <span className="flex-1 font-extrabold text-lg truncate" style={{ color: "#fff" }}>{title}</span>
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
  const visibleSteps = STEPS.filter((s) =>
    (s !== "furnished" || ["move_in", "move_out"].includes(q.cleaningType)) &&
    (s !== "pets" || q.propKind !== "commercial"));
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
      const satUrl = housePos ? `/api/housephoto?view=satellite&lat=${housePos.lat}&lng=${housePos.lng}` : null;
      return (
        <div className="flex-1 flex flex-col justify-center px-6" style={{ background: M.tealDeep }}>
          {/* Aerial card with a sweeping scan beam — the "wow" moment */}
          <div className="relative mx-auto w-full overflow-hidden" style={{ maxWidth: 360, aspectRatio: "16 / 11", borderRadius: 22, border: "1.5px solid rgba(167,232,200,0.35)", background: "linear-gradient(135deg,#2A2352,#243b7a)", boxShadow: "0 20px 50px rgba(0,0,0,0.4)" }}>
            {satUrl && <img src={satUrl} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
            {/* scan beam */}
            <div className="absolute left-0 right-0" style={{ height: 3, background: `linear-gradient(90deg,transparent,${M.goldHi},transparent)`, boxShadow: `0 0 18px 4px ${M.goldHi}`, animation: "ttpScan 1.7s ease-in-out infinite" }} />
            {/* grid overlay */}
            <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(167,232,200,0.12) 1px,transparent 1px),linear-gradient(90deg,rgba(167,232,200,0.12) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
            <span className="absolute" style={{ top: 12, left: 14, fontSize: 22, animation: "ttpBlink 1.4s ease-in-out infinite" }}>🛰️</span>
            <div className="absolute" style={{ bottom: 10, left: 12, right: 12, background: "rgba(0,0,0,0.42)", backdropFilter: "blur(2px)", borderRadius: 12, padding: "7px 12px" }}>
              <p className="truncate" style={{ color: "#fff", fontSize: 12, fontWeight: 800 }}>📍 {q.address}</p>
            </div>
          </div>
          <p className="text-center mt-5 mb-4" style={{ color: M.goldHi, fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>{lang === "es" ? "Analizando la propiedad" : "Analyzing the property"}</p>
          <div className="mx-auto text-left" style={{ maxWidth: 360, width: "100%" }}>
            {phases.map((ph, i) => (
              <p key={ph} className="py-1 font-semibold" style={{ fontSize: 14, color: i < measurePhase ? M.goldHi : i === measurePhase ? "#fff" : "rgba(255,255,255,0.4)" }}>{i < measurePhase ? "✓ " : i === measurePhase ? "● " : "○ "}{ph}</p>
            ))}
          </div>
        </div>
      );
    }

    if (curStepKey === "customer") {
      const query = addrQ.trim().toLowerCase();
      // Only HER history — recent quotes + saved customers. No seeded demo addresses.
      const recents = [...new Set([...savedQuotes.map((s) => s.address), ...customers.map((c) => c.addr)].filter(Boolean))].slice(0, 5);
      const matches = placeSugs !== null ? placeSugs : recents.filter((a) => !query || a.toLowerCase().includes(query)).map((a) => ({ text: a, placeId: null }));
      const showRecentsLabel = placeSugs === null && matches.length > 0;
      const custom = addrQ.trim() && !matches.some((m) => m.text.toLowerCase() === query) ? addrQ.trim() : null;
      const canGo = !!(addrQ.trim());
      const isCom = q.propKind === "commercial";
      // Commercial: no satellite lookup — suites aren't in any property record.
      // She asks the manager for the sqft (it's on the lease) and types it.
      const goCommercial = (addr) => {
        setHousePos(null);
        setQ((prev) => ({ ...prev, address: addr, cleaningType: ["regular", "deep"].includes(prev.cleaningType) ? "office" : prev.cleaningType }));
        setStep(1);
      };
      const pick = (text, placeId) => { if (isCom) goCommercial(text); else lookupProperty(text, placeId); };
      const go = () => { if (!canGo) return; if (custom) pick(custom, null); else if (matches[0]) pick(matches[0].text, matches[0].placeId); };
      return (
        <div className="flex-1 overflow-y-auto pb-6" style={{ background: M.bg }}>
          <div className="px-5 py-4" style={{ background: M.headGrad, borderBottom: `2px solid ${M.gold}` }}>
            <p className="text-center" style={{ color: M.goldHi, fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>{lang === "es" ? "Cotización de limpieza" : "Cleaning quote"}</p>
            <p className="text-center font-extrabold text-white mt-0.5" style={{ fontSize: 18 }}>{lang === "es" ? "¿Cuál es la dirección?" : "What's the address?"}</p>
          </div>
          <div className="px-5 pt-3">
            {/* Casa vs Comercial — commercial suites aren't in property records, so that path asks instead of scans */}
            <div className="flex gap-2 mb-3">
              {[["home", "🏠", lang === "es" ? "Casa" : "Home"], ["commercial", "🏢", lang === "es" ? "Comercial" : "Commercial"]].map(([k, ic, label]) => (
                <button key={k} onClick={() => setField("propKind", k)} className="flex-1 active:scale-[0.98] transition-transform"
                  style={{ background: q.propKind === k ? M.teal : "#fff", color: q.propKind === k ? "#fff" : M.teal, border: `1.5px solid ${q.propKind === k ? M.teal : M.line}`, borderRadius: 13, padding: "11px 10px", fontSize: 14.5, fontWeight: 800 }}>{ic} {label}</button>
              ))}
            </div>
            {/* Hero — satellite radar for homes; walkthrough promise for commercial */}
            <div className="relative overflow-hidden mb-3" style={{ height: 150, borderRadius: 22, background: "linear-gradient(160deg,#2A2352 0%,#3A2E63 70%,#5B3D8F 100%)", border: "1.5px solid rgba(167,232,200,0.28)", boxShadow: "0 18px 40px rgba(22,41,95,0.28)" }}>
              <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(167,232,200,0.10) 1px,transparent 1px),linear-gradient(90deg,rgba(167,232,200,0.10) 1px,transparent 1px)", backgroundSize: "26px 26px" }} />
              {isCom ? (<>
                <span className="absolute" style={{ left: "50%", top: "50%", transform: "translate(-50%,-62%)", fontSize: 34 }}>🏢</span>
                <span className="absolute" style={{ bottom: 10, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", background: "rgba(0,0,0,0.35)", color: "#fff", fontSize: 11, fontWeight: 800, borderRadius: 99, padding: "5px 13px" }}>{lang === "es" ? "Oficinas, locales y plazas" : "Offices, suites & retail"}</span>
              </>) : (<>
                <div className="absolute" style={{ left: "50%", top: "50%", width: 84, height: 84, margin: "-42px 0 0 -42px", borderRadius: 999, border: `2px solid ${M.aqua}`, animation: "ttpRipple 2.2s ease-out infinite" }} />
                <div className="absolute" style={{ left: "50%", top: "50%", width: 84, height: 84, margin: "-42px 0 0 -42px", borderRadius: 999, border: `2px solid ${M.mint}`, animation: "ttpRipple 2.2s ease-out 1.1s infinite" }} />
                <span className="absolute" style={{ left: "50%", top: "50%", transform: "translate(-50%,-58%)", fontSize: 30 }}>📍</span>
                <span className="absolute" style={{ top: 12, left: 14, fontSize: 18, animation: "ttpBlink 1.6s ease-in-out infinite" }}>🛰️</span>
                <span className="absolute" style={{ bottom: 10, left: "50%", transform: "translateX(-50%)", whiteSpace: "nowrap", background: "rgba(0,0,0,0.35)", color: "#fff", fontSize: 11, fontWeight: 800, borderRadius: 99, padding: "5px 13px" }}>{lang === "es" ? "Buscamos la casa por satélite" : "We find the home by satellite"}</span>
              </>)}
            </div>
            <Card style={{ borderRadius: 20, boxShadow: "0 14px 34px rgba(30,58,138,0.10)", padding: 18 }}>
              <p style={{ color: M.muted2, fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>{isCom ? (lang === "es" ? "Dirección del local" : "Business address") : (lang === "es" ? "Dirección de la casa" : "Home address")}</p>
              <div className="addrin flex items-center gap-2 px-3.5 transition-shadow" style={{ background: M.bg, border: `1.5px solid ${M.line}`, borderRadius: 14 }}>
                <span style={{ fontSize: 16 }}>🔍</span>
                <input value={addrQ} onChange={(e) => onAddrInput(e.target.value)} placeholder={lang === "es" ? "Escribe una dirección…" : "Enter an address…"} onKeyDown={(e) => e.key === "Enter" && go()}
                  className="flex-1 text-base font-semibold outline-none bg-transparent" style={{ color: M.navy, padding: "15px 0" }} />
                {hasVoice && <button onClick={() => startVoice(onAddrInput)} className="text-xl active:scale-90 transition-transform" style={{ background: "none", border: "none", opacity: listening ? 1 : 0.6 }}>{listening ? "🔴" : "🎤"}</button>}
              </div>
              <button onClick={useMyLocation} className="w-full mt-2.5 flex items-center justify-center gap-1.5 active:scale-[0.99] transition-transform" style={{ background: "#fff", border: `1.5px solid ${M.line}`, borderRadius: 14, padding: "13px 14px", color: M.teal, fontSize: 14.5, fontWeight: 800, boxShadow: "0 3px 10px rgba(30,58,138,0.07)" }}>📍 {t.useMyLocation}</button>
              {showRecentsLabel && <p style={{ color: M.muted2, fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", margin: "12px 0 0" }}>{lang === "es" ? "Recientes" : "Recent"}</p>}
              {(custom || matches.length > 0) && (
                <div className="rounded-xl mt-2 overflow-hidden" style={{ border: `1.5px solid ${M.line}` }}>
                  {custom && (
                    <button onClick={() => pick(custom, null)} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left active:opacity-80" style={{ background: "#fff", borderBottom: matches.length ? `1px solid ${M.bg}` : "none" }}>
                      <span style={{ color: M.teal }}>📍</span><span className="font-bold truncate" style={{ color: M.navy, fontSize: 13 }}>{custom}</span>
                    </button>
                  )}
                  {matches.map((m, i) => (
                    <button key={m.text} onClick={() => pick(m.text, m.placeId)} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left active:opacity-80" style={{ background: "#fff", borderBottom: i < matches.length - 1 ? `1px solid ${M.bg}` : "none" }}>
                      <span style={{ color: M.teal }}>{placeSugs === null ? "🕘" : "📍"}</span><span className="font-semibold truncate" style={{ color: M.navy, fontSize: 13 }}>{m.text}</span>
                    </button>
                  ))}
                </div>
              )}
            </Card>
            {canGo && <PrimaryBtn onClick={go}>{isCom ? (lang === "es" ? "Continuar →" : "Continue →") : (lang === "es" ? "🛰️ Escanear la casa →" : "🛰️ Scan the home →")}</PrimaryBtn>}
            <p className="text-center mt-3" style={{ color: M.muted, fontSize: 11, fontWeight: 600 }}>{isCom ? (lang === "es" ? "El precio se confirma con una visita al local" : "Price is confirmed on a walkthrough") : (lang === "es" ? "Detectamos recámaras, baños y tamaño automáticamente" : "We auto-detect beds, baths and size")}</p>
          </div>
        </div>
      );
    }

    if (curStepKey === "confirm") {
      const canNext = Number(q.sqft) > 0;
      const stepField = (key, delta, min, step) => setField(key, String(Math.max(min, (Number(q[key]) || 0) + delta * step)));
      const Stepper = ({ icon, label, value, unit, onMinus, onPlus }) => (
        <div className="flex items-center justify-between" style={{ background: M.bg, border: `1.5px solid ${M.line}`, borderRadius: 12, padding: "10px 12px" }}>
          <div className="flex items-center gap-2 min-w-0">
            <span style={{ fontSize: 18 }}>{icon}</span>
            <div className="min-w-0">
              <p className="font-extrabold truncate" style={{ color: M.tealDeep, fontSize: 15 }}>{value || "—"}{unit ? <span style={{ color: M.muted2, fontSize: 12, fontWeight: 700 }}> {unit}</span> : null}</p>
              <p style={{ color: M.muted2, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={onMinus} className="active:scale-90 transition-transform" style={{ width: 34, height: 34, borderRadius: 10, background: "#fff", border: `1.5px solid ${M.line}`, color: M.teal, fontSize: 20, fontWeight: 800, lineHeight: 1 }}>−</button>
            <button onClick={onPlus} className="active:scale-90 transition-transform" style={{ width: 34, height: 34, borderRadius: 10, background: M.teal, border: "none", color: "#fff", fontSize: 20, fontWeight: 800, lineHeight: 1 }}>+</button>
          </div>
        </div>
      );
      const isCom = q.propKind === "commercial";
      return (
        <StepFrame kicker={isCom ? (lang === "es" ? "Paso 2 · Tu local" : "Step 2 · The space") : (lang === "es" ? "Paso 2 · Tu casa escaneada" : "Step 2 · Your scanned home")} title={isCom ? (lang === "es" ? "Datos del local 🏢" : "About the space 🏢") : (lang === "es" ? "Esto detectamos 🛰️" : "Here's what we found 🛰️")} canNext={canNext}>
          {/* Aerial "LIVE" wow card */}
          {!isCom && housePos && (
            <div className="rounded-2xl overflow-hidden mb-3" style={{ background: M.tealDeep, boxShadow: "0 18px 38px rgba(10,20,55,0.22)" }}>
              <div className="relative">
                <img src={`/api/housephoto?view=satellite&lat=${housePos.lat}&lng=${housePos.lng}`} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }}
                  style={{ width: "100%", height: 170, objectFit: "cover", display: "block", background: M.tealDeep }} />
                <span className="absolute flex items-center gap-1" style={{ top: 10, right: 10, background: "rgba(232,68,46,0.92)", color: "#fff", fontSize: 10, fontWeight: 900, letterSpacing: "0.1em", padding: "3px 8px", borderRadius: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: "#fff", display: "inline-block", animation: "ttpBlink 1.2s ease-in-out infinite" }} /> LIVE
                </span>
                <span className="absolute" style={{ top: 10, left: 10, background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 8 }}>🛰️ {lang === "es" ? "Vista aérea" : "Aerial view"}</span>
              </div>
              <div className="px-3 py-3">
                <p className="text-white font-bold truncate mb-2" style={{ fontSize: 13 }}>📍 {q.address}</p>
                <div className={`grid gap-2 ${q.yearBuilt ? "grid-cols-4" : "grid-cols-3"}`}>
                  {[["📐", q.sqft ? num(q.sqft) : "—", t.sqft], ["🛏️", q.beds || "—", t.beds], ["🛁", q.baths || "—", t.baths], ...(q.yearBuilt ? [["🏗️", q.yearBuilt, t.builtIn]] : [])].map(([icon, v, label]) => (
                    <div key={label} style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(167,232,200,0.22)", borderRadius: 10, padding: "8px 4px", textAlign: "center" }}>
                      <p className="font-extrabold text-white" style={{ fontSize: q.yearBuilt ? 14 : 16 }}>{v}</p>
                      <p style={{ color: M.goldHi, fontSize: 8, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 2 }}>{icon} {label}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-2" style={{ color: "rgba(255,255,255,0.62)", fontSize: 10, fontWeight: 600, textAlign: "center" }}>🛰️ {lang === "es" ? "Datos reales · Verifica en sitio" : "Real data · Verify on site"}</p>
              </div>
            </div>
          )}

          {/* Front-elevation photo */}
          {!isCom && housePos && (
            <div className="rounded-2xl overflow-hidden mb-3" style={{ border: `1px solid ${M.line}`, boxShadow: "0 10px 26px rgba(30,58,138,0.10)" }}>
              <img src={`/api/housephoto?view=street&lat=${housePos.lat}&lng=${housePos.lng}`} alt="" onError={(e) => { e.currentTarget.parentNode.style.display = "none"; }}
                style={{ width: "100%", height: 150, objectFit: "cover", display: "block", background: M.line }} />
              <p className="px-3 py-2" style={{ color: M.muted2, fontSize: 11, fontWeight: 800 }}>🏠 {lang === "es" ? "Foto del exterior" : "Front photo"}</p>
            </div>
          )}

          {/* Adjust if needed */}
          <Card>
            <p style={{ color: M.muted2, fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 10 }}>{isCom ? (lang === "es" ? "Tamaño del local" : "Size of the space") : (lang === "es" ? "Ajusta si hace falta" : "Adjust if needed")}</p>
            {isCom && <p style={{ color: M.body, fontSize: 13, fontWeight: 600, lineHeight: 1.55, marginBottom: 10 }}>💡 {lang === "es" ? "Pregúntale al encargado cuántos pies cuadrados tiene — el contrato de renta lo dice." : "Ask the manager for the square footage — it's on the lease."}</p>}
            <div className="flex flex-col gap-2">
              <Stepper icon="📐" label={t.sqft} value={q.sqft ? num(q.sqft) : ""} onMinus={() => stepField("sqft", -1, 0, 100)} onPlus={() => stepField("sqft", 1, 0, 100)} />
              {!isCom && <Stepper icon="🛏️" label={t.beds} value={q.beds} onMinus={() => stepField("beds", -1, 0, 1)} onPlus={() => stepField("beds", 1, 0, 1)} />}
              <Stepper icon="🛁" label={t.baths} value={q.baths} onMinus={() => stepField("baths", -1, 0, 1)} onPlus={() => stepField("baths", 1, 0, 1)} />
            </div>
          </Card>
          <p className="text-center" style={{ color: M.muted, fontSize: 11, fontWeight: 600 }}>{isCom ? (lang === "es" ? "≈ Estimado — el precio se confirma con una visita" : "≈ Estimate — price is confirmed on a walkthrough") : (lang === "es" ? "≈ Estimado — puedes ajustar los cuadros arriba" : "≈ Estimate — tune the numbers above")}</p>
          {!canNext && <p className="mt-1" style={{ color: M.red, fontSize: 12, fontWeight: 600 }}>{lang === "es" ? "Pon los pies cuadrados para continuar." : "Enter the square footage to continue."}</p>}
        </StepFrame>
      );
    }

    if (curStepKey === "type") {
      const opts = CLEANING_TYPES.map(([key, icon, es, en]) => ({ key, icon, title: lang === "es" ? es : en }));
      return (
        <StepFrame kicker={lang === "es" ? `Paso ${step + 1} · Tipo de limpieza` : `Step ${step + 1} · Cleaning type`} title={lang === "es" ? "¿Qué limpieza necesita?" : "What cleaning is needed?"}>
          <OptionGrid options={opts} value={q.cleaningType} onChange={(v) => setField("cleaningType", v)} />
        </StepFrame>
      );
    }

    if (curStepKey === "condition") {
      const opts = CONDITIONS.map(([key, icon, es, en, esS, enS]) => ({ key, icon, title: lang === "es" ? es : en, sub: lang === "es" ? esS : enS }));
      return (
        <StepFrame kicker={lang === "es" ? `Paso ${step + 1} · Condición` : `Step ${step + 1} · Condition`} title={lang === "es" ? (q.propKind === "commercial" ? "¿Cómo está el local?" : "¿Cómo está la casa?") : "What condition is it in?"}>
          <OptionGrid options={opts} value={q.condition} onChange={(v) => setField("condition", v)} />
          {q.condition === "very_heavy" && <p className="mt-3" style={{ color: "#8A6A00", fontSize: 12, fontWeight: 700, background: "#FFF8E6", border: "1px solid #ffe08a", borderRadius: 10, padding: "10px 12px" }}>⚠️ {lang === "es" ? "Recomendamos cotización personalizada después de ver fotos o la casa." : "We recommend a custom quote after seeing photos or the home."}</p>}
        </StepFrame>
      );
    }

    if (curStepKey === "pets") {
      const opts = PETS.map(([key, icon, es, en]) => ({ key, icon, title: lang === "es" ? es : en }));
      return (
        <StepFrame kicker={lang === "es" ? `Paso ${step + 1} · Mascotas` : `Step ${step + 1} · Pets`} title={lang === "es" ? "¿Hay mascotas?" : "Any pets?"}>
          <OptionGrid options={opts} value={q.pets} onChange={(v) => setField("pets", v)} />
        </StepFrame>
      );
    }

    if (curStepKey === "addons") {
      return (
        <StepFrame kicker={lang === "es" ? `Paso ${step + 1} · Extras` : `Step ${step + 1} · Add-ons`} title={lang === "es" ? "¿Algún extra?" : "Any add-ons?"} nextLabel={t.next + " →"}>
          <div className="grid grid-cols-2 gap-2">
            {[
              ...ADDONS.map(([key, icon, es, en]) => ({ key, label: lang === "es" ? es : en })),
              ...Object.keys(myRates.ADDON || {}).filter((k) => k.startsWith("custom:")).map((key) => ({ key, label: myRates.ADDON_LABELS?.[key] || (lang === "es" ? "Extra" : "Extra") })),
            ].map(({ key, label }) => {
              const on = q.addOns.includes(key);
              return (
                <button key={key} onClick={() => toggleAddon(key)} className="flex items-center gap-2 text-left active:scale-[0.98] transition-transform"
                  style={{ background: on ? M.teal : "#fff", color: on ? "#fff" : M.navy, border: `1.5px solid ${on ? M.teal : M.line}`, borderRadius: 12, padding: "12px 12px" }}>
                  <span className="font-bold" style={{ fontSize: 13 }}>{label}</span>
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
        <StepFrame kicker={lang === "es" ? `Paso ${step + 1} · Frecuencia` : `Step ${step + 1} · Frequency`} title={lang === "es" ? "¿Cada cuánto?" : "How often?"}>
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
        <StepFrame kicker={lang === "es" ? `Paso ${step + 1} · Mobiliario` : `Step ${step + 1} · Furnishing`} title={lang === "es" ? "¿Vacía o amueblada?" : "Empty or furnished?"}>
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
    // Hosted quote page (/q/:id) — a branded link she can send instead of raw text.
    const shareQuote = async () => {
      let url = null;
      try {
        const r = await api("/api/quote/share", { method: "POST", body: JSON.stringify({
          name: q.name, address: q.address, sqft: q.sqft, beds: q.beds, baths: q.baths,
          cleaningType: out.cleaningType, recommended: out.recommended, low: out.range[0], high: out.range[1],
          recurring: out.recurring, frequency: out.frequency,
          cleaners: out.time?.cleaners, hoursLow: out.time?.low, hoursHigh: out.time?.high, lang,
        }) });
        url = (await r.json()).url || null;
      } catch { /* backend unreachable */ }
      if (!url) { showToast(lang === "es" ? "No se pudo crear el link" : "Couldn't create the link"); return; }
      try { await navigator.clipboard.writeText(url); } catch { /* clipboard blocked */ }
      showToast(lang === "es" ? "Link copiado ✓ — mándaselo a tu cliente" : "Link copied ✓ — send it to your customer");
      if (navigator.share) { try { await navigator.share({ url }); } catch { /* user closed the sheet */ } }
    };
    const ct = CLEANING_TYPES.find((c) => c[0] === out.cleaningType);
    return (
      <div className="flex-1 overflow-y-auto pb-6" style={{ background: M.bg }}>
        <div className="px-5 pt-4">
          {/* The wow factor: a real photo of the client's house */}
          {housePos && (
            <div className="rounded-2xl mb-3 overflow-hidden" style={{ border: `1px solid ${M.line}`, boxShadow: "0 10px 30px rgba(30,58,138,0.12)" }}>
              <img src={`/api/housephoto?view=street&lat=${housePos.lat}&lng=${housePos.lng}`} alt="" onError={(e) => { e.currentTarget.parentNode.style.display = "none"; }}
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
                {q.addOns.map((a) => { const ad = ADDONS.find((x) => x[0] === a); const label = ad ? (lang === "es" ? ad[2] : ad[3]) : (myRates.ADDON_LABELS?.[a] || "Extra"); return <span key={a} style={{ background: M.bg, border: `1px solid ${M.line}`, borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: M.body }}>{label}</span>; })}
              </div>
            )}
          </Card>

          {/* WhatsApp message preview */}
          <Card>
            <p style={{ color: M.gold, fontSize: 10, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8 }}>{lang === "es" ? "Mensaje para el cliente" : "Message for the customer"}</p>
            <p style={{ color: M.body, fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{msg}</p>
          </Card>

          {/* Customer contact — captured here (not at the address step) */}
          <Card>
            <p style={{ color: M.gold, fontSize: 10, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8 }}>{lang === "es" ? "¿A quién le mandas el precio?" : "Who's this quote for?"}</p>
            <TextInput value={q.name} onChange={(v) => setField("name", v)} placeholder={lang === "es" ? "Nombre del cliente" : "Customer name"} />
            <TextInput value={q.phone} onChange={(v) => setField("phone", v)} placeholder={lang === "es" ? "Teléfono (WhatsApp)" : "Phone (WhatsApp)"} inputMode="tel" />
          </Card>

          <p className="mb-3" style={{ color: M.muted2, fontSize: 11, fontWeight: 600, lineHeight: 1.5 }}>⚠️ {q.propKind === "commercial" ? (lang === "es" ? "Precio estimado — se confirma con una visita al local." : "Estimated price — confirmed on a walkthrough of the space.") : (lang === "es" ? "El precio final puede cambiar después de ver fotos o la casa si está más sucia de lo descrito." : "Final price may change after photos/walkthrough if the home is heavier than described.")}</p>

          <button onClick={sendWhatsApp} className="w-full active:translate-y-px transition-transform mb-2.5" style={{ background: "#25D366", color: "#fff", border: "none", borderRadius: 12, padding: 15, fontSize: 16, fontWeight: 800, boxShadow: "0 4px 14px rgba(37,211,102,0.35)" }}>
            🟢 {lang === "es" ? "Enviar por WhatsApp" : "Send on WhatsApp"}
          </button>
          {session && (
            <button onClick={shareQuote} className="w-full active:translate-y-px transition-transform mb-2.5" style={{ background: "#fff", color: M.teal, border: `1.5px solid ${M.aqua}`, borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 800 }}>
              🔗 {lang === "es" ? "Crear link de la cotización" : "Create quote link"}
            </button>
          )}
          {(housePos || q.address) && (
            <button onClick={() => setDriveTo({ lat: housePos?.lat, lng: housePos?.lng, address: q.address })} className="w-full active:translate-y-px transition-transform mb-2.5" style={{ background: "#fff", color: M.teal, border: `1.5px solid ${M.line}`, borderRadius: 12, padding: 14, fontSize: 15, fontWeight: 800 }}>
              🚗 {lang === "es" ? "Cómo llegar al trabajo" : "Directions to the job"}
            </button>
          )}
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
      a.href = u; a.download = "pauleza-leads.csv"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u);
    }).catch(() => showToast(lang === "es" ? "No se pudo exportar" : "Export failed"));
  };

  const Clients = () => (
    <div className="flex-1 overflow-y-auto pb-6" style={{ background: M.bg }}>
      <div className="px-5 pt-4">
        <div className="rounded-2xl p-5 mb-3" style={{ background: M.cardGrad, boxShadow: "0 18px 38px rgba(10,69,55,0.18)" }}>
          <p style={{ color: M.goldHi, fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>{lang === "es" ? "Tus clientes" : "Your customers"}</p>
          <p className="text-white font-extrabold" style={{ fontSize: 26, margin: "4px 0 0" }}>{customers.length}</p>
        </div>
        <button onClick={resetQuote} className="w-full flex items-center justify-center gap-2 mb-3 active:translate-y-px transition-transform" style={{ background: "#fff", color: M.teal, border: `1.5px dashed ${M.aqua}`, borderRadius: 14, padding: 14, fontSize: 14, fontWeight: 800 }}>
          + {lang === "es" ? "Nueva cotización (cliente nuevo)" : "New quote (new client)"}
        </button>
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
              <button key={sq.id} onClick={() => openQuote(sq)} className="w-full text-left active:scale-[0.98] transition-transform" style={{ marginBottom: 8, background: "#fff", border: `1px solid ${M.line}`, borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate" style={{ color: M.navy, fontSize: 14 }}>{sq.name || sq.address || "—"}</p>
                  <p className="truncate" style={{ color: M.muted2, fontSize: 11, fontWeight: 600 }}>{sq.address}{sq.cleaningType ? ` · ${(lang === "es" ? TYPE_ES : TYPE_EN)[sq.cleaningType] || sq.cleaningType}` : ""}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-extrabold" style={{ color: M.teal, fontSize: 18 }}>{fmt(sq.recommended)}</p>
                  <p style={{ color: M.muted, fontSize: 10, fontWeight: 700 }}>{lang === "es" ? "Ver ›" : "View ›"}</p>
                </div>
              </button>
            ))}
          </>
        )}
        <p className="mb-2 mt-3" style={{ color: M.tealDeep, fontSize: 14, fontWeight: 800 }}>{lang === "es" ? "Directorio" : "Directory"}</p>
        {customers.length === 0 && <p style={{ color: M.muted2, fontSize: 13, fontWeight: 600, lineHeight: 1.6, marginBottom: 8 }}>{lang === "es" ? "Aquí aparecen tus clientes en cuanto mandes una cotización por WhatsApp." : "Your clients show up here as soon as you send a quote on WhatsApp."}</p>}
        {customers.map((c) => (
          <button key={c.id} onClick={() => startQuoteForClient(c)} className="w-full text-left active:scale-[0.98] transition-transform" style={{ marginBottom: 8, background: "#fff", border: `1px solid ${M.line}`, borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate" style={{ color: M.navy, fontSize: 14 }}>{c.name}</p>
              <p className="truncate" style={{ color: M.muted2, fontSize: 12, fontWeight: 600 }}>{c.phone}{c.addr ? ` · ${c.addr}` : ""}</p>
            </div>
            <span className="shrink-0" style={{ color: M.teal, fontSize: 11, fontWeight: 800, background: M.bg, border: `1px solid ${M.line}`, borderRadius: 9, padding: "6px 10px", whiteSpace: "nowrap" }}>{lang === "es" ? "Cotizar de nuevo ›" : "Quote again ›"}</span>
          </button>
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
    // Custom extras the cleaner adds herself (keyed custom:<id>, label in ADDON_LABELS).
    const customKeys = Object.keys(myRates.ADDON || {}).filter((k) => k.startsWith("custom:"));
    const addCustom = () => {
      const name = (newExtra.name || "").trim(); const price = cleanNum(newExtra.price);
      if (!name || price === undefined) { showToast(lang === "es" ? "Escribe nombre y precio" : "Enter a name and price"); return; }
      const key = "custom:" + Math.random().toString(36).slice(2, 10);
      setMyRates((prev) => {
        const next = { ...prev, ADDON: { ...(prev.ADDON || {}), [key]: price }, ADDON_LABELS: { ...(prev.ADDON_LABELS || {}), [key]: name.slice(0, 40) } };
        saveProfile({ rates: next }); return next;
      });
      setNewExtra({ name: "", price: "" });
    };
    const removeCustom = (key) => setMyRates((prev) => {
      const ADDON = { ...(prev.ADDON || {}) }; const ADDON_LABELS = { ...(prev.ADDON_LABELS || {}) };
      delete ADDON[key]; delete ADDON_LABELS[key];
      const next = { ...prev, ADDON, ADDON_LABELS }; saveProfile({ rates: next }); return next;
    });
    const inp = { background: M.bg, border: `1.5px solid ${M.line}`, color: M.navy };
    return (
      <div className="flex-1 overflow-y-auto pb-6" style={{ background: M.bg }}>
        <div className="px-5 pt-4">
          <div className="rounded-2xl p-5 mb-3" style={{ background: M.cardGrad, boxShadow: "0 14px 32px rgba(42,35,82,0.18)" }}>
            <p style={{ color: M.goldHi, fontSize: 11, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase" }}>{lang === "es" ? "Mis precios" : "My prices"}</p>
            <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 600, lineHeight: 1.5, marginTop: 4 }}>{lang === "es" ? "Ajusta tus tarifas. Cada cotización usa las tuyas." : "Set your rates. Every quote uses yours."}</p>
          </div>

          {/* Rates by cleaning type — label on its own line, two clearly-labeled fields */}
          <Card style={{ padding: 18 }}>
            <p style={{ color: M.teal, fontSize: 11, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 3 }}>{lang === "es" ? "Tarifas por tipo de limpieza" : "Rates by cleaning type"}</p>
            <p style={{ color: M.muted2, fontSize: 12, fontWeight: 600, marginBottom: 14 }}>{lang === "es" ? "El precio por pie cuadrado y el mínimo que cobras." : "Your price per square foot and your minimum."}</p>
            {CLEANING_TYPES.map(([key, icon, es, en], i) => (
              <div key={key} style={{ paddingTop: i ? 12 : 0, marginTop: i ? 12 : 0, borderTop: i ? `1px solid ${M.line}` : "none" }}>
                <p className="font-bold mb-2" style={{ fontSize: 14, color: M.navy }}>{lang === "es" ? es : en}</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block"><span style={{ color: M.muted2, fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" }}>$ / {t.sqft}</span>
                    <input value={myRates.RATE?.[key]?.perSqft ?? ""} onChange={(e) => setRate(key, "perSqft", e.target.value)} placeholder={String(rates.RATE[key].perSqft)} inputMode="decimal"
                      className="w-full rounded-xl px-3 py-2.5 font-bold outline-none mt-1" style={{ ...inp, fontSize: 15 }} /></label>
                  <label className="block"><span style={{ color: M.muted2, fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", textTransform: "uppercase" }}>{lang === "es" ? "Mínimo $" : "Minimum $"}</span>
                    <input value={myRates.RATE?.[key]?.min ?? ""} onChange={(e) => setRate(key, "min", e.target.value)} placeholder={String(rates.RATE[key].min)} inputMode="numeric"
                      className="w-full rounded-xl px-3 py-2.5 font-bold outline-none mt-1" style={{ ...inp, fontSize: 15 }} /></label>
                </div>
              </div>
            ))}
          </Card>

          {/* Add-on prices — no icons, name + $, plus custom extras she can add/remove */}
          <Card style={{ padding: 18 }}>
            <p style={{ color: M.teal, fontSize: 11, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 3 }}>{lang === "es" ? "Precio de extras" : "Add-on prices"}</p>
            <p style={{ color: M.muted2, fontSize: 12, fontWeight: 600, marginBottom: 14 }}>{lang === "es" ? "Servicios sueltos que sumas a una limpieza." : "Extra services you add on to a cleaning."}</p>
            {ADDONS.map(([key, icon, es, en], i) => (
              <div key={key} className="flex items-center gap-3" style={{ paddingTop: i ? 8 : 0, marginTop: i ? 8 : 0, borderTop: i ? `1px solid ${M.line}` : "none" }}>
                <span className="flex-1 font-bold" style={{ fontSize: 14, color: M.navy }}>{lang === "es" ? es : en}</span>
                <div className="flex items-center gap-1" style={{ width: 108 }}>
                  <span style={{ color: M.muted2, fontSize: 14, fontWeight: 800 }}>$</span>
                  <input value={myRates.ADDON?.[key] ?? ""} onChange={(e) => setAddon(key, e.target.value)} placeholder={String(rates.ADDON[key])} inputMode="numeric"
                    className="flex-1 min-w-0 rounded-xl px-3 py-2.5 font-bold outline-none text-center" style={{ ...inp, fontSize: 15 }} />
                </div>
              </div>
            ))}
            {customKeys.map((key) => (
              <div key={key} className="flex items-center gap-3" style={{ paddingTop: 8, marginTop: 8, borderTop: `1px solid ${M.line}` }}>
                <span className="flex-1 font-bold truncate" style={{ fontSize: 14, color: M.teal }}>{myRates.ADDON_LABELS?.[key] || (lang === "es" ? "Extra" : "Extra")}</span>
                <div className="flex items-center gap-1" style={{ width: 108 }}>
                  <span style={{ color: M.muted2, fontSize: 14, fontWeight: 800 }}>$</span>
                  <input value={myRates.ADDON?.[key] ?? ""} onChange={(e) => setAddon(key, e.target.value)} inputMode="numeric"
                    className="flex-1 min-w-0 rounded-xl px-3 py-2.5 font-bold outline-none text-center" style={{ ...inp, fontSize: 15 }} />
                </div>
                <button onClick={() => removeCustom(key)} className="shrink-0 active:scale-90" style={{ width: 30, height: 30, borderRadius: 8, background: M.redSoft || "#FBEAEA", color: M.red, border: "none", fontSize: 18, fontWeight: 800, lineHeight: 1 }}>×</button>
              </div>
            ))}
            {/* Add a custom extra */}
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1.5px dashed ${M.line}` }}>
              <p style={{ color: M.muted2, fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>{lang === "es" ? "Agregar tu propio extra" : "Add your own extra"}</p>
              <div className="flex items-center gap-2">
                <input value={newExtra.name} onChange={(e) => setNewExtra((p) => ({ ...p, name: e.target.value }))} placeholder={lang === "es" ? "Nombre (ej. Lavar alfombra)" : "Name (e.g. Carpet wash)"}
                  className="flex-1 min-w-0 rounded-xl px-3 py-2.5 font-semibold outline-none" style={{ ...inp, fontSize: 14 }} />
                <div className="flex items-center gap-1" style={{ width: 84 }}>
                  <span style={{ color: M.muted2, fontSize: 14, fontWeight: 800 }}>$</span>
                  <input value={newExtra.price} onChange={(e) => setNewExtra((p) => ({ ...p, price: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addCustom()} placeholder="0" inputMode="numeric"
                    className="flex-1 min-w-0 rounded-xl px-2 py-2.5 font-bold outline-none text-center" style={{ ...inp, fontSize: 15 }} />
                </div>
              </div>
              <button onClick={addCustom} className="w-full mt-2 active:translate-y-px transition-transform" style={{ background: M.teal, color: "#fff", border: "none", borderRadius: 12, padding: 12, fontSize: 14, fontWeight: 800 }}>+ {lang === "es" ? "Agregar extra" : "Add extra"}</button>
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
        <AccRow icon="🛠️" title={lang === "es" ? "¿NECESITAS UN CAMBIO?" : "NEED A CHANGE?"} onTap={() => window.open(`https://wa.me/?text=${encodeURIComponent(lang === "es" ? "Hola, necesito un cambio en mi cuenta de Pauleza" : "Hi, I need a change to my Pauleza account")}`, "_blank")} />
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
      ["🛰️", M.mint, lang === "es" ? "Cotiza en segundos" : "Quote in seconds", lang === "es" ? "Escanea la casa por satélite" : "Scan the home by satellite"],
      ["💲", M.aqua, lang === "es" ? "Tus precios, tus reglas" : "Your prices, your rules", lang === "es" ? "Ajusta tus tarifas y mínimos" : "Set your rates and minimums"],
      ["💬", M.purple, lang === "es" ? "Envía por WhatsApp" : "Send on WhatsApp", lang === "es" ? "Mensaje listo con tu marca" : "Branded message, ready to send"],
    ];
    return (
      <div className="flex-1 overflow-y-auto" style={{ background: M.bg }}>
        {/* Hero — the satellite radar signature behind the wordmark ties it to the quote flow */}
        <div className="relative overflow-hidden px-6 pt-10 pb-9 text-center" style={{ background: M.headGrad }}>
          <div className="absolute" style={{ left: "50%", top: 46, width: 150, height: 150, margin: "0 0 0 -75px", borderRadius: 999, border: `1.5px solid ${M.mint}`, opacity: 0.25, animation: "ttpRipple 2.6s ease-out infinite" }} />
          <div className="absolute" style={{ left: "50%", top: 46, width: 150, height: 150, margin: "0 0 0 -75px", borderRadius: 999, border: `1.5px solid ${M.aqua}`, opacity: 0.25, animation: "ttpRipple 2.6s ease-out 1.3s infinite" }} />
          <div className="relative">
            <div className="mb-4"><Wordmark size={44} /></div>
            <p className="text-white font-extrabold" style={{ fontSize: 25, lineHeight: 1.15, letterSpacing: "-0.01em" }}>{lang === "es" ? "Bienvenida a Pauleza" : "Welcome to Pauleza"}</p>
            <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: 600, marginTop: 7 }}>{lang === "es" ? "Todo tu negocio de limpieza, en tu teléfono." : "Your whole cleaning business, on your phone."}</p>
          </div>
        </div>

        <div className="px-5 pt-5" style={{ marginTop: -14 }}>
          <Card style={{ borderRadius: 20, boxShadow: "0 14px 34px rgba(42,35,82,0.10)", padding: 18 }}>
            <p style={{ color: M.teal, fontSize: 10, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 4 }}>{lang === "es" ? "Tu negocio" : "Your business"}</p>
            <p className="font-bold mb-3" style={{ color: M.tealDeep, fontSize: 14.5 }}>{lang === "es" ? "Aparece en cada cotización que mandas." : "Shown on every quote you send."}</p>
            <TextInput value={bizName} onChange={(v) => setBizName(v)} placeholder={lang === "es" ? "Nombre del negocio (ej. Brillo Cleaning)" : "Business name (e.g. Sparkle Maids)"} />
            <TextInput value={userName} onChange={(v) => setUserName(v)} placeholder={lang === "es" ? "Tu nombre" : "Your name"} />
          </Card>

          <Card style={{ borderRadius: 20, padding: 18 }}>
            <p style={{ color: M.muted2, fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 12 }}>{lang === "es" ? "Cómo funciona" : "How it works"}</p>
            {feats.map(([icon, tint, name, desc], i) => (
              <div key={name} className="flex items-center gap-3" style={{ paddingTop: i ? 12 : 0, marginTop: i ? 12 : 0, borderTop: i ? `1px solid ${M.line}` : "none" }}>
                <span className="flex items-center justify-center shrink-0" style={{ width: 42, height: 42, borderRadius: 13, background: `${tint}2E`, border: `1.5px solid ${tint}`, fontSize: 19 }}>{icon}</span>
                <span className="min-w-0 flex-1"><span className="block font-extrabold" style={{ color: M.tealDeep, fontSize: 15 }}>{name}</span><span className="block" style={{ color: M.muted2, fontSize: 12, fontWeight: 600, marginTop: 1 }}>{desc}</span></span>
              </div>
            ))}
          </Card>

          <PrimaryBtn onClick={finish} style={{ marginTop: 4, marginBottom: 12, padding: 17, fontSize: 17 }}>{lang === "es" ? "Empezar →" : "Get started →"}</PrimaryBtn>
          <p className="text-center" style={{ color: M.muted, fontSize: 11, fontWeight: 600, marginBottom: 24 }}>{lang === "es" ? "Sin tarjeta · listo en 30 segundos" : "No card needed · ready in 30 seconds"}</p>
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
        @keyframes ttpScan { 0% { top: -8%; } 100% { top: 108%; } }
        @keyframes ttpBlink { 0%, 100% { opacity: 1; } 50% { opacity: .25; } }
        @keyframes ttpRipple { 0% { transform: scale(0.45); opacity: .9; } 100% { transform: scale(2.4); opacity: 0; } }
        .addrin:focus-within { border-color: #76C7C0 !important; box-shadow: 0 0 0 3px rgba(126,214,217,0.22); }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } [style*="ttpScan"] { animation: none !important; } }`}</style>
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
        {screen === "result" && <div><TopBar title={titles.result} back={() => setScreen(resultFrom)} /></div>}

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
        {driveTo && <DriveMap dest={driveTo} label={driveTo.address} lang={lang} onClose={() => setDriveTo(null)} />}

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
                <p className="font-extrabold" style={{ color: M.navy, fontSize: 17 }}>📲 {lang === "es" ? "Instalar Pauleza" : "Install Pauleza"}</p>
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
