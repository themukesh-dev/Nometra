
# backend/rules/packaged_commodities/mandatory_declarations.py

"""
Selected Legal Metrology compliance rules used by the Nometra prototype.

Legal basis:
    Legal Metrology (Packaged Commodities) Rules, 2011
    including applicable amendments.

Rule source:
    Department of Consumer Affairs, Government of India

Implementation scope:
    Nometra currently implements selected mandatory-declaration
    presence checks. These rules do NOT represent a complete
    implementation of all requirements, exceptions, measurements,
    formatting conditions, or amendments contained in the Rules.

The metadata in each rule allows the compliance engine to retain
the legal source and implementation scope alongside the decision.
"""


# --------------------------------------------------
# Rule-set metadata
# --------------------------------------------------

RULE_SET_METADATA = {
    "name": "Legal Metrology (Packaged Commodities) Rules, 2011",

    "authority": (
        "Department of Consumer Affairs, "
        "Ministry of Consumer Affairs, Food and Public Distribution, "
        "Government of India"
    ),

    "baseline": "2011",

    "source_status": (
        "Government-published rules and applicable amendments"
    ),

    "implementation_scope": (
        "Selected mandatory-declaration presence checks "
        "for the Nometra prototype"
    ),

    "completeness": "partial",

    "disclaimer": (
        "This rule set is a prototype subset and does not constitute "
        "complete legal-compliance coverage of the Legal Metrology "
        "(Packaged Commodities) Rules, 2011."
    ),
}


# --------------------------------------------------
# Basic presence validator
# --------------------------------------------------

def _is_present(field_data: dict) -> bool:
    """
    A field passes the basic presence check if it contains
    a non-empty extracted value.

    This is intentionally a presence check only.
    It does not validate the complete legal formatting or
    substantive requirements of the declaration.
    """
    return bool(
        field_data
        and field_data.get("value")
    )


# --------------------------------------------------
# Rule registry
# --------------------------------------------------

MANDATORY_DECLARATION_RULES = [

    # --------------------------------------------------
    # MRP
    # --------------------------------------------------

    {
        "id": "LM-MRP-01",

        "field": "mrp",

        "description": (
            "Retail sale price of the package must be "
            "declared as the maximum retail price inclusive "
            "of applicable taxes"
        ),

        "legal_reference": (
            "Rule 6(1)(e), Legal Metrology "
            "(Packaged Commodities) Rules, 2011"
        ),

        "required": True,

        "check": _is_present,

        "source": RULE_SET_METADATA["name"],

        "implementation_scope": "prototype_presence_check",

        "implementation_status": "partial",
    },


    # --------------------------------------------------
    # Net Quantity
    # --------------------------------------------------

    {
        "id": "LM-NETQTY-01",

        "field": "net_quantity",

        "description": (
            "Net quantity of the commodity must be "
            "declared in the applicable standard unit "
            "of weight, measure, or number"
        ),

        "legal_reference": (
            "Rule 6(1)(c), Legal Metrology "
            "(Packaged Commodities) Rules, 2011"
        ),

        "required": True,

        "check": _is_present,

        "source": RULE_SET_METADATA["name"],

        "implementation_scope": "prototype_presence_check",

        "implementation_status": "partial",
    },


    # --------------------------------------------------
    # Consumer Care
    # --------------------------------------------------

    {
        "id": "LM-CONSCARE-01",

        "field": "consumer_care",

        "description": (
            "Consumer care / complaint contact "
            "details must be declared"
        ),

        "legal_reference": (
            "Rule 6(2), Legal Metrology "
            "(Packaged Commodities) Rules, 2011"
        ),

        "required": True,

        "check": _is_present,

        "source": RULE_SET_METADATA["name"],

        "implementation_scope": "prototype_presence_check",

        "implementation_status": "partial",
    },


    # --------------------------------------------------
    # Date of Manufacture
    # --------------------------------------------------

    {
        "id": "LM-DOM-01",

        "field": "date_of_manufacture",

        "description": (
            "Month and year in which the commodity "
            "is manufactured must be declared"
        ),

        "legal_reference": (
            "Rule 6(1)(d), Legal Metrology "
            "(Packaged Commodities) Rules, 2011"
        ),

        "required": True,

        "check": _is_present,

        "source": RULE_SET_METADATA["name"],

        "implementation_scope": "prototype_presence_check",

        "implementation_status": "partial",
    },


    # --------------------------------------------------
    # Country of Origin
    # --------------------------------------------------

    {
        "id": "LM-COO-01",

        "field": "country_of_origin",

        "description": (
            "Country of origin, manufacture, or assembly "
            "must be declared for imported products"
        ),

        "legal_reference": (
            "Rule 6(1)(aa), Legal Metrology "
            "(Packaged Commodities) Rules, 2011 "
            "(import-specific)"
        ),

        # Conditional rule.
        # applicability/classifier.py resolves whether
        # this requirement applies to the package.
        "required": False,

        "check": _is_present,

        "source": RULE_SET_METADATA["name"],

        "implementation_scope": "prototype_presence_check",

        "implementation_status": "partial",
    },
]

