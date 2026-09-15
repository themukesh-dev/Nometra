# backend/ingestion/image_quality.py

"""
Pre-extraction image quality gate.

This module is NOT yet wired into api/scan.py. It's a planned refactor
piece: once ready, scan.py would call check_image_quality(temp_path)
on the saved upload BEFORE handing that same path to
extraction.ocr.extract_text_ocr() and extraction.gemini_vision.extract_label_data(),
so a bad photo (too small, too dark, too blurry) can be rejected early
with a clear reason instead of silently producing garbage OCR/Gemini output.

Deliberately uses only Pillow (already a hard dependency of both existing
extraction modules) rather than numpy/opencv, since requirements.txt is
not to be modified for this task.
"""

from PIL import Image, ImageStat, ImageFilter

# --- Heuristic thresholds ---
# These are simple, explainable cutoffs suitable for a hackathon demo,
# not a tuned production model.

MIN_WIDTH = 400
MIN_HEIGHT = 400

# Mean brightness (0-255 grayscale) below/above these is considered
# too dark / too washed-out to reliably read printed text.
MIN_BRIGHTNESS = 40
MAX_BRIGHTNESS = 235

# Sharpness proxy: standard deviation of pixel intensity after an
# edge-detection filter. Blurry images have soft, low-contrast edges
# and so a low stddev here; sharp images have a high stddev.
MIN_SHARPNESS = 8.0


def check_image_quality(image_path: str) -> dict:
    """
    Runs a set of lightweight checks against a label photo to decide
    whether it's good enough to send into OCR/Gemini extraction.

    Args:
        image_path: path to the image file, same contract as
                    extract_text_ocr() and extract_label_data().

    Returns:
        On success:
            {
                "is_acceptable": bool,
                "issues": [str, ...],       # reasons it failed (empty if passed)
                "metrics": {
                    "width": int,
                    "height": int,
                    "brightness": float,
                    "sharpness": float
                },
                "source": "image_quality"
            }
        On failure to even open/process the image:
            {
                "error": str,
                "source": "image_quality"
            }
    """
    try:
        image = Image.open(image_path)

        width, height = image.size

        # Convert to grayscale once — used for both brightness and sharpness.
        grayscale = image.convert("L")

        brightness = ImageStat.Stat(grayscale).mean[0]

        # Edge-detected version of the image: sharp photos have strong,
        # well-defined edges (high pixel variance); blurry ones don't.
        edges = grayscale.filter(ImageFilter.FIND_EDGES)
        sharpness = ImageStat.Stat(edges).stddev[0]

        issues = []

        if width < MIN_WIDTH or height < MIN_HEIGHT:
            issues.append(
                f"Image resolution too low ({width}x{height}); "
                f"minimum required is {MIN_WIDTH}x{MIN_HEIGHT}."
            )

        if brightness < MIN_BRIGHTNESS:
            issues.append("Image is too dark to reliably read printed text.")
        elif brightness > MAX_BRIGHTNESS:
            issues.append("Image is too bright/washed-out to reliably read printed text.")

        if sharpness < MIN_SHARPNESS:
            issues.append("Image appears blurry; text edges are not sharp enough.")

        return {
            "is_acceptable": len(issues) == 0,
            "issues": issues,
            "metrics": {
                "width": width,
                "height": height,
                "brightness": round(brightness, 2),
                "sharpness": round(sharpness, 2)
            },
            "source": "image_quality"
        }

    except Exception as e:
        return {
            "error": str(e),
            "source": "image_quality"
        }


# Standalone test runner — same pattern as ocr.py / gemini_vision.py
if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python image_quality.py <path_to_image>")
    else:
        result = check_image_quality(sys.argv[1])
        print(result)