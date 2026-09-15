# backend/classification/categories.py

"""
Defines the classification taxonomy used across the pipeline.

Per project scope: this system handles ONE overarching commodity type —
general pre-packaged commodities under the Legal Metrology (Packaged
Commodities) Rules, 2011. There is no multi-industry categorization
(no separate "food" vs "cosmetics" rule sets).

Instead, "classification" here means the two dimensions that actually
change which declarations are legally required for a given package:

1. ORIGIN — domestic vs imported affects whether "country_of_origin"
   is mandatory. This is exactly why LM-COO-01 in
   rules/packaged_commodities/mandatory_declarations.py is marked
   required=False: it's conditional on origin, and that condition is
   resolved using the values defined here.

2. SALE_TYPE — retail vs wholesale/institutional affects whether the
   Legal Metrology (Packaged Commodities) Rules apply AT ALL. Rule 3
   of the 2011 Rules exempts packages meant for industrial or
   institutional consumers, and wholesale packages not intended for
   retail sale, from most Chapter II declarations.

These constants are meant to be consumed by (not yet implemented):
- classification/category_validator.py — validates a classification dict
- applicability/classifier.py — decides which rules apply
- applicability/exceptions.py — implements the Rule 3 exemptions
"""

# --- Origin dimension ---
ORIGIN_DOMESTIC = "domestic"
ORIGIN_IMPORTED = "imported"

VALID_ORIGINS = [ORIGIN_DOMESTIC, ORIGIN_IMPORTED]

# --- Sale-type dimension ---
SALE_TYPE_RETAIL = "retail"
SALE_TYPE_WHOLESALE = "wholesale"
SALE_TYPE_INSTITUTIONAL_OR_INDUSTRIAL = "institutional_or_industrial"

VALID_SALE_TYPES = [
    SALE_TYPE_RETAIL,
    SALE_TYPE_WHOLESALE,
    SALE_TYPE_INSTITUTIONAL_OR_INDUSTRIAL,
]

# The single commodity type this whole system is scoped to.
COMMODITY_TYPE = "packaged_commodity"

# Sensible defaults when classification signals aren't available/detected.
# Most scans are of retail packages photographed by a consumer/inspector,
# and most retail packages sold in India are domestically produced, so
# these are the safest fallback assumptions rather than guesses.
DEFAULT_ORIGIN = ORIGIN_DOMESTIC
DEFAULT_SALE_TYPE = SALE_TYPE_RETAIL


def is_valid_origin(origin: str) -> bool:
    """Checks whether a given origin value is one of the recognized values."""
    return origin in VALID_ORIGINS


def is_valid_sale_type(sale_type: str) -> bool:
    """Checks whether a given sale-type value is one of the recognized values."""
    return sale_type in VALID_SALE_TYPES


def build_classification(origin: str = DEFAULT_ORIGIN, sale_type: str = DEFAULT_SALE_TYPE) -> dict:
    """
    Builds the standard classification dict that downstream modules
    (category_validator.py, applicability/classifier.py) will consume.

    Falls back to defaults for any unrecognized value rather than raising,
    since classification signals extracted from a label photo can be
    noisy or absent. Correctness/consistency checking of a classification
    dict happens separately, in category_validator.py.
    """
    resolved_origin = origin if is_valid_origin(origin) else DEFAULT_ORIGIN
    resolved_sale_type = sale_type if is_valid_sale_type(sale_type) else DEFAULT_SALE_TYPE

    return {
        "commodity_type": COMMODITY_TYPE,
        "origin": resolved_origin,
        "sale_type": resolved_sale_type,
    }