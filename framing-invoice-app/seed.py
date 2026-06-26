#!/usr/bin/env python3
"""
Seed / import script.

Creates the SQLite database (if needed) and imports the baseline price list
from the framing materials workbook into the baseline_items table.

Usage:
    python seed.py                       # uses data/framing_materials_budget_baseline.xlsx
    python seed.py path/to/workbook.xlsx # use a different workbook
"""

import os
import sys

from app.db import init_db
from app.importer import import_baseline

DEFAULT_XLSX = os.path.join(
    os.path.dirname(__file__), "data", "framing_materials_budget_baseline.xlsx"
)


def main():
    xlsx = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_XLSX
    if not os.path.exists(xlsx):
        print(f"ERROR: workbook not found: {xlsx}")
        sys.exit(1)
    print(f"Initializing database...")
    init_db()
    print(f"Importing baseline from: {xlsx}")
    count = import_baseline(xlsx)
    print(f"Done. Imported {count} baseline items.")


if __name__ == "__main__":
    main()
