# backend/extraction/ocr.py

import gc

from paddleocr import PaddleOCR


# ---------------------------------------------------------------------------
# PADDLEOCR CONFIGURATION
# ---------------------------------------------------------------------------

# Nometra receives reasonably controlled package-label photographs.
# Document orientation classification, document unwarping, and text-line
# orientation are disabled to reduce unnecessary processing time and memory.
#
# IMPORTANT:
# PaddleOCR is intentionally NOT initialized at module import time.
#
# Render Free Tier has a 512 MB memory limit. Keeping the PaddleOCR models
# loaded inside the Gunicorn worker permanently can consume a large portion
# of that memory even when no scan is running.
#
# The OCR object is therefore created only when OCR is actually requested.
# After extraction, it is explicitly released.


def _create_ocr():
    """
    Creates the PaddleOCR engine only when OCR is required.

    Keeping initialization inside a function prevents the OCR models from
    being loaded during FastAPI/Gunicorn startup.
    """

    return PaddleOCR(
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

    PaddleOCR is loaded only for the duration of this function
    to reduce persistent memory usage on Render Free Tier.

    Returns:
        str: Raw OCR text.
    """

    ocr = None

    try:
        # ---------------------------------------------------------------
        # Create OCR engine only when a scan actually requires OCR.
        # ---------------------------------------------------------------

        ocr = _create_ocr()

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
                        texts = result_data.get(
                            "rec_texts",
                            []
                        )

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
        print(
            f"PaddleOCR error: {e}"
        )

        return ""

    finally:
        # ---------------------------------------------------------------
        # Explicitly release PaddleOCR resources.
        #
        # This is important for Render's 512 MB memory limit.
        # ---------------------------------------------------------------

        if ocr is not None:
            try:
                del ocr
            except Exception:
                pass

        gc.collect()


# ---------------------------------------------------------------------------
# STANDALONE TEST RUNNER
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print(
            "Usage: python ocr.py <path_to_image>"
        )
    else:
        result = extract_text_ocr(
            sys.argv[1]
        )

        print(result)