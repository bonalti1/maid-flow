"""
Normalization helpers for matching invoice line items against the baseline.

Two values get normalized for every line item:

1. The item number / SKU  -> normalize_item_number()
2. The free-text description -> normalize_description()

The golden rule from the spec is: item numbers are TEXT, not numbers.  Some
SKUs contain letters (e.g. "LVL1616", "10410P", "1616SSNV"), and Excel loves to
turn "10128" into the float 10128.0.  We always coerce to a clean trimmed
upper-case string so "10128", 10128 and 10128.0 all match.

Descriptions are normalized so that the same material written slightly
differently still matches when the item number is missing or unreadable:
lower-cased, whitespace collapsed, and the symbols contractors mix up the most
(the "x" in "2 x 8", inch marks, fancy quotes, hyphens) are standardized.
"""

import re


def normalize_item_number(value) -> str:
    """Return a stable string key for an item number / SKU.

    Handles the common Excel/OCR quirks:
      * floats that should be ints   10128.0  -> "10128"
      * stray whitespace             " 10128 " -> "10128"
      * mixed case letters           "lvl1616" -> "LVL1616"
    Returns "" when there is genuinely no item number.
    """
    if value is None:
        return ""
    # Numbers coming out of openpyxl arrive as int/float. "10128.0" -> "10128".
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    text = str(value).strip()
    if text.endswith(".0") and text[:-2].isdigit():
        text = text[:-2]
    # Drop internal spaces so "LVL 1616" == "LVL1616"; upper-case for stability.
    text = re.sub(r"\s+", "", text)
    return text.upper()


# Unicode inch / quote marks that OCR and copy-paste love to introduce.
_FANCY_QUOTES = {
    "“": '"', "”": '"',   # “ ”  -> "
    "‘": "'", "’": "'",   # ‘ ’  -> '
    "″": '"', "′": "'",   # ″ ′ (prime marks) -> " '
    "×": "x",                  # ×    -> x  (multiplication sign)
    "–": "-", "—": "-",   # – —  -> -
}


def normalize_description(value) -> str:
    """Return a normalized description used for fuzzy/fallback matching.

    Steps: lower-case, standardize inch marks / quotes / the "x" separator /
    hyphens, collapse repeated whitespace, and tidy the spacing around the
    "x" and "-" separators so "2 x 8 - 16" and "2X8-16" collapse to the same
    string.
    """
    if value is None:
        return ""
    text = str(value)
    for bad, good in _FANCY_QUOTES.items():
        text = text.replace(bad, good)
    text = text.lower()
    # Treat a standalone "x" between dimensions as a separator regardless of
    # surrounding spaces: "2 x 8" / "2x8" / "2  x  8" -> "2x8".
    text = re.sub(r"\s*x\s*", "x", text)
    # Normalize spacing around hyphens: "8 - 16" -> "8-16".
    text = re.sub(r"\s*-\s*", "-", text)
    # Collapse any remaining runs of whitespace.
    text = re.sub(r"\s+", " ", text)
    return text.strip()
