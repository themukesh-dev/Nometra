# backend/normalization/monetary.py

"""
Normalizes the raw "mrp" field from fused evidence into a structured,
comparable monetary value.

Input contract: the field-data dict as produced by
extraction.evidence_fusion.fuse_evidence() for the "mrp" key, e.g.:
    {"value": "MRP: Rs. 45.00 (Incl. of all taxes)", "source": "gemini_vision", "verified_by_ocr": True}

Handles the shapes the Gemini extraction prompt and the OCR fallback
pattern (see extraction.evidence_fusion.OCR_PATTERNS["mrp"]) can produce:
    "MRP: Rs. 45.00"
    "M.R.P ₹99"
    "MRP Rs 45.00 (incl. of all taxes)"
    "₹1,200.50"

Output contract: the SAME dict, unchanged, with one new key added:
    {
        ...original keys unchanged...,
        "normalized": {
            "numeric_value": float | None,
            "currency": str | None,       # "INR" if a value was found, else None
            "is_tax_inclusive": bool,      # True if label text says "incl. of all taxes"
            "parse_error": str | None
        }
    }

Keeping "value"/"source"/"verified_by_ocr" untouched means
rules.packaged_commodities.mandatory_declarations._is_present(), which
only checks field_data.get("value"), continues to work unmodified on
the output of this function.
"""

import re

# Matches a number after an MRP/Rs/₹ marker, allowing thousands separators
# and up to 2 decimal places, e.g. "45.00", "1,200.50", "99".
AMOUNT_PATTERN = r"(?:mrp|m\.r\.p|rs\.?|₹)\s*[:\-]?\s*([\d,]+(?:\.\d{1,2})?)"

# Fallback: if no MRP/Rs/₹ marker is present, still try to grab a plain
# decimal-looking number so a bare value like "45.00" still normalizes.
BARE_NUMBER_PATTERN = r"([\d,]+(?:\.\d{1,2})?)"

# Loosely matches "inclusive of all taxes" style wording, allowing for
# common abbreviations ("incl.") and punctuation variance.
TAX_INCLUSIVE_PATTERN = r"incl(?:usive|\.)?\s*(?:of)?\s*(?:all)?\s*tax(?:es)?"


def _parse_amount(raw_value: str):
    """
    Tries to find a numeric amount preceded by an MRP/Rs/₹ marker first
    (more specific), then falls back to any bare decimal-looking number.
    Returns a float, or None if nothing could be parsed.
    """
    match = re.search(AMOUNT_PATTERN, raw_value, re.IGNORECASE)
    if not match:
        match = re.search(BARE_NUMBER_PATTERN, raw_value)

    if not match:
        return None

    amount_str = match.group(1).replace(",", "")
    try:
        return float(amount_str)
    except ValueError:
        return None


def normalize_monetary(mrp_field: dict) -> dict:
    """
    Normalizes an mrp field-data dict into a structured monetary value.

    Does not mutate the input dict; returns a new dict with the same
    top-level keys plus "normalized".
    """
    result = dict(mrp_field) if mrp_field else {}
    raw_value = result.get("value")

    normalized = {
        "numeric_value": None,
        "currency": None,
        "is_tax_inclusive": False,
        "parse_error": None
    }

    if not raw_value:
        normalized["parse_error"] = "No mrp value to normalize."
        result["normalized"] = normalized
        return result

    amount = _parse_amount(raw_value)

    if amount is None:
        normalized["parse_error"] = f"Could not parse mrp value: '{raw_value}'"
        result["normalized"] = normalized
        return result

    normalized["numeric_value"] = amount
    # Only currency this project deals with — Legal Metrology (Packaged
    # Commodities) Rules, 2011 is an Indian regulation, MRP is always ₹/Rs.
    normalized["currency"] = "INR"
    normalized["is_tax_inclusive"] = bool(re.search(TAX_INCLUSIVE_PATTERN, raw_value, re.IGNORECASE))

    result["normalized"] = normalized
    return result


# Standalone test runner — same pattern as other modules in this project
if __name__ == "__main__":
    test_cases = [
        {"value": "MRP: Rs. 45.00 (Incl. of all taxes)", "source": "gemini_vision", "verified_by_ocr": True},
        {"value": "M.R.P ₹99", "source": "ocr_fallback", "verified_by_ocr": False},
        {"value": "₹1,200.50", "source": "gemini_vision", "verified_by_ocr": True},
        {"value": None, "source": "none", "verified_by_ocr": False},
    ]
    for case in test_cases:
        print(normalize_monetary(case))