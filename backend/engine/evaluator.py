# backend/engine/evaluator.py

from rules.packaged_commodities.mandatory_declarations import MANDATORY_DECLARATION_RULES


def _is_likely_imported(fused_evidence: dict) -> bool:
    """
    Simple heuristic: if a country_of_origin was found on the label at all
    (Gemini or OCR picked up SOME text there), we treat the product as
    an import and therefore country_of_origin becomes mandatory.

    If nothing was found for country_of_origin, we assume it's a
    domestic product, so a missing country_of_origin is NOT a violation.

    This is deliberately simple for now — a proper "applicability" module
    (checking category, import documents, etc.) is out of scope for this
    build phase.
    """
    coo_field = fused_evidence.get("country_of_origin", {})
    return bool(coo_field.get("value"))


def evaluate_rules(fused_evidence: dict) -> dict:
    """
    Runs every rule in MANDATORY_DECLARATION_RULES against the fused
    evidence and returns a full compliance breakdown.

    Returns a dict shaped like:
    {
        "overall_status": "COMPLIANT" | "NON_COMPLIANT",
        "total_rules_checked": int,
        "passed": int,
        "failed": int,
        "results": [ { ...per-rule result... }, ... ]
    }
    """
    results = []
    passed_count = 0
    failed_count = 0

    is_imported = _is_likely_imported(fused_evidence)

    for rule in MANDATORY_DECLARATION_RULES:
        field_name = rule["field"]
        field_data = fused_evidence.get(field_name, {})

        # Special case: country_of_origin is only actually required
        # if the product looks imported. If not imported, skip this
        # rule entirely rather than failing it.
        if field_name == "country_of_origin" and not is_imported:
            results.append({
                "rule_id": rule["id"],
                "description": rule["description"],
                "legal_reference": rule["legal_reference"],
                "field": field_name,
                "status": "NOT_APPLICABLE",
                "reason": "Product does not appear to be imported, so country of origin is not mandatory.",
                "extracted_value": field_data.get("value"),
                "verified_by_ocr": field_data.get("verified_by_ocr", False)
            })
            continue

        # Run the rule's check function against this field's evidence
        passed = rule["check"](field_data)

        if passed:
            passed_count += 1
            status = "PASS"
            reason = f"{rule['description']} — found: \"{field_data.get('value')}\""
        else:
            failed_count += 1
            status = "FAIL"
            reason = f"{rule['description']} — not found on label."

        results.append({
            "rule_id": rule["id"],
            "description": rule["description"],
            "legal_reference": rule["legal_reference"],
            "field": field_name,
            "status": status,
            "reason": reason,
            "extracted_value": field_data.get("value"),
            "verified_by_ocr": field_data.get("verified_by_ocr", False)
        })

    overall_status = "COMPLIANT" if failed_count == 0 else "NON_COMPLIANT"

    return {
        "overall_status": overall_status,
        "total_rules_checked": passed_count + failed_count,  # excludes NOT_APPLICABLE
        "passed": passed_count,
        "failed": failed_count,
        "results": results
    }


# Standalone test runner — runs the FULL pipeline end to end:
# image -> Gemini -> OCR -> fusion -> rule evaluation
if __name__ == "__main__":
    import sys
    import json
    import os

    # Allows this script to find sibling folders (extraction/, rules/) when
    # run directly, regardless of which directory you call it from.
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    from extraction.gemini_vision import extract_label_data
    from extraction.ocr import extract_text_ocr
    from extraction.evidence_fusion import fuse_evidence

    if len(sys.argv) < 2:
        print("Usage: python evaluator.py <path_to_image>")
    else:
        image_path = sys.argv[1]

        gemini_result = extract_label_data(image_path)
        ocr_result = extract_text_ocr(image_path)
        fused = fuse_evidence(gemini_result, ocr_result)

        report = evaluate_rules(fused)
        print(json.dumps(report, indent=2))