"""
Evidence fusion between Gemini Vision extraction and Tesseract OCR.

Gemini Vision provides structured field extraction.

Tesseract OCR provides independent textual evidence.

The fusion layer:

1. Keeps Gemini values when available.
2. Verifies Gemini values against OCR when possible.
3. Falls back to OCR when Gemini misses a field.
4. Avoids guessing values that are not supported by either source.

This module is deliberately field-aware so that OCR corruption such as:

    "MAXIMUM RETAILPRICE: & 10.00"

can still be recognized as an MRP declaration.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Any, Dict, Optional


# ---------------------------------------------------------------------------
# PATH SETUP
# ---------------------------------------------------------------------------

CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR.parent

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


# ---------------------------------------------------------------------------
# NORMALIZATION
# ---------------------------------------------------------------------------

def _normalize_for_comparison(value: Any) -> str:
    """
    Normalize a value for OCR comparison.

    This is intentionally conservative. It does not try to reconstruct
    missing information; it only removes formatting noise.
    """

    if value is None:
        return ""

    text = str(value).lower().strip()

    # Normalize common currency symbols.
    text = text.replace("₹", "rs")
    text = text.replace("₨", "rs")

    # Common OCR confusion around currency symbols.
    text = text.replace("&", " ")

    # Normalize whitespace.
    text = re.sub(r"\s+", " ", text)

    return text.strip()


# ---------------------------------------------------------------------------
# GENERIC OCR SEARCH
# ---------------------------------------------------------------------------

def _find_in_ocr_text(
    value: Any,
    ocr_text: str,
    *,
    numeric: bool = False,
) -> bool:
    """
    Determine whether a Gemini-extracted value is supported by OCR text.

    For numeric values, compare meaningful numeric tokens.
    For text values, compare normalized text.
    """

    if value is None or not ocr_text:
        return False

    value_text = _normalize_for_comparison(value)
    ocr_normalized = _normalize_for_comparison(ocr_text)

    if not value_text:
        return False

    if numeric:
        value_numbers = re.findall(
            r"\d+(?:\.\d+)?",
            value_text,
        )

        if not value_numbers:
            return False

        return all(
            number in ocr_normalized
            for number in value_numbers
        )

    return value_text in ocr_normalized


# ---------------------------------------------------------------------------
# OCR PATTERNS
# ---------------------------------------------------------------------------

OCR_PATTERNS = {
    "mrp": [
        # Standard MRP form.
        r"\bMRP\b\s*[:\-]?\s*(?:rs\.?|₹)?\s*"
        r"([0-9]+(?:\.[0-9]{1,2})?)",

        # Maximum Retail Price.
        r"MAXIMUM\s+RETAIL\s+PRICE\s*[:\-]?\s*"
        r"(?:rs\.?|₹)?\s*"
        r"([0-9]+(?:\.[0-9]{1,2})?)",

        # OCR frequently removes the space:
        # MAXIMUM RETAILPRICE
        r"MAXIMUM\s+RETAILPRICE\s*[:\-]?\s*"
        r"(?:rs\.?|₹)?\s*"
        r"([0-9]+(?:\.[0-9]{1,2})?)",

        # OCR can produce:
        # MAXIMUM RETAIL PRICE: & 10.00
        #
        # The currency symbol is ignored deliberately because Tesseract
        # may convert ₹ into &, $, S, etc.
        r"MAXIMUM\s+RETAIL\s*PRICE\s*[:\-]?\s*"
        r"[^0-9]{0,8}"
        r"([0-9]+(?:\.[0-9]{1,2})?)",

        # Same case with RETAILPRICE merged.
        r"MAXIMUM\s+RETAILPRICE\s*[:\-]?\s*"
        r"[^0-9]{0,8}"
        r"([0-9]+(?:\.[0-9]{1,2})?)",

        # Compact fallback around MRP.
        r"\bMRP\b[^0-9]{0,12}"
        r"([0-9]+(?:\.[0-9]{1,2})?)",
    ],

    "net_quantity": [
        # Examples:
        # 140g
        # 140 g
        # 40g +50 g FREE = 190g
        r"\b(\d+(?:\.\d+)?)\s*"
        r"(kg|g|gm|mg|ml|l|litre|liter)\b",

        # Net quantity declaration.
        r"(?:NET\s*(?:WT\.?|WEIGHT|QTY|QUANTITY))"
        r"[^0-9]{0,12}"
        r"(\d+(?:\.\d+)?)\s*"
        r"(kg|g|gm|mg|ml|l)\b",

        # Free quantity.
        r"\+\s*(\d+(?:\.\d+)?)\s*"
        r"(kg|g|gm|mg|ml|l)\s*FREE",
    ],

    "date_of_manufacture": [
        # MFD / MFG with full date.
        r"\b(?:MFD|MFG|MFD\.|MFG\.)\s*[:\-]?\s*"
        r"(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})",

        # MFD / MFG with month/year.
        r"\b(?:MFD|MFG|MFD\.|MFG\.)\s*[:\-]?\s*"
        r"(\d{1,2}[\/\-]\d{4})",

        # Manufactured / packed with date.
        r"\b(?:MANUFACTURED|MANUFACTURING|PACKED)\b"
        r"[^0-9]{0,15}"
        r"(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})",
    ],

    "country_of_origin": [
        r"\bMADE\s+IN\s+([A-Z][A-Z\s]{2,30})",
        r"\bCOUNTRY\s+OF\s+ORIGIN\s*[:\-]?\s*"
        r"([A-Z][A-Z\s]{2,30})",
    ],
}


# ---------------------------------------------------------------------------
# MRP EXTRACTION
# ---------------------------------------------------------------------------

def _extract_mrp_from_ocr(ocr_text: str) -> Optional[str]:
    """
    Extract MRP from noisy OCR.

    Important example supported:

        MAXIMUM RETAILPRICE: & 10.00

    Here Tesseract has:

        - removed the space in RETAIL PRICE
        - converted the rupee symbol into '&'

    We therefore anchor extraction primarily on the declaration text and
    locate the first monetary number after it.
    """

    if not ocr_text:
        return None

    text = str(ocr_text)

    # Normalize whitespace without destroying useful OCR characters.
    text = re.sub(r"[ \t]+", " ", text)

    for pattern in OCR_PATTERNS["mrp"]:
        match = re.search(
            pattern,
            text,
            flags=re.IGNORECASE,
        )

        if match:
            amount = match.group(1)

            try:
                amount_float = float(amount)
            except ValueError:
                continue

            if amount_float <= 0:
                continue

            return f"₹ {amount_float:.2f}"

    return None


# ---------------------------------------------------------------------------
# NET QUANTITY EXTRACTION
# ---------------------------------------------------------------------------

def _extract_net_quantity_from_ocr(
    ocr_text: str,
) -> Optional[str]:
    """
    Extract the complete net-quantity declaration from OCR.

    Examples supported:

        140g
        140 g
        40g +50 g FREE = 190g
        140 g + 50 g FREE = 190 g

    When a FREE quantity and total quantity are present, the complete
    declaration is preserved instead of returning only the first number.
    """

    if not ocr_text:
        return None

    text = str(ocr_text)

    # Normalize spaces around the common quantity expression.
    text = re.sub(r"[ \t]+", " ", text)

    # ---------------------------------------------------------------
    # 1. Complete expression:
    #
    #    40g +50 g FREE = 190g
    #
    # ---------------------------------------------------------------

    complete_pattern = re.compile(
        r"(\d+(?:\.\d+)?)\s*"
        r"(kg|g|gm|mg|ml|l|litre|liter)"
        r"\s*\+\s*"
        r"(\d+(?:\.\d+)?)\s*"
        r"(kg|g|gm|mg|ml|l|litre|liter)"
        r"\s*FREE"
        r"(?:\s*=\s*"
        r"(\d+(?:\.\d+)?)\s*"
        r"(kg|g|gm|mg|ml|l|litre|liter))?",
        flags=re.IGNORECASE,
    )

    match = complete_pattern.search(text)

    if match:
        base_value = match.group(1)
        base_unit = match.group(2)

        free_value = match.group(3)
        free_unit = match.group(4)

        total_value = match.group(5)
        total_unit = match.group(6)

        result = (
            f"{base_value} {base_unit}"
            f" + {free_value} {free_unit} FREE"
        )

        if total_value and total_unit:
            result += f" = {total_value} {total_unit}"

        return result

    # ---------------------------------------------------------------
    # 2. Alternative complete expression without "=":
    #
    #    40g + 50g FREE
    # ---------------------------------------------------------------

    free_pattern = re.compile(
        r"(\d+(?:\.\d+)?)\s*"
        r"(kg|g|gm|mg|ml|l|litre|liter)"
        r"\s*\+\s*"
        r"(\d+(?:\.\d+)?)\s*"
        r"(kg|g|gm|mg|ml|l|litre|liter)"
        r"\s*FREE",
        flags=re.IGNORECASE,
    )

    match = free_pattern.search(text)

    if match:
        return (
            f"{match.group(1)} {match.group(2)}"
            f" + {match.group(3)} {match.group(4)} FREE"
        )

    # ---------------------------------------------------------------
    # 3. Explicit NET WT / NET QUANTITY.
    # ---------------------------------------------------------------

    net_pattern = re.compile(
        r"(?:NET\s*(?:WT\.?|WEIGHT|QTY|QUANTITY))"
        r"[^0-9]{0,12}"
        r"(\d+(?:\.\d+)?)\s*"
        r"(kg|g|gm|mg|ml|l|litre|liter)\b",
        flags=re.IGNORECASE,
    )

    match = net_pattern.search(text)

    if match:
        return f"{match.group(1)} {match.group(2)}"

    # ---------------------------------------------------------------
    # 4. Generic quantity fallback.
    # ---------------------------------------------------------------

    generic_pattern = re.compile(
        r"\b(\d+(?:\.\d+)?)\s*"
        r"(kg|g|gm|mg|ml|l|litre|liter)\b",
        flags=re.IGNORECASE,
    )

    match = generic_pattern.search(text)

    if match:
        return f"{match.group(1)} {match.group(2)}"

    return None


# ---------------------------------------------------------------------------
# CONSUMER CARE EXTRACTION
# ---------------------------------------------------------------------------

def _extract_consumer_care_from_ocr(
    ocr_text: str,
) -> Optional[str]:
    """
    Extract phone number and/or email from OCR.

    Consumer-care information is often split over multiple OCR lines.
    """

    if not ocr_text:
        return None

    text = str(ocr_text)

    # Email.
    email_match = re.search(
        r"\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}\b",
        text,
        flags=re.IGNORECASE,
    )

    email = (
        email_match.group(0)
        if email_match
        else None
    )

    # Indian/international-style phone number.
    phone_match = re.search(
        r"(?:\+91[\s\-]?)?[6-9]\d{9}\b",
        text,
        flags=re.IGNORECASE,
    )

    phone = (
        phone_match.group(0)
        if phone_match
        else None
    )

    if email and phone:
        return f"{email}, {phone}"

    if email:
        return email

    if phone:
        return phone

    return None


# ---------------------------------------------------------------------------
# MRP VERIFICATION
# ---------------------------------------------------------------------------

def _verify_mrp(
    gemini_value: Any,
    ocr_text: str,
) -> bool:
    """
    Verify Gemini MRP against OCR.

    Example:

        Gemini: ₹ 10.00
        OCR:    MAXIMUM RETAILPRICE: & 10.00

    Result:

        True
    """

    if gemini_value is None or not ocr_text:
        return False

    gemini_numbers = re.findall(
        r"\d+(?:\.\d+)?",
        str(gemini_value),
    )

    if not gemini_numbers:
        return False

    gemini_amount = gemini_numbers[-1]

    # First try direct MRP extraction from OCR.
    ocr_mrp = _extract_mrp_from_ocr(
        ocr_text
    )

    if ocr_mrp:
        ocr_numbers = re.findall(
            r"\d+(?:\.\d+)?",
            ocr_mrp,
        )

        if (
            ocr_numbers
            and ocr_numbers[-1] == gemini_amount
        ):
            return True

    # Secondary check around MRP declaration.
    text = str(ocr_text)

    mrp_marker = re.search(
        r"(?:\bMRP\b|"
        r"MAXIMUM\s+RETAIL\s*PRICE|"
        r"MAXIMUM\s+RETAILPRICE)",
        text,
        flags=re.IGNORECASE,
    )

    if not mrp_marker:
        return False

    after_marker = text[
        mrp_marker.end():
    ]

    # Prevent unrelated prices elsewhere in the OCR from being used.
    after_marker = after_marker[:80]

    after_numbers = re.findall(
        r"\d+(?:\.\d+)?",
        after_marker,
    )

    return gemini_amount in after_numbers


# ---------------------------------------------------------------------------
# NET QUANTITY VERIFICATION
# ---------------------------------------------------------------------------

def _verify_net_quantity(
    gemini_value: Any,
    ocr_text: str,
) -> bool:
    """
    Verify net quantity using quantity and unit tokens.

    Example:

        Gemini: 140 g + 50 g FREE = 190 g
        OCR:    40g +50 g FREE = 190g

    Verification is based on the final/total quantity and compatible
    units, allowing partial OCR loss.
    """

    if gemini_value is None or not ocr_text:
        return False

    gemini_text = _normalize_for_comparison(
        gemini_value
    )

    ocr_normalized = _normalize_for_comparison(
        ocr_text
    )

    gemini_numbers = re.findall(
        r"\d+(?:\.\d+)?",
        gemini_text,
    )

    units = re.findall(
        r"\b(?:kg|g|gm|mg|ml|l|litre|liter)\b",
        gemini_text,
    )

    if not gemini_numbers:
        return False

    # Strongest check: final/total quantity.
    final_number = gemini_numbers[-1]

    if final_number not in ocr_normalized:
        return False

    # If Gemini contains a unit, ensure OCR contains a compatible unit.
    if units:
        if not any(
            unit in ocr_normalized
            for unit in units
        ):
            return False

    return True


# ---------------------------------------------------------------------------
# CONSUMER CARE VERIFICATION
# ---------------------------------------------------------------------------

def _verify_consumer_care(
    gemini_value: Any,
    ocr_text: str,
) -> bool:
    """
    Verify consumer-care information independently using phone/email.

    Verification succeeds if at least one meaningful contact token from
    Gemini appears in OCR.
    """

    if gemini_value is None or not ocr_text:
        return False

    gemini_text = str(gemini_value)
    ocr_text = str(ocr_text)

    # Email verification.
    gemini_emails = re.findall(
        r"\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}\b",
        gemini_text,
        flags=re.IGNORECASE,
    )

    ocr_lower = ocr_text.lower()

    for email in gemini_emails:
        if email.lower() in ocr_lower:
            return True

    # Phone verification.
    gemini_phones = re.findall(
        r"(?:\+91[\s\-]?)?[6-9]\d{9}\b",
        gemini_text,
        flags=re.IGNORECASE,
    )

    ocr_digits = re.sub(
        r"\D",
        "",
        ocr_text,
    )

    for phone in gemini_phones:
        phone_digits = re.sub(
            r"\D",
            "",
            phone,
        )

        if not phone_digits:
            continue

        # Handle +91 by comparing the last 10 digits.
        if len(phone_digits) >= 10:
            phone_digits = phone_digits[-10:]

        if phone_digits in ocr_digits:
            return True

    return False


# ---------------------------------------------------------------------------
# DATE VERIFICATION
# ---------------------------------------------------------------------------

def _verify_date(
    gemini_value: Any,
    ocr_text: str,
) -> bool:
    """
    Verify date-like tokens from Gemini against OCR.
    """

    if gemini_value is None or not ocr_text:
        return False

    gemini_dates = re.findall(
        r"\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}"
        r"|\d{1,2}[\/\-]\d{4}",
        str(gemini_value),
    )

    ocr_dates = re.findall(
        r"\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}"
        r"|\d{1,2}[\/\-]\d{4}",
        str(ocr_text),
    )

    if not gemini_dates or not ocr_dates:
        return False

    return any(
        gemini_date in ocr_dates
        for gemini_date in gemini_dates
    )


# ---------------------------------------------------------------------------
# COUNTRY OF ORIGIN VERIFICATION
# ---------------------------------------------------------------------------

def _verify_country_of_origin(
    gemini_value: Any,
    ocr_text: str,
) -> bool:
    """
    Verify country of origin against OCR.
    """

    if gemini_value is None or not ocr_text:
        return False

    gemini_country = _normalize_for_comparison(
        gemini_value
    )

    if not gemini_country:
        return False

    ocr_normalized = _normalize_for_comparison(
        ocr_text
    )

    # Direct country match.
    if gemini_country in ocr_normalized:
        return True

    # Explicit MADE IN declaration.
    match = re.search(
        r"MADE\s+IN\s+([A-Z][A-Z\s]{2,30})",
        str(ocr_text),
        flags=re.IGNORECASE,
    )

    if match:
        declared_country = _normalize_for_comparison(
            match.group(1)
        )

        declared_country = re.split(
            r"\b(?:SARGAM|FOR|CONTACT|CONSUMER)\b",
            declared_country,
            maxsplit=1,
        )[0].strip()

        if gemini_country in declared_country:
            return True

    return False


# ---------------------------------------------------------------------------
# FIELD-AWARE VERIFICATION DISPATCHER
# ---------------------------------------------------------------------------

def _verify_with_ocr(
    field: str,
    gemini_value: Any,
    ocr_text: str,
) -> bool:
    """
    Route each field to its dedicated OCR verification logic.
    """

    if not gemini_value or not ocr_text:
        return False

    if field == "mrp":
        return _verify_mrp(
            gemini_value,
            ocr_text,
        )

    if field == "net_quantity":
        return _verify_net_quantity(
            gemini_value,
            ocr_text,
        )

    if field == "consumer_care":
        return _verify_consumer_care(
            gemini_value,
            ocr_text,
        )

    if field == "date_of_manufacture":
        return _verify_date(
            gemini_value,
            ocr_text,
        )

    if field == "country_of_origin":
        return _verify_country_of_origin(
            gemini_value,
            ocr_text,
        )

    # Generic fallback for simple text fields.
    return _find_in_ocr_text(
        gemini_value,
        ocr_text,
        numeric=False,
    )


# ---------------------------------------------------------------------------
# OCR FALLBACK EXTRACTION
# ---------------------------------------------------------------------------

def _extract_generic_field_from_ocr(
    field: str,
    ocr_text: str,
) -> Optional[str]:
    """
    Generic field extraction for fields covered by OCR_PATTERNS.
    """

    patterns = OCR_PATTERNS.get(
        field,
        [],
    )

    if not ocr_text:
        return None

    for pattern in patterns:
        match = re.search(
            pattern,
            str(ocr_text),
            flags=re.IGNORECASE,
        )

        if match:
            value = match.group(1).strip()

            if value:
                return value

    return None


# ---------------------------------------------------------------------------
# EVIDENCE FUSION
# ---------------------------------------------------------------------------

def fuse_evidence(
    gemini_data: Optional[Dict[str, Any]],
    ocr_text: str,
) -> Dict[str, Dict[str, Any]]:
    """
    Fuse Gemini Vision structured extraction with Tesseract OCR.

    Priority:

        1. Gemini value + OCR verification
        2. Gemini value without OCR verification
        3. OCR fallback
        4. None

    The output format remains compatible with the existing backend.
    """

    gemini_data = gemini_data or {}
    ocr_text = ocr_text or ""

    fields = [
        "product_name",
        "mrp",
        "net_quantity",
        "manufacturer_name",
        "manufacturer_address",
        "consumer_care",
        "date_of_manufacture",
        "country_of_origin",
    ]

    fused: Dict[str, Dict[str, Any]] = {}

    for field in fields:
        gemini_value = gemini_data.get(
            field
        )

        # ---------------------------------------------------------------
        # 1. Gemini value exists
        # ---------------------------------------------------------------

        if gemini_value not in (
            None,
            "",
            [],
            {},
        ):
            verified = _verify_with_ocr(
                field,
                gemini_value,
                ocr_text,
            )

            fused[field] = {
                "value": gemini_value,
                "source": "gemini_vision",
                "verified_by_ocr": verified,
            }

            continue

        # ---------------------------------------------------------------
        # 2. OCR fallback
        # ---------------------------------------------------------------

        fallback_value: Optional[str] = None

        if field == "mrp":
            fallback_value = _extract_mrp_from_ocr(
                ocr_text
            )

        elif field == "net_quantity":
            fallback_value = _extract_net_quantity_from_ocr(
                ocr_text
            )

        elif field == "consumer_care":
            fallback_value = _extract_consumer_care_from_ocr(
                ocr_text
            )

        elif field == "country_of_origin":
            country_match = re.search(
                r"\bMADE\s+IN\s+([A-Z][A-Z\s]{2,30})",
                ocr_text,
                flags=re.IGNORECASE,
            )

            if country_match:
                country = country_match.group(1).strip()

                country = re.split(
                    r"\b(?:SARGAM|FOR|CONTACT|CONSUMER)\b",
                    country,
                    maxsplit=1,
                    flags=re.IGNORECASE,
                )[0].strip()

                if country:
                    fallback_value = country.title()

        elif field in OCR_PATTERNS:
            fallback_value = _extract_generic_field_from_ocr(
                field,
                ocr_text,
            )

        if fallback_value:
            fused[field] = {
                "value": fallback_value,
                "source": "ocr_fallback",
                "verified_by_ocr": True,
            }

        else:
            fused[field] = {
                "value": None,
                "source": "none",
                "verified_by_ocr": False,
            }

    return fused


# ---------------------------------------------------------------------------
# STANDALONE TEST RUNNER
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import json

    sample_ocr = """
    EEE

    ‘s NET WT. {40g +50 g FREE = 190g

    (WHEN PACKED)

    t il il | ln MAXIMUM RETAILPRICE: & 10.00

    “INCL. OF ALL TAXES), USP: 0.07 perg = |

    SARGAM IS A REGISTERED TRADEMARK

    FOR COMMENTS/COMPLAINTS,& SHANI

    CONTACT CONSUMER SERVICE OFFICER AT THE ABOVE ADDRESS.

    +91 9111911111

    contact@sdplgroup.com

    MADE IN INDIA
    """

    sample_gemini = {
        "product_name": None,
        "mrp": None,
        "net_quantity": None,
        "manufacturer_name": None,
        "manufacturer_address": None,
        "consumer_care": None,
        "date_of_manufacture": None,
        "country_of_origin": None,
    }

    result = fuse_evidence(
        sample_gemini,
        sample_ocr,
    )

    print(
        json.dumps(
            result,
            indent=2,
            ensure_ascii=False,
        )
    )