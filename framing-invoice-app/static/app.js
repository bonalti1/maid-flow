/* Framing Invoice Review — front-end logic (vanilla JS, no build step).
 *
 * Flow: import baseline -> upload invoice -> /api/extract returns editable
 * structured JSON -> user edits -> /api/compare returns review rows + summary
 * -> per-line actions (approve / keep flagged / update baseline / messages).
 */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

let state = {
  uploadedFilePath: null,
  invoiceId: null,
  lines: [],        // current review rows (after compare)
  invoiceMeta: {},
};

// ---------- helpers ----------
function money(v) {
  if (v === null || v === undefined || v === "") return "";
  return "$" + Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => (t.hidden = true), 3000);
}
async function api(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail || detail; } catch (e) {}
    throw new Error(detail);
  }
  return res.json();
}

// ---------- variance settings ----------
async function loadSettings() {
  try {
    const s = await api("/api/settings");
    $("#variance").value = Number(s.allowed_variance || 0).toFixed(2);
  } catch (e) {}
}
$("#saveVariance").onclick = async () => {
  try {
    await api("/api/settings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowed_variance: parseFloat($("#variance").value || "0") }),
    });
    $("#varianceMsg").textContent = "Saved";
    setTimeout(() => ($("#varianceMsg").textContent = ""), 1500);
    // Re-run comparison if we already have results loaded.
    if (state.lines.length) runCompare();
  } catch (e) { toast("Error: " + e.message); }
};

// ---------- baseline import ----------
$("#baselineFile").onchange = (e) => {
  const f = e.target.files[0];
  if (f) $(".filebtn").textContent = f.name;
};
$("#importBaseline").onclick = async () => {
  const f = $("#baselineFile").files[0];
  if (!f) { toast("Pick a baseline .xlsx first"); return; }
  const fd = new FormData(); fd.append("file", f);
  const pill = $("#baselineStatus");
  pill.className = "status-pill"; pill.textContent = "Importing…";
  try {
    const r = await api("/api/baseline/import", { method: "POST", body: fd });
    pill.className = "status-pill ok"; pill.textContent = `✓ ${r.imported} baseline items loaded`;
  } catch (e) {
    pill.className = "status-pill err"; pill.textContent = "✗ " + e.message;
  }
};
// Show baseline count on load.
(async () => {
  try {
    const r = await api("/api/baseline");
    if (r.items.length) {
      const pill = $("#baselineStatus");
      pill.className = "status-pill ok";
      pill.textContent = `✓ ${r.items.length} baseline items loaded`;
    }
  } catch (e) {}
})();

// ---------- invoice upload + extract ----------
const dz = $("#dropzone");
$("#pickInvoice").onclick = () => $("#invoiceFile").click();
dz.ondragover = (e) => { e.preventDefault(); dz.classList.add("drag"); };
dz.ondragleave = () => dz.classList.remove("drag");
dz.ondrop = (e) => {
  e.preventDefault(); dz.classList.remove("drag");
  if (e.dataTransfer.files[0]) handleInvoiceFile(e.dataTransfer.files[0]);
};
$("#invoiceFile").onchange = (e) => { if (e.target.files[0]) handleInvoiceFile(e.target.files[0]); };

async function handleInvoiceFile(file) {
  $("#invoiceFileName").textContent = "Extracting " + file.name + "…";
  const fd = new FormData(); fd.append("file", file);
  try {
    const data = await api("/api/extract", { method: "POST", body: fd });
    state.uploadedFilePath = data.uploaded_file_path;
    $("#invoiceFileName").textContent = file.name + " · status: " + (data.extraction_status || "");
    fillExtraction(data);
  } catch (e) {
    $("#invoiceFileName").textContent = "";
    toast("Extraction failed: " + e.message);
  }
}

function fillExtraction(data) {
  $("#m_vendor").value = data.vendor_name || "";
  $("#m_invoice").value = data.invoice_number || "";
  $("#m_date").value = data.invoice_date || "";
  $("#m_job").value = data.property_or_job || "";
  $("#m_po").value = data.customer_po || "";
  $("#m_subtotal").value = data.subtotal ?? "";
  $("#m_tax").value = data.tax ?? "";
  $("#m_total").value = data.total ?? "";

  const tbody = $("#extractTable tbody");
  tbody.innerHTML = "";
  (data.line_items || []).forEach(addExtractRow);
  if (!(data.line_items || []).length) addExtractRow({});

  const warns = $("#extractWarnings");
  warns.innerHTML = "";
  (data.warnings || []).forEach((w) => {
    const d = document.createElement("div"); d.className = "warn"; d.textContent = "⚠ " + w;
    warns.appendChild(d);
  });
  $("#extractSection").hidden = false;
  $("#extractSection").scrollIntoView({ behavior: "smooth" });
}

function addExtractRow(li) {
  const tbody = $("#extractTable tbody");
  const tr = document.createElement("tr");
  const fields = [
    ["item_number", li.item_number ?? ""],
    ["description", li.description ?? ""],
    ["quantity", li.quantity ?? ""],
    ["unit_measure", li.unit_measure ?? ""],
    ["unit_price", li.unit_price ?? ""],
    ["line_amount", li.line_amount ?? ""],
    ["category", li.category ?? ""],
  ];
  fields.forEach(([k, v]) => {
    const td = document.createElement("td");
    if (k === "description") td.className = "desc";
    const inp = document.createElement("input");
    inp.value = v; inp.dataset.field = k;
    if (["quantity", "unit_price", "line_amount"].includes(k)) inp.type = "number";
    inp.dataset.conf = li.extract_confidence ?? 1;
    td.appendChild(inp); tr.appendChild(td);
  });
  const tdDel = document.createElement("td");
  const del = document.createElement("button");
  del.className = "del-row"; del.textContent = "×"; del.title = "Remove line";
  del.onclick = () => tr.remove();
  tdDel.appendChild(del); tr.appendChild(tdDel);
  tbody.appendChild(tr);
}
$("#addRow").onclick = () => addExtractRow({});

function collectExtraction() {
  const invoice = {
    vendor_name: $("#m_vendor").value || null,
    invoice_number: $("#m_invoice").value || null,
    invoice_date: $("#m_date").value || null,
    property_or_job: $("#m_job").value || null,
    customer_po: $("#m_po").value || null,
    subtotal: $("#m_subtotal").value || null,
    tax: $("#m_tax").value || null,
    total: $("#m_total").value || null,
    uploaded_file_path: state.uploadedFilePath,
    extraction_status: "reviewed",
  };
  const line_items = [];
  $$("#extractTable tbody tr").forEach((tr) => {
    const rec = {};
    tr.querySelectorAll("input").forEach((inp) => {
      rec[inp.dataset.field] = inp.value === "" ? null : inp.value;
      rec.extract_confidence = inp.dataset.conf;
    });
    if (rec.description || rec.item_number || rec.unit_price) line_items.push(rec);
  });
  return { invoice, line_items };
}

// ---------- compare ----------
$("#runCompare").onclick = runCompare;
async function runCompare() {
  const payload = collectExtraction();
  if (!payload.line_items.length) { toast("Add at least one line item"); return; }
  try {
    const r = await api("/api/compare", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    state.invoiceId = r.invoice_id;
    state.lines = r.line_items;
    state.invoiceMeta = payload.invoice;
    renderSummary(r.summary);
    renderReview(r.line_items);
    $("#exportCsv").href = `/api/invoices/${r.invoice_id}/export?fmt=csv`;
    $("#exportXlsx").href = `/api/invoices/${r.invoice_id}/export?fmt=xlsx`;
    $("#reviewSection").scrollIntoView({ behavior: "smooth" });
  } catch (e) { toast("Compare failed: " + e.message); }
}

function renderSummary(s) {
  $("#summarySection").hidden = false;
  $("#s_total").textContent = money(s.total_invoice_amount);
  $("#s_checked").textContent = money(s.total_amount_checked);
  $("#s_over").textContent = money(s.total_potential_overcharge);
  $("#s_ok").textContent = s.ok_count;
  $("#s_overc").textContent = s.over_count;
  $("#s_review").textContent = s.review_count;
}

const STATUS_CLASS = {
  "OK": "ok", "OVER BASELINE": "over", "NEW ITEM - REVIEW": "new", "OCR REVIEW": "ocr",
};
function renderReview(lines) {
  $("#reviewSection").hidden = false;
  const tbody = $("#reviewTable tbody");
  tbody.innerHTML = "";
  lines.forEach((l) => tbody.appendChild(reviewRow(l)));
}

function reviewRow(l) {
  const cls = STATUS_CLASS[l.status] || "ocr";
  const tr = document.createElement("tr");
  tr.className = "s-" + cls;
  tr.dataset.lineId = l.id;
  const over = l.potential_overcharge > 0;
  tr.innerHTML = `
    <td><span class="badge ${cls}">${l.status}</span></td>
    <td>${l.item_number || ""}</td>
    <td>${l.description || ""}</td>
    <td>${l.quantity ?? ""}</td>
    <td>${money(l.unit_price)}</td>
    <td>${l.baseline_unit_price != null ? money(l.baseline_unit_price) : "—"}</td>
    <td>${l.difference_per_unit != null ? money(l.difference_per_unit) : "—"}</td>
    <td class="${over ? "money-over" : ""}">${money(l.potential_overcharge)}</td>
    <td>${Math.round((l.confidence_score ?? 1) * 100)}%</td>
    <td class="small">${l.notes || ""}</td>
    <td></td>`;
  tr.lastElementChild.appendChild(rowActions(l));
  return tr;
}

function rowActions(l) {
  const wrap = document.createElement("div");
  wrap.className = "line-actions";
  const flagged = l.status !== "OK";
  const mkBtn = (label, cls, fn) => {
    const b = document.createElement("button");
    b.className = "btn btn-sm " + (cls || "btn-ghost");
    b.textContent = label; b.onclick = fn; return b;
  };
  if (flagged) {
    wrap.appendChild(mkBtn("Approve", "btn-primary", () => openApprove(l)));
    wrap.appendChild(mkBtn("Add/update baseline", "", () => approve(l.id, "update_baseline")));
    wrap.appendChild(mkBtn("Message", "btn-warn", () => openMessages(l.id)));
  } else {
    wrap.appendChild(mkBtn("Keep flagged", "", () => approve(l.id, "keep_flagged")));
  }
  return wrap;
}

// ---------- approval ----------
let pendingApprove = null;
function openApprove(l) {
  pendingApprove = l;
  $("#approveDesc").textContent =
    `${l.description || l.item_number}: invoice ${money(l.unit_price)} vs baseline ${money(l.baseline_unit_price)}.`;
  $("#approveModal").hidden = false;
}
$("#approveModal").addEventListener("click", (e) => {
  const action = e.target.dataset.action;
  if (!action) return;
  if (action === "cancel") { $("#approveModal").hidden = true; return; }
  if (pendingApprove) approve(pendingApprove.id, action);
  $("#approveModal").hidden = true;
});

async function approve(lineId, action) {
  try {
    const r = await api(`/api/line/${lineId}/approve`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    toast(action === "update_baseline"
      ? "Approved & baseline updated for future invoices"
      : action === "keep_flagged" ? "Kept flagged" : "Approved this line");
    // Refresh the invoice view to reflect new statuses/overcharge.
    await refreshInvoice();
    if (r.baseline_updated) {
      const pill = $("#baselineStatus"); // refresh baseline count
      const b = await api("/api/baseline");
      pill.className = "status-pill ok";
      pill.textContent = `✓ ${b.items.length} baseline items loaded`;
    }
  } catch (e) { toast("Error: " + e.message); }
}

async function refreshInvoice() {
  if (!state.invoiceId) return;
  const r = await api(`/api/invoices/${state.invoiceId}`);
  state.lines = r.line_items;
  state.invoiceMeta = r.invoice;
  renderReview(r.line_items);
  // Recompute summary client-side from saved lines.
  let s = { total_invoice_amount: 0, total_amount_checked: 0, total_potential_overcharge: 0,
            ok_count: 0, over_count: 0, review_count: 0 };
  r.line_items.forEach((l) => {
    if (l.line_amount != null) s.total_invoice_amount += l.line_amount;
    if (l.baseline_unit_price != null && l.line_amount != null) s.total_amount_checked += l.line_amount;
    s.total_potential_overcharge += l.potential_overcharge || 0;
    if (l.status === "OK") s.ok_count++;
    else if (l.status === "OVER BASELINE") s.over_count++;
    else s.review_count++;
  });
  renderSummary(s);
}

// ---------- messages ----------
let msgData = null;
async function openMessages(lineId) {
  try {
    msgData = await api(`/api/line/${lineId}/messages`, { method: "POST" });
    const line = state.lines.find((l) => l.id === lineId) || {};
    $("#waBody").value = msgData.whatsapp;
    $("#emailSubject").value = msgData.email.subject;
    $("#emailBody").value = msgData.email.body;
    // wa.me + mailto convenience links
    $("#waLink").href = "https://wa.me/?text=" + encodeURIComponent(msgData.whatsapp);
    const mailto = `mailto:?subject=${encodeURIComponent(msgData.email.subject)}&body=${encodeURIComponent(msgData.email.body)}`;
    $("#emailLink").href = mailto;
    switchTab("wa");
    $("#msgModal").hidden = false;
  } catch (e) { toast("Error: " + e.message); }
}
function switchTab(which) {
  $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === which));
  $("#tab-wa").hidden = which !== "wa";
  $("#tab-email").hidden = which !== "email";
}
$$(".tab").forEach((t) => (t.onclick = () => switchTab(t.dataset.tab)));
$("#msgModal").addEventListener("click", (e) => {
  if (e.target.dataset.action === "closeMsg") $("#msgModal").hidden = true;
  const copyTarget = e.target.dataset.copy;
  if (copyTarget) {
    navigator.clipboard.writeText($("#" + copyTarget).value).then(() => toast("Copied"));
  }
});

// ---------- init ----------
loadSettings();
