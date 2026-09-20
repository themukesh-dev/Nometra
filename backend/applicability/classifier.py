"""
Resolves, for a given classification and package evidence, which
mandatory_declarations rules actually apply to a package and whether
each is required.

This module also exposes structured trace information so the compliance
engine can explain HOW each rule reached its applicability/requirement
decision.

Responsibilities:

1. Determine whether a rule is exempted for the package.
2. Resolve conditional requirements.
3. Use package evidence where a conditional requirement depends on
   detected declarations.
4. Return the resolved rule list.
5. Provide trace metadata describing the decision path.

This module does NOT run rule check functions or evaluate scanned
evidence. That remains engine/evaluator.py's responsibility.
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

from rules.packaged_commodities.mandatory_declarations import (
    MANDATORY_DECLARATION_RULES,
)

from applicability.exceptions import (
    is_rule_exempt,
    get_exemption_reason,
)

from applicability.conditions import (
    requires_country_of_origin,
)


# --------------------------------------------------
# Conditional requirement resolvers
# --------------------------------------------------

CONDITIONAL_REQUIRED_RESOLVERS = {
    "LM-COO-01": requires_country_of_origin,
}


CONDITIONAL_REQUIRED_CONDITIONS = {
    "LM-COO-01": "requires_country_of_origin",
}


# --------------------------------------------------
# Required-status resolution
# --------------------------------------------------

def _resolve_required(
    rule: dict,
    classification: dict,
    fused_evidence: dict | None = None,
) -> bool:
    """
    Resolves whether a rule is actually required.

    Conditional rules receive package evidence so that requirements
    such as Country of Origin can be resolved using detected evidence.
    """

    resolver = CONDITIONAL_REQUIRED_RESOLVERS.get(
        rule["id"]
    )

    if resolver:

        if rule["id"] == "LM-COO-01":

            return resolver(
                classification,
                fused_evidence,
            )

        return resolver(
            classification
        )

    return rule["required"]


# --------------------------------------------------
# Trace construction
# --------------------------------------------------

def _build_trace(
    rule: dict,
    classification: dict,
    fused_evidence: dict | None,
    applicable: bool,
    required: bool,
    exempt: bool,
) -> dict:
    """
    Builds structured trace information explaining
    how applicability and required-ness were resolved.
    """

    trace = {
        "classification": {
            "commodity_type": classification.get(
                "commodity_type"
            ),
            "origin": classification.get(
                "origin"
            ),
            "sale_type": classification.get(
                "sale_type"
            ),
        },

        "applicability": {
            "applicable": applicable,
            "exempted": exempt,
        },

        "requirement": {
            "required": required,
        },
    }


    # --------------------------------------------------
    # Exemption trace
    # --------------------------------------------------

    if exempt:

        trace["applicability"]["decision_source"] = (
            "applicability.exceptions.is_rule_exempt"
        )

        trace["applicability"]["decision"] = (
            "Rule exempted for this classification."
        )

        trace["requirement"]["decision_source"] = (
            "exemption"
        )

        trace["requirement"]["decision"] = (
            "Requirement disabled because the rule "
            "is exempted."
        )

        return trace


    # --------------------------------------------------
    # Conditional requirement trace
    # --------------------------------------------------

    condition_name = CONDITIONAL_REQUIRED_CONDITIONS.get(
        rule["id"]
    )

    if condition_name:

        trace["requirement"]["decision_source"] = (
            "applicability.conditions."
            + condition_name
        )

        trace["requirement"]["condition"] = (
            condition_name
        )

        trace["requirement"]["condition_result"] = (
            required
        )

        trace["requirement"]["decision"] = (
            "Condition evaluated using package "
            "classification and available evidence."
        )

        if rule["id"] == "LM-COO-01":

            country_data = {}

            if isinstance(
                fused_evidence,
                dict,
            ):
                country_data = fused_evidence.get(
                    "country_of_origin",
                    {},
                )

            if isinstance(
                country_data,
                dict,
            ):
                country_value = country_data.get(
                    "value"
                )

                trace["requirement"][
                    "evidence_value"
                ] = country_value

                trace["requirement"][
                    "evidence_present"
                ] = bool(
                    country_value
                )

    else:

        trace["requirement"]["decision_source"] = (
            "rule.required"
        )

        trace["requirement"]["decision"] = (
            "Static requirement from rule definition."
        )


    # --------------------------------------------------
    # Applicability trace
    # --------------------------------------------------

    trace["applicability"]["decision_source"] = (
        "applicability.classifier"
    )

    trace["applicability"]["decision"] = (
        "No exemption matched this rule."
    )

    return trace


# --------------------------------------------------
# Main applicability resolver
# --------------------------------------------------

def get_applicable_rules(
    classification: dict,
    fused_evidence: dict | None = None,
) -> list:
    """
    Returns MANDATORY_DECLARATION_RULES augmented with
    classification/evidence-resolved applicability and
    requirement information.

    Each returned rule contains:

        id
        field
        description
        legal_reference
        required
        check
        applicable
        exemption_reason
        trace
    """

    resolved = []


    for rule in MANDATORY_DECLARATION_RULES:

        # --------------------------------------------------
        # 1. Determine exemption
        # --------------------------------------------------

        exempt = is_rule_exempt(
            rule["id"],
            classification,
        )

        applicable = not exempt


        # --------------------------------------------------
        # 2. Resolve required status
        # --------------------------------------------------

        if exempt:

            required = False

        else:

            required = _resolve_required(
                rule,
                classification,
                fused_evidence,
            )


        # --------------------------------------------------
        # 3. Resolve exemption reason
        # --------------------------------------------------

        exemption_reason = (
            get_exemption_reason(
                classification
            )
            if exempt
            else None
        )


        # --------------------------------------------------
        # 4. Build trace
        # --------------------------------------------------

        trace = _build_trace(
            rule=rule,
            classification=classification,
            fused_evidence=fused_evidence,
            applicable=applicable,
            required=required,
            exempt=exempt,
        )


        # --------------------------------------------------
        # 5. Return original rule + resolved metadata
        # --------------------------------------------------

        resolved.append({
            **rule,

            "applicable": applicable,

            "required": required,

            "exemption_reason": exemption_reason,

            "trace": trace,
        })


    return resolved


# --------------------------------------------------
# Convenience filter
# --------------------------------------------------

def get_applicable_required_rules(
    classification: dict,
    fused_evidence: dict | None = None,
) -> list:
    """
    Returns only rules that are both applicable and required.
    """

    return [
        rule
        for rule in get_applicable_rules(
            classification,
            fused_evidence,
        )
        if rule["applicable"]
        and rule["required"]
    ]


# --------------------------------------------------
# Standalone test runner
# --------------------------------------------------

if __name__ == "__main__":

    from classification.categories import (
        build_classification
    )


    domestic_retail = build_classification(
        origin="domestic",
        sale_type="retail",
    )

    imported_retail = build_classification(
        origin="imported",
        sale_type="retail",
    )

    india_evidence = {
        "country_of_origin": {
            "value": "India",
        }
    }

    china_evidence = {
        "country_of_origin": {
            "value": "China",
        }
    }

    no_country_evidence = {}


    test_cases = [
        (
            "domestic_retail + India evidence",
            domestic_retail,
            india_evidence,
        ),
        (
            "domestic_retail + no COO evidence",
            domestic_retail,
            no_country_evidence,
        ),
        (
            "imported_retail + no COO evidence",
            imported_retail,
            no_country_evidence,
        ),
        (
            "imported_retail + China evidence",
            imported_retail,
            china_evidence,
        ),
    ]


    for label, classification, evidence in test_cases:

        print()
        print("=" * 70)
        print(label)
        print("=" * 70)

        print(
            "CLASSIFICATION:",
            classification,
        )

        print(
            "EVIDENCE:",
            evidence,
        )

        print()

        for rule in get_applicable_rules(
            classification,
            evidence,
        ):

            print(
                rule["id"],
                "| applicable:",
                rule["applicable"],
                "| required:",
                rule["required"],
            )

            print(
                "  applicability:",
                rule["trace"]["applicability"],
            )

            print(
                "  requirement:",
                rule["trace"]["requirement"],
            )

            print()