 
# backend/extraction/ocr.py

import os
import shutil
import subprocess
import time

import pytesseract
from PIL import Image


# ---------------------------------------------------------------------------
# TESSERACT CONFIGURATION
# ---------------------------------------------------------------------------

# Use the Windows installation when running locally.
# On Render/Linux, Tesseract is normally available in PATH.

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

    total_start = time.perf_counter()

    try:
        # ---------------------------------------------------------------
        # TESSERACT PATH
        # ---------------------------------------------------------------

        tesseract_path = pytesseract.pytesseract.tesseract_cmd

        print("========== TESSERACT DIAGNOSTICS ==========")
        print(f"TESSERACT PATH: {tesseract_path}")

        # ---------------------------------------------------------------
        # TESSERACT VERSION
        # ---------------------------------------------------------------

        version_start = time.perf_counter()

        try:
            version_result = subprocess.run(
                [tesseract_path, "--version"],
                capture_output=True,
                text=True,
                timeout=5,
            )

            version_output = (
                version_result.stdout.strip()
                or version_result.stderr.strip()
            )

            first_line = version_output.splitlines()[0] if version_output else "UNKNOWN"

            print(f"TESSERACT VERSION: {first_line}")

        except Exception as version_error:
            print(f"TESSERACT VERSION ERROR: {version_error}")

        version_time = time.perf_counter() - version_start
        print(f"TESSERACT VERSION CHECK TIME: {version_time:.3f} sec")

        # ---------------------------------------------------------------
        # IMAGE OPEN
        # ---------------------------------------------------------------

        image_start = time.perf_counter()

        image = Image.open(image_path)

        image_time = time.perf_counter() - image_start

        print(f"IMAGE OPEN TIME: {image_time:.3f} sec")
        print(f"IMAGE SIZE: {image.size}")
        print(f"IMAGE MODE: {image.mode}")

        # ---------------------------------------------------------------
        # TESSERACT OCR
        # ---------------------------------------------------------------

        ocr_start = time.perf_counter()

        raw_text = pytesseract.image_to_string(image)

        ocr_time = time.perf_counter() - ocr_start

        print(f"TESSERACT OCR EXECUTION TIME: {ocr_time:.3f} sec")

        # ---------------------------------------------------------------
        # TOTAL
        # ---------------------------------------------------------------

        total_time = time.perf_counter() - total_start

        print(f"TOTAL OCR FUNCTION TIME: {total_time:.3f} sec")
        print("============================================")

        return raw_text.strip()

    except Exception as e:
        total_time = time.perf_counter() - total_start

        print(f"Tesseract OCR error: {e}")
        print(f"TOTAL OCR FUNCTION TIME BEFORE ERROR: {total_time:.3f} sec")

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

