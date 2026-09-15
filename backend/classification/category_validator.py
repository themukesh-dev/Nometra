# backend/classification/category_validator.py

"""
Validates classification dicts before they're used by the applicability
layer to decide which Legal Metrology rules apply.

A classification dict is expected to look like what
classification.categories.build_classification() returns:

    {
        "commodity_type": "packaged_commodity",
        "origin": "domestic" | "imported",
        "sale_type": "retail" | "wholesale" | "institutional_or_industrial"
    }

This module does NOT re-decide values or apply fallback defaults itself —
that's build_classification()'s job. Instead, it checks whether a
classification dict is well-formed and legally meaningful, and flags
anything that looks off, so a bad/incomplete classification doesn't
silently reach the rule engine.
"""

from classification.categories import (
    COMMODITY_TYPE,
    VALID_ORIGINS,
    VALID_SALE_TYPES,
    is_valid_origin,
    is_valid_sale_type,
)

REQUIRED_KEYS = ["commodity_type", "origin", "sale_type"]


def validate_classification(classification: dict) -> dict:
    """
    Checks a classification dict for structural and value correctness.

    Args:
        classification: dict expected to match the shape produced by
                         categories.build_classification().

    Returns:
        {
            "is_valid": bool,
            "errors": [str, ...],   # empty if is_valid is True
            "source": "category_validator"
        }
    """
    errors = []

    if not isinstance(classification, dict):
        return {
            "is_valid": False,
            "errors": ["Classification must be a dictionary."],
            "source": "category_validator"
        }

    # --- Structural check: all required keys present ---
    for key in REQUIRED_KEYS:
        if key not in classification:
            errors.append(f"Missing required classification key: '{key}'.")

    # If keys are missing outright, no point checking their values.
    if errors:
        return {
            "is_valid": False,
            "errors": errors,
            "source": "category_validator"
        }

    # --- Value checks ---
    commodity_type = classification["commodity_type"]
    origin = classification["origin"]
    sale_type = classification["sale_type"]

    if commodity_type != COMMODITY_TYPE:
        errors.append(
            f"Unrecognized commodity_type '{commodity_type}'; "
            f"this system only handles '{COMMODITY_TYPE}'."
        )

    if not is_valid_origin(origin):
        errors.append(
            f"Invalid origin '{origin}'; must be one of {VALID_ORIGINS}."
        )

    if not is_valid_sale_type(sale_type):
        errors.append(
            f"Invalid sale_type '{sale_type}'; must be one of {VALID_SALE_TYPES}."
        )

    return {
        "is_valid": len(errors) == 0,
        "errors": errors,
        "source": "category_validator"
    }


# Standalone test runner — same pattern as other modules in this project
if __name__ == "__main__":
    from classification.categories import build_classification

    test_classification = build_classification()
    result = validate_classification(test_classification)
    print(result)