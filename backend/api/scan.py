# backend/api/scan.py

import os
import sys
import uuid
import hashlib
import inspect
import json
import time
from datetime import datetime, timezone

from fastapi import (
    APIRouter,
    FastAPI,
    File,
    Form,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse


# ============================================================
# PATH CONFIGURATION
# ============================================================

# Allows this file to find sibling top-level folders
# (extraction/, engine/, classification/, etc.)
sys.path.append(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )
)


# ============================================================
# IMPORTS
# ============================================================

from extraction.gemini_vision import (
    extract_label_data,
)

from extraction.ocr import (
    extract_text_ocr,
)

from extraction.evidence_fusion import (
    fuse_evidence,
)

from engine.evaluator import (
    evaluate_rules,
)

from classification.categories import (
    build_classification,
)

from database.inspections import (
    init_db,
    save_inspection,
    get_all_inspections,
    get_inspection_by_id,
    update_inspector_review,
)

from ingestion.image_quality import (
    check_image_quality,
)


# ============================================================
# DATABASE DEBUGGING
# ============================================================

import database.inspections as inspections_module


print(
    "DATABASE MODULE:",
    inspections_module.__file__,
)

print(
    "DATABASE PATH:",
    inspections_module.DB_PATH,
)

print("SAVE_INSPECTION FUNCTION:")

print(
    inspect.signature(
        save_inspection
    )
)


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="Nometra API",
    description=(
        "Legal Metrology packaged commodity "
        "inspection backend."
    ),
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://nometra.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

init_db()


# ============================================================
# ROUTER
# ============================================================

router = APIRouter()


# ============================================================
# UPLOAD CONFIGURATION
# ============================================================

UPLOAD_FOLDER = os.path.join(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    ),
    "uploads",
)

os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True,
)


ALLOWED_EXTENSIONS = {
    "jpg",
    "jpeg",
    "png",
    "webp",
}


def _allowed_file(
    filename: str,
) -> bool:
    """
    Returns True when the uploaded filename has
    a supported image extension.
    """

    return (
        "." in filename
        and filename.rsplit(
            ".",
            1,
        )[1].lower()
        in ALLOWED_EXTENSIONS
    )


def _calculate_sha256(
    file_path: str,
) -> str:
    """
    Calculates the SHA-256 hash of an evidence image.

    The hash provides a tamper-evident fingerprint
    of the exact uploaded evidence file.
    """

    sha256 = hashlib.sha256()

    with open(
        file_path,
        "rb",
    ) as evidence_file:

        for chunk in iter(
            lambda: evidence_file.read(8192),
            b"",
        ):
            sha256.update(chunk)

    return sha256.hexdigest()


def _parse_image_sides(
    image_sides: str,
) -> list:
    """
    Parses the image_sides form field.

    Normal frontend value:

        ["FRONT"]

    Some command-line clients or proxies may escape
    the quotation marks and send:

        [\\"FRONT\\"]

    This helper accepts both representations while
    keeping the API contract as a JSON array.
    """

    if image_sides is None:
        raise ValueError(
            "Invalid image_sides. Expected a JSON array."
        )

    value = str(
        image_sides
    ).strip()

    if not value:
        raise ValueError(
            "Invalid image_sides. Expected a JSON array."
        )

    # First attempt: normal JSON.
    try:

        parsed = json.loads(value)

        if isinstance(parsed, list):
            return parsed

    except json.JSONDecodeError:
        pass

    # Second attempt: JSON whose quotation marks
    # were escaped by a shell/client.
    try:

        unescaped_value = value.replace(
            '\\"',
            '"',
        )

        parsed = json.loads(
            unescaped_value
        )

        if isinstance(parsed, list):
            return parsed

    except json.JSONDecodeError:
        pass

    raise ValueError(
        "Invalid image_sides. Expected a JSON array."
    )


# ============================================================
# IMAGE QUALITY ENDPOINT
# ============================================================

@router.post(
    "/image-quality"
)
async def image_quality_check(
    image: UploadFile = File(...)
):
    """
    Performs the pre-extraction image-quality check.

    This endpoint is used by ImageQualityScreen.tsx.

    The image is NOT sent to Gemini or OCR here.
    """

    temp_path = None

    try:

        # --------------------------------------------------
        # 1. Validate upload
        # --------------------------------------------------

        if image is None or not image.filename:

            return JSONResponse(
                status_code=400,
                content={
                    "error": (
                        "No image was provided."
                    )
                },
            )

        # --------------------------------------------------
        # 2. Validate file extension
        # --------------------------------------------------

        if not _allowed_file(
            image.filename
        ):

            return JSONResponse(
                status_code=400,
                content={
                    "error": (
                        f"Unsupported file type for "
                        f"'{image.filename}'. "
                        "Use jpg, jpeg, png, or webp."
                    )
                },
            )

        print("")
        print(
            "========== IMAGE QUALITY CHECK =========="
        )

        print(
            "FILENAME:",
            image.filename,
        )

        # --------------------------------------------------
        # 3. Save temporary image
        # --------------------------------------------------

        file_extension = (
            image.filename
            .rsplit(
                ".",
                1,
            )[1]
            .lower()
        )

        temp_filename = (
            f"quality_{uuid.uuid4()}.{file_extension}"
        )

        temp_path = os.path.join(
            UPLOAD_FOLDER,
            temp_filename,
        )

        image_bytes = await image.read()

        if not image_bytes:

            return JSONResponse(
                status_code=400,
                content={
                    "error": (
                        "The uploaded image is empty."
                    )
                },
            )

        with open(
            temp_path,
            "wb",
        ) as output_file:

            output_file.write(
                image_bytes
            )

        # --------------------------------------------------
        # 4. OpenCV image-quality analysis
        # --------------------------------------------------

        print(
            "RUNNING OPENCV IMAGE QUALITY..."
        )

        quality_start = time.perf_counter()

        quality_result = (
            check_image_quality(
                temp_path
            )
        )

        quality_time = (
            time.perf_counter()
            - quality_start
        )

        print(
            f"IMAGE QUALITY TIME: {quality_time:.3f} sec"
        )

        # --------------------------------------------------
        # 5. Handle processing error
        # --------------------------------------------------

        if "error" in quality_result:

            print(
                "IMAGE QUALITY ERROR:",
                quality_result,
            )

            return JSONResponse(
                status_code=400,
                content={
                    "error": (
                        "Image quality analysis failed."
                    ),
                    "image_quality":
                        quality_result,
                },
            )

        # --------------------------------------------------
        # 6. Log result
        # --------------------------------------------------

        print(
            "IMAGE QUALITY RESULT:"
        )

        print(
            json.dumps(
                quality_result,
                indent=2,
                ensure_ascii=False,
            )
        )

        print(
            "=========================================="
        )

        print("")

        # --------------------------------------------------
        # 7. Return result to frontend
        # --------------------------------------------------

        return {
            "image_quality":
                quality_result
        }

    except Exception as e:

        print(
            "IMAGE QUALITY ENDPOINT ERROR:",
            str(e),
        )

        return JSONResponse(
            status_code=500,
            content={
                "error": (
                    f"Image quality processing failed: "
                    f"{str(e)}"
                )
            },
        )

    finally:

        # --------------------------------------------------
        # Always delete temporary image
        # --------------------------------------------------

        if (
            temp_path
            and os.path.exists(
                temp_path
            )
        ):

            try:

                os.remove(
                    temp_path
                )

            except OSError as cleanup_error:

                print(
                    "IMAGE QUALITY TEMP FILE "
                    "CLEANUP ERROR:",
                    cleanup_error,
                )


# ============================================================
# SCAN ENDPOINT
# ============================================================

@router.post(
    "/scan"
)
async def scan_label(
    images: list[UploadFile] = File(...),
    image_sides: str = Form("[]"),
    category: str = Form("Other"),
):
    """
    Accepts one package image.

    Current Nometra frontend contract:

        images       -> one uploaded image
        image_sides  -> ["FRONT"]
        category     -> selected category

    Full Nometra pipeline:

        Package Image
              ↓
        Image Validation
              ↓
        SHA-256 + Timestamp
              ↓
        OpenCV Image Quality
              ↓
        Gemini Vision
              ↓
        Tesseract OCR
              ↓
        Evidence Fusion
              ↓
        Classification
              ↓
        Applicability
              ↓
        Rule Engine
              ↓
        Database
              ↓
        Compliance Report

    Product-name traceability:

        Gemini product name
              ↓
        gemini_product_name
              ↓
        initial product_name
              ↓
        Inspector Review
              ↓
        final product_name
    """

    # --------------------------------------------------
    # TOTAL TIMER
    # --------------------------------------------------

    total_start = time.perf_counter()

    temporary_images = []

    try:

        # --------------------------------------------------
        # 1. Validate uploaded image
        # --------------------------------------------------

        valid_images = [
            image
            for image in images
            if image is not None
            and image.filename
        ]

        if not valid_images:

            return JSONResponse(
                status_code=400,
                content={
                    "error": (
                        "No package image was provided."
                    )
                },
            )

        # --------------------------------------------------
        # Current product flow is SINGLE IMAGE
        # --------------------------------------------------

        if len(valid_images) != 1:

            return JSONResponse(
                status_code=400,
                content={
                    "error": (
                        "Nometra currently supports "
                        "one package image per inspection."
                    )
                },
            )

        image_file = valid_images[0]

        print(
            "NUMBER OF IMAGES RECEIVED:",
            len(valid_images),
        )

        print(
            "FILENAME:",
            image_file.filename,
        )

        # --------------------------------------------------
        # 2. Validate image_sides
        # --------------------------------------------------

        try:

            parsed_sides = _parse_image_sides(
                image_sides
            )

        except ValueError as e:

            return JSONResponse(
                status_code=400,
                content={
                    "error": str(e)
                },
            )

        if not isinstance(
            parsed_sides,
            list,
        ):

            return JSONResponse(
                status_code=400,
                content={
                    "error": (
                        "image_sides must be "
                        "a JSON array."
                    )
                },
            )

        if len(parsed_sides) != 1:

            return JSONResponse(
                status_code=400,
                content={
                    "error": (
                        "Exactly one image side "
                        "must be provided."
                    )
                },
            )

        side = str(
            parsed_sides[0]
        ).strip().upper()

        if not side:
            side = "FRONT"

        # --------------------------------------------------
        # 3. Validate filename
        # --------------------------------------------------

        if not image_file.filename:

            return JSONResponse(
                status_code=400,
                content={
                    "error": (
                        "The uploaded image "
                        "has no filename."
                    )
                },
            )

        if not _allowed_file(
            image_file.filename
        ):

            return JSONResponse(
                status_code=400,
                content={
                    "error": (
                        f"Unsupported file type for "
                        f"'{image_file.filename}'. "
                        "Use jpg, jpeg, png, or webp."
                    )
                },
            )

        # --------------------------------------------------
        # 4. Classification
        # --------------------------------------------------

        category = (
            str(category).strip()
            if category
            else "Other"
        )

        # Frontend no longer sends origin/sale_type.
        # Backend uses the current defaults.

        origin = "domestic"
        sale_type = "retail"

        print(
            "CLASSIFICATION:"
        )

        print(
            "  category:",
            category,
        )

        print(
            "  origin:",
            origin,
        )

        print(
            "  sale_type:",
            sale_type,
        )

        classification_start = time.perf_counter()

        try:

            classification = (
                build_classification(
                    origin=origin,
                    sale_type=sale_type,
                )
            )

        except ValueError as e:

            return JSONResponse(
                status_code=400,
                content={
                    "error":
                        f"Invalid classification: {str(e)}"
                },
            )

        classification_time = (
            time.perf_counter()
            - classification_start
        )

        print(
            f"CLASSIFICATION TIME: "
            f"{classification_time:.3f} sec"
        )

        # --------------------------------------------------
        # 5. Save uploaded image temporarily
        # --------------------------------------------------

        upload_start = time.perf_counter()

        file_extension = (
            image_file.filename
            .rsplit(
                ".",
                1,
            )[1]
            .lower()
        )

        temp_filename = (
            f"{uuid.uuid4()}.{file_extension}"
        )

        temp_path = os.path.join(
            UPLOAD_FOLDER,
            temp_filename,
        )

        image_bytes = (
            await image_file.read()
        )

        if not image_bytes:

            return JSONResponse(
                status_code=400,
                content={
                    "error": (
                        "The uploaded image is empty."
                    )
                },
            )

        with open(
            temp_path,
            "wb",
        ) as output_file:

            output_file.write(
                image_bytes
            )

        temporary_images.append(
            {
                "side": side,
                "path": temp_path,
                "original_filename":
                    image_file.filename,
            }
        )

        upload_time = (
            time.perf_counter()
            - upload_start
        )

        print(
            f"IMAGE SAVE TIME: {upload_time:.3f} sec"
        )

        # --------------------------------------------------
        # 6. Evidence integrity
        # --------------------------------------------------

        evidence_start = time.perf_counter()

        evidence_timestamp = (
            datetime.now(
                timezone.utc
            ).isoformat()
        )

        image_hash = (
            _calculate_sha256(
                temp_path
            )
        )

        print(
            "EVIDENCE INTEGRITY:"
        )

        print(
            "  algorithm: SHA-256"
        )

        print(
            "  timestamp:",
            evidence_timestamp,
        )

        print(
            "  hash:",
            image_hash,
        )

        # For the current single-image flow,
        # the combined evidence hash is the image hash.
        combined_evidence_hash = image_hash

        evidence_time = (
            time.perf_counter()
            - evidence_start
        )

        print(
            f"EVIDENCE HASH TIME: "
            f"{evidence_time:.3f} sec"
        )

        # --------------------------------------------------
        # 7. OpenCV image-quality check
        # --------------------------------------------------

        print(
            "OPENCV IMAGE QUALITY:",
            side,
        )

        quality_start = time.perf_counter()

        image_quality = (
            check_image_quality(
                temp_path
            )
        )

        quality_time = (
            time.perf_counter()
            - quality_start
        )

        print(
            f"IMAGE QUALITY TIME: "
            f"{quality_time:.3f} sec"
        )

        print(
            "IMAGE QUALITY RESULT:"
        )

        print(
            json.dumps(
                image_quality,
                indent=2,
                ensure_ascii=False,
            )
        )

        # If OpenCV could not process the image,
        # reject the scan before OCR/Gemini.
        if "error" in image_quality:

            return JSONResponse(
                status_code=400,
                content={
                    "error": (
                        "Image quality analysis failed."
                    ),
                    "image_quality":
                        image_quality,
                },
            )

        # If the image does not meet the quality
        # thresholds, reject it before extraction.
        if not image_quality.get(
            "is_acceptable",
            False,
        ):

            return JSONResponse(
                status_code=400,
                content={
                    "error": (
                        "Image quality is not sufficient "
                        "for reliable label extraction."
                    ),
                    "image_quality":
                        image_quality,
                },
            )

        # --------------------------------------------------
        # 8. Gemini Vision
        # --------------------------------------------------

        print(
            "GEMINI VISION:",
            side,
        )

        gemini_start = time.perf_counter()

        gemini_result = (
            extract_label_data(
                temp_path
            )
        )

        gemini_time = (
            time.perf_counter()
            - gemini_start
        )

        print(
            f"GEMINI VISION TIME: "
            f"{gemini_time:.3f} sec"
        )

        # --------------------------------------------------
        # 8A. Preserve Gemini's original product name
        # --------------------------------------------------
        #
        # This value is captured BEFORE evidence fusion
        # and BEFORE inspector review.
        #
        # It is stored separately so that an inspector's
        # correction never overwrites Gemini's original
        # extraction.

        gemini_product_name = None

        if isinstance(
            gemini_result,
            dict,
        ):

            raw_product_name = (
                gemini_result.get(
                    "product_name"
                )
            )

            if isinstance(
                raw_product_name,
                dict,
            ):

                raw_product_name = (
                    raw_product_name.get(
                        "value"
                    )
                )

            if raw_product_name is not None:

                raw_product_name = str(
                    raw_product_name
                ).strip()

                if raw_product_name:

                    gemini_product_name = (
                        raw_product_name
                    )

        # At scan time, the inspector has not changed
        # anything yet, so the final product name starts
        # as Gemini's suggestion.

        product_name = (
            gemini_product_name
        )

        print(
            "GEMINI PRODUCT NAME:",
            gemini_product_name,
        )

        print(
            "INITIAL PRODUCT NAME:",
            product_name,
        )

        print(
            "GEMINI COUNTRY OF ORIGIN:",
            gemini_result.get(
                "country_of_origin"
            )
            if isinstance(
                gemini_result,
                dict,
            )
            else None,
        )

        # --------------------------------------------------
        # 9. Tesseract OCR
        # --------------------------------------------------

        print(
            "TESSERACT OCR:",
            side,
        )

        ocr_start = time.perf_counter()

        ocr_result = (
            extract_text_ocr(
                temp_path
            )
        )

        ocr_time = (
            time.perf_counter()
            - ocr_start
        )

        print(
            f"TESSERACT OCR TIME: "
            f"{ocr_time:.3f} sec"
        )

        print(
            "TESSERACT OCR RESULT AVAILABLE:",
            bool(ocr_result),
        )

        # --------------------------------------------------
        # 10. Evidence fusion
        # --------------------------------------------------

        print(
            "EVIDENCE FUSION:",
            side,
        )

        fusion_start = time.perf_counter()

        fused_evidence = (
            fuse_evidence(
                gemini_result,
                ocr_result,
            )
        )

        fusion_time = (
            time.perf_counter()
            - fusion_start
        )

        print(
            f"EVIDENCE FUSION TIME: "
            f"{fusion_time:.3f} sec"
        )

        print(
            "FUSED COUNTRY OF ORIGIN:",
            json.dumps(
                fused_evidence.get(
                    "country_of_origin"
                ),
                indent=2,
                ensure_ascii=False,
            ),
        )

        print(
            "FUSED NON-EMPTY FIELDS:",
            [
                field_name
                for field_name, field_value
                in fused_evidence.items()
                if (
                    isinstance(
                        field_value,
                        dict,
                    )
                    and field_value.get(
                        "value"
                    ) is not None
                    and str(
                        field_value.get(
                            "value"
                        )
                    ).strip() != ""
                )
            ],
        )

        # --------------------------------------------------
        # 11. Attach single-image metadata
        # --------------------------------------------------

        fused_evidence[
            "_multi_view"
        ] = {
            "image_count": 1,

            "sides": [
                side
            ],

            "images": [
                {
                    "side": side,
                    "filename":
                        image_file.filename,
                    "hash":
                        image_hash,
                }
            ],

            "processing": [
                {
                    "side": side,

                    "gemini_fields":
                        sum(
                            1
                            for (
                                field_name,
                                field_value,
                            ) in (
                                gemini_result.items()
                                if isinstance(
                                    gemini_result,
                                    dict,
                                )
                                else []
                            )
                            if (
                                field_name
                                != "source"
                                and field_value
                                is not None
                                and str(
                                    field_value
                                ).strip()
                                != ""
                            )
                        ),

                    "ocr_result_available":
                        bool(
                            ocr_result
                        ),
                }
            ],

            "conflicts": {},
        }

        # --------------------------------------------------
        # 12. Rule engine
        # --------------------------------------------------

        print("")
        print(
            "========== COO DEBUG =========="
        )

        print(
            "CLASSIFICATION:"
        )

        print(
            json.dumps(
                classification,
                indent=2,
                ensure_ascii=False,
            )
        )

        print(
            "FUSED COUNTRY OF ORIGIN:"
        )

        print(
            json.dumps(
                fused_evidence.get(
                    "country_of_origin"
                ),
                indent=2,
                ensure_ascii=False,
            )
        )

        rule_start = time.perf_counter()

        compliance_report = (
            evaluate_rules(
                fused_evidence,
                classification,
            )
        )

        rule_time = (
            time.perf_counter()
            - rule_start
        )

        print(
            f"RULE ENGINE TIME: "
            f"{rule_time:.3f} sec"
        )

        print(
            "COO RULE RESULT:"
        )

        print(
            json.dumps(
                [
                    result
                    for result
                    in compliance_report.get(
                        "results",
                        [],
                    )
                    if (
                        result.get(
                            "rule_id"
                        )
                        == "LM-COO-01"
                        or
                        result.get(
                            "field"
                        )
                        == "country_of_origin"
                    )
                ],
                indent=2,
                ensure_ascii=False,
            )
        )

        print(
            "================================"
        )

        print("")

        # --------------------------------------------------
        # 13. Save inspection
        # --------------------------------------------------

        print(
            "ABOUT TO SAVE INSPECTION:"
        )

        print(
            "  evidence_hash:",
            combined_evidence_hash,
        )

        print(
            "  evidence_timestamp:",
            evidence_timestamp,
        )

        print(
            "  gemini_product_name:",
            gemini_product_name,
        )

        print(
            "  product_name:",
            product_name,
        )

        save_start = time.perf_counter()

        inspection_id = (
            save_inspection(
                fused_evidence,
                compliance_report,

                evidence_hash=
                    combined_evidence_hash,

                evidence_timestamp=
                    evidence_timestamp,

                # Preserve Gemini's original extraction.
                gemini_product_name=
                    gemini_product_name,

                # Initial final name.
                # Inspector can change this later.
                product_name=
                    product_name,
            )
        )

        save_time = (
            time.perf_counter()
            - save_start
        )

        print(
            f"DATABASE SAVE TIME: "
            f"{save_time:.3f} sec"
        )

        # --------------------------------------------------
        # 14. Complete response
        # --------------------------------------------------

        response_build_start = time.perf_counter()

        response = {
            "inspection_id":
                inspection_id,

            # ------------------------------------------------
            # Product-name traceability
            # ------------------------------------------------

            "gemini_product_name":
                gemini_product_name,

            "product_name":
                product_name,

            "classification": {
                "category":
                    category,

                "commodity_type":
                    classification[
                        "commodity_type"
                    ],

                "origin":
                    classification[
                        "origin"
                    ],

                "sale_type":
                    classification[
                        "sale_type"
                    ],
            },

            "extracted_data":
                fused_evidence,

            "compliance_report":
                compliance_report,

            "image_quality":
                image_quality,

            "evidence_integrity": {
                "algorithm":
                    "SHA-256",

                "hash":
                    combined_evidence_hash,

                "timestamp":
                    evidence_timestamp,

                "images": [
                    {
                        "side": side,
                        "filename":
                            image_file.filename,
                        "hash":
                            image_hash,
                    }
                ],
            },

            "multi_view": {
                "enabled": False,

                "image_count": 1,

                "sides": [
                    side
                ],

                "conflicts": {},
            },
        }

        response_build_time = (
            time.perf_counter()
            - response_build_start
        )

        print(
            f"RESPONSE BUILD TIME: "
            f"{response_build_time:.3f} sec"
        )

        # --------------------------------------------------
        # TOTAL TIMING
        # --------------------------------------------------

        total_time = (
            time.perf_counter()
            - total_start
        )

        print("")
        print(
            "=========================================="
        )
        print(
            "NOMETRA SCAN TIMING SUMMARY"
        )
        print(
            "=========================================="
        )

        print(
            f"Image Quality : {quality_time:.3f} sec"
        )

        print(
            f"Gemini Vision : {gemini_time:.3f} sec"
        )

        print(
            f"Tesseract OCR : {ocr_time:.3f} sec"
        )

        print(
            f"Evidence Fusion: {fusion_time:.3f} sec"
        )

        print(
            f"Rule Engine   : {rule_time:.3f} sec"
        )

        print(
            f"Database Save : {save_time:.3f} sec"
        )

        print(
            f"Total Scan    : {total_time:.3f} sec"
        )

        print(
            "=========================================="
        )

        print("")

        return response

    except Exception as e:

        total_time = (
            time.perf_counter()
            - total_start
        )

        print(
            "PROCESSING ERROR:",
            str(e),
        )

        print(
            f"TOTAL SCAN TIME BEFORE ERROR: "
            f"{total_time:.3f} sec"
        )

        return JSONResponse(
            status_code=500,
            content={
                "error": (
                    f"Processing failed: {str(e)}"
                )
            },
        )

    finally:

        # --------------------------------------------------
        # Always remove temporary image.
        # --------------------------------------------------

        for image in temporary_images:

            temp_path = image[
                "path"
            ]

            if os.path.exists(
                temp_path
            ):

                try:

                    os.remove(
                        temp_path
                    )

                except OSError as cleanup_error:

                    print(
                        "TEMP FILE CLEANUP ERROR:",
                        cleanup_error,
                    )


# ============================================================
# INSPECTOR REVIEW ENDPOINT
# ============================================================

@router.put(
    "/inspections/{inspection_id}/review"
)
async def save_inspector_review(
    inspection_id: int,
    data: dict,
):
    """
    Persists the inspector's review for an
    existing inspection.

    Product-name behavior:

        gemini_product_name
            ↓
        remains unchanged

        product_name
            ↓
        may be edited by inspector
    """

    inspection = (
        get_inspection_by_id(
            inspection_id
        )
    )

    if inspection is None:

        return JSONResponse(
            status_code=404,
            content={
                "error": (
                    f"No inspection found with id "
                    f"{inspection_id}"
                )
            },
        )

    inspector_decisions = data.get(
        "inspector_decisions",
        {},
    )

    inspector_notes = data.get(
        "inspector_notes",
        {},
    )

    inspector_remarks = data.get(
        "inspector_remarks",
        "",
    )

    final_status = data.get(
        "final_status"
    )

    # --------------------------------------------------
    # Product name from inspector
    # --------------------------------------------------

    product_name = data.get(
        "product_name"
    )

    # --------------------------------------------------
    # Validate inspector decisions
    # --------------------------------------------------

    if not isinstance(
        inspector_decisions,
        dict,
    ):

        return JSONResponse(
            status_code=400,
            content={
                "error": (
                    "inspector_decisions "
                    "must be an object."
                )
            },
        )

    # --------------------------------------------------
    # Validate inspector notes
    # --------------------------------------------------

    if not isinstance(
        inspector_notes,
        dict,
    ):

        return JSONResponse(
            status_code=400,
            content={
                "error": (
                    "inspector_notes "
                    "must be an object."
                )
            },
        )

    # --------------------------------------------------
    # Validate inspector remarks
    # --------------------------------------------------

    if not isinstance(
        inspector_remarks,
        str,
    ):

        return JSONResponse(
            status_code=400,
            content={
                "error": (
                    "inspector_remarks "
                    "must be a string."
                )
            },
        )

    # --------------------------------------------------
    # Validate final status
    # --------------------------------------------------

    if (
        final_status is not None
        and not isinstance(
            final_status,
            str,
        )
    ):

        return JSONResponse(
            status_code=400,
            content={
                "error": (
                    "final_status must be "
                    "a string or null."
                )
            },
        )

    # --------------------------------------------------
    # Validate product name
    # --------------------------------------------------

    if (
        product_name is not None
        and not isinstance(
            product_name,
            str,
        )
    ):

        return JSONResponse(
            status_code=400,
            content={
                "error": (
                    "product_name must be "
                    "a string or null."
                )
            },
        )

    # --------------------------------------------------
    # Update inspection
    # --------------------------------------------------

    updated = (
        update_inspector_review(
            inspection_id=
                inspection_id,

            inspector_decisions=
                inspector_decisions,

            inspector_notes=
                inspector_notes,

            inspector_remarks=
                inspector_remarks,

            final_status=
                final_status,

            product_name=
                product_name,
        )
    )

    if not updated:

        return JSONResponse(
            status_code=500,
            content={
                "error": (
                    f"Failed to update inspection "
                    f"{inspection_id}."
                )
            },
        )

    # --------------------------------------------------
    # Retrieve updated inspection
    # --------------------------------------------------

    updated_inspection = (
        get_inspection_by_id(
            inspection_id
        )
    )

    return {
        "message":
            "Inspector review saved.",

        "inspection":
            updated_inspection,
    }


# ============================================================
# HISTORICAL INSPECTIONS
# ============================================================

@router.get(
    "/inspections"
)
async def list_inspections():
    """
    Returns a summary list of every past scan
    (most recent first).
    """

    inspections = (
        get_all_inspections()
    )

    return {
        "inspections":
            inspections
    }


# ============================================================
# GET SINGLE INSPECTION
# ============================================================

@router.get(
    "/inspections/{inspection_id}"
)
async def get_inspection(
    inspection_id: int,
):
    """
    Returns full detail for one past scan.
    """

    inspection = (
        get_inspection_by_id(
            inspection_id
        )
    )

    if inspection is None:

        return JSONResponse(
            status_code=404,
            content={
                "error": (
                    f"No inspection found with id "
                    f"{inspection_id}"
                )
            },
        )

    return inspection


# ============================================================
# HEALTH CHECK
# ============================================================

@router.get(
    "/health"
)
async def health_check():

    return {
        "status": "ok"
    }


# ============================================================
# REGISTER API ROUTES
# ============================================================

app.include_router(
    router
)


# ============================================================
# REPORT ROUTES
# ============================================================

try:

    from api.reports import (
        router as reports_router,
    )

    app.include_router(
        reports_router
    )

except ImportError as e:

    print(
        "REPORT ROUTER NOT LOADED:",
        e,
    )


# ============================================================
# UVICORN ENTRY POINT
# ============================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "api.scan:app",
        host="0.0.0.0",
        port=5000,
        reload=True,
    )