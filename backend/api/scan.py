# backend/api/scan.py

import os
import sys
import uuid
import hashlib
import inspect
import json
from datetime import datetime, timezone

from flask import Flask, request, jsonify
from flask_cors import CORS


# Allows this file to find sibling top-level folders
# (extraction/, engine/, classification/, etc.)
# when Flask runs this file directly.
sys.path.append(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )
)


from extraction.gemini_vision import extract_label_data
from extraction.ocr import extract_text_ocr
from extraction.evidence_fusion import fuse_evidence
from engine.evaluator import evaluate_rules
from classification.categories import build_classification
from database.inspections import (
    init_db,
    save_inspection,
    get_all_inspections,
    get_inspection_by_id,
    update_inspector_review,
)


# --------------------------------------------------
# Database debugging
# --------------------------------------------------

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
    inspect.signature(save_inspection)
)


app = Flask(__name__)
CORS(app)


# Make sure the inspections table exists before
# the app starts taking requests.
init_db()


# --------------------------------------------------
# Upload configuration
# --------------------------------------------------

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
            lambda: evidence_file.read(
                8192
            ),
            b"",
        ):
            sha256.update(chunk)

    return sha256.hexdigest()


# --------------------------------------------------
# Multi-image helpers
# --------------------------------------------------

def _get_uploaded_images():
    """
    Reads uploaded package images from the request.

    Preferred format:

        images -> multiple files
        image_sides -> JSON array

    Example:

        images:
            front.jpg
            back.jpg
            left.jpg
            right.jpg

        image_sides:
            ["FRONT", "BACK", "LEFT", "RIGHT"]

    Legacy format is also supported:

        image -> single file

    Returns:

        [
            {
                "file": FileStorage,
                "side": "FRONT"
            },
            ...
        ]
    """

    uploaded_files = request.files.getlist(
        "images"
    )

    uploaded_files = [
        file
        for file in uploaded_files
        if file is not None
        and file.filename
    ]

    # --------------------------------------------------
    # Multi-image request
    # --------------------------------------------------

    if uploaded_files:

        raw_sides = request.form.get(
            "image_sides",
            "[]",
        )

        try:
            image_sides = json.loads(
                raw_sides
            )

        except json.JSONDecodeError:
            return None, (
                "Invalid image_sides. "
                "Expected a JSON array."
            )

        if not isinstance(
            image_sides,
            list,
        ):
            return None, (
                "image_sides must be a JSON array."
            )

        if len(image_sides) != len(
            uploaded_files
        ):
            return None, (
                "The number of image_sides "
                "must match the number of images."
            )

        normalized = []

        for index, image_file in enumerate(
            uploaded_files
        ):

            side = str(
                image_sides[index]
            ).strip().upper()

            if not side:
                side = (
                    f"IMAGE_{index + 1}"
                )

            normalized.append(
                {
                    "file": image_file,
                    "side": side,
                }
            )

        return normalized, None

    # --------------------------------------------------
    # Legacy single-image request
    # --------------------------------------------------

    if "image" in request.files:

        image_file = request.files[
            "image"
        ]

        if (
            image_file is not None
            and image_file.filename
        ):
            return [
                {
                    "file": image_file,
                    "side": "FRONT",
                }
            ], None

    return None, (
        "No image files provided. "
        "Use form field name 'images' "
        "for multi-image inspection or "
        "'image' for a single image."
    )


def _candidate_is_better(
    candidate: dict,
    existing: dict,
) -> bool:
    """
    Determines which extracted field should become
    the primary value when the same field is found
    on multiple package sides.

    Priority:

        1. A non-empty candidate replaces an empty
           existing value.
        2. An OCR-verified candidate replaces an
           unverified existing value.
        3. Otherwise keep the existing value.

    Empty candidates never replace useful evidence.
    """

    candidate_value = candidate.get("value")
    existing_value = existing.get("value")

    candidate_has_value = (
        candidate_value is not None
        and str(candidate_value).strip() != ""
    )

    existing_has_value = (
        existing_value is not None
        and str(existing_value).strip() != ""
    )

    # Critical multi-view rule:
    # a valid value from a later package side must
    # replace a null/empty value from an earlier side.
    if candidate_has_value and not existing_has_value:
        return True

    # Prefer independently OCR-verified evidence
    # when both candidates already contain values.
    if (
        candidate_has_value
        and existing_has_value
        and candidate.get("verified_by_ocr", False)
        and not existing.get("verified_by_ocr", False)
    ):
        return True

    return False


def _values_are_different(
    first: dict,
    second: dict,
) -> bool:
    """
    Checks whether two extracted field values
    conflict with one another.
    """

    first_value = first.get("value")
    second_value = second.get("value")

    if (
        first_value is None
        or str(first_value).strip() == ""
        or second_value is None
        or str(second_value).strip() == ""
    ):
        return False

    return (
        str(first_value).strip().lower()
        != str(second_value).strip().lower()
    )


def _record_conflict(
    conflicts: dict,
    field: str,
    candidate: dict,
):
    """
    Records a non-empty candidate that conflicts
    with another non-empty value already observed.
    """

    conflicts.setdefault(
        field,
        [],
    )

    conflicts[field].append(
        {
            "side": candidate.get(
                "source_side"
            ),
            "value": candidate.get(
                "value"
            ),
            "source": candidate.get(
                "source"
            ),
            "verified_by_ocr":
                candidate.get(
                    "verified_by_ocr",
                    False,
                ),
        }
    )


def _merge_multiview_evidence(
    per_side_evidence: list,
):
    """
    Combines evidence extracted independently
    from each package side.

    Empty/null evidence from one side must never
    block valid evidence from another side.

    When two non-empty values differ, the additional
    value is retained in the conflict structure.

    The selected primary value keeps its source_side
    so the frontend can show which package view
    supplied the evidence.
    """

    merged = {}
    conflicts = {}

    for side_result in per_side_evidence:

        side = side_result.get(
            "side",
            "UNKNOWN",
        )

        evidence = (
            side_result.get(
                "evidence",
                {},
            )
        )

        if not isinstance(
            evidence,
            dict,
        ):
            continue

        for field, raw_value in (
            evidence.items()
        ):

            if not isinstance(
                raw_value,
                dict,
            ):
                continue

            candidate = dict(
                raw_value
            )

            candidate[
                "source_side"
            ] = side

            candidate_value = candidate.get(
                "value"
            )

            candidate_has_value = (
                candidate_value is not None
                and str(candidate_value).strip() != ""
            )

            # First observation of the field.
            if field not in merged:

                merged[field] = candidate

                continue

            existing = merged[field]

            existing_value = existing.get(
                "value"
            )

            existing_has_value = (
                existing_value is not None
                and str(existing_value).strip() != ""
            )

            # Only compare actual evidence values.
            # Null/empty candidates are ignored and
            # therefore cannot create false conflicts.
            if (
                candidate_has_value
                and existing_has_value
                and _values_are_different(
                    candidate,
                    existing,
                )
            ):

                _record_conflict(
                    conflicts,
                    field,
                    candidate,
                )

            # Replace an empty primary value with a
            # valid value from this package side, or
            # prefer OCR-verified evidence when both
            # values are present.
            if _candidate_is_better(
                candidate,
                existing,
            ):

                # If the existing value was itself a
                # real value and differs, retain it as
                # a conflict when the candidate replaces it.
                if (
                    existing_has_value
                    and candidate_has_value
                    and _values_are_different(
                        candidate,
                        existing,
                    )
                ):
                    existing_conflict = dict(
                        existing
                    )

                    _record_conflict(
                        conflicts,
                        field,
                        existing_conflict,
                    )

                merged[field] = candidate

    return merged, conflicts


def _build_combined_evidence_hash(
    image_records: list,
) -> str:
    """
    Builds a deterministic SHA-256 fingerprint
    for the complete multi-view evidence set.

    The side name and individual image hash are
    included so that:

        FRONT + hash
        BACK + hash
        LEFT + hash
        RIGHT + hash

    represent one deterministic inspection
    evidence fingerprint.
    """

    evidence_parts = []

    for record in image_records:

        evidence_parts.append(
            f"{record['side']}:{record['hash']}"
        )

    canonical_evidence = "|".join(
        evidence_parts
    )

    return hashlib.sha256(
        canonical_evidence.encode(
            "utf-8"
        )
    ).hexdigest()


# --------------------------------------------------
# Scan endpoint
# --------------------------------------------------

@app.route(
    "/scan",
    methods=["POST"],
)
def scan_label():
    """
    Accepts one or multiple package images.

    Multi-image request:

        images      -> package images
        image_sides -> JSON array containing
                       corresponding package sides

    Example:

        images:
            front.jpg
            back.jpg
            left.jpg
            right.jpg

        image_sides:
            ["FRONT", "BACK", "LEFT", "RIGHT"]

    Also supports the legacy single-image field:

        image -> package image

    Classification:

        category
        origin
        sale_type

    Full Nometra pipeline:

        Package Images
              ↓
        Image Validation
              ↓
        SHA-256 + Timestamp
              ↓
        Gemini Vision per side
              ↓
        Tesseract OCR per side
              ↓
        Evidence Fusion per side
              ↓
        Multi-view Evidence Merge
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
    """

    # --------------------------------------------------
    # 1. Validate uploaded images
    # --------------------------------------------------

    image_entries, image_error = (
        _get_uploaded_images()
    )

    if image_error:
        return jsonify({
            "error": image_error
        }), 400

    if not image_entries:
        return jsonify({
            "error": (
                "No package images were provided."
            )
        }), 400

    print(
        "NUMBER OF IMAGES RECEIVED:",
        len(image_entries),
    )

    for entry in image_entries:
        print(
            "  side:",
            entry["side"],
            "| filename:",
            entry["file"].filename,
        )

    # --------------------------------------------------
    # 2. Validate file names and extensions
    # --------------------------------------------------

    for entry in image_entries:

        image_file = entry[
            "file"
        ]

        if (
            not image_file.filename
        ):
            return jsonify({
                "error": (
                    "One of the uploaded files "
                    "has no filename."
                )
            }), 400

        if not _allowed_file(
            image_file.filename
        ):
            return jsonify({
                "error": (
                    f"Unsupported file type for "
                    f"'{image_file.filename}'. "
                    "Use jpg, jpeg, png, or webp."
                )
            }), 400

    # --------------------------------------------------
    # 3. Read classification from frontend
    # --------------------------------------------------

    category = request.form.get(
        "category",
        "Other",
    )

    origin = request.form.get(
        "origin",
        "domestic",
    )

    sale_type = request.form.get(
        "sale_type",
        "retail",
    )

    print(
        "CLASSIFICATION RECEIVED:"
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

    # --------------------------------------------------
    # 4. Build backend classification
    # --------------------------------------------------

    try:

        classification = (
            build_classification(
                origin=origin,
                sale_type=sale_type,
            )
        )

    except ValueError as e:

        return jsonify({
            "error":
                f"Invalid classification: {str(e)}"
        }), 400

    # --------------------------------------------------
    # 5. Save all images temporarily
    # --------------------------------------------------

    temporary_images = []

    try:

        for entry in image_entries:

            image_file = entry[
                "file"
            ]

            side = entry[
                "side"
            ]

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

            image_file.save(
                temp_path
            )

            temporary_images.append(
                {
                    "side": side,
                    "path": temp_path,
                    "original_filename":
                        image_file.filename,
                }
            )

        # --------------------------------------------------
        # 6. Evidence integrity metadata
        # --------------------------------------------------

        evidence_timestamp = (
            datetime.now(
                timezone.utc
            ).isoformat()
        )

        image_records = []

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

        for image in temporary_images:

            image_hash = (
                _calculate_sha256(
                    image["path"]
                )
            )

            image_record = {
                "side": image[
                    "side"
                ],

                "filename":
                    image[
                        "original_filename"
                    ],

                "hash":
                    image_hash,
            }

            image_records.append(
                image_record
            )

            print(
                "  ",
                image["side"],
                "hash:",
                image_hash,
            )

        combined_evidence_hash = (
            _build_combined_evidence_hash(
                image_records
            )
        )

        print(
            "  combined hash:",
            combined_evidence_hash,
        )

        # --------------------------------------------------
        # 7. Process every package side
        # --------------------------------------------------

        per_side_evidence = []

        per_side_processing = []

        for image in temporary_images:

            side = image[
                "side"
            ]

            temp_path = image[
                "path"
            ]

            print(
                ""
            )

            print(
                "======================================"
            )

            print(
                "PROCESSING SIDE:",
                side,
            )

            print(
                "======================================"
            )

            # --------------------------------------------------
            # Gemini Vision
            # --------------------------------------------------

            print(
                "GEMINI VISION:",
                side,
            )

            gemini_result = (
                extract_label_data(
                    temp_path
                )
            )

            # --------------------------------------------------
            # OCR
            # --------------------------------------------------

            print(
                "TESSERACT OCR:",
                side,
            )

            ocr_result = (
                extract_text_ocr(
                    temp_path
                )
            )

            # --------------------------------------------------
            # Evidence fusion
            # --------------------------------------------------

            print(
                "EVIDENCE FUSION:",
                side,
            )

            fused_side_evidence = (
                fuse_evidence(
                    gemini_result,
                    ocr_result,
                )
            )

            print(
                "FUSED NON-EMPTY FIELDS:",
                [
                    field_name
                    for field_name, field_value
                    in fused_side_evidence.items()
                    if isinstance(field_value, dict)
                    and field_value.get("value") is not None
                    and str(field_value.get("value")).strip() != ""
                ],
            )

            per_side_evidence.append(
                {
                    "side": side,

                    "evidence":
                        fused_side_evidence,
                }
            )

            per_side_processing.append(
                {
                    "side": side,

                    "gemini_fields":
                        sum(
                            1
                            for field_name, field_value
                            in (
                                gemini_result.items()
                                if isinstance(
                                    gemini_result,
                                    dict,
                                )
                                else []
                            )
                            if field_name != "source"
                            and field_value is not None
                            and str(field_value).strip() != ""
                        ),

                    "ocr_result_available":
                        bool(
                            ocr_result
                        ),
                }
            )

        # --------------------------------------------------
        # 8. Merge evidence from all package sides
        # --------------------------------------------------

        (
            fused_evidence,
            multi_view_conflicts,
        ) = _merge_multiview_evidence(
            per_side_evidence
        )

        print(
            ""
        )

        print(
            "MULTI-VIEW EVIDENCE MERGE COMPLETE"
        )

        print(
            "  images:",
            len(
                temporary_images
            ),
        )

        print(
            "  fields:",
            len(
                fused_evidence
            ),
        )

        if multi_view_conflicts:

            print(
                "  conflicts detected:"
            )

            for field, conflicts in (
                multi_view_conflicts.items()
            ):

                print(
                    "   ",
                    field,
                    ":",
                    len(conflicts),
                    "additional value(s)",
                )

        # --------------------------------------------------
        # 9. Attach multi-view metadata
        # --------------------------------------------------
        #
        # Stored inside extracted_data so the
        # historical inspection retains the fact
        # that multiple package views were used.
        #
        # The evaluator ignores this metadata because
        # it evaluates only registered rule fields.
        # --------------------------------------------------

        fused_evidence[
            "_multi_view"
        ] = {
            "image_count":
                len(
                    temporary_images
                ),

            "sides": [
                image[
                    "side"
                ]
                for image in temporary_images
            ],

            "images":
                image_records,

            "processing":
                per_side_processing,

            "conflicts":
                multi_view_conflicts,
        }

        # --------------------------------------------------
        # 10. Rule engine
        #
        # Classification is passed to the evaluator
        # so applicability conditions can be evaluated.
        # --------------------------------------------------

        compliance_report = (
            evaluate_rules(
                fused_evidence,
                classification,
            )
        )

        # --------------------------------------------------
        # 11. Save real inspection
        # --------------------------------------------------

        print(
            ""
        )

        print(
            "ABOUT TO SAVE INSPECTION:"
        )

        print(
            "  combined evidence_hash:",
            combined_evidence_hash,
        )

        print(
            "  evidence_timestamp:",
            evidence_timestamp,
        )

        inspection_id = (
            save_inspection(
                fused_evidence,
                compliance_report,
                evidence_hash=
                    combined_evidence_hash,
                evidence_timestamp=
                    evidence_timestamp,
            )
        )

        # --------------------------------------------------
        # 12. Return complete response
        # --------------------------------------------------

        response = {
            "inspection_id":
                inspection_id,

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

            "evidence_integrity": {
                "algorithm":
                    "SHA-256",

                "hash":
                    combined_evidence_hash,

                "timestamp":
                    evidence_timestamp,

                "images":
                    image_records,
            },

            "multi_view": {
                "enabled":
                    len(
                        temporary_images
                    ) > 1,

                "image_count":
                    len(
                        temporary_images
                    ),

                "sides": [
                    image[
                        "side"
                    ]
                    for image in temporary_images
                ],

                "conflicts":
                    multi_view_conflicts,
            },
        }

        return jsonify(
            response
        ), 200

    except Exception as e:

        print(
            "PROCESSING ERROR:",
            str(e),
        )

        return jsonify({
            "error": (
                f"Processing failed: {str(e)}"
            )
        }), 500

    finally:

        # --------------------------------------------------
        # Always remove all temporary images.
        # --------------------------------------------------

        for image in temporary_images:

            temp_path = image[
                "path"
            ]

            if os.path.exists(
                temp_path
            ):
                os.remove(
                    temp_path
                )


# --------------------------------------------------
# Inspector review endpoint
# --------------------------------------------------

@app.route(
    "/inspections/<int:inspection_id>/review",
    methods=["PUT"],
)
def save_inspector_review(
    inspection_id,
):
    """
    Persists the inspector's review for an
    existing inspection.

    Expected JSON body:

    {
        "inspector_decisions": {
            "finding-id": "CONFIRM"
        },

        "inspector_notes": {
            "finding-id": "Inspector note"
        },

        "inspector_remarks":
            "Overall remarks",

        "final_status":
            "COMPLIANT"
    }
    """

    # --------------------------------------------------
    # 1. Verify inspection exists
    # --------------------------------------------------

    inspection = (
        get_inspection_by_id(
            inspection_id
        )
    )

    if inspection is None:

        return jsonify({
            "error": (
                f"No inspection found with id "
                f"{inspection_id}"
            )
        }), 404

    # --------------------------------------------------
    # 2. Validate request body
    # --------------------------------------------------

    data = request.get_json(
        silent=True
    )

    if data is None:

        return jsonify({
            "error": (
                "Request body must contain "
                "valid JSON."
            )
        }), 400

    # --------------------------------------------------
    # 3. Read inspector review data
    # --------------------------------------------------

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
    # 4. Basic type validation
    # --------------------------------------------------

    if not isinstance(
        inspector_decisions,
        dict,
    ):

        return jsonify({
            "error": (
                "inspector_decisions "
                "must be an object."
            )
        }), 400

    if not isinstance(
        inspector_notes,
        dict,
    ):

        return jsonify({
            "error": (
                "inspector_notes "
                "must be an object."
            )
        }), 400

    if not isinstance(
        inspector_remarks,
        str,
    ):

        return jsonify({
            "error": (
                "inspector_remarks "
                "must be a string."
            )
        }), 400

    if (
        final_status is not None
        and not isinstance(
            final_status,
            str,
        )
    ):

        return jsonify({
            "error": (
                "final_status must be "
                "a string or null."
            )
        }), 400

    # --------------------------------------------------
    # 5. Persist inspector review
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
        )
    )

    if not updated:

        return jsonify({
            "error": (
                f"Failed to update inspection "
                f"{inspection_id}."
            )
        }), 500

    # --------------------------------------------------
    # 6. Return updated inspection
    # --------------------------------------------------

    updated_inspection = (
        get_inspection_by_id(
            inspection_id
        )
    )

    return jsonify({
        "message":
            "Inspector review saved.",

        "inspection":
            updated_inspection,
    }), 200


# --------------------------------------------------
# Historical inspections
# --------------------------------------------------

@app.route(
    "/inspections",
    methods=["GET"],
)
def list_inspections():
    """
    Returns a summary list of every past scan
    (most recent first).

    Does NOT include the full extracted_data /
    compliance_report.

    Use GET /inspections/<id> for full detail.
    """

    inspections = (
        get_all_inspections()
    )

    return jsonify({
        "inspections":
            inspections
    }), 200


@app.route(
    "/inspections/<int:inspection_id>",
    methods=["GET"],
)
def get_inspection(
    inspection_id,
):
    """
    Returns full detail for one past scan,
    including extracted_data,
    compliance_report,
    and inspector review information.
    """

    inspection = (
        get_inspection_by_id(
            inspection_id
        )
    )

    if inspection is None:

        return jsonify({
            "error": (
                f"No inspection found with id "
                f"{inspection_id}"
            )
        }), 404

    return jsonify(
        inspection
    ), 200


# --------------------------------------------------
# Health check
# --------------------------------------------------

@app.route(
    "/health",
    methods=["GET"],
)
def health_check():

    return jsonify({
        "status": "ok"
    }), 200


# --------------------------------------------------
# Report routes
# --------------------------------------------------

import api.reports


# --------------------------------------------------
# Run Flask
# --------------------------------------------------

if __name__ == "__main__":

    app.run(
        debug=True,
        port=5000,
    )