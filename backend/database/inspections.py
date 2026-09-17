import sqlite3
import json
import os
from datetime import datetime, timezone

# The database file will live at backend/database/compliance.db
DB_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "compliance.db",
)


def _utc_timestamp() -> str:
    """
    Returns a timezone-aware UTC timestamp in ISO 8601 format.
    """
    return datetime.now(timezone.utc).isoformat()


def init_db():
    """
    Creates the inspections table if it doesn't already exist.

    Also performs lightweight migrations for databases created
    by earlier versions of Nometra.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS inspections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            overall_status TEXT NOT NULL,
            passed INTEGER NOT NULL,
            failed INTEGER NOT NULL,
            extracted_data TEXT NOT NULL,
            compliance_report TEXT NOT NULL,
            evidence_hash TEXT,
            evidence_timestamp TEXT,
            inspector_decisions TEXT,
            inspector_notes TEXT,
            inspector_remarks TEXT,
            final_status TEXT
        )
    """)

    # --------------------------------------------------
    # Database migration
    # --------------------------------------------------
    #
    # Existing Nometra databases may already have the
    # inspections table without the newer columns.
    # --------------------------------------------------

    cursor.execute("PRAGMA table_info(inspections)")

    existing_columns = {
        row[1]
        for row in cursor.fetchall()
    }

    migrations = {
        "evidence_hash": """
            ALTER TABLE inspections
            ADD COLUMN evidence_hash TEXT
        """,
        "evidence_timestamp": """
            ALTER TABLE inspections
            ADD COLUMN evidence_timestamp TEXT
        """,
        "inspector_decisions": """
            ALTER TABLE inspections
            ADD COLUMN inspector_decisions TEXT
        """,
        "inspector_notes": """
            ALTER TABLE inspections
            ADD COLUMN inspector_notes TEXT
        """,
        "inspector_remarks": """
            ALTER TABLE inspections
            ADD COLUMN inspector_remarks TEXT
        """,
        "final_status": """
            ALTER TABLE inspections
            ADD COLUMN final_status TEXT
        """,
    }

    for column_name, sql in migrations.items():
        if column_name not in existing_columns:
            cursor.execute(sql)

    conn.commit()
    conn.close()


def save_inspection(
    extracted_data: dict,
    compliance_report: dict,
    evidence_hash: str | None = None,
    evidence_timestamp: str | None = None,
    inspector_decisions: dict | None = None,
    inspector_notes: dict | None = None,
    inspector_remarks: str | None = None,
    final_status: str | None = None,
) -> int:
    """
    Saves one scan result to the database.

    extracted_data and compliance_report are stored as JSON.

    Inspector review data is also persisted as part of the
    inspection audit record.

    evidence_hash:
        SHA-256 hash of the uploaded evidence image.

    evidence_timestamp:
        UTC timestamp associated with the evidence record.

    inspector_decisions:
        Mapping of frontend finding IDs to inspector decisions.

    inspector_notes:
        Mapping of frontend finding IDs to inspector notes.

    inspector_remarks:
        Overall remarks entered by the inspector.

    final_status:
        Final status after inspector review.

    Returns the new row's id.
    """

    if evidence_timestamp is None:
        evidence_timestamp = _utc_timestamp()

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO inspections (
            timestamp,
            overall_status,
            passed,
            failed,
            extracted_data,
            compliance_report,
            evidence_hash,
            evidence_timestamp,
            inspector_decisions,
            inspector_notes,
            inspector_remarks,
            final_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        _utc_timestamp(),
        compliance_report["overall_status"],
        compliance_report["passed"],
        compliance_report["failed"],
        json.dumps(extracted_data),
        json.dumps(compliance_report),
        evidence_hash,
        evidence_timestamp,
        json.dumps(inspector_decisions or {}),
        json.dumps(inspector_notes or {}),
        inspector_remarks or "",
        final_status,
    ))

    new_id = cursor.lastrowid

    conn.commit()
    conn.close()

    return new_id


def update_inspector_review(
    inspection_id: int,
    inspector_decisions: dict,
    inspector_notes: dict | None = None,
    inspector_remarks: str | None = None,
    final_status: str | None = None,
) -> bool:
    """
    Persists inspector review information for an existing inspection.

    This is used after the inspector reviews the system findings.

    Returns True when the inspection exists and was updated.
    """

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE inspections
        SET
            inspector_decisions = ?,
            inspector_notes = ?,
            inspector_remarks = ?,
            final_status = ?
        WHERE id = ?
    """, (
        json.dumps(inspector_decisions or {}),
        json.dumps(inspector_notes or {}),
        inspector_remarks or "",
        final_status,
        inspection_id,
    ))

    updated = cursor.rowcount > 0

    conn.commit()
    conn.close()

    return updated


def get_all_inspections() -> list:
    """
    Returns a summary list of all past inspections
    (most recent first).

    Includes evidence integrity metadata and final
    inspector review status.
    """

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            id,
            timestamp,
            overall_status,
            passed,
            failed,
            evidence_hash,
            evidence_timestamp,
            inspector_decisions,
            inspector_notes,
            inspector_remarks,
            final_status
        FROM inspections
        ORDER BY id DESC
    """)

    rows = cursor.fetchall()
    conn.close()

    results = []

    for row in rows:
        result = dict(row)

        result["inspector_decisions"] = json.loads(
            result["inspector_decisions"]
        ) if result["inspector_decisions"] else {}

        result["inspector_notes"] = json.loads(
            result["inspector_notes"]
        ) if result["inspector_notes"] else {}

        results.append(result)

    return results


def get_inspection_by_id(inspection_id: int):
    """
    Returns the full details for one past scan,
    including evidence integrity metadata and
    inspector review information.
    """

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute(
        "SELECT * FROM inspections WHERE id = ?",
        (inspection_id,),
    )

    row = cursor.fetchone()
    conn.close()

    if row is None:
        return None

    result = dict(row)

    result["extracted_data"] = json.loads(
        result["extracted_data"]
    )

    result["compliance_report"] = json.loads(
        result["compliance_report"]
    )

    result["inspector_decisions"] = json.loads(
        result["inspector_decisions"]
    ) if result.get("inspector_decisions") else {}

    result["inspector_notes"] = json.loads(
        result["inspector_notes"]
    ) if result.get("inspector_notes") else {}

    return result


# --------------------------------------------------
# Standalone test runner
# --------------------------------------------------

if __name__ == "__main__":
    init_db()

    print(
        f"Database initialized at: {DB_PATH}"
    )

    fake_extracted = {
        "mrp": {
            "value": "Rs. 20.00",
            "source": "gemini_vision",
            "verified_by_ocr": True,
        }
    }

    fake_report = {
        "overall_status": "NON_COMPLIANT",
        "passed": 3,
        "failed": 4,
        "results": [],
    }

    new_id = save_inspection(
        fake_extracted,
        fake_report,
        evidence_hash="test_sha256_hash",
        evidence_timestamp=_utc_timestamp(),
        inspector_decisions={
            "FND-TEST-001": "CONFIRM"
        },
        inspector_notes={
            "FND-TEST-001": "Inspector confirmed declaration."
        },
        inspector_remarks="Test inspector review.",
        final_status="COMPLIANT",
    )

    print(
        f"Saved test inspection with id: {new_id}"
    )

    print("\nAll inspections:")

    for inspection in get_all_inspections():
        print(inspection)

    print(
        f"\nFull detail for inspection {new_id}:"
    )

    print(
        get_inspection_by_id(new_id)
    )