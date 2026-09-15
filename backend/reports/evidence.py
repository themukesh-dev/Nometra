# backend/reports/evidence.py

"""
Builds an evidence trace for each rule-check result, connecting a
compliance finding (e.g. "MRP: FAIL") back to the underlying
extracted evidence that produced it (e.g. what value was found, which
source found it -- Gemini Vision vs OCR fallback -- and whether OCR
independently verified it).

INTEGRATION NOTE: This module consumes two things:

1. fused_evidence -- the dict returned by
   extraction/evidence_fusion.py's fuse_evidence(), keyed by field
   name (e.g. "mrp", "net_quantity"), where each value is
   {"value": ..., "source": ..., "verified_by_ocr": ...}. This shape
   was read directly from evidence_fusion.py's actual code.

2. rule_results -- a list of per-rule result dicts. This module
   assumes each dict has at least "rule_id", "field", "status", and
   "reason" keys, matching the shape documented in
   engine/result.py's build_rule_result() (which documents this as
   the same shape engine/evaluator.py currently builds by hand).

   CAVEAT: engine/evaluator.py itself was not available when this
   file was written, so this assumed shape has been verified against
   result.py's docstring only, not against evaluator.py's actual
   code. This module reads fields defensively with .get() so it will
   not crash if evaluator.py's real dicts are missing a key -- but if
   evaluator.py uses different key names entirely, the trace will
   come back with nulls for those fields. Recommend confirming
   evaluator.py's real per-rule dict keys before wiring this into
   scan.py.

Why this exists separately from engine/result.py's field_data:
build_rule_result() only keeps a field's "value" and
"verified_by_ocr" (it drops "source"). This module goes back to the
full fused_evidence dict so a report can also show *how* a value was
found (Gemini Vision vs. OCR regex fallback vs. not found at all) --
useful for an inspector deciding how much to trust a flagged value.

This module has no dependency on classification, applicability, or
rules modules -- it only consumes plain dicts/lists, same as
engine/result.py.
"""


def build_evidence_trace(fused_evidence: dict, rule_results: list) -> list:
    """
    For each rule result, attaches the full supporting evidence for
    that rule's field (value, source, verified_by_ocr) pulled from
    fused_evidence, keyed by the result's "field".

    If a rule's field isn't present in fused_evidence (e.g. a rule
    that isn't tied to a single extracted field, or a result dict
    that's missing a "field" key), the evidence values fall back to
    None/"none"/False rather than raising -- this is a reporting
    layer and shouldn't crash on unusual input.
    """
    trace = []

    for result in rule_results:
        field = result.get("field")
        evidence = fused_evidence.get(field, {}) if field else {}

        trace.append({
            "rule_id": result.get("rule_id"),
            "field": field,
            "status": result.get("status"),
            "reason": result.get("reason"),
            "extracted_value": evidence.get("value"),
            "evidence_source": evidence.get("source", "none"),
            "verified_by_ocr": evidence.get("verified_by_ocr", False)
        })

    return trace


def build_evidence_report(fused_evidence: dict, rule_results: list) -> dict:
    """
    Wraps build_evidence_trace() output into a report-shaped dict,
    ready to be attached alongside a compliance_report -- e.g. before
    saving via database/inspections.py, or serving via a future
    reports API.
    """
    return {
        "evidence_trace": build_evidence_trace(fused_evidence, rule_results)
    }


# Standalone test runner -- same pattern as other modules in this project
if __name__ == "__main__":
    import json

    fake_fused_evidence = {
        "mrp": {"value": "Rs. 45.00", "source": "gemini_vision", "verified_by_ocr": True},
        "net_quantity": {"value": None, "source": "none", "verified_by_ocr": False},
    }

    fake_rule_results = [
        {
            "rule_id": "LM-MRP-01",
            "field": "mrp",
            "status": "PASS",
            "reason": "Found on label.",
        },
        {
            "rule_id": "LM-NETQTY-01",
            "field": "net_quantity",
            "status": "FAIL",
            "reason": "Not found on label.",
        },
    ]

    report = build_evidence_report(fake_fused_evidence, fake_rule_results)
    print(json.dumps(report, indent=2))