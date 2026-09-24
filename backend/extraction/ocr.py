# backend/extraction/ocr.py

from paddleocr import PaddleOCR


# ---------------------------------------------------------------------------
# PADDLEOCR CONFIGURATION
# ---------------------------------------------------------------------------

# Nometra receives reasonably controlled package-label photographs.
# Document orientation classification, document unwarping, and text-line
# orientation are disabled to reduce unnecessary processing time.
#
# The core OCR pipeline remains:
#   image -> text detection -> text recognition -> raw text
#
ocr = PaddleOCR(
    lang="en",
     ocr_version="PP-OCRv4",
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    use_textline_orientation=False,
)


# ---------------------------------------------------------------------------
# OCR EXTRACTION
# ---------------------------------------------------------------------------

def extract_text_ocr(image_path: str) -> str:
    """
    Takes a path to a label image, runs PaddleOCR,
    and returns the raw OCR text as a single string.

    PaddleOCR only extracts visible text from the image.
    It does not interpret the legal meaning of the text.

    The evidence-fusion layer uses this raw OCR text as
    an independent cross-check against Gemini Vision extraction.

    Returns:
        str: Raw OCR text.
    """

    try:
        result = ocr.predict(image_path)

        extracted_lines = []

        for res in result:
            if isinstance(res, dict):
                texts = res.get("rec_texts", [])

                if texts:
                    extracted_lines.extend(
                        str(text).strip()
                        for text in texts
                        if str(text).strip()
                    )

            else:
                try:
                    result_data = res.json

                    if callable(result_data):
                        result_data = result_data()

                    if isinstance(result_data, dict):
                        texts = result_data.get("rec_texts", [])

                        if texts:
                            extracted_lines.extend(
                                str(text).strip()
                                for text in texts
                                if str(text).strip()
                            )

                except Exception:
                    continue

        return "\n".join(extracted_lines).strip()

    except Exception as e:
        print(f"PaddleOCR error: {e}")
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