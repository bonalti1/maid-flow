# Framing Invoice Review

A small local web app for construction framing material pricing. Upload a
supplier **invoice or quote**, extract the line items, compare each material's
unit price against your **baseline / budget spreadsheet**, and automatically
flag possible overcharges — with one-click WhatsApp / email messages to the
supplier.

The baseline workbook (`framing_materials_budget_baseline.xlsx`) is the
**source of truth**. The app never guesses prices from the invoice; the invoice
is only used to check whether the supplier is charging more than your baseline.

---

## What it does

1. **Import** the Excel baseline (`Baseline Price List` sheet) into SQLite.
2. **Upload** an invoice/quote (PDF, image, `.xlsx`, or `.csv`).
3. **Extract** vendor, invoice #, date, PO, and line items into structured,
   **editable** JSON (OCR can misread — you fix it before comparing).
4. **Compare** every line against the baseline and flag the status:
   - 🟢 `OK` — invoice unit price ≤ baseline + allowed variance
   - 🔴 `OVER BASELINE` — invoice unit price > baseline + allowed variance
   - 🟡 `NEW ITEM - REVIEW` — item # not found in baseline
   - 🟡 `OCR REVIEW` — extraction uncertain / required fields missing
5. **Summarize**: invoice total, amount checked, total potential overcharge,
   and OK / over / review counts.
6. **Act** on each flagged line: Approve (this line *or* update baseline),
   Keep flagged, or generate a **WhatsApp** / **email** message.
7. **Export** results to CSV / Excel, or sync the baseline back to `.xlsx`.

### Overcharge math
```
difference_per_unit  = invoice_unit_price - baseline_unit_price
potential_overcharge = max(0, difference_per_unit - allowed_variance) * quantity
```
Allowed variance defaults to **$0.00 / unit** and is configurable globally or
per category (e.g. allow more slack on `Delivery`).

---

## Setup

Requires Python 3.9+.

```bash
cd framing-invoice-app

# 1. Install dependencies
python -m venv .venv && source .venv/bin/activate   # optional but recommended
pip install -r requirements.txt

# 2. Create the database and import the baseline workbook
python seed.py
#   -> "Imported 40 baseline items."

# 3. Run the app
uvicorn app.main:app --reload
#   -> open http://127.0.0.1:8000
```

Then in the browser:
1. (Optional) Re-import the baseline `.xlsx` in **Step 1** — `seed.py` already did it.
2. Drag an invoice file into **Step 2**.
3. Fix any extraction mistakes in **Step 3** and click **Compare**.
4. Review flagged lines, approve or message the supplier, and export.

### Reading PDFs & photos (AI vision — recommended)
Spreadsheet/CSV invoices are parsed deterministically and need no extra setup.
**Scanned PDFs and phone photos are images**, so reading them reliably uses
Claude vision. Set an Anthropic API key and the app reads them automatically:

```bash
export ANTHROPIC_API_KEY=sk-ant-...      # from console.anthropic.com
# optional: cheaper model for high volume (default is claude-opus-4-8)
export FRAMING_AI_MODEL=claude-haiku-4-5
```
Cost is roughly a few cents per invoice on the default model, well under a cent
on Haiku. The invoice image is sent to Anthropic only when you upload one; no
key means this step is skipped.

**Fallback without a key:** PDFs/images use local parsers instead — `pdfplumber`
for text-based PDFs, and `pytesseract` (+ the system Tesseract binary) for
images:
```bash
sudo apt-get install tesseract-ocr   # Debian/Ubuntu
brew install tesseract               # macOS
```
Text-based PDFs read fine locally; true scans/photos fall back to "needs review"
and manual entry. The comparison engine is identical either way — and every
extraction stays editable before you compare.

---

## Chart of accounts (multi-department)
Import your chart of accounts (Excel/CSV: `Account #`, `Account Name`,
`Department`, optional `Category`) from the **Dashboard → Chart of Accounts**
area (a template is at `data/sample_chart_of_accounts.csv`). Every invoice line
is then coded to a GL account + department, and the dashboard rolls up **Spend by
Department** and **Spend by GL Account** — so the app scales from framing to
checking spend across every department, all with the same price-vs-baseline
engine. Baseline items auto-map to accounts by department/category on import.

## Deploying online (web app for your team)
See **[DEPLOY.md](DEPLOY.md)** for step-by-step hosting on Render: a password-
protected web link your team opens from any phone/computer, free HTTPS, start
free and upgrade (~$7/mo) for permanently saved data. Set `APP_USERNAME` /
`APP_PASSWORD` to turn on the login, and `ANTHROPIC_API_KEY` for AI reading. On
first boot the baseline workbook auto-imports so a fresh deploy is ready to use.

## Tests

A sample test suite loads the real baseline workbook and exercises the
normalization + comparison/status logic:

```bash
pytest                       # or: python tests/test_compare.py
```

Covers: item numbers as strings (not floats), description normalization,
OK / OVER / NEW / OCR statuses, the overcharge math, global + per-category
variance, description-fallback matching, math-mismatch detection, and the
summary rollup.

---

## Project layout

```
framing-invoice-app/
├── app/
│   ├── main.py        FastAPI app: REST API + serves the UI
│   ├── db.py          SQLite schema (baseline_items, invoices,
│   │                  invoice_line_items, message_drafts, settings)
│   ├── importer.py    Excel "Baseline Price List" -> baseline_items
│   ├── extract.py     invoice/quote -> structured JSON (xlsx/csv/pdf/image)
│   ├── normalize.py   item-number & description normalization
│   ├── compare.py     comparison engine + status logic (the core)
│   ├── messages.py    WhatsApp + email message templates
│   └── export.py      results -> CSV/Excel, baseline -> Excel
├── static/            single-page UI (index.html, app.js, styles.css)
├── data/              framing_materials_budget_baseline.xlsx (source of truth)
├── tests/test_compare.py
├── seed.py            create DB + import baseline
└── requirements.txt
```

## Database tables
`baseline_items`, `invoices`, `invoice_line_items`, `message_drafts` — matching
the schema in the project spec, plus a small `settings` table for the
configurable allowed variance. Uploaded files are stored under `uploads/` and
linked to their invoice record via `invoices.uploaded_file_path`.

## API quick reference
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/baseline/import` | import baseline `.xlsx` |
| GET  | `/api/baseline` | list baseline items |
| POST | `/api/baseline` | add/update one baseline item |
| GET/POST | `/api/settings` | get/set allowed variance |
| POST | `/api/extract` | upload invoice -> structured JSON |
| POST | `/api/compare` | compare edited extraction, persist invoice |
| GET  | `/api/invoices` · `/api/invoices/{id}` | list / detail |
| POST | `/api/line/{id}/approve` | approve line / update baseline / keep flagged |
| POST | `/api/line/{id}/messages` | generate WhatsApp + email drafts |
| GET  | `/api/invoices/{id}/export?fmt=csv\|xlsx` | export review |
| GET  | `/api/baseline/export` | sync baseline back to `.xlsx` |

---

### Notes on matching (from the spec)
- Item numbers are treated as **strings**, not numbers (some contain letters;
  Excel turns `10128` into `10128.0`).
- Descriptions are normalized (lower-cased, whitespace collapsed, `x` / inch
  marks / hyphens standardized) for fallback matching when the item # is missing
  — those matches are marked **needs review**.
- Unit price is compared first; if `qty × unit_price ≠ line_amount`, the line is
  flagged as a **math mismatch**.
- Tax and delivery are categorized separately; delivery stays comparable in the
  `Delivery` category.
