"""
Import the `Baseline Price List` sheet of the framing materials workbook into
the baseline_items table.

The workbook is the SOURCE OF TRUTH. Re-importing replaces the baseline rows so
the database always reflects the latest spreadsheet. Item numbers are stored as
TEXT and a normalized_description is computed for fallback matching.

Column headers expected on the `Baseline Price List` sheet:
    Item #, Description, UM, Category, Baseline Unit Price, Baseline Rule,
    Lowest Price Seen, Highest Price Seen, Price Spread, Last Seen Price,
    Last Seen Invoice, Last Seen Date, Times Purchased, Total Qty, Total Paid,
    Notes
Only the fields the app needs are read; extras are ignored.
"""

import datetime

import openpyxl

from .db import connect
from .normalize import normalize_item_number, normalize_description

BASELINE_SHEET = "Baseline Price List"

# Map our DB columns -> the spreadsheet header text (case-insensitive match).
HEADER_MAP = {
    "item_number": "Item #",
    "description": "Description",
    "unit_measure": "UM",
    "category": "Category",
    "baseline_unit_price": "Baseline Unit Price",
    "lowest_price_seen": "Lowest Price Seen",
    "highest_price_seen": "Highest Price Seen",
    "last_seen_price": "Last Seen Price",
    "last_seen_invoice": "Last Seen Invoice",
    "last_seen_date": "Last Seen Date",
    "times_purchased": "Times Purchased",
    "total_qty": "Total Qty",
    "total_paid": "Total Paid",
}


def _coerce(value):
    """Make a cell value JSON/SQLite friendly (dates -> ISO strings)."""
    if isinstance(value, (datetime.datetime, datetime.date)):
        return value.date().isoformat() if isinstance(value, datetime.datetime) else value.isoformat()
    return value


def read_baseline_rows(xlsx_path: str):
    """Yield dict rows from the Baseline Price List sheet."""
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    if BASELINE_SHEET not in wb.sheetnames:
        raise ValueError(
            f"Workbook is missing the '{BASELINE_SHEET}' sheet. "
            f"Found: {wb.sheetnames}"
        )
    ws = wb[BASELINE_SHEET]
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return
    header = [str(h).strip() if h is not None else "" for h in rows[0]]
    # Build header text -> column index (case-insensitive).
    idx = {h.lower(): i for i, h in enumerate(header)}

    def col(field):
        want = HEADER_MAP[field].lower()
        return idx.get(want)

    for raw in rows[1:]:
        item_raw = raw[col("item_number")] if col("item_number") is not None else None
        # Skip blank / non-data rows.
        if item_raw is None or str(item_raw).strip() == "":
            continue
        rec = {}
        for field in HEADER_MAP:
            c = col(field)
            rec[field] = _coerce(raw[c]) if c is not None else None
        rec["item_number"] = normalize_item_number(item_raw)
        rec["normalized_description"] = normalize_description(rec.get("description"))
        yield rec


def import_baseline(xlsx_path: str, db_path: str = None, replace: bool = True) -> int:
    """Import the baseline sheet into baseline_items.

    With replace=True (default) the table is cleared first so the DB mirrors the
    spreadsheet exactly. Returns the number of rows imported.
    """
    rows = list(read_baseline_rows(xlsx_path))
    with connect(db_path) as conn:
        if replace:
            conn.execute("DELETE FROM baseline_items")
        for rec in rows:
            conn.execute(
                """INSERT INTO baseline_items
                   (item_number, description, normalized_description, unit_measure,
                    category, baseline_unit_price, lowest_price_seen,
                    highest_price_seen, last_seen_price, last_seen_invoice,
                    last_seen_date, times_purchased, total_qty, total_paid)
                   VALUES (:item_number, :description, :normalized_description,
                    :unit_measure, :category, :baseline_unit_price,
                    :lowest_price_seen, :highest_price_seen, :last_seen_price,
                    :last_seen_invoice, :last_seen_date, :times_purchased,
                    :total_qty, :total_paid)""",
                rec,
            )
    return len(rows)
