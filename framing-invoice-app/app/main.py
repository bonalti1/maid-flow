"""
FastAPI application: REST API + static single-page UI.

Run with:  uvicorn app.main:app --reload   (from the project root)

Endpoints
  GET  /                          -> the web UI (static/index.html)
  POST /api/baseline/import       -> import the Excel baseline workbook
  GET  /api/baseline              -> list baseline items
  POST /api/baseline             -> create/update a single baseline item
  GET  /api/settings              -> allowed variance (global + per category)
  POST /api/settings             -> update allowed variance
  POST /api/extract               -> upload invoice file -> structured JSON
  POST /api/compare               -> compare (edited) extraction vs baseline,
                                     persist invoice + line items, return review
  GET  /api/invoices              -> list saved invoices
  GET  /api/invoices/{id}         -> invoice + line items
  POST /api/line/{id}/approve     -> approve a flagged line (this line / baseline)
  POST /api/line/{id}/messages    -> generate + save WhatsApp & email drafts
  GET  /api/invoices/{id}/export  -> export review (?fmt=csv|xlsx)
  GET  /api/baseline/export       -> export baseline back to .xlsx
"""

import json
import os
import uuid

from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.responses import HTMLResponse, JSONResponse, Response, FileResponse
from fastapi.staticfiles import StaticFiles

from . import db
from . import export as export_mod
from .compare import (Baseline, BaselineItem, LineItemInput, compare_line,
                      summarize, STATUS_OVER)
from .extract import extract
from .importer import import_baseline
from .messages import build_messages_for_line, build_invoice_messages

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(title="Framing Invoice Review", version="1.0.0")


@app.on_event("startup")
def _startup():
    db.init_db()


# --------------------------------------------------------------------------
# Baseline lookup helpers
# --------------------------------------------------------------------------

def _load_baseline(conn) -> Baseline:
    rows = conn.execute("SELECT * FROM baseline_items").fetchall()
    items = [BaselineItem(
        id=r["id"], item_number=r["item_number"], description=r["description"],
        unit_measure=r["unit_measure"], category=r["category"],
        baseline_unit_price=r["baseline_unit_price"],
        lowest_price_seen=r["lowest_price_seen"],
        highest_price_seen=r["highest_price_seen"],
        last_seen_price=r["last_seen_price"],
        last_seen_invoice=r["last_seen_invoice"],
        last_seen_date=r["last_seen_date"],
        times_purchased=r["times_purchased"],
        total_qty=r["total_qty"], total_paid=r["total_paid"],
    ) for r in rows]
    return Baseline(items)


def _variance_settings(conn):
    allowed = float(db.get_setting(conn, "allowed_variance", "0") or 0)
    try:
        by_cat = json.loads(db.get_setting(conn, "variance_by_category", "{}") or "{}")
    except json.JSONDecodeError:
        by_cat = {}
    return allowed, by_cat


# --------------------------------------------------------------------------
# Baseline endpoints
# --------------------------------------------------------------------------

@app.post("/api/baseline/import")
async def baseline_import(file: UploadFile = File(...)):
    """Import the Excel baseline workbook (Baseline Price List sheet)."""
    dest = os.path.join(UPLOAD_DIR, f"baseline_{uuid.uuid4().hex}_{file.filename}")
    with open(dest, "wb") as f:
        f.write(await file.read())
    try:
        count = import_baseline(dest)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Import failed: {e}")
    return {"imported": count}


@app.get("/api/baseline")
def baseline_list():
    with db.connect() as conn:
        rows = conn.execute(
            "SELECT * FROM baseline_items ORDER BY item_number"
        ).fetchall()
        return {"items": [dict(r) for r in rows]}


@app.post("/api/baseline")
def baseline_upsert(payload: dict = Body(...)):
    """Create or update a single baseline item (used by 'Add/update baseline')."""
    from .normalize import normalize_item_number, normalize_description
    item_number = normalize_item_number(payload.get("item_number"))
    if not item_number:
        raise HTTPException(status_code=400, detail="item_number is required")
    norm_desc = normalize_description(payload.get("description"))
    with db.connect() as conn:
        existing = conn.execute(
            "SELECT id FROM baseline_items WHERE item_number=?", (item_number,)
        ).fetchone()
        fields = dict(
            item_number=item_number,
            description=payload.get("description"),
            normalized_description=norm_desc,
            unit_measure=payload.get("unit_measure"),
            category=payload.get("category") or "Material",
            baseline_unit_price=payload.get("baseline_unit_price"),
        )
        if existing:
            conn.execute(
                """UPDATE baseline_items SET description=:description,
                   normalized_description=:normalized_description,
                   unit_measure=:unit_measure, category=:category,
                   baseline_unit_price=:baseline_unit_price,
                   updated_at=datetime('now') WHERE item_number=:item_number""",
                fields,
            )
            return {"updated": item_number}
        conn.execute(
            """INSERT INTO baseline_items
               (item_number, description, normalized_description, unit_measure,
                category, baseline_unit_price)
               VALUES (:item_number, :description, :normalized_description,
                :unit_measure, :category, :baseline_unit_price)""",
            fields,
        )
        return {"created": item_number}


# --------------------------------------------------------------------------
# Settings (allowed variance)
# --------------------------------------------------------------------------

@app.get("/api/settings")
def settings_get():
    with db.connect() as conn:
        allowed, by_cat = _variance_settings(conn)
        return {"allowed_variance": allowed, "variance_by_category": by_cat}


@app.post("/api/settings")
def settings_set(payload: dict = Body(...)):
    with db.connect() as conn:
        if "allowed_variance" in payload:
            db.set_setting(conn, "allowed_variance", float(payload["allowed_variance"]))
        if "variance_by_category" in payload:
            db.set_setting(conn, "variance_by_category",
                           json.dumps(payload["variance_by_category"] or {}))
        allowed, by_cat = _variance_settings(conn)
        return {"allowed_variance": allowed, "variance_by_category": by_cat}


# --------------------------------------------------------------------------
# Extraction + comparison
# --------------------------------------------------------------------------

@app.get("/api/config")
def config():
    """Report whether AI reading is actually wired up, so the UI (and you) can
    see at a glance if the API key / package took effect."""
    import os as _os
    from . import ai_extract
    return {
        "ai_package_installed": ai_extract.HAVE_ANTHROPIC,
        "ai_key_present": bool(_os.environ.get("ANTHROPIC_API_KEY")),
        "ai_extraction_enabled": ai_extract.ai_available(),
        "ai_model": ai_extract.MODEL,
    }


@app.post("/api/extract")
async def extract_endpoint(file: UploadFile = File(...)):
    """Save the uploaded invoice and return structured (editable) JSON."""
    token = uuid.uuid4().hex
    safe_name = os.path.basename(file.filename or "upload")
    dest = os.path.join(UPLOAD_DIR, f"inv_{token}_{safe_name}")
    with open(dest, "wb") as f:
        f.write(await file.read())
    result = extract(dest)
    # Return a token so /api/compare can link the saved file to the invoice.
    result["upload_token"] = token
    result["uploaded_file_path"] = dest
    return result


@app.post("/api/compare")
def compare_endpoint(payload: dict = Body(...)):
    """Compare edited extraction against the baseline and persist the invoice.

    Body:
      { invoice: {vendor_name, invoice_number, invoice_date, property_or_job,
                  customer_po, subtotal, tax, total, uploaded_file_path},
        line_items: [ {quantity, unit_measure, item_number, description,
                       unit_price, line_amount, category, extract_confidence}, ... ] }
    """
    inv = payload.get("invoice", {}) or {}
    raw_lines = payload.get("line_items", []) or []

    with db.connect() as conn:
        baseline = _load_baseline(conn)
        allowed, by_cat = _variance_settings(conn)

        # Run the comparison engine over every line.
        results = []
        for rl in raw_lines:
            li = LineItemInput(
                quantity=_num(rl.get("quantity")),
                unit_measure=rl.get("unit_measure"),
                item_number=rl.get("item_number"),
                description=rl.get("description"),
                unit_price=_num(rl.get("unit_price")),
                line_amount=_num(rl.get("line_amount")),
                category=rl.get("category"),
                extract_confidence=_num(rl.get("extract_confidence")),
            )
            results.append(compare_line(li, baseline, allowed, by_cat))

        summary = summarize(results)

        # Persist invoice header.
        cur = conn.execute(
            """INSERT INTO invoices
               (vendor_name, invoice_number, invoice_date, property_or_job,
                customer_po, subtotal, tax, total, uploaded_file_path,
                extraction_status)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (inv.get("vendor_name"), inv.get("invoice_number"),
             inv.get("invoice_date"), inv.get("property_or_job"),
             inv.get("customer_po"), _num(inv.get("subtotal")),
             _num(inv.get("tax")), _num(inv.get("total")),
             inv.get("uploaded_file_path"), inv.get("extraction_status") or "reviewed"),
        )
        invoice_id = cur.lastrowid

        # Persist each compared line.
        out_rows = []
        for r in results:
            lc = conn.execute(
                """INSERT INTO invoice_line_items
                   (invoice_id, quantity, unit_measure, item_number, description,
                    unit_price, line_amount, baseline_item_id, baseline_unit_price,
                    difference_per_unit, potential_overcharge, status,
                    confidence_score, category, notes)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (invoice_id, r.quantity, r.unit_measure, r.item_number,
                 r.description, r.invoice_unit_price, r.line_amount,
                 r.baseline_item_id, r.baseline_unit_price, r.difference_per_unit,
                 r.potential_overcharge, r.status, r.confidence_score,
                 r.category, r.notes),
            )
            row = _result_to_dict(r)
            row["id"] = lc.lastrowid
            out_rows.append(row)

        return {
            "invoice_id": invoice_id,
            "line_items": out_rows,
            "summary": _summary_to_dict(summary),
        }


# --------------------------------------------------------------------------
# Saved invoices
# --------------------------------------------------------------------------

@app.get("/api/invoices")
def invoices_list():
    with db.connect() as conn:
        rows = conn.execute(
            """SELECT i.*,
                      (SELECT COALESCE(SUM(potential_overcharge),0)
                         FROM invoice_line_items WHERE invoice_id=i.id) AS overcharge
               FROM invoices i ORDER BY i.id DESC"""
        ).fetchall()
        return {"invoices": [dict(r) for r in rows]}


@app.get("/api/invoices/{invoice_id}")
def invoice_detail(invoice_id: int):
    with db.connect() as conn:
        inv = conn.execute("SELECT * FROM invoices WHERE id=?", (invoice_id,)).fetchone()
        if not inv:
            raise HTTPException(status_code=404, detail="Invoice not found")
        lines = conn.execute(
            "SELECT * FROM invoice_line_items WHERE invoice_id=? ORDER BY id",
            (invoice_id,),
        ).fetchall()
        return {"invoice": dict(inv), "line_items": [dict(r) for r in lines]}


# --------------------------------------------------------------------------
# Approval workflow
# --------------------------------------------------------------------------

@app.post("/api/line/{line_id}/approve")
def approve_line(line_id: int, payload: dict = Body(...)):
    """Approve a flagged line.

    payload.action:
      "approve_line"    -> mark this invoice line approved (status -> OK), keep
                           baseline untouched.
      "update_baseline" -> ALSO raise the baseline price to the invoice price for
                           future invoices (explicit user confirmation required).
      "keep_flagged"    -> revert an approval, keep it flagged.
    """
    action = payload.get("action")
    with db.connect() as conn:
        line = conn.execute(
            "SELECT * FROM invoice_line_items WHERE id=?", (line_id,)
        ).fetchone()
        if not line:
            raise HTTPException(status_code=404, detail="Line item not found")

        if action == "keep_flagged":
            conn.execute(
                "UPDATE invoice_line_items SET approved_by_user=NULL WHERE id=?",
                (line_id,),
            )
            return {"ok": True, "status": line["status"]}

        if action not in ("approve_line", "update_baseline"):
            raise HTTPException(status_code=400, detail="Unknown action")

        # Both approve actions mark THIS line approved/OK.
        conn.execute(
            """UPDATE invoice_line_items
               SET approved_by_user=?, status='OK',
                   potential_overcharge=0 WHERE id=?""",
            (payload.get("user") or "user", line_id),
        )

        baseline_updated = False
        if action == "update_baseline":
            # Raise (or create) the baseline price to the invoice unit price.
            item_number = line["item_number"]
            new_price = line["unit_price"]
            if item_number and new_price is not None:
                existing = conn.execute(
                    "SELECT id FROM baseline_items WHERE item_number=?",
                    (item_number,),
                ).fetchone()
                if existing:
                    conn.execute(
                        """UPDATE baseline_items
                           SET baseline_unit_price=?, last_seen_price=?,
                               highest_price_seen=MAX(COALESCE(highest_price_seen,0),?),
                               updated_at=datetime('now')
                           WHERE item_number=?""",
                        (new_price, new_price, new_price, item_number),
                    )
                else:
                    from .normalize import normalize_description
                    conn.execute(
                        """INSERT INTO baseline_items
                           (item_number, description, normalized_description,
                            unit_measure, category, baseline_unit_price,
                            last_seen_price)
                           VALUES (?,?,?,?,?,?,?)""",
                        (item_number, line["description"],
                         normalize_description(line["description"]),
                         line["unit_measure"], line["category"] or "Material",
                         new_price, new_price),
                    )
                baseline_updated = True
        return {"ok": True, "status": "OK", "baseline_updated": baseline_updated}


# --------------------------------------------------------------------------
# Message generation
# --------------------------------------------------------------------------

@app.post("/api/invoices/{invoice_id}/messages")
def invoice_messages(invoice_id: int):
    """Generate one combined WhatsApp + email for ALL over-baseline lines on the
    invoice, and persist them as drafts."""
    with db.connect() as conn:
        inv = conn.execute("SELECT * FROM invoices WHERE id=?", (invoice_id,)).fetchone()
        if not inv:
            raise HTTPException(status_code=404, detail="Invoice not found")
        rows = conn.execute(
            """SELECT * FROM invoice_line_items
               WHERE invoice_id=? AND status='OVER BASELINE'
                 AND potential_overcharge > 0 ORDER BY potential_overcharge DESC""",
            (invoice_id,),
        ).fetchall()
        over = [dict(r) for r in rows]
        total = round(sum(r["potential_overcharge"] or 0 for r in rows), 2)
        msgs = build_invoice_messages(over, dict(inv), total)

        # Save invoice-level drafts (line_item_id NULL = whole-invoice message).
        conn.execute(
            "DELETE FROM message_drafts WHERE invoice_id=? AND invoice_line_item_id IS NULL",
            (invoice_id,),
        )
        conn.execute(
            """INSERT INTO message_drafts
               (invoice_id, invoice_line_item_id, message_type, recipient, subject, body)
               VALUES (?,?,?,?,?,?)""",
            (invoice_id, None, "whatsapp", inv["vendor_name"], None, msgs["whatsapp"]),
        )
        conn.execute(
            """INSERT INTO message_drafts
               (invoice_id, invoice_line_item_id, message_type, recipient, subject, body)
               VALUES (?,?,?,?,?,?)""",
            (invoice_id, None, "email", inv["vendor_name"],
             msgs["email"]["subject"], msgs["email"]["body"]),
        )
        return msgs


@app.post("/api/line/{line_id}/messages")
def line_messages(line_id: int):
    """Generate + persist WhatsApp & email drafts for a flagged line."""
    with db.connect() as conn:
        line = conn.execute(
            "SELECT * FROM invoice_line_items WHERE id=?", (line_id,)
        ).fetchone()
        if not line:
            raise HTTPException(status_code=404, detail="Line item not found")
        inv = conn.execute(
            "SELECT * FROM invoices WHERE id=?", (line["invoice_id"],)
        ).fetchone()
        msgs = build_messages_for_line(dict(line), dict(inv) if inv else {})

        # Save drafts (overwrite previous drafts for this line).
        conn.execute(
            "DELETE FROM message_drafts WHERE invoice_line_item_id=?", (line_id,)
        )
        conn.execute(
            """INSERT INTO message_drafts
               (invoice_id, invoice_line_item_id, message_type, recipient,
                subject, body)
               VALUES (?,?,?,?,?,?)""",
            (line["invoice_id"], line_id, "whatsapp",
             inv["vendor_name"] if inv else None, None, msgs["whatsapp"]),
        )
        conn.execute(
            """INSERT INTO message_drafts
               (invoice_id, invoice_line_item_id, message_type, recipient,
                subject, body)
               VALUES (?,?,?,?,?,?)""",
            (line["invoice_id"], line_id, "email",
             inv["vendor_name"] if inv else None,
             msgs["email"]["subject"], msgs["email"]["body"]),
        )
        return msgs


# --------------------------------------------------------------------------
# Exports
# --------------------------------------------------------------------------

@app.get("/api/invoices/{invoice_id}/export")
def export_invoice(invoice_id: int, fmt: str = "xlsx"):
    with db.connect() as conn:
        inv = conn.execute("SELECT * FROM invoices WHERE id=?", (invoice_id,)).fetchone()
        if not inv:
            raise HTTPException(status_code=404, detail="Invoice not found")
        rows = [dict(r) for r in conn.execute(
            "SELECT * FROM invoice_line_items WHERE invoice_id=? ORDER BY id",
            (invoice_id,),
        ).fetchall()]
    if fmt == "csv":
        data = export_mod.export_results_csv(rows)
        return Response(content=data, media_type="text/csv",
                        headers={"Content-Disposition":
                                 f"attachment; filename=invoice_{invoice_id}.csv"})
    summary = {
        "Total potential overcharge": sum(r.get("potential_overcharge") or 0 for r in rows),
        "Lines": len(rows),
    }
    data = export_mod.export_results_xlsx(rows, summary)
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=invoice_{invoice_id}.xlsx"},
    )


@app.get("/api/dashboard")
def dashboard():
    """Aggregates for the office/CFO dashboard.

    Returns top-line KPIs, a per-invoice list, spend grouped by category
    (chart-of-accounts ready), and a vendor scorecard ranking who overcharges.
    """
    with db.connect() as conn:
        # KPIs
        inv_count = conn.execute("SELECT COUNT(*) c FROM invoices").fetchone()["c"]
        total_spend = conn.execute(
            "SELECT COALESCE(SUM(line_amount),0) s FROM invoice_line_items"
        ).fetchone()["s"]
        total_over = conn.execute(
            "SELECT COALESCE(SUM(potential_overcharge),0) s FROM invoice_line_items"
        ).fetchone()["s"]
        pending = conn.execute(
            """SELECT COUNT(*) c FROM invoice_line_items
               WHERE status IN ('OVER BASELINE','NEW ITEM - REVIEW','OCR REVIEW')
                 AND (approved_by_user IS NULL OR approved_by_user='')"""
        ).fetchone()["c"]

        invoices = [dict(r) for r in conn.execute(
            """SELECT i.id, i.vendor_name, i.invoice_number, i.invoice_date,
                      i.property_or_job, i.total,
                      (SELECT COALESCE(SUM(line_amount),0) FROM invoice_line_items
                         WHERE invoice_id=i.id) AS checked_total,
                      (SELECT COALESCE(SUM(potential_overcharge),0) FROM invoice_line_items
                         WHERE invoice_id=i.id) AS overcharge,
                      (SELECT COUNT(*) FROM invoice_line_items
                         WHERE invoice_id=i.id AND status='OVER BASELINE') AS over_lines,
                      (SELECT COUNT(*) FROM invoice_line_items
                         WHERE invoice_id=i.id AND status IN
                         ('NEW ITEM - REVIEW','OCR REVIEW')) AS review_lines
               FROM invoices i ORDER BY i.id DESC"""
        ).fetchall()]

        by_category = [dict(r) for r in conn.execute(
            """SELECT COALESCE(category,'Uncategorized') AS category,
                      COALESCE(SUM(line_amount),0) AS spend,
                      COALESCE(SUM(potential_overcharge),0) AS overcharge,
                      COUNT(*) AS lines
               FROM invoice_line_items GROUP BY category ORDER BY spend DESC"""
        ).fetchall()]

        by_vendor = [dict(r) for r in conn.execute(
            """SELECT COALESCE(vendor_name,'Unknown') AS vendor,
                      COUNT(DISTINCT i.id) AS invoices,
                      COALESCE(SUM(li.line_amount),0) AS spend,
                      COALESCE(SUM(li.potential_overcharge),0) AS overcharge
               FROM invoices i LEFT JOIN invoice_line_items li ON li.invoice_id=i.id
               GROUP BY vendor_name ORDER BY overcharge DESC, spend DESC"""
        ).fetchall()]

        return {
            "kpis": {
                "invoice_count": inv_count,
                "total_spend": round(total_spend, 2),
                "total_overcharge": round(total_over, 2),
                "pending_review": pending,
            },
            "invoices": invoices,
            "by_category": by_category,
            "by_vendor": by_vendor,
        }


@app.get("/api/baseline/export")
def export_baseline():
    with db.connect() as conn:
        rows = [dict(r) for r in conn.execute(
            "SELECT * FROM baseline_items ORDER BY item_number"
        ).fetchall()]
    data = export_mod.export_baseline_xlsx(rows)
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=baseline_export.xlsx"},
    )


# --------------------------------------------------------------------------
# Small helpers
# --------------------------------------------------------------------------

def _num(v):
    if v is None or v == "":
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _result_to_dict(r):
    return {
        "item_number": r.item_number, "description": r.description,
        "quantity": r.quantity, "unit_measure": r.unit_measure,
        "unit_price": r.invoice_unit_price, "line_amount": r.line_amount,
        "category": r.category, "baseline_item_id": r.baseline_item_id,
        "baseline_unit_price": r.baseline_unit_price,
        "difference_per_unit": r.difference_per_unit,
        "potential_overcharge": r.potential_overcharge, "status": r.status,
        "confidence_score": r.confidence_score, "matched_by": r.matched_by,
        "notes": r.notes, "math_mismatch": r.math_mismatch,
    }


def _summary_to_dict(s):
    return {
        "total_invoice_amount": s.total_invoice_amount,
        "total_amount_checked": s.total_amount_checked,
        "total_potential_overcharge": s.total_potential_overcharge,
        "ok_count": s.ok_count, "over_count": s.over_count,
        "review_count": s.review_count, "line_count": s.line_count,
    }


# Serve the SPA. Mounted last so /api/* routes take precedence.
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
