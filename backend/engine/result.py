# backend/engine/result.py

"""
Standardizes the shape of a single rule-check result and the overall
compliance summary, so that shape is defined in one place instead of
being hand-built inline wherever a report is constructed.

INTEGRATION NOTE (same situation as rules/registry.py and
applicability/classifier.py): engine/evaluator.py currently builds its
per-rule and summary dicts inline by hand, and does NOT yet call into
this module. This file is not wired into evaluator.py — it exists so
that a future refactor (when explicitly requested) has this shape
ready to import instead of re-deriving it at refactor time.

Status values:
    "PASS"           — rule's check() returned True
    "FAIL"           — rule's check() returned False, and the rule
                        was required and applicable
    "NOT_APPLICABLE" — rule was applicable but not required for this
                        classification (e.g. evaluator.py's current
                        country_of_origin heuristic when not imported)
    "EXEMPT"         — rule was exempted entirely for this
                        classification (applicability/exceptions.py's
                        Rule 3 wholesale/institutional exemption).
                        Not yet produced by evaluator.py today, since
                        evaluator.py doesn't consume classification —
                        included here so the shape exists once it does.

Consumes nothing beyond plain dicts/lists — this module has no
dependency on classification, applicability, or rules modules, so it
can be safely imported without pulling in the rest of the applicability
layer.
"""

STATUS_PASS = "PASS"
STATUS_FAIL = "FAIL"
STATUS_NOT_APPLICABLE = "NOT_APPLICABLE"
STATUS_EXEMPT = "EXEMPT"

VALID_STATUSES = [STATUS_PASS, STATUS_FAIL, STATUS_NOT_APPLICABLE, STATUS_EXEMPT]

# Statuses that count as an actual, actionable non-compliance. Everything
# else (PASS, NOT_APPLICABLE, EXEMPT) does not count against the package.
FAILING_STATUSES = [STATUS_FAIL]


def build_rule_result(rule: dict, status: str, reason: str, field_data: dict = None) -> dict:
    """
    Builds a single rule-check result dict with a consistent shape,
    matching the keys evaluator.py currently produces by hand:
        rule_id, description, legal_reference, field, status, reason,
        extracted_value, verified_by_ocr

    Args:
        rule: a rule dict from mandatory_declarations.py (or an
              applicability-resolved rule dict from classifier.py —
              both have "id", "description", "legal_reference", "field").
        status: one of VALID_STATUSES.
        reason: human-readable explanation, same role as evaluator.py's
                inline reason strings.
        field_data: the fused-evidence dict for this rule's field, e.g.
                    {"value": ..., "verified_by_ocr": ...}. Optional,
                    since NOT_APPLICABLE/EXEMPT results may have no
                    field_data to point to.
    """
    if status not in VALID_STATUSES:
        raise ValueError(f"Invalid status '{status}'; must be one of {VALID_STATUSES}.")

    field_data = field_data or {}

    return {
        "rule_id": rule["id"],
        "description": rule["description"],
        "legal_reference": rule["legal_reference"],
        "field": rule["field"],
        "status": status,
        "reason": reason,
        "extracted_value": field_data.get("value"),
        "verified_by_ocr": field_data.get("verified_by_ocr", False)
    }


def build_summary(results: list) -> dict:
    """
    Builds the overall summary dict from a list of per-rule results
    (as produced by build_rule_result()), matching the top-level shape
    evaluator.py currently returns:
        overall_status, total_rules_checked, passed, failed, results

    total_rules_checked counts only PASS/FAIL results, same as
    evaluator.py's current behavior of excluding NOT_APPLICABLE from
    the count. EXEMPT results are excluded for the same reason.
    """
    passed_count = sum(1 for r in results if r["status"] == STATUS_PASS)
    failed_count = sum(1 for r in results if r["status"] in FAILING_STATUSES)

    overall_status = "COMPLIANT" if failed_count == 0 else "NON_COMPLIANT"

    return {
        "overall_status": overall_status,
        "total_rules_checked": passed_count + failed_count,
        "passed": passed_count,
        "failed": failed_count,
        "results": results
    }


# Standalone test runner — same pattern as other modules in this project
if __name__ == "__main__":
    fake_rule = {
        "id": "LM-MRP-01",
        "field": "mrp",
        "description": "Maximum Retail Price (MRP) must be declared on the label",
        "legal_reference": "Rule 6(1)(e), Legal Metrology (Packaged Commodities) Rules, 2011",
    }
    fake_field_data = {"value": "MRP: Rs. 45.00", "verified_by_ocr": True}

    pass_result = build_rule_result(fake_rule, STATUS_PASS, "Found on label.", fake_field_data)
    fail_result = build_rule_result(fake_rule, STATUS_FAIL, "Not found on label.")
    exempt_result = build_rule_result(fake_rule, STATUS_EXEMPT, "Exempted under Rule 3.")

    print(pass_result)
    print(fail_result)
    print(exempt_result)
    print(build_summary([pass_result, fail_result, exempt_result]))