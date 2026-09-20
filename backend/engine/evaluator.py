"""
Compliance rule evaluator.

Pipeline:

    Classification
        ↓
    Package Evidence
        ↓
    Rule applicability
        ↓
    Rule requirement
        ↓
    Evidence lookup
        ↓
    Rule check
        ↓
    PASS / FAIL / NOT_APPLICABLE

The evaluator preserves:
    - legal rule metadata
    - applicability trace
    - evidence provenance
    - OCR verification status

Important:
This project currently implements a limited set of mandatory-declaration
presence checks. It should not be interpreted as a complete implementation
of the Legal Metrology (Packaged Commodities) Rules, 2011.
"""

import os
import sys


# --------------------------------------------------
# Make this file runnable directly
# --------------------------------------------------

BACKEND_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

if BACKEND_DIR not in sys.path:
    sys.path.append(BACKEND_DIR)


# --------------------------------------------------
# Imports
# --------------------------------------------------

from applicability.classifier import (
    get_applicable_rules,
)

from classification.categories import (
    build_classification,
    build_classification_from_evidence,
)

from classification.category_validator import (
    validate_classification,
)


# --------------------------------------------------
# Main evaluator
# --------------------------------------------------

def evaluate_rules(
    fused_evidence: dict,
    classification: dict | None = None,
) -> dict:
    """
    Evaluates mandatory declaration rules against
    fused evidence.

    If no classification is supplied, classification is
    resolved from the package evidence.

    The current prototype uses:

        - evidence-derived origin
        - internal retail sale-type default

    The inspector does not manually select origin or sale type.
    """

    # --------------------------------------------------
    # 1. Resolve classification
    # --------------------------------------------------

    if classification is None:

        classification = (
            build_classification_from_evidence(
                fused_evidence
            )
        )


    # --------------------------------------------------
    # 2. Validate classification
    # --------------------------------------------------

    validation = validate_classification(
        classification
    )

    if not validation["is_valid"]:

        raise ValueError(
            "Invalid classification: "
            + "; ".join(
                validation["errors"]
            )
        )


    # --------------------------------------------------
    # 3. Resolve applicable rules
    # --------------------------------------------------

    applicable_rules = get_applicable_rules(
        classification,
        fused_evidence,
    )


    results = []

    passed_count = 0
    failed_count = 0


    # --------------------------------------------------
    # 4. Evaluate every rule
    # --------------------------------------------------

    for rule in applicable_rules:

        field_name = rule["field"]

        field_data = fused_evidence.get(
            field_name,
            {}
        )


        # --------------------------------------------------
        # Common evidence information
        # --------------------------------------------------

        evidence = {
            "field": field_name,
            "value": field_data.get("value"),
            "source": field_data.get("source"),
            "verified_by_ocr": field_data.get(
                "verified_by_ocr",
                False,
            ),
        }


        # --------------------------------------------------
        # Rule applicability trace
        # --------------------------------------------------

        rule_trace = rule.get(
            "trace",
            {}
        )


        # --------------------------------------------------
        # Common legal-rule metadata
        # --------------------------------------------------

        rule_metadata = {
            "source": rule.get(
                "source"
            ),

            "implementation_scope": rule.get(
                "implementation_scope"
            ),

            "implementation_status": rule.get(
                "implementation_status"
            ),
        }


        # --------------------------------------------------
        # 4A. Rule is exempted
        # --------------------------------------------------

        if not rule["applicable"]:

            results.append({

                "rule_id": rule["id"],

                "description": rule["description"],

                "legal_reference": rule[
                    "legal_reference"
                ],

                "source": rule_metadata[
                    "source"
                ],

                "implementation_scope": rule_metadata[
                    "implementation_scope"
                ],

                "implementation_status": rule_metadata[
                    "implementation_status"
                ],

                "field": field_name,

                "status": "NOT_APPLICABLE",

                "reason": (
                    rule["exemption_reason"]
                    or
                    "Rule is not applicable to this package."
                ),

                "extracted_value": field_data.get(
                    "value"
                ),

                "verified_by_ocr": field_data.get(
                    "verified_by_ocr",
                    False,
                ),

                "evidence": evidence,

                "trace": rule_trace,

            })

            continue


        # --------------------------------------------------
        # 4B. Rule is applicable but not required
        # --------------------------------------------------

        if not rule["required"]:

            results.append({

                "rule_id": rule["id"],

                "description": rule["description"],

                "legal_reference": rule[
                    "legal_reference"
                ],

                "source": rule_metadata[
                    "source"
                ],

                "implementation_scope": rule_metadata[
                    "implementation_scope"
                ],

                "implementation_status": rule_metadata[
                    "implementation_status"
                ],

                "field": field_name,

                "status": "NOT_APPLICABLE",

                "reason": (
                    "This rule is not required for "
                    "the package classification and "
                    "no applicable evidence was detected."
                ),

                "extracted_value": field_data.get(
                    "value"
                ),

                "verified_by_ocr": field_data.get(
                    "verified_by_ocr",
                    False,
                ),

                "evidence": evidence,

                "trace": rule_trace,

            })

            continue


        # --------------------------------------------------
        # 4C. Required rule → evaluate evidence
        # --------------------------------------------------

        passed = rule["check"](
            field_data
        )


        if passed:

            passed_count += 1

            status = "PASS"

            reason = (
                f"{rule['description']} — "
                f"found: "
                f"\"{field_data.get('value')}\""
            )

        else:

            failed_count += 1

            status = "FAIL"

            reason = (
                f"{rule['description']} — "
                "not found on label."
            )


        # --------------------------------------------------
        # 4D. Store final rule result
        # --------------------------------------------------

        results.append({

            "rule_id": rule["id"],

            "description": rule["description"],

            "legal_reference": rule[
                "legal_reference"
            ],

            "source": rule_metadata[
                "source"
            ],

            "implementation_scope": rule_metadata[
                "implementation_scope"
            ],

            "implementation_status": rule_metadata[
                "implementation_status"
            ],

            "field": field_name,

            "status": status,

            "reason": reason,

            "extracted_value": field_data.get(
                "value"
            ),

            "verified_by_ocr": field_data.get(
                "verified_by_ocr",
                False,
            ),

            "evidence": evidence,

            "trace": rule_trace,

        })


    # --------------------------------------------------
    # 5. Overall compliance status
    # --------------------------------------------------

    overall_status = (
        "COMPLIANT"
        if failed_count == 0
        else "NON_COMPLIANT"
    )


    # --------------------------------------------------
    # 6. Return compliance report
    # --------------------------------------------------

    return {

        "overall_status": overall_status,

        "total_rules_checked": (
            passed_count
            + failed_count
        ),

        "passed": passed_count,

        "failed": failed_count,

        "classification": classification,

        "results": results,

    }


# --------------------------------------------------
# Standalone test runner
# --------------------------------------------------

if __name__ == "__main__":

    import json


    # --------------------------------------------------
    # Imports required only for standalone execution
    # --------------------------------------------------

    from extraction.gemini_vision import (
        extract_label_data,
    )

    from extraction.ocr import (
        extract_text_ocr,
    )

    from extraction.evidence_fusion import (
        fuse_evidence,
    )


    # --------------------------------------------------
    # Image argument
    # --------------------------------------------------

    if len(sys.argv) < 2:

        print(
            "Usage: "
            "python engine/evaluator.py "
            "<path_to_image>"
        )

        sys.exit(1)


    image_path = sys.argv[1]


    # --------------------------------------------------
    # Verify image exists
    # --------------------------------------------------

    if not os.path.exists(image_path):

        print(
            f"ERROR: Image not found: {image_path}"
        )

        sys.exit(1)


    # --------------------------------------------------
    # Run extraction
    # --------------------------------------------------

    print()
    print("=" * 70)
    print("STEP 1 — GEMINI VISION")
    print("=" * 70)

    gemini_result = extract_label_data(
        image_path
    )


    print()
    print("=" * 70)
    print("STEP 2 — OCR")
    print("=" * 70)

    ocr_result = extract_text_ocr(
        image_path
    )


    print()
    print("=" * 70)
    print("STEP 3 — EVIDENCE FUSION")
    print("=" * 70)

    fused = fuse_evidence(
        gemini_result,
        ocr_result,
    )


    print()
    print("=" * 70)
    print("STEP 4 — RULE EVALUATION")
    print("=" * 70)

    report = evaluate_rules(
        fused
    )


    # --------------------------------------------------
    # Print final report
    # --------------------------------------------------

    print()

    print(
        json.dumps(
            report,
            indent=2,
            ensure_ascii=False,
        )
    )