import os
import html
import re

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


def _final_status_for_result(
    system_status: str,
    decision: str | None,
) -> str:
    """
    Converts the automated system assessment into the
    final reviewed status when an inspector decision exists.

    Decision semantics:

        CONFIRM
            Inspector confirms the finding as acceptable.

        REJECT
            Inspector rejects the finding.

        MODIFY
            Finding requires further verification.

        REQUEST_EVIDENCE
            Finding requires additional evidence.

    A NOT_APPLICABLE rule remains NOT_APPLICABLE when the
    inspector confirms it. It is not converted into PASS.

    If no inspector decision exists, the original automated
    status is preserved.
    """

    if not decision:
        return system_status

    if (
        system_status == "NOT_APPLICABLE"
        and decision == "CONFIRM"
    ):
        return "NOT_APPLICABLE"

    if decision == "CONFIRM":
        return "PASS"

    if decision == "REJECT":
        return "FAIL"

    if decision in {
        "MODIFY",
        "REQUEST_EVIDENCE",
    }:
        return "VERIFICATION_REQUIRED"

    return system_status


def _display_status(
    system_status: str,
    final_status: str,
    decision: str | None,
) -> str:
    """
    Creates the status text displayed in the PDF.

    When an inspector has reviewed a finding, the final
    reviewed status is shown together with the inspector
    decision so the automated assessment remains auditable.

    The system assessment is not replaced in the stored
    inspection record; only the displayed final status is
    changed according to the inspector decision.
    """

    if not decision:
        return html.escape(
            str(final_status)
        )

    decision_label = decision.replace(
        "_",
        " ",
    )

    return (
        f"{html.escape(str(final_status))}<br/>"
        f"<font size='6'>Inspector: "
        f"{html.escape(decision_label)}</font>"
    )


def _resolve_review_key(
    result: dict,
    result_index: int,
    inspector_decisions: dict,
) -> str | None:
    """
    Resolves an inspector decision to a compliance result.

    The frontend currently stores inspector decisions using
    finding IDs such as:

        FND-BE-001
        FND-BE-005

    while the compliance engine uses rule IDs such as:

        LM-MRP-01
        LM-COO-01

    First try the rule ID directly.

    Then support the current backend finding-ID convention,
    where the numeric portion of FND-BE-XXX corresponds to
    the one-based position of the compliance result.

    Example:

        result index 0 -> FND-BE-001
        result index 4 -> FND-BE-005

    This keeps the report compatible with the existing
    InspectorReviewScreen without changing the frontend
    review workflow.
    """

    rule_id = result.get(
        "rule_id"
    )

    if (
        rule_id
        and rule_id in inspector_decisions
    ):
        return rule_id

    finding_id = (
        f"FND-BE-{result_index + 1:03d}"
    )

    if finding_id in inspector_decisions:
        return finding_id

    # Defensive fallback: if the decision object contains
    # an FND-BE key whose numeric suffix matches this result.
    for key in inspector_decisions:
        if not isinstance(key, str):
            continue

        match = re.fullmatch(
            r"FND-BE-(\d+)",
            key,
        )

        if not match:
            continue

        try:
            finding_number = int(
                match.group(1)
            )
        except ValueError:
            continue

        if finding_number == result_index + 1:
            return key

    return None


def _get_review_value(
    result: dict,
    result_index: int,
    review_data: dict,
):
    """
    Resolves either a rule-ID key or the current FND-BE
    finding-ID key from a persisted inspector review object.
    """

    key = _resolve_review_key(
        result,
        result_index,
        review_data,
    )

    if key is None:
        return None

    return review_data.get(
        key
    )


@app.route("/reports/<int:inspection_id>/pdf", methods=["GET"])
def download_report_pdf(inspection_id):
    """
    Generates and downloads a readable A4 PDF report
    from the stored inspection data.

    The PDF uses the persisted inspector review when
    determining the final displayed status of each rule.

    The original automated assessment remains available
    through the stored inspection record and is shown
    implicitly through the final-status / inspector-decision
    trace in the rule table.
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

    compliance_report = inspection[
        "compliance_report"
    ]

    extracted_data = inspection[
        "extracted_data"
    ]

    inspector_decisions = inspection.get(
        "inspector_decisions",
        {},
    )

    inspector_notes = inspection.get(
        "inspector_notes",
        {},
    )

    inspector_remarks = inspection.get(
        "inspector_remarks",
        "",
    )

    stored_final_status = inspection.get(
        "final_status"
    )

    # ---------------------------------------------------------
    # Save PDF inside the backend folder
    # ---------------------------------------------------------

    pdf_path = os.path.join(
        os.path.dirname(
            os.path.dirname(
                os.path.abspath(__file__)
            )
        ),
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

    status_style = ParagraphStyle(
        "StatusText",
        parent=styles["Normal"],
        fontSize=7,
        leading=9,
        alignment=TA_CENTER,
    )

    story = []

    # ---------------------------------------------------------
    # Header
    # ---------------------------------------------------------

    story.append(
        Paragraph(
            "NOMETRA",
            title_style,
        )
    )

    story.append(
        Paragraph(
            "Legal Metrology Inspection Report",
            subtitle_style,
        )
    )

    story.append(
        Paragraph(
            f"<b>Inspection ID:</b> "
            f"{html.escape(str(inspection['id']))}<br/>"
            f"<b>Timestamp:</b> "
            f"{html.escape(str(inspection['timestamp']))}",
            normal_style,
        )
    )

    story.append(
        Spacer(
            1,
            6,
        )
    )

    # ---------------------------------------------------------
    # Determine final rule statuses
    # ---------------------------------------------------------

    results = compliance_report.get(
        "results",
        [],
    )

    final_results = []

    for result_index, result in enumerate(
        results
    ):
        rule_id = result.get(
            "rule_id",
            "-",
        )

        system_status = result.get(
            "status",
            "-",
        )

        decision = _get_review_value(
            result,
            result_index,
            inspector_decisions,
        )

        final_status = _final_status_for_result(
            system_status,
            decision,
        )

        review_key = _resolve_review_key(
            result,
            result_index,
            inspector_decisions,
        )

        note = ""

        if review_key is not None:
            note = inspector_notes.get(
                review_key,
                "",
            )

        final_results.append({
            "result": result,
            "system_status": system_status,
            "decision": decision,
            "final_status": final_status,
            "review_key": review_key,
            "note": note,
        })

    # ---------------------------------------------------------
    # Overall status
    # ---------------------------------------------------------

    if stored_final_status:
        overall_status = stored_final_status

    else:
        final_statuses = [
            item["final_status"]
            for item in final_results
        ]

        if "FAIL" in final_statuses:
            overall_status = "NON_COMPLIANT"

        elif (
            "VERIFICATION_REQUIRED"
            in final_statuses
        ):
            overall_status = (
                "VERIFICATION_REQUIRED"
            )

        else:
            overall_status = "COMPLIANT"

    final_passed = sum(
        1
        for item in final_results
        if item["final_status"] == "PASS"
    )

    final_failed = sum(
        1
        for item in final_results
        if item["final_status"] == "FAIL"
    )

    final_not_applicable = sum(
        1
        for item in final_results
        if item["final_status"]
        == "NOT_APPLICABLE"
    )

    final_verification_required = sum(
        1
        for item in final_results
        if item["final_status"]
        == "VERIFICATION_REQUIRED"
    )

    story.append(
        Paragraph(
            f"<b>Overall Status:</b> "
            f"{html.escape(str(overall_status))}<br/>"
            f"<b>Passed:</b> {final_passed} "
            f"&nbsp;&nbsp;&nbsp;"
            f"<b>Failed:</b> {final_failed}"
            + (
                f" &nbsp;&nbsp;&nbsp;"
                f"<b>Verification Required:</b> "
                f"{final_verification_required}"
                if final_verification_required > 0
                else ""
            )
            + (
                f" &nbsp;&nbsp;&nbsp;"
                f"<b>Not Applicable:</b> "
                f"{final_not_applicable}"
                if final_not_applicable > 0
                else ""
            ),
            normal_style,
        )
    )

    # ---------------------------------------------------------
    # Extracted Product Information
    # ---------------------------------------------------------

    story.append(
        Paragraph(
            "Extracted Product Information",
            heading_style,
        )
    )

    product_fields = [
        ("MRP", "mrp"),
        ("Net Quantity", "net_quantity"),
        ("Manufacturer Name", "manufacturer_name"),
        (
            "Manufacturer Address",
            "manufacturer_address",
        ),
        ("Consumer Care", "consumer_care"),
        (
            "Date of Manufacture",
            "date_of_manufacture",
        ),
        (
            "Country of Origin",
            "country_of_origin",
        ),
    ]

    product_table_data = [
        [
            Paragraph(
                "<b>Field</b>",
                header_style,
            ),
            Paragraph(
                "<b>Extracted Value</b>",
                header_style,
            ),
        ]
    ]

    for display_name, field_name in product_fields:
        field_data = extracted_data.get(
            field_name,
            {},
        )

        if isinstance(
            field_data,
            dict,
        ):
            value = field_data.get(
                "value"
            )
        else:
            value = field_data

        if value is None or value == "":
            value = "Not found"

        product_table_data.append([
            Paragraph(
                html.escape(
                    str(display_name)
                ),
                normal_style,
            ),
            Paragraph(
                html.escape(
                    str(value)
                ),
                normal_style,
            ),
        ])

    product_table = Table(
        product_table_data,
        colWidths=[
            45 * mm,
            135 * mm,
        ],
        repeatRows=1,
    )

    product_table.setStyle(
        TableStyle([
            (
                "BACKGROUND",
                (0, 0),
                (-1, 0),
                colors.lightgrey,
            ),
            (
                "GRID",
                (0, 0),
                (-1, -1),
                0.5,
                colors.grey,
            ),
            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "TOP",
            ),
            (
                "LEFTPADDING",
                (0, 0),
                (-1, -1),
                4,
            ),
            (
                "RIGHTPADDING",
                (0, 0),
                (-1, -1),
                4,
            ),
            (
                "TOPPADDING",
                (0, 0),
                (-1, -1),
                4,
            ),
            (
                "BOTTOMPADDING",
                (0, 0),
                (-1, -1),
                4,
            ),
        ])
    )

    story.append(
        product_table
    )

    # ---------------------------------------------------------
    # Rule Evaluation
    # ---------------------------------------------------------

    story.append(
        Paragraph(
            "Rule Evaluation",
            heading_style,
        )
    )

    rule_table_data = [
        [
            Paragraph(
                "<b>Rule ID</b>",
                header_style,
            ),
            Paragraph(
                "<b>Requirement</b>",
                header_style,
            ),
            Paragraph(
                "<b>Status</b>",
                header_style,
            ),
            Paragraph(
                "<b>Extracted Value</b>",
                header_style,
            ),
        ]
    ]

    for item in final_results:
        result = item["result"]

        rule_id = result.get(
            "rule_id",
            "-",
        )

        description = result.get(
            "description",
            "-",
        )

        final_status = item[
            "final_status"
        ]

        decision = item[
            "decision"
        ]

        extracted_value = result.get(
            "extracted_value"
        )

        if (
            extracted_value is None
            or extracted_value == ""
        ):
            extracted_value = "Not found"

        status_text = _display_status(
            item["system_status"],
            final_status,
            decision,
        )

        rule_table_data.append([
            Paragraph(
                html.escape(
                    str(rule_id)
                ),
                small_style,
            ),
            Paragraph(
                html.escape(
                    str(description)
                ),
                normal_style,
            ),
            Paragraph(
                status_text,
                status_style,
            ),
            Paragraph(
                html.escape(
                    str(extracted_value)
                ),
                normal_style,
            ),
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
        (
            "BACKGROUND",
            (0, 0),
            (-1, 0),
            colors.lightgrey,
        ),
        (
            "GRID",
            (0, 0),
            (-1, -1),
            0.5,
            colors.grey,
        ),
        (
            "VALIGN",
            (0, 0),
            (-1, -1),
            "TOP",
        ),
        (
            "LEFTPADDING",
            (0, 0),
            (-1, -1),
            4,
        ),
        (
            "RIGHTPADDING",
            (0, 0),
            (-1, -1),
            4,
        ),
        (
            "TOPPADDING",
            (0, 0),
            (-1, -1),
            5,
        ),
        (
            "BOTTOMPADDING",
            (0, 0),
            (-1, -1),
            5,
        ),
    ]

    # ---------------------------------------------------------
    # Status colours use FINAL reviewed status
    # ---------------------------------------------------------

    for row_index, item in enumerate(
        final_results,
        start=1,
    ):
        final_status = item[
            "final_status"
        ]

        if final_status == "PASS":
            rule_table_style.append(
                (
                    "BACKGROUND",
                    (2, row_index),
                    (2, row_index),
                    colors.lightgreen,
                )
            )

        elif final_status == "FAIL":
            rule_table_style.append(
                (
                    "BACKGROUND",
                    (2, row_index),
                    (2, row_index),
                    colors.lightcoral,
                )
            )

        elif final_status == "NOT_APPLICABLE":
            rule_table_style.append(
                (
                    "BACKGROUND",
                    (2, row_index),
                    (2, row_index),
                    colors.lightgrey,
                )
            )

        elif (
            final_status
            == "VERIFICATION_REQUIRED"
        ):
            rule_table_style.append(
                (
                    "BACKGROUND",
                    (2, row_index),
                    (2, row_index),
                    colors.lightyellow,
                )
            )

    rule_table.setStyle(
        TableStyle(
            rule_table_style
        )
    )

    story.append(
        rule_table
    )

    # ---------------------------------------------------------
    # Inspector Review
    # ---------------------------------------------------------

    if (
        inspector_decisions
        or inspector_notes
        or inspector_remarks
    ):
        story.append(
            Paragraph(
                "Inspector Review",
                heading_style,
            )
        )

        if inspector_decisions:
            review_table_data = [
                [
                    Paragraph(
                        "<b>Rule ID</b>",
                        header_style,
                    ),
                    Paragraph(
                        "<b>Inspector Decision</b>",
                        header_style,
                    ),
                    Paragraph(
                        "<b>Inspector Note</b>",
                        header_style,
                    ),
                ]
            ]

            for item in final_results:
                result = item[
                    "result"
                ]

                rule_id = result.get(
                    "rule_id",
                    "-",
                )

                decision = item[
                    "decision"
                ]

                if not decision:
                    continue

                note = item[
                    "note"
                ]

                review_table_data.append([
                    Paragraph(
                        html.escape(
                            str(rule_id)
                        ),
                        small_style,
                    ),
                    Paragraph(
                        html.escape(
                            decision.replace(
                                "_",
                                " ",
                            )
                        ),
                        normal_style,
                    ),
                    Paragraph(
                        html.escape(
                            str(note)
                            if note
                            else "-"
                        ),
                        normal_style,
                    ),
                ])

            if len(
                review_table_data
            ) > 1:
                review_table = Table(
                    review_table_data,
                    colWidths=[
                        35 * mm,
                        45 * mm,
                        100 * mm,
                    ],
                    repeatRows=1,
                )

                review_table.setStyle(
                    TableStyle([
                        (
                            "BACKGROUND",
                            (0, 0),
                            (-1, 0),
                            colors.lightgrey,
                        ),
                        (
                            "GRID",
                            (0, 0),
                            (-1, -1),
                            0.5,
                            colors.grey,
                        ),
                        (
                            "VALIGN",
                            (0, 0),
                            (-1, -1),
                            "TOP",
                        ),
                        (
                            "LEFTPADDING",
                            (0, 0),
                            (-1, -1),
                            4,
                        ),
                        (
                            "RIGHTPADDING",
                            (0, 0),
                            (-1, -1),
                            4,
                        ),
                        (
                            "TOPPADDING",
                            (0, 0),
                            (-1, -1),
                            4,
                        ),
                        (
                            "BOTTOMPADDING",
                            (0, 0),
                            (-1, -1),
                            4,
                        ),
                    ])
                )

                story.append(
                    review_table
                )

        if inspector_remarks:
            story.append(
                Spacer(
                    1,
                    6,
                )
            )

            story.append(
                Paragraph(
                    f"<b>Inspector Remarks:</b> "
                    f"{html.escape(str(inspector_remarks))}",
                    normal_style,
                )
            )

    # ---------------------------------------------------------
    # Evidence integrity
    # ---------------------------------------------------------

    evidence_hash = inspection.get(
        "evidence_hash"
    )

    evidence_timestamp = inspection.get(
        "evidence_timestamp"
    )

    if evidence_hash:
        story.append(
            Paragraph(
                "Evidence Integrity",
                heading_style,
            )
        )

        story.append(
            Paragraph(
                f"<b>Algorithm:</b> SHA-256<br/>"
                f"<b>Evidence Hash:</b> "
                f"{html.escape(str(evidence_hash))}<br/>"
                f"<b>Evidence Timestamp:</b> "
                f"{html.escape(str(evidence_timestamp or '-'))}",
                small_style,
            )
        )

    # ---------------------------------------------------------
    # Note
    # ---------------------------------------------------------

    story.append(
        Spacer(
            1,
            10,
        )
    )

    story.append(
        Paragraph(
            "<b>Note:</b> This report represents an automated "
            "preliminary compliance check based on the configured "
            "Legal Metrology declaration rules and records the "
            "subsequent inspector review where applicable. Final "
            "regulatory determination remains subject to human "
            "inspection and applicable law.",
            small_style,
        )
    )

    # ---------------------------------------------------------
    # Build PDF
    # ---------------------------------------------------------

    doc.build(
        story
    )

    return send_file(
        pdf_path,
        as_attachment=True,
        download_name=(
            f"Nometra_Inspection_{inspection_id}.pdf"
        ),
        mimetype="application/pdf",
    )