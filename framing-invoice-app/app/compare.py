"""
Comparison engine: the heart of the app.

Takes an extracted invoice line item plus the baseline price list and decides:
  * which baseline row it matches (by Item # first, description as fallback)
  * the per-unit difference and potential overcharge
  * a status: OK / OVER BASELINE / NEW ITEM - REVIEW / OCR REVIEW
  * a confidence score and human-readable notes

The baseline file is the SOURCE OF TRUTH. We never invent prices from the
invoice; the invoice is only used to check whether the supplier is charging
more than the known baseline.

Status rules (from the spec):
  OK                -> invoice unit price <= baseline + allowed variance
  OVER BASELINE     -> invoice unit price >  baseline + allowed variance
  NEW ITEM - REVIEW -> item number not found in baseline (no desc match either)
  OCR REVIEW        -> extraction uncertain / required fields missing, OR the
                       only match we could find was a fuzzy description match

Overcharge math (from the spec):
  difference_per_unit  = invoice_unit_price - baseline_unit_price
  potential_overcharge = max(0, difference_per_unit - allowed_variance) * qty
"""

from dataclasses import dataclass, field
from typing import Optional

from .normalize import normalize_item_number, normalize_description

# Status constants — imported elsewhere so the strings stay consistent.
STATUS_OK = "OK"
STATUS_OVER = "OVER BASELINE"
STATUS_NEW = "NEW ITEM - REVIEW"
STATUS_OCR = "OCR REVIEW"

# A line is treated as low-confidence (-> OCR REVIEW) below this threshold.
OCR_CONFIDENCE_THRESHOLD = 0.6
# Tolerance when checking qty * unit_price == line_amount (rounding/cents).
MATH_TOLERANCE = 0.02


@dataclass
class BaselineItem:
    """A single row from the Baseline Price List."""
    item_number: str
    description: str
    unit_measure: str
    category: str
    baseline_unit_price: float
    lowest_price_seen: Optional[float] = None
    highest_price_seen: Optional[float] = None
    last_seen_price: Optional[float] = None
    last_seen_invoice: Optional[str] = None
    last_seen_date: Optional[str] = None
    times_purchased: Optional[int] = None
    total_qty: Optional[float] = None
    total_paid: Optional[float] = None
    id: Optional[int] = None

    @property
    def norm_item(self) -> str:
        return normalize_item_number(self.item_number)

    @property
    def norm_desc(self) -> str:
        return normalize_description(self.description)


class Baseline:
    """Lookup index over the baseline rows.

    Builds two indexes once: one keyed by normalized item number (primary), and
    one keyed by normalized description (fallback when the item # is missing or
    OCR is uncertain).
    """

    def __init__(self, items):
        self.items = list(items)
        self._by_item = {}
        self._by_desc = {}
        for it in self.items:
            if it.norm_item:
                self._by_item.setdefault(it.norm_item, it)
            if it.norm_desc:
                self._by_desc.setdefault(it.norm_desc, it)

    def by_item_number(self, raw_item) -> Optional[BaselineItem]:
        key = normalize_item_number(raw_item)
        return self._by_item.get(key) if key else None

    def by_description(self, raw_desc) -> Optional[BaselineItem]:
        key = normalize_description(raw_desc)
        return self._by_desc.get(key) if key else None


@dataclass
class LineItemInput:
    """An extracted invoice line item, before comparison."""
    quantity: Optional[float] = None
    unit_measure: Optional[str] = None
    item_number: Optional[str] = None
    description: Optional[str] = None
    unit_price: Optional[float] = None
    line_amount: Optional[float] = None
    category: Optional[str] = None
    # Confidence the extractor assigned to THIS line (0..1). Spreadsheet imports
    # are ~1.0; OCR lines may be lower. None means "not provided" (treated 1.0).
    extract_confidence: Optional[float] = None


@dataclass
class ComparisonResult:
    """Everything the review table needs for one line."""
    item_number: str
    description: str
    quantity: Optional[float]
    unit_measure: Optional[str]
    invoice_unit_price: Optional[float]
    line_amount: Optional[float]
    category: Optional[str]
    baseline_item_id: Optional[int]
    baseline_unit_price: Optional[float]
    difference_per_unit: Optional[float]
    potential_overcharge: float
    status: str
    confidence_score: float
    matched_by: str          # "item_number" | "description" | "none"
    notes: str
    math_mismatch: bool = False


# Categories whose "baseline" is informational, not a hard material price.
DELIVERY_KEYWORDS = ("delivery", "freight", "fuel", "haul")
TAX_KEYWORDS = ("sales tax", "tax")


def categorize(line: LineItemInput) -> str:
    """Best-effort category if the invoice didn't give one explicitly.

    Tax and delivery lines are separated out so they don't get mixed in with
    material overcharge totals. Delivery stays comparable (category 'Delivery').
    """
    if line.category:
        return line.category
    desc = (line.description or "").lower()
    if any(k in desc for k in TAX_KEYWORDS):
        return "Tax"
    if any(k in desc for k in DELIVERY_KEYWORDS):
        return "Delivery"
    return "Material"


def _resolve_variance(category: str, allowed_variance: float,
                      variance_by_category: Optional[dict]) -> float:
    """Per-category variance overrides the global one when present."""
    if variance_by_category and category in variance_by_category:
        try:
            return float(variance_by_category[category])
        except (TypeError, ValueError):
            pass
    return float(allowed_variance or 0.0)


def compare_line(line: LineItemInput, baseline: Baseline,
                 allowed_variance: float = 0.0,
                 variance_by_category: Optional[dict] = None) -> ComparisonResult:
    """Compare one extracted line item against the baseline.

    `allowed_variance` is the global per-unit tolerance (default $0.00).
    `variance_by_category` optionally overrides it per category, e.g.
    {"Delivery": 5.0}.
    """
    category = categorize(line)
    variance = _resolve_variance(category, allowed_variance, variance_by_category)

    notes = []
    confidence = 1.0 if line.extract_confidence is None else float(line.extract_confidence)

    # --- Sanity: do we even have the fields needed to compare? -------------
    missing = []
    if line.unit_price is None:
        missing.append("unit price")
    if line.quantity is None:
        missing.append("quantity")
    if not (line.item_number or line.description):
        missing.append("item # / description")
    if missing:
        notes.append("Missing fields: " + ", ".join(missing))
        confidence = min(confidence, 0.4)

    # --- Math check: qty * unit_price vs printed line amount ----------------
    math_mismatch = False
    if (line.quantity is not None and line.unit_price is not None
            and line.line_amount is not None):
        calc = round(line.quantity * line.unit_price, 2)
        if abs(calc - line.line_amount) > MATH_TOLERANCE:
            math_mismatch = True
            notes.append(
                f"Math mismatch: qty x unit (${calc:.2f}) != "
                f"line amount (${line.line_amount:.2f})"
            )
            confidence = min(confidence, 0.55)

    # --- Match against baseline: item # first, description as fallback ------
    match = None
    matched_by = "none"
    if line.item_number:
        match = baseline.by_item_number(line.item_number)
        if match:
            matched_by = "item_number"
    if match is None and line.description:
        match = baseline.by_description(line.description)
        if match:
            matched_by = "description"
            # A description-only match is never fully trusted.
            notes.append(
                "Matched by description (item # missing or unmatched) — needs review"
            )
            confidence = min(confidence, 0.5)

    baseline_price = match.baseline_unit_price if match else None
    baseline_id = match.id if match else None

    # --- Difference + potential overcharge ---------------------------------
    diff_per_unit = None
    overcharge = 0.0
    if baseline_price is not None and line.unit_price is not None:
        diff_per_unit = round(line.unit_price - baseline_price, 4)
        qty = line.quantity if line.quantity is not None else 0
        overcharge = round(max(0.0, diff_per_unit - variance) * qty, 2)

    # --- Decide status -----------------------------------------------------
    if confidence < OCR_CONFIDENCE_THRESHOLD:
        # Uncertain extraction wins over everything else — a human must look.
        status = STATUS_OCR
    elif match is None:
        status = STATUS_NEW
        notes.append("Item number not found in baseline")
    elif line.unit_price is None or baseline_price is None:
        status = STATUS_OCR
    elif line.unit_price > baseline_price + variance:
        status = STATUS_OVER
        notes.append(
            f"Invoice ${line.unit_price:.2f} > baseline ${baseline_price:.2f}"
            + (f" + ${variance:.2f} variance" if variance else "")
        )
    else:
        status = STATUS_OK

    return ComparisonResult(
        item_number=str(line.item_number or ""),
        description=str(line.description or ""),
        quantity=line.quantity,
        unit_measure=line.unit_measure,
        invoice_unit_price=line.unit_price,
        line_amount=line.line_amount,
        category=category,
        baseline_item_id=baseline_id,
        baseline_unit_price=baseline_price,
        difference_per_unit=diff_per_unit,
        potential_overcharge=overcharge,
        status=status,
        confidence_score=round(confidence, 2),
        matched_by=matched_by,
        notes="; ".join(notes),
        math_mismatch=math_mismatch,
    )


@dataclass
class InvoiceSummary:
    total_invoice_amount: float = 0.0
    total_amount_checked: float = 0.0
    total_potential_overcharge: float = 0.0
    ok_count: int = 0
    over_count: int = 0
    review_count: int = 0          # NEW ITEM + OCR REVIEW
    line_count: int = 0


def summarize(results) -> InvoiceSummary:
    """Roll up a list of ComparisonResult into the summary cards."""
    s = InvoiceSummary()
    for r in results:
        s.line_count += 1
        if r.line_amount is not None:
            s.total_invoice_amount = round(s.total_invoice_amount + r.line_amount, 2)
        if r.status == STATUS_OK:
            s.ok_count += 1
        elif r.status == STATUS_OVER:
            s.over_count += 1
        else:  # NEW ITEM - REVIEW or OCR REVIEW
            s.review_count += 1
        # "Checked" = we had a baseline to compare against.
        if r.baseline_unit_price is not None and r.line_amount is not None:
            s.total_amount_checked = round(s.total_amount_checked + r.line_amount, 2)
        s.total_potential_overcharge = round(
            s.total_potential_overcharge + r.potential_overcharge, 2
        )
    return s
