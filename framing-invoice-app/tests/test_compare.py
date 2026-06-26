"""
Sample tests using the real baseline workbook.

These exercise the two pieces most likely to break and most important to get
right: normalization and the comparison/status engine. The baseline is loaded
straight from data/framing_materials_budget_baseline.xlsx so the test doubles
as a smoke test of the Excel importer.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.compare import (Baseline, BaselineItem, LineItemInput, compare_line,
                         summarize, STATUS_OK, STATUS_OVER, STATUS_NEW, STATUS_OCR)
from app.importer import read_baseline_rows
from app.normalize import normalize_item_number, normalize_description

XLSX = os.path.join(os.path.dirname(os.path.dirname(__file__)),
                    "data", "framing_materials_budget_baseline.xlsx")


def load_baseline():
    items = []
    for i, rec in enumerate(read_baseline_rows(XLSX), start=1):
        items.append(BaselineItem(
            id=i, item_number=rec["item_number"], description=rec["description"],
            unit_measure=rec["unit_measure"], category=rec["category"],
            baseline_unit_price=rec["baseline_unit_price"],
        ))
    return Baseline(items)


# --- normalization ---------------------------------------------------------

def test_item_number_is_string_not_number():
    # Excel float -> clean string; letters preserved; case stabilized.
    assert normalize_item_number(10128.0) == "10128"
    assert normalize_item_number(" 10128 ") == "10128"
    assert normalize_item_number("lvl1616") == "LVL1616"
    assert normalize_item_number("10410P") == "10410P"


def test_description_normalization():
    a = normalize_description("2 x 8-16  #2  SPF/HF/YP LUMBER")
    b = normalize_description("2X8 - 16 #2 SPF/HF/YP LUMBER")
    assert a == b
    # fancy inch marks / multiplication sign collapse
    assert normalize_description('16" x 16') == normalize_description("16″ × 16")


# --- comparison engine -----------------------------------------------------

def test_ok_when_at_baseline():
    bl = load_baseline()
    # 10824 baseline is 37.79 in the workbook.
    line = LineItemInput(quantity=3, item_number="10824", unit_price=37.79,
                         line_amount=113.37, unit_measure="EACH",
                         description="2 x 8-24 #2 SPF/HF/YP/FJ LUMBER")
    r = compare_line(line, bl)
    assert r.status == STATUS_OK
    assert r.baseline_unit_price == 37.79
    assert r.potential_overcharge == 0


def test_over_baseline_overcharge_math():
    bl = load_baseline()
    # 10816 baseline 12.99; charge 14.99 -> $2.00/unit over, qty 5 -> $10.00.
    line = LineItemInput(quantity=5, item_number="10816", unit_price=14.99,
                         line_amount=74.95, unit_measure="EACH",
                         description="2 x 8-16 #2 SPF HF/YP LUMBER")
    r = compare_line(line, bl)
    assert r.status == STATUS_OVER
    assert round(r.difference_per_unit, 2) == 2.00
    assert r.potential_overcharge == 10.00


def test_allowed_variance_suppresses_small_increase():
    bl = load_baseline()
    # 10816 baseline 12.99; charge 13.49 -> $0.50 over. With $0.50 variance -> OK.
    line = LineItemInput(quantity=10, item_number="10816", unit_price=13.49,
                         line_amount=134.90)
    over = compare_line(line, bl, allowed_variance=0.0)
    assert over.status == STATUS_OVER
    ok = compare_line(line, bl, allowed_variance=0.50)
    assert ok.status == STATUS_OK
    assert ok.potential_overcharge == 0


def test_per_category_variance_override():
    bl = load_baseline()
    # Delivery baseline (item "1") is 45. Charge 48 with a Delivery override of 5.
    line = LineItemInput(quantity=1, item_number="1", unit_price=48.0,
                         description="DELIVERY CHARGE - ZONE 1 (<8)")
    r = compare_line(line, bl, allowed_variance=0.0,
                     variance_by_category={"Delivery": 5.0})
    assert r.category == "Delivery"
    assert r.status == STATUS_OK  # 48 <= 45 + 5


def test_new_item_review():
    bl = load_baseline()
    line = LineItemInput(quantity=2, item_number="ZZZ999", unit_price=99.0,
                         description="Mystery widget")
    r = compare_line(line, bl)
    assert r.status == STATUS_NEW
    assert r.potential_overcharge == 0


def test_ocr_review_on_missing_fields():
    bl = load_baseline()
    # No unit price -> can't compare -> OCR REVIEW with low confidence.
    line = LineItemInput(quantity=2, item_number="10816", unit_price=None,
                         description="2 x 8-16")
    r = compare_line(line, bl)
    assert r.status == STATUS_OCR
    assert r.confidence_score < 0.6


def test_description_fallback_match_flags_review():
    bl = load_baseline()
    # Item # missing but description matches a baseline row -> matched_by desc,
    # confidence lowered -> OCR REVIEW.
    line = LineItemInput(quantity=1, item_number=None, unit_price=12.99,
                         description="2 x 8-16 #2 SPF HF/YP LUMBER")
    r = compare_line(line, bl)
    assert r.matched_by == "description"
    assert r.baseline_unit_price == 12.99


def test_math_mismatch_flagged():
    bl = load_baseline()
    # qty*price = 25.98 but line amount says 30.00 -> math mismatch.
    line = LineItemInput(quantity=2, item_number="10816", unit_price=12.99,
                         line_amount=30.00)
    r = compare_line(line, bl)
    assert r.math_mismatch is True


def test_summary_rollup():
    bl = load_baseline()
    lines = [
        LineItemInput(quantity=3, item_number="10824", unit_price=37.79, line_amount=113.37),
        LineItemInput(quantity=5, item_number="10816", unit_price=14.99, line_amount=74.95),
        LineItemInput(quantity=2, item_number="ZZZ999", unit_price=99.0, line_amount=198.0),
    ]
    results = [compare_line(l, bl) for l in lines]
    s = summarize(results)
    assert s.line_count == 3
    assert s.ok_count == 1
    assert s.over_count == 1
    assert s.review_count == 1
    assert s.total_potential_overcharge == 10.00


if __name__ == "__main__":
    # Allow running without pytest: python tests/test_compare.py
    import traceback
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    passed = 0
    for fn in fns:
        try:
            fn()
            print(f"PASS {fn.__name__}")
            passed += 1
        except Exception:
            print(f"FAIL {fn.__name__}")
            traceback.print_exc()
    print(f"\n{passed}/{len(fns)} passed")
