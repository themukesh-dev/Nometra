# backend/applicability/exceptions.py

"""
Implements the Rule 3 exemption from the Legal Metrology (Packaged
Commodities) Rules, 2011: packages intended for wholesale or for
institutional/industrial consumers (i.e. NOT retail sale) are exempted
from most Chapter II declarations.

SIMPLIFICATION NOTE (intentional, for hackathon scope):
Rule 3's real exemption is fact-specific and doesn't blanket-exempt
every declaration — e.g. some declarations still apply to wholesale
packages in certain circumstances. Modeling that full nuance is out of
scope for this project. Instead, RULE_3_EXEMPTED_RULE_IDS below is an
explicit, editable list of which mandatory_declarations.py rule IDs are
treated as exempted when a package is non-retail. This keeps the
simplification visible and easy to correct, rather than hidden inside
conditional logic.

Consumes:
- applicability.conditions.is_non_retail_sale() to detect wholesale/
  institutional packages
- rule "id" values as defined in
  rules.packaged_commodities.mandatory_declarations.MANDATORY_DECLARATION_RULES

Does NOT decide which rules apply overall — that's
applicability/classifier.py's job (not yet implemented). This module only
answers: "given a classification, which rule IDs are exempted?"
"""

from applicability.conditions import is_non_retail_sale

# Rule IDs exempted from the mandatory_declarations rule set when a
# package is wholesale or institutional/industrial (i.e. not retail).
# MRP and consumer-care details are consumer-facing declarations that
# don't apply when there's no retail consumer in the transaction.
# Net quantity and date of manufacture are left OUT of this list
# deliberately — those still commonly apply to wholesale packages in
# practice, so they are NOT exempted here.
RULE_3_EXEMPTED_RULE_IDS = [
    "LM-MRP-01",
    "LM-CONSCARE-01",
]


def get_exempted_rule_ids(classification: dict) -> list:
    """
    Returns the list of mandatory_declarations rule IDs that are
    exempted for the given classification, under the Rule 3
    wholesale/institutional exemption.

    Returns an empty list for retail packages (i.e. no exemption).
    """
    if not is_non_retail_sale(classification):
        return []

    return list(RULE_3_EXEMPTED_RULE_IDS)


def is_rule_exempt(rule_id: str, classification: dict) -> bool:
    """
    Convenience check: is this specific rule ID exempted for this
    classification? Used by the engine when deciding whether a failed
    rule should actually count as a violation.
    """
    return rule_id in get_exempted_rule_ids(classification)


def get_exemption_reason(classification: dict) -> str | None:
    """
    Returns a human-readable reason string for compliance reports when
    an exemption applies, or None if no exemption applies. Kept
    separate from get_exempted_rule_ids() so reports can explain WHY
    a rule was skipped, not just that it was.
    """
    if not is_non_retail_sale(classification):
        return None

    return (
        f"Package classified as sale_type='{classification['sale_type']}' "
        f"(not retail) — exempted under Rule 3, Legal Metrology "
        f"(Packaged Commodities) Rules, 2011."
    )


# Standalone test runner — same pattern as other modules in this project
if __name__ == "__main__":
    from classification.categories import build_classification

    retail = build_classification(origin="domestic", sale_type="retail")
    wholesale = build_classification(origin="domestic", sale_type="wholesale")

    for label, classification in [("retail", retail), ("wholesale", wholesale)]:
        print(label, {
            "exempted_rule_ids": get_exempted_rule_ids(classification),
            "exemption_reason": get_exemption_reason(classification),
        })