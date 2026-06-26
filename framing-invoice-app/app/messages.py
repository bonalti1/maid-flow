"""
Supplier message generation for flagged overcharges.

Two flavors, per the spec:
  * WhatsApp -> short, simple, direct, friendly
  * Email    -> professional, with full pricing breakdown and a polite request

These are deterministic templates (no network / API key required) so the app
works fully offline. The placeholders are filled from the flagged line item and
invoice header. Templates intentionally read naturally for a contractor to send
as-is or tweak.
"""


def _money(v):
    return f"${v:,.2f}" if isinstance(v, (int, float)) else "$?"


def whatsapp_message(*, supplier_name=None, invoice_number=None, description=None,
                     quantity=None, unit_measure=None, invoice_unit_price=None,
                     baseline_unit_price=None, difference_per_unit=None) -> str:
    """Short, friendly WhatsApp note about a price increase."""
    item = description or "this item"
    inv = invoice_number or "the latest invoice"
    diff = ""
    if difference_per_unit is not None:
        diff = f" (about {_money(difference_per_unit)} more per {unit_measure or 'unit'})"
    lines = [
        f"Hey{(' ' + supplier_name) if supplier_name else ''}, quick question 👋",
        "",
        f"On invoice {inv}, can you double-check the price on \"{item}\"?",
        f"It looks higher than our last baseline{diff}.",
    ]
    if invoice_unit_price is not None and baseline_unit_price is not None:
        lines.append(
            f"We have {_money(invoice_unit_price)} vs our usual "
            f"{_money(baseline_unit_price)}."
        )
    lines.append("")
    lines.append("Can you confirm if that's right or if it can be corrected? Thanks!")
    return "\n".join(lines)


def email_message(*, supplier_name=None, invoice_number=None, description=None,
                  quantity=None, unit_measure=None, invoice_unit_price=None,
                  baseline_unit_price=None, difference_per_unit=None) -> dict:
    """Professional email. Returns {'subject': str, 'body': str}."""
    inv = invoice_number or "[invoice number]"
    unit = unit_measure or "unit"
    subject = f"Question About Pricing on Invoice {inv}"
    diff = difference_per_unit
    if diff is None and invoice_unit_price is not None and baseline_unit_price is not None:
        diff = round(invoice_unit_price - baseline_unit_price, 2)
    body = (
        f"Hi {supplier_name or '[supplier name]'},\n\n"
        f"We noticed a price difference on the following item from "
        f"invoice/quote {inv}:\n\n"
        f"Item: {description or '[description]'}\n"
        f"Qty: {quantity if quantity is not None else '[quantity]'}\n"
        f"Invoice price: {_money(invoice_unit_price)} per {unit}\n"
        f"Our baseline price: {_money(baseline_unit_price)} per {unit}\n"
        f"Difference: {_money(diff)} per {unit}\n\n"
        "Can you please confirm whether this was intentional, or if the price "
        "can be corrected to match our baseline?\n\n"
        "Thank you."
    )
    return {"subject": subject, "body": body}


def whatsapp_invoice_message(*, supplier_name=None, invoice_number=None,
                             over_lines=None, total_overcharge=0.0) -> str:
    """One friendly WhatsApp note covering EVERY over-baseline line on an invoice.

    Tone per the spec: short, direct, friendly — summarize the increases and the
    total, then ask to work it out.
    """
    over_lines = over_lines or []
    inv = invoice_number or "your latest invoice"
    out = [f"Hi{(' ' + supplier_name) if supplier_name else ''} 👋", ""]
    out.append(f"Looking at invoice {inv} against our past invoices, a few items "
               f"came in higher than what we've been paying:")
    out.append("")
    for l in over_lines:
        desc = l.get("description") or l.get("item_number") or "item"
        unit = l.get("unit_measure") or "ea"
        out.append(
            f"• {desc}: was {_money(l.get('baseline_unit_price'))}, "
            f"now {_money(l.get('unit_price'))} per {unit} "
            f"(x{_qty(l.get('quantity'))} = +{_money(l.get('potential_overcharge'))})"
        )
    out.append("")
    out.append(f"Based on these items alone, that's about {_money(total_overcharge)} "
               f"more than our baseline.")
    out.append("Please let me know how we can work this out. Thanks!")
    return "\n".join(out)


def email_invoice_message(*, supplier_name=None, invoice_number=None,
                          over_lines=None, total_overcharge=0.0) -> dict:
    """Professional email covering every over-baseline line. Returns subject+body."""
    over_lines = over_lines or []
    inv = invoice_number or "[invoice number]"
    subject = f"Pricing Question on Invoice {inv}"
    rows = []
    for l in over_lines:
        unit = l.get("unit_measure") or "unit"
        rows.append(
            f"Item: {l.get('description') or l.get('item_number') or '[item]'}\n"
            f"  Our baseline price: {_money(l.get('baseline_unit_price'))} per {unit}\n"
            f"  This invoice: {_money(l.get('unit_price'))} per {unit}\n"
            f"  Difference: +{_money(l.get('difference_per_unit'))}/{unit} "
            f"x {_qty(l.get('quantity'))} = {_money(l.get('potential_overcharge'))}"
        )
    body = (
        f"Hi {supplier_name or '[supplier name]'},\n\n"
        f"Reviewing invoice/quote {inv} against our recent purchase history, the "
        f"following items came in higher than our baseline pricing:\n\n"
        + "\n\n".join(rows)
        + f"\n\nBased on these items alone, that is about {_money(total_overcharge)} "
        f"more than our baseline. Could you please review and let us know whether "
        f"these increases are intended, or if they can be corrected to match our "
        f"baseline?\n\nThank you."
    )
    return {"subject": subject, "body": body}


def build_invoice_messages(over_lines: list, invoice: dict,
                           total_overcharge: float) -> dict:
    """Both invoice-level messages (WhatsApp + email) for all flagged lines."""
    common = dict(
        supplier_name=invoice.get("vendor_name"),
        invoice_number=invoice.get("invoice_number"),
        over_lines=over_lines,
        total_overcharge=total_overcharge,
    )
    return {
        "whatsapp": whatsapp_invoice_message(**common),
        "email": email_invoice_message(**common),
        "line_count": len(over_lines),
        "total_overcharge": round(total_overcharge, 2),
    }


def _qty(v):
    if v is None:
        return "?"
    return int(v) if float(v).is_integer() else v


def build_messages_for_line(line: dict, invoice: dict) -> dict:
    """Convenience: build both messages for a flagged line.

    `line` and `invoice` are plain dicts (DB rows). Returns:
        {"whatsapp": str, "email": {"subject": str, "body": str}}
    """
    common = dict(
        supplier_name=invoice.get("vendor_name"),
        invoice_number=invoice.get("invoice_number"),
        description=line.get("description"),
        quantity=line.get("quantity"),
        unit_measure=line.get("unit_measure"),
        invoice_unit_price=line.get("unit_price"),
        baseline_unit_price=line.get("baseline_unit_price"),
        difference_per_unit=line.get("difference_per_unit"),
    )
    return {
        "whatsapp": whatsapp_message(**common),
        "email": email_message(**common),
    }
