# backend/rules/packaged_commodities/mandatory_declarations.py

# Each rule is a plain dictionary describing ONE compliance check.
# - "id": short unique code for this rule, useful in reports/logs
# - "field": which key in our fused evidence dict this rule checks
# - "description": plain-English name of the rule, shown in reports
# - "legal_reference": the actual rule number, for the compliance report
# - "required": True means this MUST be present to pass; some rules
#   (like country_of_origin) are conditional, handled separately below
# - "check": a function that takes the field's evidence dict
#   (e.g. {"value": ..., "source": ..., "verified_by_ocr": ...})
#   and returns True (pass) or False (fail)

def _is_present(field_data: dict) -> bool:
    """A field passes a basic 'presence' check if it has a non-empty value."""
    return bool(field_data and field_data.get("value"))


MANDATORY_DECLARATION_RULES = [
    {
        "id": "LM-MRP-01",
        "field": "mrp",
        "description": "Maximum Retail Price (MRP) must be declared on the label",
        "legal_reference": "Rule 6(1)(e), Legal Metrology (Packaged Commodities) Rules, 2011",
        "required": True,
        "check": _is_present
    },
    {
        "id": "LM-NETQTY-01",
        "field": "net_quantity",
        "description": "Net quantity (weight/volume/number) must be declared in standard units",
        "legal_reference": "Rule 6(1)(b), Legal Metrology (Packaged Commodities) Rules, 2011",
        "required": True,
        "check": _is_present
    },
    {
        "id": "LM-CONSCARE-01",
        "field": "consumer_care",
        "description": "Consumer care / complaint contact details must be declared",
        "legal_reference": "Rule 6(1)(a), Legal Metrology (Packaged Commodities) Rules, 2011",
        "required": True,
        "check": _is_present
    },
    {
        "id": "LM-DOM-01",
        "field": "date_of_manufacture",
        "description": "Date of manufacture or packing must be declared",
        "legal_reference": "Rule 6(1)(d), Legal Metrology (Packaged Commodities) Rules, 2011",
        "required": True,
        "check": _is_present
    },
    {
        "id": "LM-COO-01",
        "field": "country_of_origin",
        "description": "Country of origin must be declared for imported products",
        "legal_reference": "Rule 6(1)(f) read with Legal Metrology (Packaged Commodities) Rules, 2011 (import-specific)",
        "required": False,  # only mandatory if the product is imported — handled in engine, not here
        "check": _is_present
    },
]