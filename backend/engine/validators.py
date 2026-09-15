# backend/engine/validators.py

"""
Validates the fused-evidence dict structurally and surfaces plausibility
warnings, BEFORE it's handed to engine/evaluator.py's rule checks.

This answers a different question than evaluator.py does. evaluator.py
(existing, unmodified) asks "is this declaration present on the label,"
via rule["check"](field_data), which only ever looks at
field_data.get("value"). This module asks two questions evaluator.py
doesn't ask at all:

1. STRUCTURE — is the fused-evidence dict shaped the way
   extraction.evidence_fusion.fuse_evidence() is supposed to produce it?
   (every expected field present, each a dict with "value"/"source"/
   "verified_by_ocr"). Catches pipeline bugs upstream, not label issues.

2. PLAUSIBILITY — for fields that HAVE been run through a
   normalization/*.py module (dates.py, quantity.py, monetary.py), does
   the parsed value look trustworthy? A field_data["normalized"] dict
   with a parse_error, or is_plausible=False, or is_standard_unit=False,
   means something WAS extracted but may be garbled/misread — a
   meaningfully different situation than nothing being found at all,
   which is all evaluator.py's current PASS/FAIL logic can express.

INTEGRATION NOTE (same situation as rules/registry.py,
applicability/classifier.py, engine/result.py): the normalization
modules (normalization/dates.py, quantity.py, monetary.py) are NOT
currently called anywhere in the pipeline — api/scan.py only calls
fuse_evidence() then evaluate_rules(), so fused_evidence field_data
dicts do not actually contain a "normalized" key today. This module
treats a missing "normalized" key as "not yet normalized" (not an
error), so it's safe to run against today's pipeline output as-is, and
will start surfacing real plausibility warnings once/if scan.py is
explicitly refactored to call the normalization functions first.

This module does NOT decide pass/fail compliance and does NOT replace
evaluator.py's rule checks — it only produces warnings alongside
whatever evaluator.py already returns.
"""

EXPECTED_FIELDS = [
    "mrp", "net_quantity", "manufacturer_name", "manufacturer_address",
    "consumer_care", "date_of_manufacture", "country_of_origin"
]

REQUIRED_FIELD_DATA_KEYS = ["value", "source", "verified_by_ocr"]


def validate_fused_evidence_structure(fused_evidence: dict) -> dict:
    """
    Checks that a fused-evidence dict has the shape
    extraction.evidence_fusion.fuse_evidence() is supposed to produce:
    every field in EXPECTED_FIELDS present, each mapping to a dict that
    has "value"/"source"/"verified_by_ocr" keys.

    Returns:
        {
            "is_valid": bool,
            "errors": [str, ...],
            "source": "engine_validators"
        }
    """
    errors = []

    if not isinstance(fused_evidence, dict):
        return {
            "is_valid": False,
            "errors": ["fused_evidence must be a dictionary."],
            "source": "engine_validators"
        }

    for field_name in EXPECTED_FIELDS:
        if field_name not in fused_evidence:
            errors.append(f"Missing expected field '{field_name}' in fused evidence.")
            continue

        field_data = fused_evidence[field_name]

        if not isinstance(field_data, dict):
            errors.append(f"Field '{field_name}' must be a dictionary, got {type(field_data).__name__}.")
            continue

        for key in REQUIRED_FIELD_DATA_KEYS:
            if key not in field_data:
                errors.append(f"Field '{field_name}' is missing required key '{key}'.")

    return {
        "is_valid": len(errors) == 0,
        "errors": errors,
        "source": "engine_validators"
    }


def _plausibility_warning_for_field(field_name: str, field_data: dict) -> dict | None:
    """
    Inspects one field's "normalized" sub-dict (if present) and returns
    a warning dict if it looks untrustworthy, or None if it looks fine
    or hasn't been normalized at all.
    """
    normalized = field_data.get("normalized")
    if not normalized:
        return None

    if normalized.get("parse_error"):
        return {
            "field": field_name,
            "issue": "parse_error",
            "message": normalized["parse_error"]
        }

    # is_plausible only exists on normalized dates.
    if normalized.get("is_plausible") is False:
        return {
            "field": field_name,
            "issue": "implausible_value",
            "message": f"Normalized value for '{field_name}' does not look plausible "
                       f"(e.g. a manufacture date in the future or unreasonably old)."
        }

    # is_standard_unit only exists on normalized net_quantity.
    if normalized.get("is_standard_unit") is False:
        return {
            "field": field_name,
            "issue": "non_standard_unit",
            "message": f"Normalized value for '{field_name}' did not resolve to a "
                       f"recognized standard unit (grams, millilitres, or count)."
        }

    return None


def collect_plausibility_warnings(fused_evidence: dict) -> list:
    """
    Runs _plausibility_warning_for_field() across every field in the
    fused-evidence dict that has been normalized, and returns the list
    of warnings found. Fields with no "normalized" key are skipped
    silently — see INTEGRATION NOTE above.
    """
    warnings = []

    for field_name, field_data in (fused_evidence or {}).items():
        if not isinstance(field_data, dict):
            continue

        warning = _plausibility_warning_for_field(field_name, field_data)
        if warning:
            warnings.append(warning)

    return warnings


def validate_evidence(fused_evidence: dict) -> dict:
    """
    Convenience entry point combining structural validation and
    plausibility warnings into one call.

    Returns:
        {
            "is_valid": bool,          # structural validity only
            "errors": [str, ...],      # structural errors
            "warnings": [dict, ...],   # plausibility warnings (non-blocking)
            "source": "engine_validators"
        }
    """
    structure_result = validate_fused_evidence_structure(fused_evidence)
    warnings = collect_plausibility_warnings(fused_evidence) if structure_result["is_valid"] else []

    return {
        "is_valid": structure_result["is_valid"],
        "errors": structure_result["errors"],
        "warnings": warnings,
        "source": "engine_validators"
    }


# Standalone test runner — same pattern as other modules in this project
if __name__ == "__main__":
    good_evidence = {
        "mrp": {"value": "MRP: Rs. 45.00", "source": "gemini_vision", "verified_by_ocr": True},
        "net_quantity": {"value": "500 g", "source": "gemini_vision", "verified_by_ocr": True},
        "manufacturer_name": {"value": "Acme Foods Pvt Ltd", "source": "gemini_vision", "verified_by_ocr": True},
        "manufacturer_address": {"value": "123 Industrial Area, Pune", "source": "gemini_vision", "verified_by_ocr": True},
        "consumer_care": {"value": "1800-123-4567", "source": "gemini_vision", "verified_by_ocr": True},
        "date_of_manufacture": {"value": "MFD: 08/2026", "source": "gemini_vision", "verified_by_ocr": True},
        "country_of_origin": {"value": None, "source": "none", "verified_by_ocr": False},
    }

    print(validate_evidence(good_evidence))

    missing_key_evidence = {"mrp": {"value": "Rs. 45"}}
    print(validate_fused_evidence_structure(missing_key_evidence))

    from normalization.quantity import normalize_quantity
    from normalization.dates import normalize_date

    evidence_with_normalization = dict(good_evidence)
    evidence_with_normalization["net_quantity"] = normalize_quantity(good_evidence["net_quantity"])
    evidence_with_normalization["date_of_manufacture"] = normalize_date(
        {"value": "MFD: 08/2050", "source": "gemini_vision", "verified_by_ocr": True}
    )
    print(collect_plausibility_warnings(evidence_with_normalization))