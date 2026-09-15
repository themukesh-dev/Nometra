# backend/rules/registry.py

"""
Looks up the correct rule set for a given commodity_type.

INTEGRATION NOTE (same situation as ingestion/image_upload.py):
engine/evaluator.py currently imports MANDATORY_DECLARATION_RULES
directly from rules.packaged_commodities.mandatory_declarations, and
does not go through this registry. This module is NOT yet wired into
evaluator.py — it exists so that a future refactor (when explicitly
requested) can point evaluator.py at get_rule_set() instead of a
hardcoded import, without needing to invent that lookup layer at
refactor time.

Today there is exactly ONE commodity type (see
classification.categories.COMMODITY_TYPE), so this registry has exactly
one entry. Its value is in being the single place a second rule set
would be registered later — not in doing anything clever right now.

Consumes:
- classification.categories.COMMODITY_TYPE
- rules.packaged_commodities.mandatory_declarations.MANDATORY_DECLARATION_RULES
"""

from classification.categories import COMMODITY_TYPE
from rules.packaged_commodities.mandatory_declarations import MANDATORY_DECLARATION_RULES

# Maps a commodity_type string to its rule set (a list of rule dicts,
# same shape as MANDATORY_DECLARATION_RULES). Add new entries here if
# this project ever needs a second rule set — nothing else in this
# file needs to change to support that.
RULE_REGISTRY = {
    COMMODITY_TYPE: MANDATORY_DECLARATION_RULES,
}


def is_supported_commodity_type(commodity_type: str) -> bool:
    """Checks whether a rule set is registered for this commodity_type."""
    return commodity_type in RULE_REGISTRY


def get_rule_set(commodity_type: str) -> list | None:
    """
    Returns the rule set (list of rule dicts) registered for the given
    commodity_type, or None if nothing is registered for it.

    Returns None rather than raising so callers can decide how to
    handle an unsupported commodity_type (e.g. treat as
    non-applicable, log a warning) rather than crashing the pipeline.
    """
    return RULE_REGISTRY.get(commodity_type)


def list_supported_commodity_types() -> list:
    """Returns all commodity_type values that have a registered rule set."""
    return list(RULE_REGISTRY.keys())


# Standalone test runner — same pattern as other modules in this project
if __name__ == "__main__":
    from classification.categories import COMMODITY_TYPE

    print("Supported commodity types:", list_supported_commodity_types())

    rule_set = get_rule_set(COMMODITY_TYPE)
    print(f"Rule set for '{COMMODITY_TYPE}':", [rule["id"] for rule in rule_set])

    print("Unsupported example:", get_rule_set("cosmetics"))