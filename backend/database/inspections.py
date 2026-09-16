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

    Also adds the evidence integrity columns when upgrading
    an existing database created by an earlier version.
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
            evidence_timestamp TEXT
        )
    """)

    # --------------------------------------------------
    # Database migration
    #
    # Existing Nometra databases may already have the
    # inspections table without the new integrity columns.
    # --------------------------------------------------

    cursor.execute("PRAGMA table_info(inspections)")
    existing_columns = {
        row[1]
        for row in cursor.fetchall()
    }

    if "evidence_hash" not in existing_columns:
        cursor.execute("""
            ALTER TABLE inspections
            ADD COLUMN evidence_hash TEXT
        """)

    if "evidence_timestamp" not in existing_columns:
        cursor.execute("""
            ALTER TABLE inspections
            ADD COLUMN evidence_timestamp TEXT
        """)

    conn.commit()
    conn.close()


def save_inspection(
    extracted_data: dict,
    compliance_report: dict,
    evidence_hash: str | None = None,
    evidence_timestamp: str | None = None,
) -> int:
    """
    Saves one scan result to the database.

    extracted_data and compliance_report are stored as JSON.

    evidence_hash:
        SHA-256 hash of the uploaded evidence image.

    evidence_timestamp:
        UTC timestamp associated with the evidence record.

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
            evidence_timestamp
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        _utc_timestamp(),
        compliance_report["overall_status"],
        compliance_report["passed"],
        compliance_report["failed"],
        json.dumps(extracted_data),
        json.dumps(compliance_report),
        evidence_hash,
        evidence_timestamp,
    ))

    new_id = cursor.lastrowid

    conn.commit()
    conn.close()

    return new_id


def get_all_inspections() -> list:
    """
    Returns a summary list of all past inspections
    (most recent first).

    Includes the evidence timestamp and hash so the
    history record can identify the integrity metadata.
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
            evidence_timestamp
        FROM inspections
        ORDER BY id DESC
    """)

    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]


def get_inspection_by_id(inspection_id: int):
    """
    Returns the full details for one past scan,
    including evidence integrity metadata.
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

    return result


# Standalone test runner
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