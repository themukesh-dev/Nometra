import os

from __main__ import app

from database.inspections import get_inspection_by_id

from flask import jsonify, send_file

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


@app.route("/reports/<int:inspection_id>", methods=["GET"])
def get_report(inspection_id):
    """
    Returns the stored inspection report as JSON.
    """
    inspection = get_inspection_by_id(inspection_id)

    if inspection is None:
        return jsonify({
            "error": f"No inspection found with id {inspection_id}"
        }), 404

    return jsonify(inspection), 200


@app.route("/reports/<int:inspection_id>/pdf", methods=["GET"])
def download_report_pdf(inspection_id):
    """
    Generates and downloads a readable A4 PDF report
    from the stored inspection data.
    """

    inspection = get_inspection_by_id(inspection_id)

    if inspection is None:
        return jsonify({
            "error": f"No inspection found with id {inspection_id}"
        }), 404

    compliance_report = inspection["compliance_report"]
    extracted_data = inspection["extracted_data"]

    # Save PDF inside the backend folder
    pdf_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        f"inspection_{inspection_id}.pdf"
    )

    # ---------------------------------------------------------
    # PDF document
    # ---------------------------------------------------------

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "NometraTitle",
        parent=styles["Title"],
        fontSize=18,
        leading=22,
        alignment=TA_CENTER,
        spaceAfter=4,
    )

    subtitle_style = ParagraphStyle(
        "NometraSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        leading=13,
        alignment=TA_CENTER,
        spaceAfter=12,
    )

    heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontSize=11,
        leading=14,
        spaceBefore=8,
        spaceAfter=6,
    )

    normal_style = ParagraphStyle(
        "TableText",
        parent=styles["Normal"],
        fontSize=8,
        leading=10,
    )

    header_style = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontSize=8,
        leading=10,
        alignment=TA_CENTER,
    )

    small_style = ParagraphStyle(
        "SmallText",
        parent=styles["Normal"],
        fontSize=7,
        leading=9,
    )

    story = []

    # ---------------------------------------------------------
    # Header
    # ---------------------------------------------------------

    story.append(Paragraph("NOMETRA", title_style))

    story.append(
        Paragraph(
            "Legal Metrology Inspection Report",
            subtitle_style
        )
    )

    story.append(
        Paragraph(
            f"<b>Inspection ID:</b> {inspection['id']}<br/>"
            f"<b>Timestamp:</b> {inspection['timestamp']}",
            normal_style,
        )
    )

    story.append(Spacer(1, 6))

    # ---------------------------------------------------------
    # Overall status
    # ---------------------------------------------------------

    overall_status = compliance_report.get(
        "overall_status",
        "UNKNOWN"
    )

    passed = compliance_report.get("passed", 0)
    failed = compliance_report.get("failed", 0)

    story.append(
        Paragraph(
            f"<b>Overall Status:</b> {overall_status}<br/>"
            f"<b>Passed:</b> {passed} &nbsp;&nbsp;&nbsp;"
            f"<b>Failed:</b> {failed}",
            normal_style,
        )
    )

    # ---------------------------------------------------------
    # Extracted Product Information
    # ---------------------------------------------------------

    story.append(
        Paragraph(
            "Extracted Product Information",
            heading_style
        )
    )

    product_fields = [
        ("MRP", "mrp"),
        ("Net Quantity", "net_quantity"),
        ("Manufacturer Name", "manufacturer_name"),
        ("Manufacturer Address", "manufacturer_address"),
        ("Consumer Care", "consumer_care"),
        ("Date of Manufacture", "date_of_manufacture"),
        ("Country of Origin", "country_of_origin"),
    ]

    product_table_data = [
        [
            Paragraph("<b>Field</b>", header_style),
            Paragraph("<b>Extracted Value</b>", header_style),
        ]
    ]

    for display_name, field_name in product_fields:
        field_data = extracted_data.get(field_name, {})

        if isinstance(field_data, dict):
            value = field_data.get("value")
        else:
            value = field_data

        if value is None or value == "":
            value = "Not found"

        product_table_data.append([
            Paragraph(str(display_name), normal_style),
            Paragraph(str(value), normal_style),
        ])

    product_table = Table(
        product_table_data,
        colWidths=[45 * mm, 135 * mm],
        repeatRows=1,
    )

    product_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ])
    )

    story.append(product_table)

    # ---------------------------------------------------------
    # Rule Evaluation
    # ---------------------------------------------------------

    story.append(
        Paragraph(
            "Rule Evaluation",
            heading_style
        )
    )

    rule_table_data = [
        [
            Paragraph("<b>Rule ID</b>", header_style),
            Paragraph("<b>Requirement</b>", header_style),
            Paragraph("<b>Status</b>", header_style),
            Paragraph("<b>Extracted Value</b>", header_style),
        ]
    ]

    results = compliance_report.get("results", [])

    for result in results:
        rule_id = result.get("rule_id", "-")
        description = result.get("description", "-")
        status = result.get("status", "-")
        extracted_value = result.get("extracted_value")

        if extracted_value is None or extracted_value == "":
            extracted_value = "Not found"

        rule_table_data.append([
            Paragraph(str(rule_id), small_style),
            Paragraph(str(description), normal_style),
            Paragraph(str(status), header_style),
            Paragraph(str(extracted_value), normal_style),
        ])

    rule_table = Table(
        rule_table_data,
        colWidths=[
            24 * mm,
            78 * mm,
            25 * mm,
            53 * mm,
        ],
        repeatRows=1,
    )

    rule_table_style = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]

    for row_index, result in enumerate(results, start=1):
        status = result.get("status", "")

        if status == "PASS":
            rule_table_style.append(
                (
                    "BACKGROUND",
                    (2, row_index),
                    (2, row_index),
                    colors.lightgreen
                )
            )

        elif status == "FAIL":
            rule_table_style.append(
                (
                    "BACKGROUND",
                    (2, row_index),
                    (2, row_index),
                    colors.lightcoral
                )
            )

        elif status == "NOT_APPLICABLE":
            rule_table_style.append(
                (
                    "BACKGROUND",
                    (2, row_index),
                    (2, row_index),
                    colors.lightgrey
                )
            )

    rule_table.setStyle(TableStyle(rule_table_style))

    story.append(rule_table)

    # ---------------------------------------------------------
    # Note
    # ---------------------------------------------------------

    story.append(Spacer(1, 10))

    story.append(
        Paragraph(
            "<b>Note:</b> This report represents an automated preliminary "
            "compliance check based on the configured Legal Metrology "
            "declaration rules. Final regulatory determination remains "
            "subject to human inspection and applicable law.",
            small_style,
        )
    )

    # ---------------------------------------------------------
    # Build PDF
    # ---------------------------------------------------------

    doc.build(story)

    return send_file(
        pdf_path,
        as_attachment=True,
        download_name=f"Nometra_Inspection_{inspection_id}.pdf",
        mimetype="application/pdf",
    )