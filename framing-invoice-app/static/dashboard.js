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
load();
