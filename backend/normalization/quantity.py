# backend/normalization/quantity.py

"""
Normalizes the raw "net_quantity" field from fused evidence into a
standard numeric value + unit.

Input contract: the field-data dict as produced by
extraction.evidence_fusion.fuse_evidence() for the "net_quantity" key,
i.e.:
    {"value": "500 g", "source": "gemini_vision", "verified_by_ocr": True}

Output contract: the SAME dict, unchanged, with one new key added:
    {
        ...original keys unchanged...,
        "normalized": {
            "numeric_value": float | None,
            "unit": str | None,          # standard unit symbol, e.g. "g", "ml", "count"
            "is_standard_unit": bool,
            "is_promotional": bool,
            "total_declared_value": float | None,
            "total_declared_unit": str | None,
            "parse_error": str | None
        }
    }

Keeping "value"/"source"/"verified_by_ocr" untouched means
rules.packaged_commodities.mandatory_declarations._is_present(), which
only checks field_data.get("value"), continues to work unmodified on
the output of this function.
"""

import re

# Units recognized as "standard units" for net quantity declarations
# under the Legal Metrology (Packaged Commodities) Rules, 2011.
# Weight -> grams, Volume -> millilitres, Count -> count (numbered items).
UNIT_TO_GRAMS = {
    "mg": 0.001,
    "g": 1,
    "gm": 1,
    "gms": 1,
    "kg": 1000,
}

UNIT_TO_ML = {
    "ml": 1,
    "l": 1000,
    "litre": 1000,
    "liter": 1000,
    "litres": 1000,
    "liters": 1000,
}

# Matches a number followed by a unit, e.g. "140 g", "1.5 L", "500ml"
QUANTITY_PATTERN = r"(\d+(?:\.\d+)?)\s*(mg|kg|gm|gms|g|ml|litres|liters|litre|liter|l)\b"

# Matches simple count-based declarations, e.g. "10 pieces", "20 tablets", "6 units"
COUNT_PATTERN = r"(\d+(?:\.\d+)?)\s*(pieces?|tablets?|units?|pcs?|nos?)\b"


def _parse_single_quantity(text: str):
    """
    Finds the first weight/volume/count quantity in a string and
    returns (numeric_value_in_base_unit, base_unit) or (None, None).
    base_unit is "g" for weight, "ml" for volume, "count" for counted items.
    """
    if not text:
        return None, None

    match = re.search(QUANTITY_PATTERN, text, re.IGNORECASE)
    if match:
        number = float(match.group(1))
        unit = match.group(2).lower()

        if unit in UNIT_TO_GRAMS:
            return number * UNIT_TO_GRAMS[unit], "g"
        if unit in UNIT_TO_ML:
            return number * UNIT_TO_ML[unit], "ml"

    count_match = re.search(COUNT_PATTERN, text, re.IGNORECASE)
    if count_match:
        return float(count_match.group(1)), "count"

    return None, None


def normalize_quantity(net_quantity_field: dict) -> dict:
    """
    Normalizes a net_quantity field-data dict into standard units.

    Handles two cases:
    1. Simple declarations: "500 g", "1.5 L", "10 tablets"
    2. Promotional declarations: "140 g + 50 g FREE = 190 g"
       Here, the FIRST quantity is the base pack quantity, and the
       quantity after "=" (if present) is the total declared quantity
       a consumer actually receives. Both are preserved separately,
       since compliance checks may care about either.

    Does not mutate the input dict; returns a new dict with the same
    top-level keys plus "normalized".
    """
    result = dict(net_quantity_field) if net_quantity_field else {}
    raw_value = result.get("value")

    normalized = {
        "numeric_value": None,
        "unit": None,
        "is_standard_unit": False,
        "is_promotional": False,
        "total_declared_value": None,
        "total_declared_unit": None,
        "parse_error": None
    }

    if not raw_value:
        normalized["parse_error"] = "No net_quantity value to normalize."
        result["normalized"] = normalized
        return result

    is_promotional = "+" in raw_value or "free" in raw_value.lower()
    normalized["is_promotional"] = is_promotional

    if is_promotional and "=" in raw_value:
        # Split at "=" to separate base pack quantity from total declared quantity.
        base_part, total_part = raw_value.split("=", 1)
        base_value, base_unit = _parse_single_quantity(base_part)
        total_value, total_unit = _parse_single_quantity(total_part)

        normalized["numeric_value"] = base_value
        normalized["unit"] = base_unit
        normalized["total_declared_value"] = total_value
        normalized["total_declared_unit"] = total_unit

        if base_value is None and total_value is None:
            normalized["parse_error"] = f"Could not parse promotional quantity: '{raw_value}'"

    else:
        # Simple (non-promotional) declaration — parse the whole string once.
        value, unit = _parse_single_quantity(raw_value)
        normalized["numeric_value"] = value
        normalized["unit"] = unit
        # No separate promotional total; the base quantity IS the total received.
        normalized["total_declared_value"] = value
        normalized["total_declared_unit"] = unit

        if value is None:
            normalized["parse_error"] = f"Could not parse net_quantity value: '{raw_value}'"

    # A "standard unit" per Rule 6(1)(b) means grams/kilograms, millilitres/litres,
    # or a plain count/number — i.e. we successfully resolved a recognized unit.
    normalized["is_standard_unit"] = normalized["unit"] in ("g", "ml", "count")

    result["normalized"] = normalized
    return result


# Standalone test runner — same pattern as other modules in this project
if __name__ == "__main__":
    test_cases = [
        {"value": "500 g", "source": "gemini_vision", "verified_by_ocr": True},
        {"value": "140 g + 50 g FREE = 190 g", "source": "gemini_vision", "verified_by_ocr": True},
        {"value": "1.5 L", "source": "ocr_fallback", "verified_by_ocr": False},
        {"value": None, "source": "none", "verified_by_ocr": False},
    ]
    for case in test_cases:
        print(normalize_quantity(case))