"""
Reusable boolean predicates over a classification dict and, where
required, package evidence.

The classification dict retains the existing shape:

    {
        "commodity_type": "packaged_commodity",
        "origin": "domestic" | "imported",
        "sale_type": "retail" | "wholesale" | "institutional_or_industrial"
    }

The inspector does NOT manually select origin or sale type.

Country-of-origin applicability is therefore evidence-aware:

    - If the package contains a detected country-of-origin value,
      the declaration is evaluated.
    - If the package is classified as imported but no country-of-origin
      value was detected, the declaration is still required and can fail.
    - If the package is domestic and no country-of-origin evidence is
      present, the current prototype does not treat COO as a required
      declaration.

This preserves the existing imported-package logic while allowing
detected evidence such as "MADE IN INDIA" to be evaluated instead of
being hidden behind a manually selected "Domestic" classification.
"""

from classification.categories import (
    ORIGIN_IMPORTED,
    ORIGIN_DOMESTIC,
    SALE_TYPE_RETAIL,
    SALE_TYPE_WHOLESALE,
    SALE_TYPE_INSTITUTIONAL_OR_INDUSTRIAL,
)


# --------------------------------------------------
# Origin predicates
# --------------------------------------------------

def is_imported(
    classification: dict,
) -> bool:
    """True if the package classification is imported."""
    return (
        classification["origin"]
        == ORIGIN_IMPORTED
    )


def is_domestic(
    classification: dict,
) -> bool:
    """True if the package classification is domestic."""
    return (
        classification["origin"]
        == ORIGIN_DOMESTIC
    )


# --------------------------------------------------
# Sale-type predicates
# --------------------------------------------------

def is_retail_sale(
    classification: dict,
) -> bool:
    """True if the package is treated as retail sale."""
    return (
        classification["sale_type"]
        == SALE_TYPE_RETAIL
    )


def is_wholesale_sale(
    classification: dict,
) -> bool:
    """True if the package is treated as wholesale."""
    return (
        classification["sale_type"]
        == SALE_TYPE_WHOLESALE
    )


def is_institutional_or_industrial_sale(
    classification: dict,
) -> bool:
    """True if the package is institutional/industrial."""
    return (
        classification["sale_type"]
        == SALE_TYPE_INSTITUTIONAL_OR_INDUSTRIAL
    )


def is_non_retail_sale(
    classification: dict,
) -> bool:
    """
    True if the package is NOT treated as retail.

    Rule 3 exemptions currently use this predicate.
    """

    return (
        is_wholesale_sale(classification)
        or
        is_institutional_or_industrial_sale(
            classification
        )
    )


# --------------------------------------------------
# Evidence helper
# --------------------------------------------------

def has_country_of_origin_evidence(
    fused_evidence: dict | None,
) -> bool:
    """
    Returns True when usable country-of-origin evidence exists.

    Evidence is expected to contain:

        fused_evidence["country_of_origin"]["value"]
    """

    if not isinstance(
        fused_evidence,
        dict,
    ):
        return False

    field_data = fused_evidence.get(
        "country_of_origin",
        {},
    )

    if not isinstance(
        field_data,
        dict,
    ):
        return False

    value = field_data.get(
        "value"
    )

    if value is None:
        return False

    if not isinstance(
        value,
        str,
    ):
        value = str(value)

    return bool(
        value.strip()
    )


# --------------------------------------------------
# Country-of-origin requirement
# --------------------------------------------------

def requires_country_of_origin(
    classification: dict,
    fused_evidence: dict | None = None,
) -> bool:
    """
    Determines whether Country of Origin should be evaluated.

    Current prototype behavior:

    1. Imported classification:
       COO is required even when evidence is missing.

    2. Any detected COO evidence:
       COO is evaluated, including "India".

    3. Domestic classification with no COO evidence:
       COO is not required.

    This prevents a detected value such as "India" from being
    incorrectly displayed as NOT_APPLICABLE solely because the
    inspector did not select "Imported".
    """

    if is_imported(
        classification
    ):
        return True

    if has_country_of_origin_evidence(
        fused_evidence
    ):
        return True

    return False


# --------------------------------------------------
# Standalone test runner
# --------------------------------------------------

if __name__ == "__main__":

    from classification.categories import (
        build_classification,
    )

    domestic_retail = build_classification(
        origin="domestic",
        sale_type="retail",
    )

    imported_retail = build_classification(
        origin="imported",
        sale_type="retail",
    )

    india_evidence = {
        "country_of_origin": {
            "value": "India",
        }
    }

    no_evidence = {}

    print(
        "Domestic + India evidence:",
        requires_country_of_origin(
            domestic_retail,
            india_evidence,
        ),
    )

    print(
        "Domestic + no evidence:",
        requires_country_of_origin(
            domestic_retail,
            no_evidence,
        ),
    )

    print(
        "Imported + no evidence:",
        requires_country_of_origin(
            imported_retail,
            no_evidence,
        ),
    )