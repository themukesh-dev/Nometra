# backend/applicability/classifier.py

"""
Resolves, for a given classification, which mandatory_declarations
rules actually apply to a package and whether each is required.

MANDATORY_DECLARATION_RULES (rules/packaged_commodities/mandatory_declarations.py)
is deliberately classification-agnostic — it just lists every possible
declaration rule with a static "required" flag. Two things it can't
answer on its own:

1. Is this rule exempted for this package? (wholesale/institutional
   packages are exempted from some rules — see applicability/exceptions.py)
2. For rules marked required=False because they're CONDITIONAL
   (currently only LM-COO-01 / country_of_origin), is the condition
   actually true for this package? (see applicability/conditions.py)

This module combines both to produce one resolved list the engine can
iterate over without knowing about classification, exemptions, or
conditions itself.

Consumes:
- rules.packaged_commodities.mandatory_declarations.MANDATORY_DECLARATION_RULES
- applicability.exceptions.is_rule_exempt() / get_exemption_reason()
- applicability.conditions.requires_country_of_origin()

Does NOT run any "check" functions or evaluate a scanned package — that
remains engine/evaluator.py's job. This module only resolves
applicability/required-ness ahead of time.
"""

from rules.packaged_commodities.mandatory_declarations import MANDATORY_DECLARATION_RULES
from applicability.exceptions import is_rule_exempt, get_exemption_reason
from applicability.conditions import requires_country_of_origin

# Rule IDs whose "required" flag is conditional rather than static, and
# the predicate (from conditions.py) that resolves the condition for a
# given classification. Currently only country_of_origin is conditional;
# add future conditional rule IDs here rather than special-casing them
# inline below.
CONDITIONAL_REQUIRED_RESOLVERS = {
    "LM-COO-01": requires_country_of_origin,
}


def _resolve_required(rule: dict, classification: dict) -> bool:
    """
    Resolves whether a rule is actually required for this classification.
    Static rules (required=True/False with no entry in
    CONDITIONAL_REQUIRED_RESOLVERS) just return their static flag.
    Conditional rules defer to their resolver predicate instead.
    """
    resolver = CONDITIONAL_REQUIRED_RESOLVERS.get(rule["id"])
    if resolver:
        return resolver(classification)
    return rule["required"]


def get_applicable_rules(classification: dict) -> list:
    """
    Returns MANDATORY_DECLARATION_RULES augmented with classification-
    resolved applicability, for a single package's classification.

    Each item in the returned list has all the original rule keys
    ("id", "field", "description", "legal_reference", "check") plus:
        "applicable": bool   # False if exempted under Rule 3
        "required": bool     # resolved required-ness (only meaningful
                              # when applicable is True)
        "exemption_reason": str | None
    """
    resolved = []

    for rule in MANDATORY_DECLARATION_RULES:
        exempt = is_rule_exempt(rule["id"], classification)

        resolved.append({
            **rule,
            "applicable": not exempt,
            "required": False if exempt else _resolve_required(rule, classification),
            "exemption_reason": get_exemption_reason(classification) if exempt else None,
        })

    return resolved


def get_applicable_required_rules(classification: dict) -> list:
    """
    Convenience filter: only the rules that are both applicable AND
    required for this classification. This is the list the engine most
    likely wants when deciding what actually constitutes a violation.
    """
    return [
        rule for rule in get_applicable_rules(classification)
        if rule["applicable"] and rule["required"]
    ]


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
        print(f"--- {label} ---")
        for rule in get_applicable_rules(classification):
            print(rule["id"], "applicable:", rule["applicable"], "required:", rule["required"])