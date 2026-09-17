# backend/applicability/classifier.py

"""
Resolves, for a given classification, which mandatory_declarations
rules actually apply to a package and whether each is required.

This module also exposes structured trace information so the compliance
engine can explain HOW each rule reached its applicability/requirement
decision.

Responsibilities:

1. Determine whether a rule is exempted for the package.
2. Resolve conditional requirements.
3. Return the resolved rule list.
4. Provide trace metadata describing the decision path.

This module does NOT run rule check functions or evaluate scanned
evidence. That remains engine/evaluator.py's responsibility.
"""

import os
import sys


# --------------------------------------------------
# Make this file runnable directly
# --------------------------------------------------

# When running:
#     python applicability/classifier.py
#
# Python starts from the applicability/ directory.
# Add the backend directory to sys.path so sibling
# packages such as rules/, classification/, and
# applicability/ can be imported correctly.

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

# Rule IDs whose "required" value depends on the
# package classification rather than the static
# "required" value inside the rule definition.

CONDITIONAL_REQUIRED_RESOLVERS = {
    "LM-COO-01": requires_country_of_origin,
}


# Human-readable names for the conditional predicates.
# These are used only for traceability/reporting.

CONDITIONAL_REQUIRED_CONDITIONS = {
    "LM-COO-01": "requires_country_of_origin",
}


# --------------------------------------------------
# Required-status resolution
# --------------------------------------------------

def _resolve_required(
    rule: dict,
    classification: dict,
) -> bool:
    """
    Resolves whether a rule is actually required for
    the supplied classification.

    Static rules:
        Return the rule's static "required" value.

    Conditional rules:
        Execute the registered resolver predicate.
    """

    resolver = CONDITIONAL_REQUIRED_RESOLVERS.get(
        rule["id"]
    )

    if resolver:
        return resolver(classification)

    return rule["required"]


# --------------------------------------------------
# Trace construction
# --------------------------------------------------

def _build_trace(
    rule: dict,
    classification: dict,
    applicable: bool,
    required: bool,
    exempt: bool,
) -> dict:
    """
    Builds structured trace information explaining
    how applicability and required-ness were resolved.

    This does not perform any compliance check.
    It only records the classification decision path.
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
            "Condition evaluated for package classification."
        )

    else:

        trace["requirement"]["decision_source"] = (
            "rule.required"
        )

        trace["requirement"]["decision"] = (
            "Static requirement from rule definition."
        )


    # --------------------------------------------------
    # Applicability trace for non-exempt rules
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
) -> list:
    """
    Returns MANDATORY_DECLARATION_RULES augmented with
    classification-resolved applicability and requirement
    information.

    Each returned rule contains all original rule keys:

        id
        field
        description
        legal_reference
        required
        check

    plus:

        applicable
        exemption_reason
        trace

    "trace" explains how the applicability and requirement
    decisions were reached.
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
) -> list:
    """
    Returns only rules that are both applicable and
    required for the supplied classification.
    """

    return [
        rule
        for rule in get_applicable_rules(
            classification
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


    # --------------------------------------------------
    # Test classifications
    # --------------------------------------------------

    domestic_retail = build_classification(
        origin="domestic",
        sale_type="retail",
    )

    imported_retail = build_classification(
        origin="imported",
        sale_type="retail",
    )

    domestic_wholesale = build_classification(
        origin="domestic",
        sale_type="wholesale",
    )


    test_cases = [
        (
            "domestic_retail",
            domestic_retail,
        ),
        (
            "imported_retail",
            imported_retail,
        ),
        (
            "domestic_wholesale",
            domestic_wholesale,
        ),
    ]


    # --------------------------------------------------
    # Run tests
    # --------------------------------------------------

    for label, classification in test_cases:

        print()
        print("=" * 70)
        print(label)
        print("=" * 70)

        print(
            "CLASSIFICATION:",
            classification,
        )

        print()


        for rule in get_applicable_rules(
            classification
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