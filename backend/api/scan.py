# backend/api/scan.py

import os
import sys
import uuid
import hashlib
import inspect
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
)


# --------------------------------------------------
# Database debugging
# --------------------------------------------------

import database.inspections as inspections_module

print("DATABASE MODULE:", inspections_module.__file__)
print("DATABASE PATH:", inspections_module.DB_PATH)
print("SAVE_INSPECTION FUNCTION:")
print(inspect.signature(save_inspection))


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

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


ALLOWED_EXTENSIONS = {
    "jpg",
    "jpeg",
    "png",
    "webp",
}


def _allowed_file(filename: str) -> bool:
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in ALLOWED_EXTENSIONS
    )


def _calculate_sha256(file_path: str) -> str:
    """
    Calculates the SHA-256 hash of the evidence image.

    The hash provides a tamper-evident fingerprint
    of the exact uploaded evidence file.
    """

    sha256 = hashlib.sha256()

    with open(file_path, "rb") as evidence_file:
        for chunk in iter(
            lambda: evidence_file.read(8192),
            b"",
        ):
            sha256.update(chunk)

    return sha256.hexdigest()


# --------------------------------------------------
# Scan endpoint
# --------------------------------------------------

@app.route("/scan", methods=["POST"])
def scan_label():
    """
    Expects a multipart/form-data POST request with:

        image      -> package image
        category   -> product category
        origin     -> domestic / imported
        sale_type  -> retail / wholesale /
                      institutional_or_industrial

    Runs the full Nometra pipeline:

        Image
          ↓
        Evidence hash + timestamp
          ↓
        Gemini Vision
          ↓
        OCR
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
    """

    # --------------------------------------------------
    # 1. Validate image
    # --------------------------------------------------

    if "image" not in request.files:
        return jsonify({
            "error": (
                "No image file provided. "
                "Use form field name 'image'."
            )
        }), 400

    image_file = request.files["image"]

    if image_file.filename == "":
        return jsonify({
            "error": "No file selected."
        }), 400

    if not _allowed_file(image_file.filename):
        return jsonify({
            "error": (
                "Unsupported file type. "
                "Use jpg, jpeg, png, or webp."
            )
        }), 400


    # --------------------------------------------------
    # 2. Read classification from frontend
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


    # Temporary debug output to verify that the
    # frontend classification reaches the backend.
    print("CLASSIFICATION RECEIVED:")
    print("  category:", category)
    print("  origin:", origin)
    print("  sale_type:", sale_type)


    # --------------------------------------------------
    # 3. Build backend classification
    # --------------------------------------------------

    try:
        classification = build_classification(
            origin=origin,
            sale_type=sale_type,
        )

    except ValueError as e:
        return jsonify({
            "error": f"Invalid classification: {str(e)}"
        }), 400


    # --------------------------------------------------
    # 4. Save image temporarily
    # --------------------------------------------------

    file_extension = image_file.filename.rsplit(
        ".",
        1,
    )[1].lower()

    temp_filename = (
        f"{uuid.uuid4()}.{file_extension}"
    )

    temp_path = os.path.join(
        UPLOAD_FOLDER,
        temp_filename,
    )

    image_file.save(temp_path)


    try:

        # --------------------------------------------------
        # 5. Evidence integrity metadata
        # --------------------------------------------------

        evidence_hash = _calculate_sha256(
            temp_path
        )

        evidence_timestamp = datetime.now(
            timezone.utc
        ).isoformat()

        print("EVIDENCE INTEGRITY:")
        print("  algorithm: SHA-256")
        print("  hash:", evidence_hash)
        print("  timestamp:", evidence_timestamp)


        # --------------------------------------------------
        # 6. Gemini Vision extraction
        # --------------------------------------------------

        gemini_result = extract_label_data(
            temp_path
        )


        # --------------------------------------------------
        # 7. OCR extraction
        # --------------------------------------------------

        ocr_result = extract_text_ocr(
            temp_path
        )


        # --------------------------------------------------
        # 8. Evidence fusion
        # --------------------------------------------------

        fused_evidence = fuse_evidence(
            gemini_result,
            ocr_result,
        )


        # --------------------------------------------------
        # 9. Rule engine
        #
        # Classification is passed to the evaluator
        # so applicability conditions can be evaluated.
        # --------------------------------------------------

        compliance_report = evaluate_rules(
            fused_evidence,
            classification,
        )


        # --------------------------------------------------
        # 10. Save real inspection
        # --------------------------------------------------

        print("ABOUT TO SAVE INSPECTION:")
        print("  evidence_hash:", evidence_hash)
        print(
            "  evidence_timestamp:",
            evidence_timestamp,
        )

        inspection_id = save_inspection(
            fused_evidence,
            compliance_report,
            evidence_hash=evidence_hash,
            evidence_timestamp=evidence_timestamp,
        )


        # --------------------------------------------------
        # 11. Return complete response
        # --------------------------------------------------

        response = {
            "inspection_id": inspection_id,

            "classification": {
                "category": category,

                "commodity_type": classification[
                    "commodity_type"
                ],

                "origin": classification[
                    "origin"
                ],

                "sale_type": classification[
                    "sale_type"
                ],
            },

            "extracted_data": fused_evidence,

            "compliance_report": compliance_report,

            "evidence_integrity": {
                "algorithm": "SHA-256",
                "hash": evidence_hash,
                "timestamp": evidence_timestamp,
            },
        }

        return jsonify(response), 200


    except Exception as e:

        return jsonify({
            "error": (
                f"Processing failed: {str(e)}"
            )
        }), 500


    finally:

        # Always remove temporary image.
        if os.path.exists(temp_path):
            os.remove(temp_path)


# --------------------------------------------------
# Historical inspections
# --------------------------------------------------

@app.route("/inspections", methods=["GET"])
def list_inspections():
    """
    Returns a summary list of every past scan
    (most recent first).

    Does NOT include the full extracted_data /
    compliance_report.

    Use GET /inspections/<id> for full detail.
    """

    inspections = get_all_inspections()

    return jsonify({
        "inspections": inspections
    }), 200


@app.route(
    "/inspections/<int:inspection_id>",
    methods=["GET"],
)
def get_inspection(inspection_id):
    """
    Returns full detail for one past scan,
    including extracted_data and compliance_report.
    """

    inspection = get_inspection_by_id(
        inspection_id
    )

    if inspection is None:
        return jsonify({
            "error": (
                f"No inspection found with id "
                f"{inspection_id}"
            )
        }), 404

    return jsonify(inspection), 200


# --------------------------------------------------
# Health check
# --------------------------------------------------

@app.route("/health", methods=["GET"])
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