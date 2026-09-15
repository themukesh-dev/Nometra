# backend/applicability/conditions.py

"""
Reusable boolean predicates over a classification dict.

A classification dict is expected to match the shape produced by
classification.categories.build_classification():

    {
        "commodity_type": "packaged_commodity",
        "origin": "domestic" | "imported",
        "sale_type": "retail" | "wholesale" | "institutional_or_industrial"
    }

This module does NOT decide which rules apply or which exemptions kick
in — that's applicability/classifier.py and applicability/exceptions.py's
job (not yet implemented). It only exposes small, named yes/no checks so
those modules (and the engine) don't each re-implement the same
comparisons against classification.categories constants.

Every function here assumes it receives an already-valid classification
dict (i.e. one that passed classification.category_validator.validate_classification()).
Callers are responsible for validating first; these predicates don't
re-check structure and will raise a KeyError on a malformed dict rather
than silently guessing.
"""

from classification.categories import (
    ORIGIN_IMPORTED,
    ORIGIN_DOMESTIC,
    SALE_TYPE_RETAIL,
    SALE_TYPE_WHOLESALE,
    SALE_TYPE_INSTITUTIONAL_OR_INDUSTRIAL,
)


def is_imported(classification: dict) -> bool:
    """True if the package's origin is imported (not domestic)."""
    return classification["origin"] == ORIGIN_IMPORTED


def is_domestic(classification: dict) -> bool:
    """True if the package's origin is domestic (not imported)."""
    return classification["origin"] == ORIGIN_DOMESTIC


def is_retail_sale(classification: dict) -> bool:
    """True if the package is intended for retail sale to a consumer."""
    return classification["sale_type"] == SALE_TYPE_RETAIL


def is_wholesale_sale(classification: dict) -> bool:
    """True if the package is a wholesale package, not intended for retail sale."""
    return classification["sale_type"] == SALE_TYPE_WHOLESALE


def is_institutional_or_industrial_sale(classification: dict) -> bool:
    """True if the package is meant for an institutional/industrial consumer."""
    return classification["sale_type"] == SALE_TYPE_INSTITUTIONAL_OR_INDUSTRIAL


def is_non_retail_sale(classification: dict) -> bool:
    """
    True if the package is NOT a retail package — i.e. wholesale or
    institutional/industrial. Rule 3 of the 2011 Rules exempts these
    from most Chapter II declarations; applicability/exceptions.py will
    use this to decide when that exemption applies.
    """
    return is_wholesale_sale(classification) or is_institutional_or_industrial_sale(classification)


def requires_country_of_origin(classification: dict) -> bool:
    """
    True if country_of_origin should be treated as mandatory for this
    package. This is exactly the condition LM-COO-01 in
    mandatory_declarations.py defers to the engine: the rule itself is
    required=False, and becomes effectively required only when the
    package is imported.
    """
    return is_imported(classification)


# Standalone test runner — same pattern as other modules in this project
if __name__ == "__main__":
    from classification.categories import build_classification

    domestic_retail = build_classification(origin="domestic", sale_type="retail")
    imported_retail = build_classification(origin="imported", sale_type="retail")
    domestic_wholesale = build_classification(origin="domestic", sale_type="wholesale")

    for label, classification in [
        ("domestic_retail", domestic_retail),
        ("imported_retail", imported_retail),
        ("domestic_wholesale", domestic_wholesale),
    ]:
        print(label, {
            "is_imported": is_imported(classification),
            "is_retail_sale": is_retail_sale(classification),
            "is_non_retail_sale": is_non_retail_sale(classification),
            "requires_country_of_origin": requires_country_of_origin(classification),
        })