// Maid Flow — golden-flow regression suite. Boots the server in-process and
// asserts the flows that must never break. Run before every commit:
//   node scripts/regression.mjs   (exit 0 = all green)
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
process.env.PORT = process.env.PORT || "8999";
process.env.ADMIN_KEY = "regadmin";
process.env.CLOSER_KEY = "regcloser";
process.env.CS_KEY = "regcs";
process.env.DEMO_PASS = "regpass";
process.env.HL_WEBHOOK_SECRET = "regsecret";
process.env.STRIPE_WEBHOOK_SECRET = "regwh";
const { createHmac } = await import("node:crypto");
// fresh file store each run
process.env.DATABASE_URL = "";
try { (await import("node:fs")).rmSync(path.join(ROOT, "server", "data", "store.json")); } catch { /* ok */ }

const db = await import(path.join(ROOT, "server", "db.mjs"));
const pricing = await import(path.join(ROOT, "server", "pricing.mjs"));
const templates = await import(path.join(ROOT, "server", "templates.mjs"));
await import(path.join(ROOT, "server", "index.mjs"));
await new Promise((r) => setTimeout(r, 1500));

const B = `http://localhost:${process.env.PORT}`;
let pass = 0, fail = 0;
const results = [];
function check(name, ok, detail = "") { (ok ? pass++ : fail++); results.push(`${ok ? "✓" : "✗"} ${name}${ok || !detail ? "" : "  → " + detail}`); }
const J = (path, opts) => fetch(B + path, opts).then((r) => r.json());

// 1. Pricing engine acceptance (the contract that must never drift)
{
  const q = pricing.quote({ sqft: 2200, beds: 4, baths: 2, cleaningType: "deep", condition: "normal", pets: "heavy", addOns: ["fridge", "oven"] });
  check("pricing acceptance 555/[485,620]/{2,1,3}",
    q.recommended === 555 && q.range[0] === 485 && q.range[1] === 620 && q.time.cleaners === 2 && q.time.low === 1 && q.time.high === 3,
    JSON.stringify({ r: q.recommended, range: q.range, t: q.time }));
}
// 2. mergeRates rejects garbage (no NaN/negative)
{
  const bad = pricing.mergeRates({ RATE: { regular: { perSqft: NaN, min: "x" } }, FREQ_DISCOUNT: { weekly: 5 } });
  const q = pricing.quote({ sqft: 2000, beds: 3, baths: 2, cleaningType: "regular", frequency: "weekly" }, bad);
  check("mergeRates NaN/negative-safe", Number.isFinite(q.recommended) && q.recommended > 0 && q.recurring >= 0, JSON.stringify(q));
}
// 3. Stored-XSS: hero escaped, color forced to hex
{
  const html = templates.renderSite({ template: "1", biz: "X", hero: "<img src=x onerror=alert(1)>", color: "</style><script>bad" });
  check("site template escapes hero + validates color",
    !html.includes("<img src=x onerror") && html.includes("&lt;img src=x onerror") && !html.includes("<script>bad") && html.includes("#6B3FA0"));
}
// 4. Health
check("GET /api/health ok", (await J("/api/health")).ok === true);

// 5. Widget quote prices from sqft
{
  const r = await J("/api/widget/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: "alto-demo", name: "A", phone: "9565551234", address: "1 St", sqft: 2200, beds: 4, baths: 2, cleaningType: "deep", pets: "heavy", addOns: ["fridge", "oven"] }) });
  check("widget quote prices (555)", r.quoted === true && r.recommended === 555, JSON.stringify({ q: r.quoted, r: r.recommended }));
}
// 6. Widget sqft fallback: unquoted (no rentcast) -> sqft -> priced, ONE lead
{
  const r1 = await J("/api/widget/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: "alto-demo", name: "B", phone: "9565550001", address: "2 St", cleaningType: "regular" }) });
  const r2 = await J("/api/widget/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: "alto-demo", name: "B", phone: "9565550001", address: "2 St", cleaningType: "regular", sqft: 2000, leadId: r1.id }) });
  const demo = await db.getContractorBySlug("alto-demo");
  const leads = await db.listLeads(demo.id);
  const forPhone = leads.filter((l) => String(l.phone).includes("9565550001"));
  check("widget sqft fallback prices + single lead", r1.quoted === false && r2.quoted === true && forPhone.length === 1, JSON.stringify({ q1: r1.quoted, q2: r2.quoted, n: forPhone.length }));
}

// Set up an authed cleaner for the in-app flows
const cleaner = await db.createContractor({ name: "Reg Cleaner", phone: "9565552222" });
await db.saveContractorData(cleaner.id, { status: "paused", payStatus: "ok", stripeCustomer: "cus_reg", webhook: "https://example.com/h", site: { domain: "z.com" }, profile: { biz: "Old" } });
const invite = await db.createInvite(cleaner.id);
const sess = await db.useInvite(invite);
const AH = { "Content-Type": "application/json", Authorization: `Bearer ${sess}` };

// 7. /api/state merges (never wipes billing/site/webhook)
{
  await fetch(B + "/api/state", { method: "PUT", headers: AH, body: JSON.stringify({ state: { customers: [], quotes: [] }, profile: { profile: { biz: "New", rates: { RATE: { regular: { perSqft: "0.15" } } } } } }) });
  const c = await db.getContractor(cleaner.id);
  check("/api/state merge keeps billing/site/webhook",
    c.data.status === "paused" && c.data.payStatus === "ok" && c.data.stripeCustomer === "cus_reg" && !!c.data.webhook && !!c.data.site && c.data.profile.biz === "New" && Number(c.data.profile.rates.RATE.regular.perSqft) === 0.15,
    JSON.stringify({ status: c.data.status, pay: c.data.payStatus, cust: c.data.stripeCustomer, wh: !!c.data.webhook, site: !!c.data.site, biz: c.data.profile.biz, rate: c.data.profile.rates?.RATE?.regular?.perSqft }));
}
// 7b. stored-XSS guard: a logo with an attribute-breakout payload is rejected,
// a clean base64 data URL is kept (audit C-1).
{
  const evil = 'data:image/png;base64,x" onerror="alert(1)';
  const good = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mhowever"; // shape only
  await fetch(B + "/api/state", { method: "PUT", headers: AH, body: JSON.stringify({ profile: { profile: { logo: evil } } }) });
  const evilLogo = (await db.getContractor(cleaner.id)).data.profile.logo; // capture primitive now (store returns a live ref)
  await fetch(B + "/api/state", { method: "PUT", headers: AH, body: JSON.stringify({ profile: { profile: { logo: good } } }) });
  const goodLogo = (await db.getContractor(cleaner.id)).data.profile.logo;
  check("logo XSS payload rejected, clean data URL kept",
    evilLogo === undefined && goodLogo === good,
    JSON.stringify({ evil: evilLogo, good: goodLogo === good }));
}
// 8. paused account cannot generate a quote
check("paused -> /api/quote 403", (await fetch(B + "/api/quote", { method: "POST", headers: AH, body: JSON.stringify({ sqft: 2000, cleaningType: "regular" }) })).status === 403);

// unpause for the remaining authed checks
await db.mergeContractorData(cleaner.id, { status: null });
// 9. authed in-app quote uses her saved rates
{
  const r = await J("/api/quote", { method: "POST", headers: AH, body: JSON.stringify({ sqft: 2000, beds: 3, baths: 2, cleaningType: "regular" }) });
  // 0.15/sqft override -> 0.15*2000 + 3*8 + 2*15 = 354 -> round 355
  check("in-app quote uses saved rates (355)", r.ok && r.quote.recommended === 355, JSON.stringify(r.quote && r.quote.recommended));
}
// 10. in-app lead round-trip + mini-CRM (source tag, company, stage, note, CSV)
{
  const lr = await J("/api/lead", { method: "POST", headers: AH, body: JSON.stringify({ name: "HO", phone: "9565553333", address: "3 St", company: "Acme", info: { recommended: 300 } }) });
  await fetch(B + "/api/leads/" + lr.id, { method: "POST", headers: AH, body: JSON.stringify({ status: "won", note: "paid" }) });
  await fetch(B + "/api/leads/" + lr.id, { method: "POST", headers: AH, body: JSON.stringify({ status: "BOGUS" }) }); // must be ignored
  const leads = await J("/api/leads", { headers: AH });
  const l = leads.leads.find((x) => x.id === lr.id);
  check("in-app lead recorded + retrievable", !!l && l.info.recommended === 300);
  check("lead CRM: source/company/stage/note", l.info.source === "app" && l.info.company === "Acme" && l.status === "won" && l.info.note === "paid" && leads.stages.length === 5);
  const csv = await fetch(B + "/api/leads.csv", { headers: AH }).then((r) => r.text());
  check("leads CSV export", /^date,name,phone,company,address,source,stage/.test(csv) && csv.includes("Acme") && csv.includes("won"));
}

// 11. staff auth: 401 without key, 200 with query key
check("/admin 401 without key", (await fetch(B + "/admin")).status === 401);
check("/admin 200 with key", (await fetch(B + "/admin?key=regadmin", { redirect: "manual" })).status < 400 || (await fetch(B + "/admin?key=regadmin")).status === 200);

// 12. GHL-IN dedupe by phone (24h)
{
  const a = await J("/api/hl/lead?key=regsecret", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "X", phone: "+1 (956) 555-4444", channel: "whatsapp" }) });
  const b = await J("/api/hl/lead?key=regsecret", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "X2", phone: "9565554444", channel: "whatsapp" }) });
  check("GHL-IN dedupe same phone", b.deduped === true && b.id === a.id);
}
// 13. DEMO_PASS lifts the anonymous lookup cap
{
  const look = (hdr) => fetch(B + "/api/lookup", { method: "POST", headers: { "Content-Type": "application/json", ...hdr }, body: JSON.stringify({ address: "cap " + Math.random() }) }).then((r) => r.status);
  let anon = []; for (let i = 0; i < 9; i++) anon.push(await look({}));
  let withPass = []; for (let i = 0; i < 9; i++) withPass.push(await look({ "x-demo-pass": "regpass" }));
  check("DEMO_PASS bypasses lookup cap", anon.includes(429) && !withPass.includes(429));
}
// 14. Backup: admin-gated, excludes tokens
{
  const no = await fetch(B + "/api/admin/backup");
  const bak = await J("/api/admin/backup?key=regadmin");
  check("backup 403 w/o key + excludes sessions/invites", no.status === 403 && !("sessions" in bak) && !("invites" in bak) && Array.isArray(bak.contractors));
}

// 15. Web push endpoints (dormant without VAPID, but endpoints must respond + store)
{
  const key = await J("/api/push/key");
  const sr = await J("/api/push/subscribe", { method: "POST", headers: AH, body: JSON.stringify({ subscription: { endpoint: "https://x.example/1", keys: { p256dh: "a", auth: "b" } } }) });
  const c = await db.getContractor(cleaner.id);
  check("push key + subscribe stores device", typeof key.enabled === "boolean" && sr.ok === true && (c.data.push || []).some((s) => s.endpoint === "https://x.example/1"));
}

// 16. Stripe webhook tags the plan by exact amount ($149 -> widget, legacy $197 too)
{
  const payer = await db.createContractor({ name: "Payer", phone: "9560009999" });
  await db.saveContractorData(payer.id, { stripeCustomer: "cus_reg9", payStatus: "pending" });
  const hit = async (cents) => {
    const body = JSON.stringify({ id: "evt_reg_" + Math.random(), type: "invoice.paid", created: Math.floor(Date.now() / 1000), data: { object: { customer: "cus_reg9", amount_paid: cents } } });
    const ts = Math.floor(Date.now() / 1000);
    const sig = createHmac("sha256", "regwh").update(ts + "." + body).digest("hex");
    await fetch(B + "/api/stripe/webhook", { method: "POST", headers: { "Content-Type": "application/json", "stripe-signature": `t=${ts},v1=${sig}` }, body });
    return db.getContractor(payer.id);
  };
  const p1 = await hit(14900);
  check("stripe webhook tags plan by amount ($149->widget)", p1.data.plan === "widget" && p1.data.payStatus === "ok", JSON.stringify({ plan: p1.data.plan, pay: p1.data.payStatus }));
  await db.saveContractorData(payer.id, { stripeCustomer: "cus_reg9", plan: null, payStatus: "pending" });
  const p2 = await hit(19700);
  check("stripe webhook tags legacy amount ($197->widget)", p2.data.plan === "widget" && p2.data.payStatus === "ok", JSON.stringify({ plan: p2.data.plan, pay: p2.data.payStatus }));
}

// 17. Legal + bienvenida pages exist (Meta ads need the privacy URL)
{
  const legal = await fetch(B + "/legal").then((r) => r.text());
  const wel = await fetch(B + "/bienvenida").then((r) => r.text());
  check("/legal + /bienvenida serve", legal.includes("Privacidad") && wel.includes("Pago recibido"));
}

// 18. Stripe amount tolerance: $251 (tax drift) still tags COMPLETE
{
  const payer = await db.createContractor({ name: "Tol Payer", phone: "9560008888" });
  await db.saveContractorData(payer.id, { stripeCustomer: "cus_tol", payStatus: "pending" });
  const body = JSON.stringify({ id: "evt_tol_" + Math.random(), type: "invoice.paid", created: Math.floor(Date.now() / 1000), data: { object: { customer: "cus_tol", amount_paid: 25100 } } });
  const ts = Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", "regwh").update(ts + "." + body).digest("hex");
  await fetch(B + "/api/stripe/webhook", { method: "POST", headers: { "Content-Type": "application/json", "stripe-signature": `t=${ts},v1=${sig}` }, body });
  const p = await db.getContractor(payer.id);
  check("stripe tolerance ($251->complete)", p.data.plan === "complete", JSON.stringify({ plan: p.data.plan }));
}

// 19. Unmatched real payment leaves a CS task (paid-but-undelivered is impossible)
{
  const body = JSON.stringify({ id: "evt_nomatch_" + Math.random(), type: "checkout.session.completed", created: Math.floor(Date.now() / 1000), data: { object: { customer: "cus_ghost", payment_status: "paid", amount_total: 14900, customer_details: { email: "ghost@example.com" } } } });
  const ts = Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", "regwh").update(ts + "." + body).digest("hex");
  await fetch(B + "/api/stripe/webhook", { method: "POST", headers: { "Content-Type": "application/json", "stripe-signature": `t=${ts},v1=${sig}` }, body });
  const tasks = await db.listTasks(50);
  check("unmatched payment creates CS task", tasks.some((t) => String(t.title).includes("Pago recibido SIN cuenta") && String(t.note).includes("ghost@example.com")));
}

// 20. Backup restore round-trip (upsert via /api/admin/restore)
{
  const dump = { contractors: [{ id: "rest0001", slug: "rest-1", name: "Restaurada", phone: "9560007777", data: { payStatus: "ok" } }] };
  const r = await J("/api/admin/restore?key=regadmin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: "RESTAURAR", dump }) });
  const c = await db.getContractor("rest0001");
  check("admin restore upserts backup", r.ok === true && c && c.slug === "rest-1", JSON.stringify(r));
}

// 21. Revoke access: old session dies, fresh invite works
{
  const vic = await db.createContractor({ name: "Revocada", phone: "9560006666" });
  const inv = await db.createInvite(vic.id);
  const tok = await db.useInvite(inv);
  const before = await fetch(B + "/api/me", { headers: { Authorization: `Bearer ${tok}` } });
  await fetch(B + "/api/admin/revoke?key=regadmin&id=" + vic.id, { method: "POST" });
  const after = await fetch(B + "/api/me", { headers: { Authorization: `Bearer ${tok}` } });
  const oldInvite = await db.useInvite(inv);
  check("admin revoke kills sessions + invites", before.status === 200 && after.status === 401 && oldInvite === null, JSON.stringify({ before: before.status, after: after.status, oldInvite }));
}

// 22. Shared quote link: create -> hosted page renders the price
{
  const r = await J("/api/quote/share", { method: "POST", headers: AH, body: JSON.stringify({ name: "Carlos", address: "1 Oak St", sqft: 2200, beds: 4, baths: 2, cleaningType: "deep", recommended: 555, low: 485, high: 620, cleaners: 2, hoursLow: 1, hoursHigh: 3, lang: "es" }) });
  const page = r.url ? await fetch(r.url).then((x) => x.text()) : "";
  const anon = await fetch(B + "/api/quote/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recommended: 555 }) });
  check("shared quote page renders + requires session", r.ok === true && page.includes("$555") && page.includes("1 Oak St") && anon.status === 401, JSON.stringify({ ok: r.ok, url: r.url, anon: anon.status }));
}

// 23. Review gate: good (4-5★) returns her saved review link; bad (1-3★) never does
{
  await fetch(B + "/api/state", { method: "PUT", headers: AH, body: JSON.stringify({ profile: { profile: { reviewLink: "https://g.page/r/reg-test" } } }) });
  const good = await J(`/api/review/${cleaner.slug}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stars: 5, text: "Excelente" }) });
  const bad = await J(`/api/review/${cleaner.slug}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stars: 2, text: "No otra vez" }) });
  const badLink = await J(`/api/review/${cleaner.slug}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stars: 0 }) });
  check("review gate: good routes to review link, bad never does", good.ok === true && good.reviewLink === "https://g.page/r/reg-test" && bad.ok === true && bad.reviewLink === null && badLink.error === "stars 1-5", JSON.stringify({ good, bad, badLink }));
}

// 24. /opina/:slug: public review page renders for a real slug, 404s for unknown
{
  const page = await fetch(B + `/opina/${cleaner.slug}`).then((r) => r.text());
  const missing = await fetch(B + "/opina/no-such-slug-xyz");
  check("/opina renders + 404s unknown slug", page.includes("¿Cómo estuvo tu limpieza") && missing.status === 404);
}

console.log("\n" + results.join("\n"));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
