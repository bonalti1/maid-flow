"""
SQLite storage layer.

One file-based database (framing.db by default). Schema mirrors the four tables
in the spec exactly: baseline_items, invoices, invoice_line_items,
message_drafts — plus a small settings table for the configurable variance.

Raw sqlite3 is used (no ORM) to keep the dependency footprint tiny and the SQL
obvious for anyone reading the code later. Rows come back as dict-like
sqlite3.Row objects.
"""

import os
import sqlite3
from contextlib import contextmanager

DB_PATH = os.environ.get(
    "FRAMING_DB",
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "framing.db"),
)

SCHEMA = """
CREATE TABLE IF NOT EXISTS baseline_items (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    item_number           TEXT,
    description           TEXT,
    normalized_description TEXT,
    unit_measure          TEXT,
    category              TEXT,
    department            TEXT,
    gl_account            TEXT,
    baseline_unit_price   REAL,
    lowest_price_seen     REAL,
    highest_price_seen    REAL,
    last_seen_price       REAL,
    last_seen_invoice     TEXT,
    last_seen_date        TEXT,
    times_purchased       INTEGER,
    total_qty             REAL,
    total_paid            REAL,
    created_at            TEXT DEFAULT (datetime('now')),
    updated_at            TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_baseline_item_number ON baseline_items(item_number);
CREATE INDEX IF NOT EXISTS idx_baseline_norm_desc   ON baseline_items(normalized_description);

CREATE TABLE IF NOT EXISTS invoices (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_name        TEXT,
    invoice_number     TEXT,
    invoice_date       TEXT,
    property_or_job    TEXT,
    customer_po        TEXT,
    department         TEXT,
    subtotal           REAL,
    tax                REAL,
    total              REAL,
    uploaded_file_path TEXT,
    extraction_status  TEXT,
    created_at         TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoice_line_items (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id           INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    quantity             REAL,
    unit_measure         TEXT,
    item_number          TEXT,
    description          TEXT,
    unit_price           REAL,
    line_amount          REAL,
    baseline_item_id     INTEGER REFERENCES baseline_items(id),
    baseline_unit_price  REAL,
    difference_per_unit  REAL,
    potential_overcharge REAL,
    status               TEXT,
    confidence_score     REAL,
    category             TEXT,
    department           TEXT,
    gl_account           TEXT,
    notes                TEXT,
    approved_by_user     TEXT,
    created_at           TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_line_invoice ON invoice_line_items(invoice_id);

CREATE TABLE IF NOT EXISTS message_drafts (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id           INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    invoice_line_item_id INTEGER REFERENCES invoice_line_items(id) ON DELETE CASCADE,
    message_type         TEXT,
    recipient            TEXT,
    subject              TEXT,
    body                 TEXT,
    created_at           TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    account_number TEXT,
    account_name   TEXT,
    department     TEXT,
    category       TEXT,
    created_at     TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_coa_account ON chart_of_accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_coa_department ON chart_of_accounts(department);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
);
"""

# Columns added after v1 — applied to pre-existing databases via ALTER.
_MIGRATIONS = [
    ("baseline_items", "department", "TEXT"),
    ("baseline_items", "gl_account", "TEXT"),
    ("invoices", "department", "TEXT"),
    ("invoice_line_items", "department", "TEXT"),
    ("invoice_line_items", "gl_account", "TEXT"),
]


def _migrate(conn):
    """Add new columns to existing tables (CREATE IF NOT EXISTS won't alter)."""
    for table, column, decl in _MIGRATIONS:
        cols = [r["name"] for r in conn.execute(f"PRAGMA table_info({table})")]
        if column not in cols:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {decl}")


def get_connection(path: str = None) -> sqlite3.Connection:
    conn = sqlite3.connect(path or DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def connect(path: str = None):
    conn = get_connection(path)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db(path: str = None):
    """Create tables if they don't exist and seed default settings."""
    with connect(path) as conn:
        conn.executescript(SCHEMA)
        _migrate(conn)
        # Default global allowed variance is $0.00 (spec default).
        conn.execute(
            "INSERT OR IGNORE INTO settings(key, value) VALUES('allowed_variance', '0')"
        )
        conn.execute(
            "INSERT OR IGNORE INTO settings(key, value) VALUES('variance_by_category', '{}')"
        )


# --- settings helpers ------------------------------------------------------

def get_setting(conn, key, default=None):
    row = conn.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    return row["value"] if row else default


def set_setting(conn, key, value):
    conn.execute(
        "INSERT INTO settings(key, value) VALUES(?, ?) "
        "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (key, str(value)),
    )
