# backend/extraction/evidence_fusion.py

import re


def _normalize_for_comparison(text: str) -> str:
    """
    Helper function: strips spaces/punctuation and lowercases text
    so we can loosely compare two strings without being tripped up
    by things like "Rs. 45.00" vs "Rs 45.00" being treated as different.
    """
    if not text:
        return ""

    return re.sub(r"[^a-z0-9]", "", text.lower())


def _find_in_ocr_text(ocr_text: str, pattern: str):
    """
    Helper function: searches the raw OCR text for a regex pattern
    and returns the first match found, or None.
    """
    match = re.search(pattern, ocr_text, re.IGNORECASE)
    return match.group(0).strip() if match else None


# Regex patterns used to hunt for specific fields inside raw OCR text,
# when Gemini couldn't find them.
OCR_PATTERNS = {
    "mrp": r"(?:mrp|m\.r\.p|rs\.?|₹)\s*[:\-]?\s*[\d,]+(?:\.\d{1,2})?",
    "net_quantity": r"\d+(?:\.\d+)?\s*(?:g|gm|gms|kg|ml|l|litre|liter|litres)\b",
    "date_of_manufacture": r"(?:mfd|mfg|manufactured|packed)\s*[:\-]?\s*[\d/.\-]+",
}


def fuse_evidence(gemini_data: dict, ocr_data: dict) -> dict:
    """
    Combines Gemini Vision's structured output with raw OCR text.

    Rules:
    - If Gemini found a value for a field, we keep it, but mark it as
      "verified_by_ocr": True/False depending on whether OCR text
      contains something similar (cross-check).
    - If Gemini returned null for a field, we try to find it ourselves
      in the OCR text using regex patterns, and mark that field's
      source as "ocr_fallback".
    - If neither source finds it, the field stays null with source "none".
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
            # Gemini found something — check if OCR text roughly agrees
            normalized_gemini = _normalize_for_comparison(gemini_value)
            normalized_ocr = _normalize_for_comparison(ocr_text)

            verified = normalized_gemini in normalized_ocr

            fused[field] = {
                "value": gemini_value,
                "source": "gemini_vision",
                "verified_by_ocr": verified,
            }

        else:
            # Gemini found nothing — try OCR fallback using regex,
            # but only for fields we have a pattern for.
            fallback_value = None

            if field in OCR_PATTERNS:
                fallback_value = _find_in_ocr_text(
                    ocr_text,
                    OCR_PATTERNS[field],
                )

            fused[field] = {
                "value": fallback_value,
                "source": "ocr_fallback" if fallback_value else "none",
                "verified_by_ocr": fallback_value is not None,
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
        print("Usage: python evidence_fusion.py <path_to_image>")
    else:
        image_path = sys.argv[1]

        gemini_result = extract_label_data(image_path)
        ocr_result = extract_text_ocr(image_path)

        fused_result = fuse_evidence(
            gemini_result,
            ocr_result,
        )

        print(json.dumps(fused_result, indent=2))