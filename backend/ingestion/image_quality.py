# backend/ingestion/image_quality.py

"""
Pre-extraction image quality gate.

This module provides lightweight, explainable image-quality checks
before OCR/Gemini extraction.

OpenCV is used for:
    - Image loading
    - Grayscale conversion
    - Brightness analysis
    - Laplacian-based sharpness analysis

Pillow is used for basic image-file validation.

The original uploaded image is never modified by this module.

Quality checks:
    1. Resolution
    2. Brightness
    3. Sharpness / blur detection
"""

import cv2
from PIL import Image


# -------------------------------------------------------------
# Quality thresholds
# -------------------------------------------------------------

MIN_WIDTH = 400
MIN_HEIGHT = 400

# Mean brightness:
# 0   = completely black
# 255 = completely white
MIN_BRIGHTNESS = 40
MAX_BRIGHTNESS = 235

# Laplacian variance threshold for blur detection.
#
# Lower values generally indicate weaker/fewer sharp edges,
# which is characteristic of blurry images.
#
# This is a hackathon-oriented heuristic, not a production-
# calibrated computer-vision model.
MIN_SHARPNESS = 50.0


def check_image_quality(image_path: str) -> dict:
    """
    Runs lightweight image-quality checks against a label photo.

    Checks:
        - Image resolution
        - Average brightness
        - Image sharpness using Laplacian variance

    Args:
        image_path:
            Path to the image file.

    Returns:
        On success:

            {
                "is_acceptable": bool,
                "issues": [str, ...],
                "metrics": {
                    "width": int,
                    "height": int,
                    "brightness": float,
                    "sharpness": float
                },
                "source": "image_quality"
            }

        On failure:

            {
                "error": str,
                "source": "image_quality"
            }
    """

    try:

        # ---------------------------------------------------------
        # 1. Validate image file
        # ---------------------------------------------------------

        with Image.open(image_path) as image:
            image.verify()

        # ---------------------------------------------------------
        # 2. Load image using OpenCV
        # ---------------------------------------------------------

        image = cv2.imread(image_path)

        if image is None:

            return {
                "error":
                    "OpenCV could not read the image.",
                "source":
                    "image_quality"
            }

        # ---------------------------------------------------------
        # 3. Check image resolution
        # ---------------------------------------------------------

        height, width = image.shape[:2]

        # ---------------------------------------------------------
        # 4. Convert to grayscale
        # ---------------------------------------------------------

        grayscale = cv2.cvtColor(
            image,
            cv2.COLOR_BGR2GRAY
        )

        # ---------------------------------------------------------
        # 5. Calculate average brightness
        # ---------------------------------------------------------

        brightness = float(
            grayscale.mean()
        )

        # ---------------------------------------------------------
        # 6. Calculate sharpness
        # ---------------------------------------------------------
        #
        # Laplacian variance is commonly used as a simple
        # focus/blur indicator.
        #
        # Sharp image:
        #     stronger fine edges
        #     higher variance
        #
        # Blurry image:
        #     smoother edges
        #     lower variance
        #

        laplacian = cv2.Laplacian(
            grayscale,
            cv2.CV_64F
        )

        sharpness = float(
            laplacian.var()
        )

        # ---------------------------------------------------------
        # 7. Evaluate quality issues
        # ---------------------------------------------------------

        issues = []

        # Resolution check
        if (
            width < MIN_WIDTH
            or height < MIN_HEIGHT
        ):

            issues.append(
                f"Image resolution too low "
                f"({width}x{height}); "
                f"minimum required is "
                f"{MIN_WIDTH}x{MIN_HEIGHT}."
            )

        # Brightness check
        if brightness < MIN_BRIGHTNESS:

            issues.append(
                "Image is too dark to reliably "
                "read printed text."
            )

        elif brightness > MAX_BRIGHTNESS:

            issues.append(
                "Image is too bright/washed-out "
                "to reliably read printed text."
            )

        # Blur/sharpness check
        if sharpness < MIN_SHARPNESS:

            issues.append(
                "Image appears blurry; "
                "text edges are not sharp enough."
            )

        # ---------------------------------------------------------
        # 8. Return quality result
        # ---------------------------------------------------------

        return {
            "is_acceptable":
                len(issues) == 0,

            "issues":
                issues,

            "metrics": {
                "width":
                    int(width),

                "height":
                    int(height),

                "brightness":
                    round(
                        brightness,
                        2
                    ),

                "sharpness":
                    round(
                        sharpness,
                        2
                    )
            },

            "source":
                "image_quality"
        }

    except Exception as e:

        return {
            "error":
                str(e),

            "source":
                "image_quality"
        }


# -------------------------------------------------------------
# Standalone test runner
# -------------------------------------------------------------

if __name__ == "__main__":

    import sys

    if len(sys.argv) < 2:

        print(
            "Usage: "
            "python image_quality.py "
            "<path_to_image>"
        )

    else:

        result = check_image_quality(
            sys.argv[1]
        )

        print(result)