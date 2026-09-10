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

app = Flask(__name__)
CORS(app)  # allows requests from any origin — fine for a hackathon build

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
    under the field name "image" (this is what your frontend's
    FormData upload should use as the key).

    Returns a full compliance report as JSON.
    """
    # Step 1: Make sure an image was actually sent
    if "image" not in request.files:
        return jsonify({"error": "No image file provided. Use form field name 'image'."}), 400

    image_file = request.files["image"]

    if image_file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    if not _allowed_file(image_file.filename):
        return jsonify({"error": "Unsupported file type. Use jpg, jpeg, png, or webp."}), 400

    # Step 2: Save the uploaded image temporarily with a unique name
    # (so two people scanning at the same time don't overwrite each other's file)
    file_extension = image_file.filename.rsplit(".", 1)[1].lower()
    temp_filename = f"{uuid.uuid4()}.{file_extension}"
    temp_path = os.path.join(UPLOAD_FOLDER, temp_filename)
    image_file.save(temp_path)

    try:
        # Step 3: Run the full pipeline — extraction, fusion, rule evaluation
        gemini_result = extract_label_data(temp_path)
        ocr_result = extract_text_ocr(temp_path)
        fused_evidence = fuse_evidence(gemini_result, ocr_result)
        compliance_report = evaluate_rules(fused_evidence)

        # Step 4: Build the final response your frontend will receive
        response = {
            "extracted_data": fused_evidence,
            "compliance_report": compliance_report
        }

        return jsonify(response), 200

    except Exception as e:
        return jsonify({"error": f"Processing failed: {str(e)}"}), 500

    finally:
        # Step 5: Clean up — delete the temp image whether it succeeded or failed
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.route("/health", methods=["GET"])
def health_check():
    """Simple endpoint to confirm the server is running — useful for your frontend to ping on load."""
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    app.run(debug=True, port=5000)