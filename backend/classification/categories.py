"""
Defines the classification taxonomy used across the pipeline.

Per project scope: this system handles ONE overarching commodity type —
general pre-packaged commodities under the Legal Metrology (Packaged
Commodities) Rules, 2011.

The inspector does not manually select origin or sale type.

Instead:

1. PRODUCT CATEGORY is selected by the inspector as descriptive
   information.

2. ORIGIN is resolved from package evidence when possible.

3. SALE_TYPE remains an internal default of retail for the current
   prototype because the inspector is not asked to manually classify
   retail/wholesale/institutional intent.

This keeps the existing applicability architecture compatible while
removing manual legal classification from the UI.
"""

# --------------------------------------------------
# Origin dimension
# --------------------------------------------------

ORIGIN_DOMESTIC = "domestic"
ORIGIN_IMPORTED = "imported"

VALID_ORIGINS = [
    ORIGIN_DOMESTIC,
    ORIGIN_IMPORTED,
]


# --------------------------------------------------
# Sale-type dimension
# --------------------------------------------------

SALE_TYPE_RETAIL = "retail"
SALE_TYPE_WHOLESALE = "wholesale"
SALE_TYPE_INSTITUTIONAL_OR_INDUSTRIAL = (
    "institutional_or_industrial"
)

VALID_SALE_TYPES = [
    SALE_TYPE_RETAIL,
    SALE_TYPE_WHOLESALE,
    SALE_TYPE_INSTITUTIONAL_OR_INDUSTRIAL,
]


# --------------------------------------------------
# Commodity type
# --------------------------------------------------

COMMODITY_TYPE = "packaged_commodity"


# --------------------------------------------------
# Internal defaults
# --------------------------------------------------

DEFAULT_ORIGIN = ORIGIN_DOMESTIC

DEFAULT_SALE_TYPE = SALE_TYPE_RETAIL


# --------------------------------------------------
# Validation helpers
# --------------------------------------------------

def is_valid_origin(
    origin: str,
) -> bool:
    """Checks whether an origin value is recognized."""
    return origin in VALID_ORIGINS


def is_valid_sale_type(
    sale_type: str,
) -> bool:
    """Checks whether a sale type is recognized."""
    return sale_type in VALID_SALE_TYPES


# --------------------------------------------------
# Evidence helpers
# --------------------------------------------------

def _extract_evidence_value(
    fused_evidence: dict | None,
    field_name: str,
) -> str | None:
    """
    Safely extracts a normalized evidence value.

    Evidence is expected to have the form:

        {
            "country_of_origin": {
                "value": "...",
                ...
            }
        }
    """

    if not isinstance(
        fused_evidence,
        dict,
    ):
        return None

    field_data = fused_evidence.get(
        field_name,
        {},
    )

    if not isinstance(
        field_data,
        dict,
    ):
        return None

    value = field_data.get(
        "value"
    )

    if value is None:
        return None

    if not isinstance(
        value,
        str,
    ):
        value = str(value)

    value = value.strip()

    return value or None


def resolve_origin_from_evidence(
    fused_evidence: dict | None,
) -> str:
    """
    Resolves origin from package evidence.

    Current prototype logic:

    - Explicit foreign country-of-origin evidence → imported.
    - Explicit India country-of-origin evidence → domestic.
    - No usable country-of-origin evidence → domestic fallback.

    This is an evidence-based prototype classification signal, not a
    complete legal determination of import status.
    """

    country_of_origin = _extract_evidence_value(
        fused_evidence,
        "country_of_origin",
    )

    if not country_of_origin:
        return DEFAULT_ORIGIN

    normalized = country_of_origin.strip().lower()

    india_values = {
        "india",
        "ind",
        "bharat",
        "made in india",
        "manufactured in india",
    }

    for value in india_values:
        if value in normalized:
            return ORIGIN_DOMESTIC

    return ORIGIN_IMPORTED


# --------------------------------------------------
# Classification builder
# --------------------------------------------------

def build_classification(
    origin: str = DEFAULT_ORIGIN,
    sale_type: str = DEFAULT_SALE_TYPE,
) -> dict:
    """
    Builds the standard classification dict.

    Origin and sale type remain part of the backend schema for
    compatibility with the existing applicability/rule engine.

    The frontend no longer supplies these values manually.
    """

    resolved_origin = (
        origin
        if is_valid_origin(origin)
        else DEFAULT_ORIGIN
    )

    resolved_sale_type = (
        sale_type
        if is_valid_sale_type(sale_type)
        else DEFAULT_SALE_TYPE
    )

    return {
        "commodity_type": COMMODITY_TYPE,
        "origin": resolved_origin,
        "sale_type": resolved_sale_type,
    }


def build_classification_from_evidence(
    fused_evidence: dict | None = None,
    sale_type: str = DEFAULT_SALE_TYPE,
) -> dict:
    """
    Builds classification using package evidence.

    The inspector does not manually select origin.

    Sale type remains an internal retail default for the current
    prototype because the current package image pipeline does not
    establish retail/wholesale/institutional intent from evidence.
    """

    origin = resolve_origin_from_evidence(
        fused_evidence
    )

    return build_classification(
        origin=origin,
        sale_type=sale_type,
    )


# --------------------------------------------------
# Standalone test runner
# --------------------------------------------------

if __name__ == "__main__":

    india_evidence = {
        "country_of_origin": {
            "value": "India",
        }
    }

    foreign_evidence = {
        "country_of_origin": {
            "value": "China",
        }
    }

    no_country_evidence = {}

    print(
        "India:",
        build_classification_from_evidence(
            india_evidence
        ),
    )

    print(
        "China:",
        build_classification_from_evidence(
            foreign_evidence
        ),
    )

    print(
        "No COO:",
        build_classification_from_evidence(
            no_country_evidence
        ),
    )