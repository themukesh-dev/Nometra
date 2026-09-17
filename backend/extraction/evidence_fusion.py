# backend/extraction/evidence_fusion.py

import re


def _normalize_for_comparison(text: str) -> str:
    """
    Strips spaces/punctuation and lowercases text so loosely
    comparable strings can be compared without formatting differences.
    """
    if not text:
        return ""

    return re.sub(r"[^a-z0-9]", "", text.lower())


def _find_in_ocr_text(ocr_text: str, pattern: str):
    """
    Searches the raw OCR text for a regex pattern and returns
    the first match found, or None.
    """
    match = re.search(pattern, ocr_text, re.IGNORECASE)

    return match.group(0).strip() if match else None


# Regex patterns used to hunt for specific fields inside raw OCR text
# when Gemini could not find them.
OCR_PATTERNS = {
    "mrp": r"(?:mrp|m\.r\.p|rs\.?|₹)\s*[:\-]?\s*[\d,]+(?:\.\d{1,2})?",

    "net_quantity": r"\d+(?:\.\d+)?\s*(?:g|gm|gms|kg|ml|l|litre|liter|litres)\b",

    "date_of_manufacture": r"(?:mfd|mfg|manufactured|packed)\s*[:\-]?\s*[\d/.\-]+",
}


def _verify_mrp(gemini_value: str, ocr_text: str) -> bool:
    """
    Verifies an MRP value using the numeric amount rather than
    requiring the complete Gemini string to appear in OCR.
    """
    gemini_match = re.search(
        r"(?:\d[\d,]*)(?:\.\d{1,2})?",
        gemini_value or "",
    )

    if not gemini_match:
        return False

    amount = gemini_match.group(0).replace(",", "")

    ocr_amounts = re.findall(
        r"(?:\d[\d,]*)(?:\.\d{1,2})?",
        ocr_text or "",
    )

    return any(
        value.replace(",", "") == amount
        for value in ocr_amounts
    )


def _verify_net_quantity(
    gemini_value: str,
    ocr_text: str,
) -> bool:
    """
    Verifies net quantity using quantity + unit tokens.
    This tolerates additional OCR text such as FREE quantities.
    """
    gemini_quantities = re.findall(
        r"\d+(?:\.\d+)?\s*(?:g|gm|gms|kg|ml|l|litre|liter|litres)\b",
        gemini_value or "",
        re.IGNORECASE,
    )

    if not gemini_quantities:
        return False

    normalized_ocr = _normalize_for_comparison(ocr_text)

    for quantity in gemini_quantities:
        normalized_quantity = _normalize_for_comparison(quantity)

        if normalized_quantity in normalized_ocr:
            return True

    return False


def _verify_consumer_care(
    gemini_value: str,
    ocr_text: str,
) -> bool:
    """
    Verifies consumer-care information independently using
    phone numbers and email addresses.

    OCR may insert or corrupt unrelated characters between values,
    so the complete Gemini string is not required to match.
    """
    gemini_value = gemini_value or ""
    ocr_text = ocr_text or ""

    # Check phone number.
    gemini_phone = re.search(
        r"(?:\+91[\s\-]?)?[6-9]\d{9}",
        gemini_value,
    )

    if gemini_phone:
        phone_digits = re.sub(
            r"\D",
            "",
            gemini_phone.group(0),
        )

        ocr_digits = re.sub(r"\D", "", ocr_text)

        if phone_digits and phone_digits in ocr_digits:
            return True

    # Check email address.
    gemini_email = re.search(
        r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}",
        gemini_value,
    )

    if gemini_email:
        email = gemini_email.group(0).lower()
        normalized_ocr = re.sub(
            r"\s+",
            "",
            ocr_text.lower(),
        )

        if email in normalized_ocr:
            return True

    return False


def _verify_date(
    gemini_value: str,
    ocr_text: str,
) -> bool:
    """
    Verifies recognizable date tokens instead of requiring
    the complete Gemini phrase to appear in OCR.
    """
    gemini_dates = re.findall(
        r"\d{1,4}[\/.\-]\d{1,2}(?:[\/.\-]\d{2,4})?",
        gemini_value or "",
    )

    normalized_ocr = _normalize_for_comparison(ocr_text)

    for date in gemini_dates:
        normalized_date = _normalize_for_comparison(date)

        if normalized_date in normalized_ocr:
            return True

    return False


def _verify_country_of_origin(
    gemini_value: str,
    ocr_text: str,
) -> bool:
    """
    Verifies country-of-origin text using normalized comparison.
    """
    normalized_value = _normalize_for_comparison(
        gemini_value
    )

    normalized_ocr = _normalize_for_comparison(
        ocr_text
    )

    return bool(
        normalized_value
        and normalized_value in normalized_ocr
    )


def _verify_with_ocr(
    field: str,
    gemini_value: str,
    ocr_text: str,
) -> bool:
    """
    Performs field-specific OCR verification.

    Different fields require different verification strategies
    because OCR can introduce noise, spacing changes, or extra
    characters.
    """
    if not gemini_value or not ocr_text:
        return False

    if field == "mrp":
        return _verify_mrp(gemini_value, ocr_text)

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

    # Generic fallback for fields without a specialised verifier.
    normalized_gemini = _normalize_for_comparison(
        gemini_value
    )

    normalized_ocr = _normalize_for_comparison(
        ocr_text
    )

    return bool(
        normalized_gemini
        and normalized_gemini in normalized_ocr
    )


def fuse_evidence(
    gemini_data: dict,
    ocr_data: dict,
) -> dict:
    """
    Combines Gemini Vision's structured output with raw OCR.

    Rules:

    1. If Gemini found a value:
       - Keep Gemini's structured value.
       - Independently check the value against OCR.
       - Store whether OCR verification succeeded.

    2. If Gemini found nothing:
       - Try OCR fallback using regex patterns where available.

    3. If neither source finds a field:
       - Store null with source "none".

    Gemini is therefore responsible for structured extraction,
    while Tesseract provides an independent text-based
    cross-check and fallback.
    """
    ocr_text = ocr_data.get("raw_text", "") or ""

    fused = {}

    fields = [
        "mrp",
        "net_quantity",
        "manufacturer_name",
        "manufacturer_address",
        "consumer_care",
        "date_of_manufacture",
        "country_of_origin",
    ]

    for field in fields:
        gemini_value = gemini_data.get(field)

        if gemini_value:
            # Gemini found something.
            # Use field-aware OCR verification.
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

        else:
            # Gemini found nothing.
            # Try OCR fallback using a field-specific regex.
            fallback_value = None

            if field in OCR_PATTERNS:
                fallback_value = _find_in_ocr_text(
                    ocr_text,
                    OCR_PATTERNS[field],
                )

            fused[field] = {
                "value": fallback_value,
                "source": (
                    "ocr_fallback"
                    if fallback_value
                    else "none"
                ),
                "verified_by_ocr": (
                    fallback_value is not None
                ),
            }

    return fused


# Standalone test runner
if __name__ == "__main__":
    import sys
    import json

    sys.path.append("..")

    from gemini_vision import extract_label_data
    from ocr import extract_text_ocr

    if len(sys.argv) < 2:
        print(
            "Usage: python evidence_fusion.py "
            "<path_to_image>"
        )
    else:
        image_path = sys.argv[1]

        gemini_result = extract_label_data(
            image_path
        )

        ocr_result = extract_text_ocr(
            image_path
        )

        fused_result = fuse_evidence(
            gemini_result,
            ocr_result,
        )

        print(
            json.dumps(
                fused_result,
                indent=2,
            )
        )