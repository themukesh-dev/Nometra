# backend/extraction/ocr.py

import os
import shutil

import pytesseract
from PIL import Image


# ---------------------------------------------------------------------------
# TESSERACT CONFIGURATION
# ---------------------------------------------------------------------------

# Use the Windows installation when running locally.
# On Render/Linux, Tesseract is installed through apt.txt and is normally
# available in PATH as /usr/bin/tesseract.

if os.name == "nt":
    windows_tesseract = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

    if os.path.exists(windows_tesseract):
        pytesseract.pytesseract.tesseract_cmd = windows_tesseract

else:
    linux_tesseract = shutil.which("tesseract")

    if linux_tesseract:
        pytesseract.pytesseract.tesseract_cmd = linux_tesseract


def extract_text_ocr(image_path: str) -> str:
    """
    Takes a path to a label image, runs it through Tesseract OCR,
    and returns the raw OCR text as a string.

    Tesseract does not interpret the meaning of the text. It simply
    returns the text it can read from the image. The evidence-fusion
    layer later uses this raw text as an independent cross-check
    against Gemini Vision extraction.
    """

    try:
        image = Image.open(image_path)

        # Run Tesseract and return its raw text directly.
        raw_text = pytesseract.image_to_string(image)

        return raw_text.strip()

    except Exception as e:
        # Keep the return type consistent with the function contract.
        # The caller expects OCR text, so return an empty string when
        # OCR fails rather than returning a dictionary.
        print(f"Tesseract OCR error: {e}")
        return ""


# ---------------------------------------------------------------------------
# STANDALONE TEST RUNNER
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python ocr.py <path_to_image>")
    else:
        result = extract_text_ocr(sys.argv[1])
        print(result)