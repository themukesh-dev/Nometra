# backend/extraction/ocr.py

import pytesseract
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
from PIL import Image

# ---- WINDOWS USERS ONLY ----
# If you're on Windows, uncomment the line below and set it to your actual
# install path, otherwise pytesseract won't be able to find the engine.
# pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


def extract_text_ocr(image_path: str) -> dict:
    """
    Takes a path to a label image, runs it through Tesseract OCR,
    and returns the raw text it found.

    This is our fallback/cross-check method — it doesn't understand
    what the text MEANS (no "this is the MRP" labeling like Gemini gives us),
    it just reads every bit of text it can see on the image, in order.
    """
    try:
        image = Image.open(image_path)

        # This is the actual OCR call — Tesseract scans the image
        # and returns everything it can read as one big string.
        raw_text = pytesseract.image_to_string(image)

        return {
            "raw_text": raw_text.strip(),
            "source": "ocr"
        }

    except Exception as e:
        return {
            "error": str(e),
            "source": "ocr"
        }


# Standalone test runner — same pattern as gemini_vision.py
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python ocr.py <path_to_image>")
    else:
        result = extract_text_ocr(sys.argv[1])
        print(result["raw_text"] if "raw_text" in result else result)