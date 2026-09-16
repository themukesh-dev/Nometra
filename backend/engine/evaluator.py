# backend/engine/evaluator.py

from rules.packaged_commodities.mandatory_declarations import (
    MANDATORY_DECLARATION_RULES,
)
from applicability.classifier import get_applicable_rules
from classification.categories import build_classification
from classification.category_validator import validate_classification


def evaluate_rules(
    fused_evidence: dict,
    classification: dict | None = None,
) -> dict:
    """
    Evaluates the mandatory declaration rules against fused evidence.

    Classification determines which rules are applicable and required.
    If no classification is supplied, the project's default classification
    is used:

        origin = domestic
        sale_type = retail

    This avoids incorrectly inferring that a product is imported merely
    because a country-of-origin value was extracted from the label.
    """

    if classification is None:
        classification = build_classification()

    validation = validate_classification(classification)

    if not validation["is_valid"]:
        raise ValueError(
            "Invalid classification: "
            + "; ".join(validation["errors"])
        )

    applicable_rules = get_applicable_rules(classification)

    results = []
    passed_count = 0
    failed_count = 0

    for rule in applicable_rules:
        field_name = rule["field"]
        field_data = fused_evidence.get(field_name, {})

        # Rule is exempted under the resolved applicability classification.
        if not rule["applicable"]:
            results.append({
                "rule_id": rule["id"],
                "description": rule["description"],
                "legal_reference": rule["legal_reference"],
                "field": field_name,
                "status": "NOT_APPLICABLE",
                "reason": rule["exemption_reason"]
                    or "Rule is not applicable to this package.",
                "extracted_value": field_data.get("value"),
                "verified_by_ocr": field_data.get(
                    "verified_by_ocr",
                    False,
                ),
            })
            continue

        # Rule is applicable but not required for this classification.
        if not rule["required"]:
            results.append({
                "rule_id": rule["id"],
                "description": rule["description"],
                "legal_reference": rule["legal_reference"],
                "field": field_name,
                "status": "NOT_APPLICABLE",
                "reason": (
                    "This rule is not required for the package "
                    "classification."
                ),
                "extracted_value": field_data.get("value"),
                "verified_by_ocr": field_data.get(
                    "verified_by_ocr",
                    False,
                ),
            })
            continue

        # Required rule — actually evaluate the extracted evidence.
        passed = rule["check"](field_data)

        if passed:
            passed_count += 1
            status = "PASS"
            reason = (
                f"{rule['description']} — "
                f"found: \"{field_data.get('value')}\""
            )
        else:
            failed_count += 1
            status = "FAIL"
            reason = (
                f"{rule['description']} — "
                "not found on label."
            )

        results.append({
            "rule_id": rule["id"],
            "description": rule["description"],
            "legal_reference": rule["legal_reference"],
            "field": field_name,
            "status": status,
            "reason": reason,
            "extracted_value": field_data.get("value"),
            "verified_by_ocr": field_data.get(
                "verified_by_ocr",
                False,
            ),
        })

    overall_status = (
        "COMPLIANT"
        if failed_count == 0
        else "NON_COMPLIANT"
    )

    return {
        "overall_status": overall_status,
        "total_rules_checked": passed_count + failed_count,
        "passed": passed_count,
        "failed": failed_count,
        "results": results,
    }


# Standalone test runner
if __name__ == "__main__":
    import sys
    import json
    import os

    sys.path.append(
        os.path.dirname(
            os.path.dirname(
                os.path.abspath(__file__)
            )
        )
    )

    from extraction.gemini_vision import extract_label_data
    from extraction.ocr import extract_text_ocr
    from extraction.evidence_fusion import fuse_evidence

    if len(sys.argv) < 2:
        print("Usage: python evaluator.py <path_to_image>")
    else:
        image_path = sys.argv[1]

        gemini_result = extract_label_data(image_path)
        ocr_result = extract_text_ocr(image_path)
        fused = fuse_evidence(
            gemini_result,
            ocr_result,
        )

        report = evaluate_rules(fused)

        print(json.dumps(report, indent=2))