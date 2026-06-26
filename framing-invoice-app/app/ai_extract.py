"""
AI-powered invoice/quote extraction using Claude vision.

This is the reliable path for *scanned or photographed* invoices (PDFs that are
really images, phone photos, etc.) where the plain-text reader in extract.py
finds nothing to parse. Claude looks at the document the way a person would and
returns the same structured JSON shape the rest of the app expects.

Opt-in and offline-safe:
  * Requires the `anthropic` package and an ANTHROPIC_API_KEY env var.
  * If either is missing, ai_available() returns False and extract.py silently
    falls back to the heuristic text/table parser. The app never hard-depends
    on the network.

Model + cost:
  * Defaults to claude-opus-4-8 (highest accuracy). For high invoice volume,
    set FRAMING_AI_MODEL=claude-haiku-4-5 to cut cost to well under a cent per
    invoice (lower accuracy on messy scans).
  * Adaptive thinking is on — it meaningfully improves reading of crinkled /
    low-contrast invoice photos. Structured outputs guarantee valid JSON back.
"""

import base64
import json
import os

try:
    import anthropic
    HAVE_ANTHROPIC = True
except Exception:  # pragma: no cover - depends on environment
    HAVE_ANTHROPIC = False

# Default to the most capable model; override via env for cost/volume.
MODEL = os.environ.get("FRAMING_AI_MODEL", "claude-opus-4-8")

IMAGE_MEDIA_TYPES = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".webp": "image/webp", ".bmp": "image/bmp",
    ".tif": "image/tiff", ".tiff": "image/tiff",
}

# JSON Schema the model is forced to return (structured outputs). Mirrors the
# fields /api/compare consumes. Every field is nullable so the model can leave
# blanks rather than hallucinate.
INVOICE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "vendor_name": {"type": ["string", "null"]},
        "invoice_number": {"type": ["string", "null"]},
        "invoice_date": {"type": ["string", "null"]},
        "property_or_job": {"type": ["string", "null"]},
        "customer_po": {"type": ["string", "null"]},
        "subtotal": {"type": ["number", "null"]},
        "tax": {"type": ["number", "null"]},
        "total": {"type": ["number", "null"]},
        "line_items": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "quantity": {"type": ["number", "null"]},
                    "unit_measure": {"type": ["string", "null"]},
                    "item_number": {"type": ["string", "null"]},
                    "description": {"type": ["string", "null"]},
                    "unit_price": {"type": ["number", "null"]},
                    "line_amount": {"type": ["number", "null"]},
                    "category": {"type": ["string", "null"]},
                    "extract_confidence": {"type": ["number", "null"]},
                },
                "required": ["quantity", "unit_measure", "item_number",
                             "description", "unit_price", "line_amount",
                             "category", "extract_confidence"],
            },
        },
    },
    "required": ["vendor_name", "invoice_number", "invoice_date",
                 "property_or_job", "customer_po", "subtotal", "tax", "total",
                 "line_items"],
}

PROMPT = """You are reading a building-materials supplier INVOICE or QUOTE for a \
framing contractor. Extract the header fields and every line item into the \
required JSON structure.

Rules:
- Item number / SKU is text — keep leading zeros and any letters exactly.
- Copy descriptions exactly as printed (e.g. "2 x 8-16 #2 SPF/HF/YP LUMBER").
- quantity, unit_price, line_amount are plain numbers (no "$" or commas).
- unit_measure is the unit (EACH, EA, etc.) if shown.
- category: "Delivery" for delivery/freight/fuel lines, "Tax" for sales tax \
lines, otherwise "Material".
- For each line, set extract_confidence from 0.0 to 1.0 — how sure you are you \
read the item number, quantity, and unit price correctly. Use a LOW value \
(<0.6) when the scan is blurry, a digit is ambiguous, or a field is missing. \
Do not guess prices you cannot read — leave them null and lower the confidence.
- Use null for any header field that is not visible on the page."""


def ai_available() -> bool:
    """True only when AI extraction can actually run (package + key present)."""
    return HAVE_ANTHROPIC and bool(os.environ.get("ANTHROPIC_API_KEY"))


def _document_block(path: str, ext: str):
    """Build the Claude content block for a PDF or image file."""
    with open(path, "rb") as f:
        data = base64.standard_b64encode(f.read()).decode("ascii")
    if ext == ".pdf":
        return {"type": "document",
                "source": {"type": "base64", "media_type": "application/pdf",
                           "data": data}}
    media_type = IMAGE_MEDIA_TYPES.get(ext, "image/jpeg")
    return {"type": "image",
            "source": {"type": "base64", "media_type": media_type, "data": data}}


def extract_with_ai(path: str) -> dict:
    """Run Claude vision extraction and return the standard result dict.

    On any failure (no key, API/network error, unparseable output) returns a
    dict with extraction_status == "error" and a warning, so the caller can
    fall back to the heuristic parser or let the user enter lines by hand.
    """
    ext = os.path.splitext(path)[1].lower()
    if not ai_available():
        return {"line_items": [], "warnings": ["AI extraction not configured."],
                "extraction_status": "error"}
    try:
        client = anthropic.Anthropic()
        block = _document_block(path, ext)
        response = client.messages.create(
            model=MODEL,
            max_tokens=16000,
            thinking={"type": "adaptive"},
            output_config={"format": {"type": "json_schema",
                                      "schema": INVOICE_SCHEMA}},
            messages=[{"role": "user",
                       "content": [block, {"type": "text", "text": PROMPT}]}],
        )
        # Guard the refusal stop reason before reading content.
        if response.stop_reason == "refusal":
            return {"line_items": [],
                    "warnings": ["The AI declined to read this document."],
                    "extraction_status": "error"}
        # Structured outputs guarantee the first text block is valid JSON.
        text = next((b.text for b in response.content if b.type == "text"), "")
        data = json.loads(text)
    except Exception as e:  # pragma: no cover - network/credential dependent
        return {"line_items": [],
                "warnings": [f"AI extraction failed: {e}"],
                "extraction_status": "error"}

    items = []
    for li in data.get("line_items") or []:
        conf = li.get("extract_confidence")
        items.append({
            "quantity": li.get("quantity"),
            "unit_measure": li.get("unit_measure"),
            "item_number": li.get("item_number"),
            "description": li.get("description"),
            "unit_price": li.get("unit_price"),
            "line_amount": li.get("line_amount"),
            "category": li.get("category"),
            # Default to high confidence if the model didn't score the line.
            "extract_confidence": conf if conf is not None else 0.9,
        })
    warnings = []
    if not items:
        warnings.append("No line items were detected. Add them manually below.")
    return {
        "vendor_name": data.get("vendor_name"),
        "invoice_number": data.get("invoice_number"),
        "invoice_date": data.get("invoice_date"),
        "property_or_job": data.get("property_or_job"),
        "customer_po": data.get("customer_po"),
        "subtotal": data.get("subtotal"),
        "tax": data.get("tax"),
        "total": data.get("total"),
        "line_items": items,
        "warnings": warnings,
        "extraction_status": "ai",
    }
