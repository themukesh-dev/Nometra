# backend/normalization/dates.py

"""
Normalizes the raw "date_of_manufacture" field from fused evidence into
a structured, comparable date.

Input contract: the field-data dict as produced by
extraction.evidence_fusion.fuse_evidence() for the "date_of_manufacture"
key, e.g.:
    {"value": "MFD : 08/2026", "source": "gemini_vision", "verified_by_ocr": True}

Handles the exact formats the Gemini extraction prompt says it preserves:
    "MFD : 08/2026"
    "MFD 08/2026"
    "PKD 08/2026"
as well as fuller dates like "08/07/2026" or "08-07-2026", since labels
don't always omit the day.

Output contract: the SAME dict, unchanged, with one new key added:
    {
        ...original keys unchanged...,
        "normalized": {
            "year": int | None,
            "month": int | None,
            "day": int | None,          # None if only month/year was printed
            "iso_date": str | None,     # "YYYY-MM-DD" or "YYYY-MM" if no day
            "is_plausible": bool,       # False if date is in the future, etc.
            "parse_error": str | None
        }
    }

Keeping "value"/"source"/"verified_by_ocr" untouched means
rules.packaged_commodities.mandatory_declarations._is_present(), which
only checks field_data.get("value"), continues to work unmodified on
the output of this function.
"""

import re
from datetime import date

# Matches "MFD"/"MFG"/"PKD"/"MANUFACTURED"/"PACKED" style prefixes, optional
# colon/dash separator, then a date in DD/MM/YYYY, MM/YYYY, or similar forms.
# Groups: (day-or-none)(month)(year)
FULL_DATE_PATTERN = r"(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{2,4})"
MONTH_YEAR_PATTERN = r"(\d{1,2})[/\-\.](\d{2,4})"

CURRENT_YEAR = date.today().year


def _expand_year(year_str: str) -> int:
    """Turns a 2-digit year into a 4-digit one, assuming 2000s."""
    year = int(year_str)
    if year < 100:
        year += 2000
    return year


def _parse_date_string(raw_value: str):
    """
    Tries full DD/MM/YYYY first (more specific), then falls back to
    MM/YYYY. Returns (year, month, day) with day=None if not present,
    or (None, None, None) if nothing could be parsed.
    """
    full_match = re.search(FULL_DATE_PATTERN, raw_value)
    if full_match:
        day_str, month_str, year_str = full_match.groups()
        day, month, year = int(day_str), int(month_str), _expand_year(year_str)

        # Sanity-check this actually looks like DD/MM/YYYY and not
        # something else matching the same shape (e.g. a phone number).
        if 1 <= day <= 31 and 1 <= month <= 12:
            return year, month, day

    month_year_match = re.search(MONTH_YEAR_PATTERN, raw_value)
    if month_year_match:
        month_str, year_str = month_year_match.groups()
        month, year = int(month_str), _expand_year(year_str)

        if 1 <= month <= 12:
            return year, month, None

    return None, None, None


def normalize_date(date_field: dict) -> dict:
    """
    Normalizes a date_of_manufacture field-data dict into a structured date.

    Does not mutate the input dict; returns a new dict with the same
    top-level keys plus "normalized".
    """
    result = dict(date_field) if date_field else {}
    raw_value = result.get("value")

    normalized = {
        "year": None,
        "month": None,
        "day": None,
        "iso_date": None,
        "is_plausible": False,
        "parse_error": None
    }

    if not raw_value:
        normalized["parse_error"] = "No date_of_manufacture value to normalize."
        result["normalized"] = normalized
        return result

    year, month, day = _parse_date_string(raw_value)

    if year is None:
        normalized["parse_error"] = f"Could not parse date_of_manufacture value: '{raw_value}'"
        result["normalized"] = normalized
        return result

    normalized["year"] = year
    normalized["month"] = month
    normalized["day"] = day
    normalized["iso_date"] = (
        f"{year:04d}-{month:02d}-{day:02d}" if day else f"{year:04d}-{month:02d}"
    )

    # Plausibility: a manufacture date shouldn't be in the future, and
    # shouldn't be absurdly old (a printing/OCR misread is more likely
    # than a 25-year-old package still being sold).
    is_not_in_future = year < CURRENT_YEAR or (year == CURRENT_YEAR and month <= date.today().month)
    is_not_too_old = year >= CURRENT_YEAR - 10

    normalized["is_plausible"] = is_not_in_future and is_not_too_old

    result["normalized"] = normalized
    return result


# Standalone test runner — same pattern as other modules in this project
if __name__ == "__main__":
    test_cases = [
        {"value": "MFD : 08/2026", "source": "gemini_vision", "verified_by_ocr": True},
        {"value": "PKD 08/2026", "source": "ocr_fallback", "verified_by_ocr": False},
        {"value": "MFD: 15/03/2025", "source": "gemini_vision", "verified_by_ocr": True},
        {"value": None, "source": "none", "verified_by_ocr": False},
    ]
    for case in test_cases:
        print(normalize_date(case))