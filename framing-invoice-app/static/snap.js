/* Quote Check — pick a chart-of-account, upload the quote, check every line
 * against that account's itemized baseline (price list). No budgets.
 *
 * Flow: choose account -> upload/photo -> /api/extract reads lines ->
 * /api/compare (scoped to the account) -> red/green report + vendor messages.
 */
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

let accounts = [];
let selected = null;
let houses = [];
let selectedHouse = null;
let current = { invoiceId: null, lines: [], invoice: {} };

function money(v) {
  if (v === null || v === undefined || v === "") return "—";
  return "$" + Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function toast(m) { const t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(t._t); t._t = setTimeout(() => (t.hidden = true), 2800); }
function show(s) { ["home", "working", "result"].forEach((x) => ($("#screen-" + x).hidden = x !== s)); window.scrollTo(0, 0); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }
async function api(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) { let d = r.statusText; try { d = (await r.json()).detail || d; } catch (e) {} throw new Error(d); }
  return r.json();
}

// ---------- house dropdown (read-only, from the Cash Flow Center) ----------
async function loadHouses() {
  try {
    const data = await api("/api/houses");
    houses = data.houses || [];
    const sel = $("#houseSelect");
    sel.innerHTML = '<option value="">Choose a house…</option>';
    houses.forEach((h) => {
      const o = document.createElement("option");
      o.value = h.id != null ? h.id : h.name;
      o.textContent = h.name || h.label || h.id;
      sel.appendChild(o);
    });
  } catch (e) {}
}
$("#houseSelect").onchange = () => {
  const v = $("#houseSelect").value;
  selectedHouse = houses.find((h) => String(h.id != null ? h.id : h.name) === String(v)) || null;
};

// ---------- account dropdown (grouped by phase) ----------
async function loadAccounts() {
  try {
    const data = await api("/api/coa");
    accounts = data.accounts || [];
    const sel = $("#accountSelect");
    sel.innerHTML = '<option value="">Choose an account…</option>';
    const byPhase = {};
    accounts.forEach((a) => { (byPhase[a.department || "Other"] = byPhase[a.department || "Other"] || []).push(a); });
    Object.keys(byPhase).forEach((phase) => {
      const og = document.createElement("optgroup"); og.label = phase;
      byPhase[phase].forEach((a) => {
        const o = document.createElement("option");
        o.value = a.account_number;
        o.textContent = (a.account_number ? a.account_number + " · " : "") + a.account_name;
        og.appendChild(o);
      });
      sel.appendChild(og);
    });
  } catch (e) {}
}

$("#accountSelect").onchange = async () => {
  selected = accounts.find((a) => String(a.account_number) === String($("#accountSelect").value)) || null;
  const row = $("#baselineRow");
  if (!selected) { row.hidden = true; return; }
  row.hidden = false;
  $("#baselineStatus").textContent = "…";
  try {
    const b = await api(`/api/coa/${encodeURIComponent(selected.account_number)}/baseline`);
    selected._items = b.count;
    $("#baselineStatus").textContent = b.count > 0
      ? `✓ ${b.count} items in this account's price list`
      : "⚠ No price list yet — items will be logged as new to build it";
  } catch (e) { $("#baselineStatus").textContent = ""; }
};

// ---------- attach / replace a price list for the selected account ----------
$("#attachBaselineBtn").onclick = (e) => { if (!selected) { e.preventDefault(); toast("Pick an account first"); } };
$("#baselineFile").onchange = async (e) => {
  const f = e.target.files[0];
  if (!f || !selected) return;
  const fd = new FormData(); fd.append("file", f);
  toast("Importing price list…");
  try {
    const r = await api(`/api/coa/${encodeURIComponent(selected.account_number)}/baseline`, { method: "POST", body: fd });
    toast(`Price list saved: ${r.imported} items`);
    $("#accountSelect").onchange();
  } catch (err) { toast("Error: " + err.message); }
  e.target.value = "";
};

// ---------- pickers ----------
$("#takePhoto").onclick = () => requireReady() && $("#cameraInput").click();
$("#uploadFile").onclick = () => requireReady() && $("#fileInput").click();
$("#cameraInput").onchange = (e) => e.target.files[0] && handleFile(e.target.files[0]);
$("#fileInput").onchange = (e) => e.target.files[0] && handleFile(e.target.files[0]);
$("#checkAnother").onclick = () => { $("#cameraInput").value = ""; $("#fileInput").value = ""; show("home"); };
function requireReady() {
  if (!selectedHouse) { toast("First pick which house"); return false; }
  if (!selected) { toast("Now pick what this quote is for"); return false; }
  return true;
}

// ---------- pipeline: read -> compare (scoped to account) ----------
async function handleFile(file) {
  show("working");
  $("#workingMsg").textContent = "Reading the quote…";
  try {
    const fd = new FormData(); fd.append("file", file);
    const ext = await api("/api/extract", { method: "POST", body: fd });
    const lines = ext.line_items || [];
    if (!lines.length) { showNoRead(ext); return; }
    $("#workingMsg").textContent = "Checking against the baseline…";
    const invoice = {
      account_number: selected.account_number,
      vendor_name: ext.vendor_name, invoice_number: ext.invoice_number,
      invoice_date: ext.invoice_date,
      property_or_job: selectedHouse ? (selectedHouse.name || selectedHouse.id) : ext.property_or_job,
      customer_po: ext.customer_po, subtotal: ext.subtotal, tax: ext.tax,
      total: ext.total, uploaded_file_path: ext.uploaded_file_path,
      extraction_status: ext.extraction_status,
    };
    const cmp = await api("/api/compare", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoice, line_items: lines }),
    });
    current = { invoiceId: cmp.invoice_id, lines: cmp.line_items, invoice };
    renderResult(cmp.summary, cmp.line_items);
  } catch (e) { toast("Couldn't read that file: " + e.message); show("home"); }
}

function showNoRead(ext) {
  show("result");
  setVerdict("review", "📝", "Needs a Quick Look", null, "We couldn't read the lines automatically. The office can finish it.");
  $("#invMeta").innerHTML = ""; $("#okLine").hidden = true;
  $("#overSummary").hidden = true; $("#invoiceMsgBtns").hidden = true;
  $("#flagList").innerHTML =
    '<div class="flag review"><div class="info"><div class="name">Sent to office</div>' +
    '<div class="detail">Open the dashboard to type the lines in and compare.</div></div></div>' +
    (ext.warnings || []).map((w) => `<div class="flag review"><div class="info"><div class="detail">⚠ ${esc(w)}</div></div></div>`).join("");
}

// ---------- itemized report ----------
function renderResult(summary, lines) {
  show("result");
  const over = lines.filter((l) => l.status === "OVER BASELINE");
  const review = lines.filter((l) => l.status === "NEW ITEM - REVIEW" || l.status === "OCR REVIEW");
  const okCount = summary.ok_count;
  const overTotal = summary.total_potential_overcharge;

  if (over.length > 0) setVerdict("bad", "⚠️", "Check This Quote", money(overTotal),
    `${over.length} item${over.length > 1 ? "s" : ""} priced above your baseline.`);
  else if (review.length > 0) setVerdict("review", "🔎", "Almost There", null,
    `${review.length} item${review.length > 1 ? "s" : ""} not on this account's price list yet.`);
  else setVerdict("good", "✅", "Looks Good", null, `All ${lines.length} items at or below your baseline.`);

  const m = [];
  const inv = current.invoice;
  if (selectedHouse) m.push(`<span>🏠 <b>${esc(selectedHouse.name || selectedHouse.id)}</b></span>`);
  m.push(`<span><b>${esc((selected && (selected.account_number + " · " + selected.account_name)) || "")}</b></span>`);
  if (inv.vendor_name) m.push(`<span>${esc(inv.vendor_name)}</span>`);
  if (inv.invoice_number) m.push(`<span>Quote <b>${esc(inv.invoice_number)}</b></span>`);
  if (summary.total_invoice_amount) m.push(`<span>Total <b>${money(summary.total_invoice_amount)}</b></span>`);
  $("#invMeta").innerHTML = m.join("");

  const okLine = $("#okLine");
  if (okCount > 0 && (over.length || review.length)) { okLine.hidden = false; okLine.textContent = `✅ ${okCount} item${okCount > 1 ? "s" : ""} at/under baseline`; }
  else okLine.hidden = true;

  const list = $("#flagList"); list.innerHTML = "";
  [...over, ...review].forEach((l) => list.appendChild(flagRow(l)));

  const summaryEl = $("#overSummary"), btns = $("#invoiceMsgBtns");
  if (over.length > 0 && overTotal > 0) {
    summaryEl.hidden = false;
    summaryEl.textContent = `Based on these items alone, there's an overcharge of ${money(overTotal)}.`;
    btns.hidden = false;
  } else { summaryEl.hidden = true; btns.hidden = true; }
}

function setVerdict(kind, ico, title, amount, sub) {
  const v = $("#verdict"); v.className = "verdict " + kind;
  $("#verdictIco").textContent = ico; $("#verdictTitle").textContent = title;
  const a = $("#verdictAmount"); if (amount) { a.hidden = false; a.textContent = amount; } else a.hidden = true;
  $("#verdictSub").textContent = sub;
}

function flagRow(l) {
  const over = l.status === "OVER BASELINE";
  const div = document.createElement("div");
  div.className = "flag " + (over ? "over" : "review");
  const detail = over
    ? `Charged ${money(l.unit_price)} · baseline ${money(l.baseline_unit_price)} · qty ${l.quantity ?? "?"}`
    : (l.status === "NEW ITEM - REVIEW" ? "Not on this price list yet" : "Hard to read — please verify");
  div.innerHTML = `
    <div class="dot">${over ? "🔴" : "🟡"}</div>
    <div class="info">
      <div class="name">${esc(l.description || l.item_number || "Item")}</div>
      <div class="detail">${detail}</div>
    </div>
    ${over ? `<div class="over-amt">+${money(l.potential_overcharge)}</div>` : ""}`;
  if (over) {
    const btn = document.createElement("button");
    btn.className = "btn btn-red btn-sm msg-btn"; btn.textContent = "Message";
    btn.onclick = () => openSheet(l); div.appendChild(btn);
  }
  return div;
}

// ---------- messages ----------
function populateSheet(label, msgs, tab) {
  $("#msgFor").textContent = label;
  $("#waBody").value = msgs.whatsapp;
  $("#emailSubject").value = msgs.email.subject;
  $("#emailBody").value = msgs.email.body;
  $("#waSend").href = "https://wa.me/?text=" + encodeURIComponent(msgs.whatsapp);
  $("#emailSend").href = `mailto:?subject=${encodeURIComponent(msgs.email.subject)}&body=${encodeURIComponent(msgs.email.body)}`;
  switchTab(tab || "wa"); $("#msgSheet").hidden = false;
}
async function openSheet(line) {
  try { populateSheet(line.description || line.item_number || "", await api(`/api/line/${line.id}/messages`, { method: "POST" }), "wa"); }
  catch (e) { toast("Error: " + e.message); }
}
async function openInvoiceMessages(tab) {
  if (!current.invoiceId) return;
  try {
    const msgs = await api(`/api/invoices/${current.invoiceId}/messages`, { method: "POST" });
    populateSheet("Quote " + (current.invoice.invoice_number || ""), msgs, tab);
  } catch (e) { toast("Error: " + e.message); }
}
$("#genWhatsapp").onclick = () => openInvoiceMessages("wa");
$("#genEmail").onclick = () => openInvoiceMessages("email");
function switchTab(t) {
  $$(".sheet .tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === t));
  $("#pane-wa").hidden = t !== "wa"; $("#pane-email").hidden = t !== "email";
}
$$(".sheet .tab").forEach((b) => (b.onclick = () => switchTab(b.dataset.tab)));
$("#closeSheet").onclick = () => ($("#msgSheet").hidden = true);
$("#msgSheet").addEventListener("click", (e) => {
  if (e.target.id === "msgSheet") $("#msgSheet").hidden = true;
  const c = e.target.dataset.copy;
  if (c) navigator.clipboard.writeText($("#" + c).value).then(() => toast("Copied"));
});

// ---------- AI status banner ----------
(async () => {
  try {
    const cfg = await api("/api/config");
    const banner = $("#aiBanner");
    if (cfg.ai_extraction_enabled) { banner.className = "ai-banner on"; banner.textContent = "✓ Photo & PDF reading is ON"; }
    else { banner.className = "ai-banner off"; banner.textContent = !cfg.ai_package_installed
      ? "⚠ Reading is OFF — run: pip install -r requirements.txt"
      : "⚠ Reading is OFF — no API key. Set ANTHROPIC_API_KEY, then restart."; }
    banner.hidden = false;
  } catch (e) {}
})();

// Nudge the hero clip to play even when the browser is shy about autoplay
// (iOS low-power, etc.). Until it plays, the goalie poster shows — never a logo.
(function () {
  const hv = document.querySelector(".hero-vid");
  if (!hv) return;
  hv.muted = true;
  const go = () => { const p = hv.play(); if (p && p.catch) p.catch(() => {}); };
  go();
  document.addEventListener("touchstart", go, { once: true, passive: true });
  document.addEventListener("click", go, { once: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) go(); });
})();

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
loadHouses();
loadAccounts();
