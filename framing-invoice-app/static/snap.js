/* Snap & Check — the one-action worker flow.
 *
 * Flow: pick/take photo -> /api/extract -> /api/compare (auto, no manual edit)
 * -> show a plain-English verdict (green / red / amber) with one-tap vendor
 * messages on each flagged line.
 */
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

let current = { invoiceId: null, lines: [], invoice: {} };

function money(v) {
  if (v === null || v === undefined || v === "") return "$0.00";
  return "$" + Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function toast(m) {
  const t = $("#toast"); t.textContent = m; t.hidden = false;
  clearTimeout(t._t); t._t = setTimeout(() => (t.hidden = true), 2600);
}
function show(screen) {
  ["home", "working", "result"].forEach((s) => ($("#screen-" + s).hidden = s !== screen));
  window.scrollTo(0, 0);
}
async function api(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) {
    let d = r.statusText; try { d = (await r.json()).detail || d; } catch (e) {}
    throw new Error(d);
  }
  return r.json();
}

// --- file pickers ---
$("#takePhoto").onclick = () => $("#cameraInput").click();
$("#uploadFile").onclick = () => $("#fileInput").click();
$("#cameraInput").onchange = (e) => e.target.files[0] && handleFile(e.target.files[0]);
$("#fileInput").onchange = (e) => e.target.files[0] && handleFile(e.target.files[0]);
$("#checkAnother").onclick = () => { resetInputs(); show("home"); };
function resetInputs() { $("#cameraInput").value = ""; $("#fileInput").value = ""; }

// --- the whole pipeline in one shot ---
async function handleFile(file) {
  show("working");
  $("#workingMsg").textContent = "Reading your invoice…";
  try {
    const fd = new FormData(); fd.append("file", file);
    const ext = await api("/api/extract", { method: "POST", body: fd });

    $("#workingMsg").textContent = "Checking prices against your baseline…";
    const invoice = {
      vendor_name: ext.vendor_name, invoice_number: ext.invoice_number,
      invoice_date: ext.invoice_date, property_or_job: ext.property_or_job,
      customer_po: ext.customer_po, subtotal: ext.subtotal, tax: ext.tax,
      total: ext.total, uploaded_file_path: ext.uploaded_file_path,
      extraction_status: ext.extraction_status,
    };
    const line_items = ext.line_items || [];

    if (!line_items.length) {
      // Nothing readable — route to office for manual entry.
      return showNoRead(ext);
    }
    const cmp = await api("/api/compare", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoice, line_items }),
    });
    current = { invoiceId: cmp.invoice_id, lines: cmp.line_items, invoice };
    renderResult(cmp.summary, cmp.line_items, invoice, ext);
  } catch (e) {
    toast("Couldn't read that file: " + e.message);
    show("home");
  }
}

function showNoRead(ext) {
  show("result");
  setVerdict("review", "📝", "Needs a Quick Look",
    null, "We couldn't read the lines automatically. The office can finish it.");
  $("#invMeta").innerHTML = "";
  $("#okLine").hidden = true;
  // Show the actual reason(s) so it's clear how to fix it.
  const reasons = (ext.warnings || []).map((w) =>
    `<div class="flag review"><div class="info"><div class="detail">⚠ ${esc(w)}</div></div></div>`
  ).join("");
  $("#flagList").innerHTML =
    '<div class="flag review"><div class="info"><div class="name">Sent to office</div>' +
    '<div class="detail">Open the dashboard to type the lines in and compare.</div></div></div>' +
    reasons;
}

// --- render the verdict ---
function renderResult(summary, lines, invoice, ext) {
  show("result");
  const over = lines.filter((l) => l.status === "OVER BASELINE");
  const review = lines.filter((l) => l.status === "NEW ITEM - REVIEW" || l.status === "OCR REVIEW");
  const okCount = summary.ok_count;
  const overTotal = summary.total_potential_overcharge;

  if (over.length > 0) {
    setVerdict("bad", "⚠️", "Check This Invoice", money(overTotal),
      `${over.length} item${over.length > 1 ? "s" : ""} cost more than your usual price.`);
  } else if (review.length > 0) {
    setVerdict("review", "🔎", "Almost There", null,
      `${review.length} item${review.length > 1 ? "s" : ""} need${review.length === 1 ? "s" : ""} a quick check. The rest look good.`);
  } else {
    setVerdict("good", "✅", "Looks Good", null,
      `All ${lines.length} items match your prices. Safe to pay.`);
  }

  // invoice meta line
  const m = [];
  if (invoice.vendor_name) m.push(`<span><b>${esc(invoice.vendor_name)}</b></span>`);
  if (invoice.invoice_number) m.push(`<span>Invoice <b>${esc(invoice.invoice_number)}</b></span>`);
  if (invoice.invoice_date) m.push(`<span><b>${esc(invoice.invoice_date)}</b></span>`);
  if (summary.total_invoice_amount) m.push(`<span>Total <b>${money(summary.total_invoice_amount)}</b></span>`);
  $("#invMeta").innerHTML = m.join("");

  // good count line
  const okLine = $("#okLine");
  if (okCount > 0 && (over.length || review.length)) {
    okLine.hidden = false;
    okLine.textContent = `✅ ${okCount} item${okCount > 1 ? "s" : ""} priced correctly`;
  } else okLine.hidden = true;

  // flagged list
  const list = $("#flagList");
  list.innerHTML = "";
  [...over, ...review].forEach((l) => list.appendChild(flagRow(l)));
}

function setVerdict(kind, ico, title, amount, sub) {
  const v = $("#verdict");
  v.className = "verdict " + kind;
  $("#verdictIco").textContent = ico;
  $("#verdictTitle").textContent = title;
  const a = $("#verdictAmount");
  if (amount) { a.hidden = false; a.textContent = amount; } else a.hidden = true;
  $("#verdictSub").textContent = sub;
}

function flagRow(l) {
  const over = l.status === "OVER BASELINE";
  const div = document.createElement("div");
  div.className = "flag " + (over ? "over" : "review");
  const detail = over
    ? `Charged ${money(l.unit_price)} · usual ${money(l.baseline_unit_price)} · qty ${l.quantity ?? "?"}`
    : (l.status === "NEW ITEM - REVIEW" ? "Not on your price list yet" : "Hard to read — please verify");
  div.innerHTML = `
    <div class="dot">${over ? "🔴" : "🟡"}</div>
    <div class="info">
      <div class="name">${esc(l.description || l.item_number || "Item")}</div>
      <div class="detail">${detail}</div>
    </div>
    ${over ? `<div class="over-amt">+${money(l.potential_overcharge)}</div>` : ""}`;
  const btn = document.createElement("button");
  btn.className = "btn btn-red btn-sm msg-btn";
  btn.textContent = "Message";
  btn.onclick = () => openSheet(l);
  div.appendChild(btn);
  return div;
}

function esc(s) { return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

// --- message bottom sheet ---
async function openSheet(line) {
  try {
    const msgs = await api(`/api/line/${line.id}/messages`, { method: "POST" });
    $("#msgFor").textContent = line.description || line.item_number || "";
    $("#waBody").value = msgs.whatsapp;
    $("#emailSubject").value = msgs.email.subject;
    $("#emailBody").value = msgs.email.body;
    $("#waSend").href = "https://wa.me/?text=" + encodeURIComponent(msgs.whatsapp);
    $("#emailSend").href = `mailto:?subject=${encodeURIComponent(msgs.email.subject)}&body=${encodeURIComponent(msgs.email.body)}`;
    switchTab("wa");
    $("#msgSheet").hidden = false;
  } catch (e) { toast("Error: " + e.message); }
}
function switchTab(t) {
  $$(".sheet .tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === t));
  $("#pane-wa").hidden = t !== "wa";
  $("#pane-email").hidden = t !== "email";
}
$$(".sheet .tab").forEach((b) => (b.onclick = () => switchTab(b.dataset.tab)));
$("#closeSheet").onclick = () => ($("#msgSheet").hidden = true);
$("#msgSheet").addEventListener("click", (e) => {
  if (e.target.id === "msgSheet") $("#msgSheet").hidden = true;
  const c = e.target.dataset.copy;
  if (c) navigator.clipboard.writeText($("#" + c).value).then(() => toast("Copied"));
});

// Show whether AI reading is actually on (helps confirm the key took effect).
(async () => {
  try {
    const cfg = await api("/api/config");
    const banner = $("#aiBanner");
    if (!banner) return;
    if (cfg.ai_extraction_enabled) {
      banner.className = "ai-banner on";
      banner.textContent = "✓ Photo & PDF reading is ON";
    } else {
      banner.className = "ai-banner off";
      banner.textContent = !cfg.ai_package_installed
        ? "⚠ Reading is OFF — run: pip install -r requirements.txt"
        : "⚠ Reading is OFF — no API key. Set ANTHROPIC_API_KEY, then restart the app.";
    }
    banner.hidden = false;
  } catch (e) {}
})();

// register service worker for Add-to-Home-Screen
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
