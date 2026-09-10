# backend/api/scan.py

import os
import sys
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS

# Allows this file to find sibling top-level folders (extraction/, engine/, etc.)
# when Flask runs this file directly.
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from extraction.gemini_vision import extract_label_data
from extraction.ocr import extract_text_ocr
from extraction.evidence_fusion import fuse_evidence
from engine.evaluator import evaluate_rules
from database.inspections import init_db, save_inspection, get_all_inspections, get_inspection_by_id

app = Flask(__name__)
CORS(app)

# Make sure the inspections table exists before the app starts taking requests
init_db()

# Folder where uploaded images get temporarily saved before processing
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}


def _allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/scan", methods=["POST"])
def scan_label():
    """
    Expects a multipart/form-data POST request with an image file
    under the field name "image".

    Runs the full pipeline, saves the result to the database, and
    returns the compliance report as JSON.
    """
    if "image" not in request.files:
        return jsonify({"error": "No image file provided. Use form field name 'image'."}), 400

    image_file = request.files["image"]

    if image_file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    if not _allowed_file(image_file.filename):
        return jsonify({"error": "Unsupported file type. Use jpg, jpeg, png, or webp."}), 400

    file_extension = image_file.filename.rsplit(".", 1)[1].lower()
    temp_filename = f"{uuid.uuid4()}.{file_extension}"
    temp_path = os.path.join(UPLOAD_FOLDER, temp_filename)
    image_file.save(temp_path)

    try:
        gemini_result = extract_label_data(temp_path)
        ocr_result = extract_text_ocr(temp_path)
        fused_evidence = fuse_evidence(gemini_result, ocr_result)
        compliance_report = evaluate_rules(fused_evidence)

        # NEW: save this real scan to the database, and grab its new id
        inspection_id = save_inspection(fused_evidence, compliance_report)

        response = {
            "inspection_id": inspection_id,
            "extracted_data": fused_evidence,
            "compliance_report": compliance_report
        }

        return jsonify(response), 200

    except Exception as e:
        return jsonify({"error": f"Processing failed: {str(e)}"}), 500

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.route("/inspections", methods=["GET"])
def list_inspections():
    """
    Returns a summary list of every past scan (most recent first).
    Does NOT include the full extracted_data/compliance_report —
    use GET /inspections/<id> for full detail on one specific scan.
    """
    inspections = get_all_inspections()
    return jsonify({"inspections": inspections}), 200


@app.route("/inspections/<int:inspection_id>", methods=["GET"])
def get_inspection(inspection_id):
    """
    Returns full detail (extracted_data + compliance_report included)
    for one specific past scan, by its id.
    """
    inspection = get_inspection_by_id(inspection_id)

    if inspection is None:
        return jsonify({"error": f"No inspection found with id {inspection_id}"}), 404

    return jsonify(inspection), 200


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    app.run(debug=True, port=5000)