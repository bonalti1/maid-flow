/* Office / CFO dashboard — KPIs, invoices, spend by account, vendor scorecard. */
const $ = (s) => document.querySelector(s);
function money(v) {
  return "$" + Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function esc(s) { return String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

async function load() {
  let d;
  try { d = await (await fetch("/api/dashboard")).json(); }
  catch (e) { return; }

  // KPIs
  const k = d.kpis;
  $("#kpis").innerHTML = `
    <div class="kpi card"><div class="num">${k.invoice_count}</div><div class="lbl">Invoices checked</div></div>
    <div class="kpi card"><div class="num">${money(k.total_spend)}</div><div class="lbl">Total checked spend</div></div>
    <div class="kpi over card"><div class="num">${money(k.total_overcharge)}</div><div class="lbl">Overcharges caught</div></div>
    <div class="kpi pending card"><div class="num">${k.pending_review}</div><div class="lbl">Lines pending review</div></div>`;

  // Invoices
  const wrap = $("#invoicesWrap");
  if (!d.invoices.length) {
    wrap.innerHTML = '<div class="empty">No invoices yet. <a href="/">Check your first invoice →</a></div>';
  } else {
    let rows = d.invoices.map((i) => {
      let pill = '<span class="pill ok">OK</span>';
      if (i.over_lines > 0) pill = `<span class="pill over">${i.over_lines} over</span>`;
      else if (i.review_lines > 0) pill = `<span class="pill review">${i.review_lines} review</span>`;
      return `<tr>
        <td>${pill}</td>
        <td>${esc(i.vendor_name) || "—"}</td>
        <td>${esc(i.invoice_number) || "—"}</td>
        <td>${esc(i.invoice_date) || "—"}</td>
        <td>${esc(i.property_or_job) || "—"}</td>
        <td>${money(i.checked_total)}</td>
        <td class="${i.overcharge > 0 ? "over-amt" : ""}">${i.overcharge > 0 ? money(i.overcharge) : "—"}</td>
        <td class="row-actions">
          <a class="btn btn-sm btn-ghost" href="/api/invoices/${i.id}/export?fmt=xlsx">Excel</a>
          <a class="btn btn-sm btn-ghost" href="/api/invoices/${i.id}/export?fmt=csv">CSV</a>
        </td></tr>`;
    }).join("");
    wrap.innerHTML = `<table class="tbl"><thead><tr>
      <th>Status</th><th>Vendor</th><th>Invoice #</th><th>Date</th><th>Job / Property</th>
      <th>Checked</th><th>Overcharge</th><th>Export</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  // Spend by Department
  const deps = d.by_department || [];
  const maxDep = Math.max(1, ...deps.map((x) => x.spend));
  $("#byDepartment").innerHTML = deps.length ? `<table class="tbl"><thead><tr>
      <th>Department</th><th>Spend</th><th>Overcharge</th></tr></thead><tbody>` +
    deps.map((x) => `<tr>
      <td><div class="bar-wrap"><span class="bar" style="width:${Math.max(8,(x.spend/maxDep)*120)}px"></span>${esc(x.department)}</div></td>
      <td>${money(x.spend)}</td>
      <td class="${x.overcharge>0?"over-amt":""}">${x.overcharge>0?money(x.overcharge):"—"}</td>
    </tr>`).join("") + "</tbody></table>"
    : '<div class="empty">No data yet.</div>';

  // Spend by GL Account
  const accts = d.by_account || [];
  $("#byAccount").innerHTML = accts.length ? `<table class="tbl"><thead><tr>
      <th>Account</th><th>Spend</th><th>Overcharge</th></tr></thead><tbody>` +
    accts.map((x) => `<tr>
      <td>${esc(x.gl_account)}${x.account_name?" · "+esc(x.account_name):""}</td>
      <td>${money(x.spend)}</td>
      <td class="${x.overcharge>0?"over-amt":""}">${x.overcharge>0?money(x.overcharge):"—"}</td>
    </tr>`).join("") + "</tbody></table>"
    : '<div class="empty">Import your chart of accounts to code spend by account.</div>';

  // Spend by account (bar)
  const cats = d.by_category;
  const maxSpend = Math.max(1, ...cats.map((c) => c.spend));
  $("#byCategory").innerHTML = cats.length ? `<table class="tbl"><thead><tr>
      <th>Account / Category</th><th>Spend</th><th>Overcharge</th></tr></thead><tbody>` +
    cats.map((c) => `<tr>
      <td><div class="bar-wrap"><span class="bar" style="width:${Math.max(8, (c.spend / maxSpend) * 120)}px"></span>${esc(c.category)}</div></td>
      <td>${money(c.spend)}</td>
      <td class="${c.overcharge > 0 ? "over-amt" : ""}">${c.overcharge > 0 ? money(c.overcharge) : "—"}</td>
    </tr>`).join("") + "</tbody></table>"
    : '<div class="empty">No data yet.</div>';

  // Vendor scorecard
  const vs = d.by_vendor;
  $("#byVendor").innerHTML = vs.length ? `<table class="tbl"><thead><tr>
      <th>Vendor</th><th>Invoices</th><th>Spend</th><th>Overcharge</th></tr></thead><tbody>` +
    vs.map((v) => `<tr>
      <td>${esc(v.vendor)}</td><td>${v.invoices}</td><td>${money(v.spend)}</td>
      <td class="${v.overcharge > 0 ? "over-amt" : ""}">${v.overcharge > 0 ? money(v.overcharge) : "—"}</td>
    </tr>`).join("") + "</tbody></table>"
    : '<div class="empty">No data yet.</div>';
}
// --- Chart of Accounts import ---
async function loadCoaStatus() {
  try {
    const r = await (await fetch("/api/coa")).json();
    const el = document.querySelector("#coaStatus");
    if (el) el.textContent = r.accounts.length
      ? `✓ ${r.accounts.length} accounts · ${r.departments.length} departments`
      : "Not imported yet";
  } catch (e) {}
}
const coaFile = document.querySelector("#coaFile");
if (coaFile) {
  coaFile.onchange = (e) => {
    const f = e.target.files[0];
    if (f) document.querySelector("#coaFile").parentElement.lastChild.textContent = " " + f.name;
  };
  document.querySelector("#importCoa").onclick = async () => {
    const f = coaFile.files[0];
    if (!f) { toast("Pick a chart of accounts file first"); return; }
    const fd = new FormData(); fd.append("file", f);
    try {
      const r = await (await fetch("/api/coa/import", { method: "POST", body: fd })).json();
      if (r.detail) throw new Error(r.detail);
      toast(`Imported ${r.imported} accounts`);
      loadCoaStatus(); load();
    } catch (e) { toast("Error: " + (e.message || e)); }
  };
}
function toast(m) {
  const t = document.querySelector("#toast");
  if (!t) return alert(m);
  t.textContent = m; t.hidden = false;
  clearTimeout(t._t); t._t = setTimeout(() => (t.hidden = true), 2600);
}

loadCoaStatus();
load();
