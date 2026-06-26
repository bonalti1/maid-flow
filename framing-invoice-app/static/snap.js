/* Quote Check v2 — pick a chart-of-account, upload the quote, approve vs budget.
 *
 * Flow: choose account (dropdown) -> upload/photo -> /api/extract reads the
 * amount -> /api/quote-check compares it to the account's budget -> report.
 */
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

let accounts = [];          // chart of accounts
let selected = null;        // currently selected account object
let last = null;            // last quote-check result (for re-check / edit)
let lastExtract = null;     // last extraction meta (vendor, quote #, etc.)

function money(v) {
  if (v === null || v === undefined || v === "") return "—";
  return "$" + Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function toast(m) {
  const t = $("#toast"); t.textContent = m; t.hidden = false;
  clearTimeout(t._t); t._t = setTimeout(() => (t.hidden = true), 2800);
}
function show(screen) {
  ["home", "working", "result"].forEach((s) => ($("#screen-" + s).hidden = s !== screen));
  window.scrollTo(0, 0);
}
async function api(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) { let d = r.statusText; try { d = (await r.json()).detail || d; } catch (e) {} throw new Error(d); }
  return r.json();
}

// ---------- load accounts into the dropdown (grouped by phase) ----------
async function loadAccounts() {
  try {
    const data = await api("/api/coa");
    accounts = data.accounts || [];
    const sel = $("#accountSelect");
    sel.innerHTML = '<option value="">Choose an account…</option>';
    const byPhase = {};
    accounts.forEach((a) => {
      const p = a.department || "Other";
      (byPhase[p] = byPhase[p] || []).push(a);
    });
    Object.keys(byPhase).forEach((phase) => {
      const og = document.createElement("optgroup");
      og.label = phase;
      byPhase[phase].forEach((a) => {
        const o = document.createElement("option");
        o.value = a.account_number;
        o.textContent = (a.account_number ? a.account_number + " · " : "") + a.account_name +
          (a.budget != null ? "  (budget " + money(a.budget) + ")" : "");
        og.appendChild(o);
      });
      sel.appendChild(og);
    });
  } catch (e) { /* dropdown stays empty */ }
}

$("#accountSelect").onchange = () => {
  const num = $("#accountSelect").value;
  selected = accounts.find((a) => String(a.account_number) === String(num)) || null;
  renderBudget();
};

function renderBudget() {
  const row = $("#budgetRow"), edit = $("#budgetEdit");
  edit.hidden = true;
  if (!selected) { row.hidden = true; return; }
  row.hidden = false;
  if (selected.budget != null) {
    $("#budgetVal").textContent = money(selected.budget);
    $("#editBudget").textContent = "edit";
  } else {
    $("#budgetVal").textContent = "none yet";
    $("#editBudget").textContent = "set budget";
  }
}

$("#editBudget").onclick = () => {
  $("#budgetRow").hidden = true;
  $("#budgetEdit").hidden = false;
  $("#budgetInput").value = selected && selected.budget != null ? selected.budget : "";
  $("#budgetInput").focus();
};
$("#cancelBudget").onclick = () => renderBudget();
$("#saveBudget").onclick = async () => {
  if (!selected) return;
  const v = $("#budgetInput").value;
  try {
    const r = await api("/api/coa/budget", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_number: selected.account_number, budget: v === "" ? null : parseFloat(v) }),
    });
    selected.budget = r.budget;
    // reflect in the dropdown label too
    loadAccounts().then(() => { $("#accountSelect").value = selected.account_number; });
    renderBudget();
    toast("Budget saved");
  } catch (e) { toast("Error: " + e.message); }
};

// ---------- file pickers ----------
$("#takePhoto").onclick = () => requireAccount() && $("#cameraInput").click();
$("#uploadFile").onclick = () => requireAccount() && $("#fileInput").click();
$("#cameraInput").onchange = (e) => e.target.files[0] && handleFile(e.target.files[0]);
$("#fileInput").onchange = (e) => e.target.files[0] && handleFile(e.target.files[0]);
$("#checkAnother").onclick = () => { resetInputs(); show("home"); };
function resetInputs() { $("#cameraInput").value = ""; $("#fileInput").value = ""; }
function requireAccount() {
  if (!selected) { toast("First pick what this quote is for"); return false; }
  return true;
}

// ---------- the pipeline: read -> check vs budget ----------
async function handleFile(file) {
  show("working");
  $("#workingMsg").textContent = "Reading the quote…";
  try {
    const fd = new FormData(); fd.append("file", file);
    const ext = await api("/api/extract", { method: "POST", body: fd });
    lastExtract = ext;
    // amount = printed total, else sum of line amounts
    let amount = ext.total;
    if (amount == null) {
      const sum = (ext.line_items || []).reduce((s, l) => s + (Number(l.line_amount) || 0), 0);
      amount = sum > 0 ? Math.round(sum * 100) / 100 : null;
    }
    await runCheck(amount, null);
  } catch (e) {
    toast("Couldn't read that file: " + e.message);
    show("home");
  }
}

async function runCheck(amount, quoteCheckId) {
  const body = {
    account_number: selected.account_number,
    amount: amount,
    quote_check_id: quoteCheckId,
    vendor_name: lastExtract && lastExtract.vendor_name,
    quote_number: lastExtract && lastExtract.invoice_number,
    quote_date: lastExtract && lastExtract.invoice_date,
    property_or_job: lastExtract && lastExtract.property_or_job,
    doc_type: "quote",
    uploaded_file_path: lastExtract && lastExtract.uploaded_file_path,
  };
  const r = await api("/api/quote-check", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  last = r;
  renderResult(r);
}

// ---------- verdict + report ----------
const VERDICTS = {
  "APPROVED":    { cls: "good",   ico: "✅", title: "Approved" },
  "OVER BUDGET": { cls: "bad",    ico: "⚠️", title: "Over Budget" },
  "LOGGED":      { cls: "review", ico: "📋", title: "Logged" },
  "NEEDS AMOUNT":{ cls: "review", ico: "✏️", title: "Enter the Amount" },
};
function renderResult(r) {
  show("result");
  const v = VERDICTS[r.status] || VERDICTS["LOGGED"];
  const verdict = $("#verdict");
  verdict.className = "verdict " + v.cls;
  $("#verdictIco").textContent = v.ico;
  $("#verdictTitle").textContent = v.title;
  const amt = $("#verdictAmount");
  if (r.amount != null) { amt.hidden = false; amt.textContent = money(r.amount); } else amt.hidden = true;

  let sub = "";
  if (r.status === "APPROVED") sub = `${money(r.over_under)} under budget. Good to go.`;
  else if (r.status === "OVER BUDGET") sub = `${money(Math.abs(r.over_under))} over the ${money(r.budget)} budget.`;
  else if (r.status === "LOGGED") sub = "No budget set for this account yet — logged to build the baseline.";
  else sub = "We couldn't read the amount — type it below and re-check.";
  $("#verdictSub").textContent = sub;

  $("#r_account").textContent = (r.account_number ? r.account_number + " · " : "") + (r.account_name || "");
  $("#r_phase").textContent = r.department || "—";
  $("#r_vendor").textContent = (lastExtract && lastExtract.vendor_name) || "—";
  $("#r_qnum").textContent = (lastExtract && lastExtract.invoice_number) || "—";
  $("#r_amount").textContent = money(r.amount);
  $("#r_budget").textContent = money(r.budget);
  const ou = $("#r_overunder"), oul = $("#r_oulabel");
  if (r.over_under == null) { ou.textContent = "—"; oul.textContent = "Over / under"; ou.className = ""; }
  else if (r.over_under >= 0) { ou.textContent = money(r.over_under); oul.textContent = "Under budget"; ou.className = "good-amt"; }
  else { ou.textContent = money(Math.abs(r.over_under)); oul.textContent = "Over budget"; ou.className = "over-amt"; }
  $("#r_baseline").textContent = r.baseline_low != null
    ? `${money(r.baseline_low)} (seen ${r.times_seen}x)` : "first one";

  $("#amountFix").value = r.amount != null ? r.amount : "";
}

$("#recheck").onclick = async () => {
  const v = $("#amountFix").value;
  if (v === "") { toast("Type the amount"); return; }
  try { await runCheck(parseFloat(v), last && last.quote_check_id); }
  catch (e) { toast("Error: " + e.message); }
};

// ---------- AI reading status banner ----------
(async () => {
  try {
    const cfg = await api("/api/config");
    const banner = $("#aiBanner");
    if (cfg.ai_extraction_enabled) { banner.className = "ai-banner on"; banner.textContent = "✓ Photo & PDF reading is ON"; }
    else {
      banner.className = "ai-banner off";
      banner.textContent = !cfg.ai_package_installed
        ? "⚠ Reading is OFF — run: pip install -r requirements.txt"
        : "⚠ Reading is OFF — no API key. Set ANTHROPIC_API_KEY, then restart.";
    }
    banner.hidden = false;
  } catch (e) {}
})();

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

loadAccounts();
