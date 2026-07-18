# Pauleza — engine + business OS

Spanish-first SaaS sold to Hispanic **house cleaners**. One Express server serves
the client PWA, all staff portals, the sales landing, and every client website.
The codebase is a fork of the ALTO Pro engine (the roofing/contractor master);
what changes per product is a **copy pack + config**, not the machine. ALTO is
the master — fixes are ported *from* ALTO *to* here (see `playbook/01`). The
human half of the machine (team roles, scripts, GHL recipes, launch steps) lives
in `playbook/` — read it before re-deriving any process.

## Map

- `tradetechpro/server/index.mjs` — the monolith: APIs, portals (`/admin`, `/cs`,
  `/closer`, `/onboarding`), sales landing (`/ventas`), sales decks (`/demo`,
  `/equipo`, `/cierre`), client widgets (`/w/:slug`), example site (`/ejemplo`),
  tenant sites (`/site/:slug`), Stripe + Cloudflare + GHL integrations.
- `tradetechpro/server/pricing.mjs` — **the cleaning pricing engine, single
  source of truth**. Imported by both the public widget AND the in-app quote so
  they can never drift. Each cleaner overrides her rates from her profile
  ("Mis precios"); `mergeRates` validates/clamps overrides (finite, non-negative,
  capped) so a half-typed rate can never produce NaN/negative prices.
- `tradetechpro/server/templates.mjs` — the website factory: 3 client-site
  templates (t1/t2/t3) rendered from data. User-supplied `hero`/`color` are
  escaped/validated before render (stored-XSS guard).
- `tradetechpro/server/db.mjs` — Postgres (Supabase) with a JSON-file fallback
  for local dev only. In production (DATABASE_URL set) a failed connection
  **throws** — it never silently falls back to the ephemeral file (that would
  lose accounts/payments on the next deploy).
- `tradetechpro/src/TradeTechPro.jsx` — the client PWA (React, vite → `dist/`).
- `tradetechpro/public/` — static assets (vite copies to dist on build); the
  offline service worker (`sw.js`) caches the app shell.
- `tradetechpro/server/pricing.test.mjs` — 6 pricing unit tests. Run before
  every commit (`npm test`).
- `playbook/` — the business playbook (launch, team, GHL, sales, env, backups).

## Non-negotiable conventions

1. **Branches**: develop on `claude/gracious-einstein-2xrkht`; merge to `main`;
   Render auto-deploys `main`. Push both after a commit. Never open a PR unless
   asked. Repo: `bonalti1/maid-flow`.
2. **Test before committing.** `node --check` the server, `npm test` (6 green),
   `npm run build` (dist is what the server serves), and boot locally to drive
   the affected flow:
   `(ADMIN_KEY=testadmin CS_KEY=testcs CLOSER_KEY=testcloser PORT=8890 node server/index.mjs &)`
3. **Small additive commits, one item per change.** Never break a live screen.
   The acceptance quote must stay `quote({sqft:2200,beds:4,baths:2,
   cleaningType:'deep',condition:'normal',pets:'heavy',addOns:['fridge','oven']})`
   → `recommended 555, range [485,620], time {cleaners:2, low:1, high:3}`.
4. **App changes need `npm run build`** — `dist/` is gitignored; Render builds on
   deploy, but the local server serves the committed build.
5. Spanish-first copy, warm cleaner tone. No fake reviews, no stock photos posing
   as the cleaner's own work.

## Domain knowledge that keeps getting re-learned

- **Built-in accounts** (protected from deletion, hidden from client lists):
  `alto-demo` (the public demo widget/site) and `alto-ventas` (the sales
  landing's own lead inbox — its GHL webhook forwards every landing lead to
  setters). *(Internal slugs kept from the ALTO fork; safe to leave.)*
- **Pricing engine** (`pricing.mjs`): rate table by cleaning type
  (regular/deep/move_in/move_out/airbnb/post_construction/office), condition
  multipliers (`very_heavy` → `customQuote` flag), pets adders, furnished
  multiplier (move in/out only), frequency discounts (on the recurring price),
  add-ons, +$15/bath +$8/bed. Recommended rounds to $5; range is ±12%.
- **Leads flow**: widget → `/api/widget/quote` (or `/api/widget/lead`) saves a
  lead + `forwardLead` → per-account GHL webhook (`data.webhook`, https-only,
  payload `{source:"pauleza", contractor, id, name, phone, address, ...extra}`).
  The in-app quote posts `/api/lead` (authed, resolves the cleaner from her
  session). Channel leads (WhatsApp/IG) come IN from GHL via `/api/hl/lead`
  (`HL_WEBHOOK_SECRET`, phone dedupe) and are NOT re-forwarded (no loop).
- **Widget without RentCast**: if property lookup returns no sqft, the widget
  asks the homeowner for approximate square footage and prices from it (the
  re-submit carries the first `leadId` so the lead is enriched, not duplicated).
- **Demo cap**: the anonymous in-app flow allows 6 lookups/day
  (`maidflow_demo_meas` localStorage + server `/api/lookup` cap); hitting it
  still lets the user enter details manually. Widget lifetime cap is keyed by
  **phone** (`wq:<slug>:<phone>` > 6), not IP, so shared/CGNAT networks aren't
  locked out. *(No `DEMO_PASS` staff-unlimited pass yet — planned, playbook/04.)*
- **Stripe**: TODAY a single Payment Link (`STRIPE_PAYMENT_LINK`); the webhook
  verifies the signature, is idempotent (dedup by `event.id`), ordered (ignores
  stale `event.created`), gates on a real payment (`payment_status=paid` /
  `amount_paid>0`), matches the account by `client_reference_id` → stored
  customer → editable email/phone, and handles pay-before-account via
  `paid:<phone|email>` (30-day window). **3 tiers (LIVE):**
  PRO **$49** (app only) · WIDGET **$149** (app + widget on her page/Facebook/IG)
  · COMPLETO **$249** (page + AI bot + domain + app + widget) — via `STRIPE_LINK_*`
  env vars + a `planByAmount` map in the webhook (legacy $67/$197/$297 amounts
  still recognized). See `playbook/04`.
- **Images** (logos + site photos): stored in the DB (`kv` table, base64) so they
  survive redeploys — never on the ephemeral disk.
- **Staff auth**: `/admin?key=…` sets a `SameSite=Strict; Secure` cookie
  (constant-time key compare). `curl -s -L -c jar -b jar` to follow the redirect.

## Current state / open items

- **ALTO business-OS port COMPLETE (items 1–10):** docs ✓ · env catalog +
  `REQUIRE_DB` ✓ · GHL-IN 24h dedupe ✓ · `DEMO_PASS` ✓ · admin backup download
  ✓ · regression suite (`npm run regression`, 26 checks) ✓ · lead-CRM
  (5-stage pipeline / notes / CSV / source tags / company field) ✓ · install
  flow (Android one-tap + iOS overlay + WhatsApp-browser warning) ✓ · web push
  (`notifyLead`/VAPID) ✓ · Stripe 3 tiers ($49/$149/$249 via `planByAmount`, legacy amounts aliased) ✓.
  Item 11 (owner cockpit `/hq`) is optional and not built (partly covered by
  `/admin/economics` + AI advisor). Parity extras from the ALTO/QC comparison:
  `/legal` (Términos y Privacidad — Meta ads need it) · `/bienvenida`
  (post-payment page, set it as the Payment Links' redirect) · admin restore
  (upload backup) + revoke access + clearmeetings · Stripe ±$10 amount
  tolerance + CS task on unmatched real payment (human-close: no self-serve
  auto-create) · shared quote links (`/api/quote/share` → `/q/:id`, 90-day
  TTL, open counter `shareopen:<id>`). The sales landing shows NO payment
  links — every sale closes with a human; Stripe links live in the closer
  deck (P key) and admin only.
- Run `npm run regression` (must be all green) before every commit, plus
  `npm test` (pricing) and `npm run build`.
- **Owner dashboard actions (values live outside git — set in Render):** create
  the 3 Stripe Payment Links ($49/$149/$249) with `client_reference_id` = contractor id
  (`STRIPE_LINK_PRO/WIDGET/COMPLETE` + `STRIPE_WEBHOOK_SECRET`); generate VAPID
  keys (`npx web-push generate-vapid-keys`); set `GOOGLE_MAPS_API_KEY`,
  `RENTCAST_API_KEY`, `ANTHROPIC_API_KEY`, `HL_WEBHOOK_SECRET`, a strong
  `DEMO_PASS`, and `REQUIRE_DB=1` in production. Full catalog: `playbook/05`.
