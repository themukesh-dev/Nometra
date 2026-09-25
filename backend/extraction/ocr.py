
# backend/extraction/ocr.py

import os
import shutil
import subprocess
import tempfile
import time

import pytesseract
from PIL import Image


# ---------------------------------------------------------------------------
# CONFIGURATION
# ---------------------------------------------------------------------------

TESSERACT_TIMEOUT_SECONDS = 4


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
    Runs Tesseract OCR with a hard execution timeout.

    Tesseract is used as an independent OCR verification source
    against Gemini Vision extraction.

    If Tesseract takes longer than TESSERACT_TIMEOUT_SECONDS,
    the OCR process is terminated and an empty string is returned.

    This prevents slow OCR on low-resource production environments
    from blocking the complete Nometra inspection.
    """

    total_start = time.perf_counter()

    try:
        # ---------------------------------------------------------------
        # TESSERACT PATH
        # ---------------------------------------------------------------

        tesseract_path = pytesseract.pytesseract.tesseract_cmd

        if not tesseract_path:
            tesseract_path = shutil.which("tesseract")

        print("========== TESSERACT DIAGNOSTICS ==========")
        print(f"TESSERACT PATH: {tesseract_path}")
        print(f"TESSERACT TIMEOUT: {TESSERACT_TIMEOUT_SECONDS} sec")

        if not tesseract_path:
            print("TESSERACT ERROR: executable not found")
            return ""

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

            first_line = (
                version_output.splitlines()[0]
                if version_output
                else "UNKNOWN"
            )

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

        # Make sure the image is fully loaded before passing it
        # to the temporary TIFF file.
        image.load()

        image_time = time.perf_counter() - image_start

        print(f"IMAGE OPEN TIME: {image_time:.3f} sec")
        print(f"IMAGE SIZE: {image.size}")
        print(f"IMAGE MODE: {image.mode}")

        # ---------------------------------------------------------------
        # CREATE TEMPORARY IMAGE
        # ---------------------------------------------------------------

        temp_start = time.perf_counter()

        temp_file = tempfile.NamedTemporaryFile(
            suffix=".png",
            delete=False,
        )

        temp_image_path = temp_file.name
        temp_file.close()

        try:
            image.save(temp_image_path, format="PNG")

            temp_time = time.perf_counter() - temp_start

            print(f"TEMP IMAGE CREATION TIME: {temp_time:.3f} sec")

            # -----------------------------------------------------------
            # TESSERACT OCR
            # -----------------------------------------------------------

            ocr_start = time.perf_counter()

            try:
                process = subprocess.run(
                    [
                        tesseract_path,
                        temp_image_path,
                        "stdout",
                        "--psm",
                        "3",
                    ],
                    capture_output=True,
                    text=True,
                    timeout=TESSERACT_TIMEOUT_SECONDS,
                )

                raw_text = process.stdout or ""

                ocr_time = time.perf_counter() - ocr_start

                print(
                    f"TESSERACT OCR EXECUTION TIME: "
                    f"{ocr_time:.3f} sec"
                )

                if process.returncode != 0:
                    print(
                        f"TESSERACT PROCESS RETURN CODE: "
                        f"{process.returncode}"
                    )

                # -------------------------------------------------------
                # TOTAL
                # -------------------------------------------------------

                total_time = time.perf_counter() - total_start

                print(f"TOTAL OCR FUNCTION TIME: {total_time:.3f} sec")
                print("============================================")

                return raw_text.strip()

            except subprocess.TimeoutExpired:
                timeout_time = time.perf_counter() - ocr_start

                print(
                    f"TESSERACT OCR TIMEOUT: "
                    f"exceeded {TESSERACT_TIMEOUT_SECONDS} sec"
                )

                print(
                    f"TESSERACT OCR TIME BEFORE TIMEOUT: "
                    f"{timeout_time:.3f} sec"
                )

                total_time = time.perf_counter() - total_start

                print(
                    f"TOTAL OCR FUNCTION TIME: "
                    f"{total_time:.3f} sec"
                )

                print("============================================")

                return ""

        finally:
            # -----------------------------------------------------------
            # CLEAN TEMPORARY FILE
            # -----------------------------------------------------------

            try:
                os.remove(temp_image_path)
            except OSError:
                pass

    except Exception as e:
        total_time = time.perf_counter() - total_start

        print(f"Tesseract OCR error: {e}")
        print(
            f"TOTAL OCR FUNCTION TIME BEFORE ERROR: "
            f"{total_time:.3f} sec"
        )

        print("============================================")

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

