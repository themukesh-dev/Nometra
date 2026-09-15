# backend/reports/compliance_report.py

"""
Assembles the full, report-ready compliance document for one
inspection: the overall verdict plus a per-rule evidence trace.

VERIFIED INTERFACES (read directly from the actual code, not guessed):

- engine/evaluator.py's evaluate_rules() returns a dict with exactly:
    overall_status        ("COMPLIANT" | "NON_COMPLIANT")
    total_rules_checked   (int, excludes NOT_APPLICABLE)
    passed                (int)
    failed                (int)
    results                (list of per-rule dicts, each with:
                            rule_id, description, legal_reference,
                            field, status, reason, extracted_value,
                            verified_by_ocr)
  This confirms the assumption reports/evidence.py's docstring
  flagged as unverified: evaluator.py's real per-rule dicts do carry
  "rule_id", "field", "status", "reason" -- so build_evidence_trace()
  works against evaluator.py's real output, not just result.py's
  documented shape.

- database/inspections.py's get_inspection_by_id() returns a dict
  with exactly: id, timestamp, overall_status, passed, failed,
  extracted_data, compliance_report (the last two already
  json.loads()'d back into dicts). "extracted_data" is exactly the
  fused_evidence dict that was passed into save_inspection(), and
  "compliance_report" is exactly evaluate_rules()'s output dict.

This module takes inspection_id, timestamp, fused_evidence, and
compliance_report as separate arguments rather than one combined
"inspection" dict, because the two real callers name the id field
differently (api/scan.py's response uses "inspection_id";
database/inspections.py's get_inspection_by_id() uses "id") and
neither api/reports.py nor database/reports.py exist yet to settle
on one wrapping shape. Passing the four values explicitly avoids
baking in a guess about that not-yet-written wrapper.
"""

from reports.evidence import build_evidence_trace


def build_compliance_report(inspection_id: int, timestamp: str,
                             fused_evidence: dict, compliance_report: dict) -> dict:
    """
    Builds the full compliance report for one inspection.

    Args:
        inspection_id: the inspection's database id (or, if called
            before persistence, whatever id will be used for it).
        timestamp: ISO-format timestamp string for the inspection.
        fused_evidence: the dict produced by
            extraction/evidence_fusion.py's fuse_evidence() --
            same object stored as "extracted_data" by
            database/inspections.py.
        compliance_report: the dict produced by
            engine/evaluator.py's evaluate_rules() -- must contain
            "overall_status", "total_rules_checked", "passed",
            "failed", and "results" (a list of per-rule dicts).

    Returns a dict with:
        inspection_id, timestamp, overall_status,
        total_rules_checked, passed, failed, evidence_trace
    """
    evidence_trace = build_evidence_trace(fused_evidence, compliance_report["results"])

    return {
        "inspection_id": inspection_id,
        "timestamp": timestamp,
        "overall_status": compliance_report["overall_status"],
        "total_rules_checked": compliance_report["total_rules_checked"],
        "passed": compliance_report["passed"],
        "failed": compliance_report["failed"],
        "evidence_trace": evidence_trace
    }


# Standalone test runner -- exercises the real database/inspections.py
# round-trip (save -> fetch -> build report), same pattern as other
# modules in this project.
if __name__ == "__main__":
    import sys
    import os
    import json

    # Allows this script to find sibling top-level folders (database/)
    # when run directly, regardless of which directory you call it from.
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    from database.inspections import init_db, save_inspection, get_inspection_by_id

    init_db()

    fake_fused_evidence = {
        "mrp": {"value": "Rs. 45.00", "source": "gemini_vision", "verified_by_ocr": True},
        "net_quantity": {"value": None, "source": "none", "verified_by_ocr": False},
    }

    fake_compliance_report = {
        "overall_status": "NON_COMPLIANT",
        "total_rules_checked": 2,
        "passed": 1,
        "failed": 1,
        "results": [
            {
                "rule_id": "LM-MRP-01",
                "description": "Maximum Retail Price (MRP) must be declared on the label",
                "legal_reference": "Rule 6(1)(e), Legal Metrology (Packaged Commodities) Rules, 2011",
                "field": "mrp",
                "status": "PASS",
                "reason": "Maximum Retail Price (MRP) must be declared on the label — found: \"Rs. 45.00\"",
                "extracted_value": "Rs. 45.00",
                "verified_by_ocr": True
            },
            {
                "rule_id": "LM-NETQTY-01",
                "description": "Net quantity must be declared on the label",
                "legal_reference": "Rule 6(1)(b), Legal Metrology (Packaged Commodities) Rules, 2011",
                "field": "net_quantity",
                "status": "FAIL",
                "reason": "Net quantity must be declared on the label — not found on label.",
                "extracted_value": None,
                "verified_by_ocr": False
            }
        ]
    }

    new_id = save_inspection(fake_fused_evidence, fake_compliance_report)
    inspection = get_inspection_by_id(new_id)

    report = build_compliance_report(
        inspection_id=inspection["id"],
        timestamp=inspection["timestamp"],
        fused_evidence=inspection["extracted_data"],
        compliance_report=inspection["compliance_report"]
    )

    print(json.dumps(report, indent=2))