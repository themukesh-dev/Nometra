# backend/database/inspections.py

import sqlite3
import json
import os
from datetime import datetime

# The database file will live at backend/database/compliance.db
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "compliance.db")


def init_db():
    """
    Creates the inspections table if it doesn't already exist.
    Safe to call every time the app starts — it won't wipe existing data.
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
            compliance_report TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()


def save_inspection(extracted_data: dict, compliance_report: dict) -> int:
    """
    Saves one scan result to the database.

    We store extracted_data and compliance_report as JSON strings
    (SQLite doesn't have a native "nested object" column type — this
    is the simplest way to keep the exact same shape your API already
    returns, without designing a bunch of separate tables/columns for
    every field).

    Returns the new row's id.
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO inspections (timestamp, overall_status, passed, failed, extracted_data, compliance_report)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        datetime.utcnow().isoformat(),
        compliance_report["overall_status"],
        compliance_report["passed"],
        compliance_report["failed"],
        json.dumps(extracted_data),
        json.dumps(compliance_report)
    ))

    new_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return new_id


def get_all_inspections() -> list:
    """
    Returns a summary list of all past inspections (most recent first),
    WITHOUT the full extracted_data/compliance_report blobs — just enough
    to show a history list in the frontend. Use get_inspection_by_id
    to get full details for one specific scan.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # lets us access columns by name, like a dict
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, timestamp, overall_status, passed, failed
        FROM inspections
        ORDER BY id DESC
    """)

    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]


def get_inspection_by_id(inspection_id: int):
    """
    Returns the full details (including extracted_data and compliance_report)
    for one specific past inspection. Returns None if it doesn't exist.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM inspections WHERE id = ?", (inspection_id,))
    row = cursor.fetchone()
    conn.close()

    if row is None:
        return None

    result = dict(row)
    # Convert the JSON strings back into actual Python dicts before returning
    result["extracted_data"] = json.loads(result["extracted_data"])
    result["compliance_report"] = json.loads(result["compliance_report"])

    return result


# Standalone test runner
if __name__ == "__main__":
    init_db()
    print(f"Database initialized at: {DB_PATH}")

    # Insert a dummy test record so you can confirm read/write works
    fake_extracted = {"mrp": {"value": "Rs. 20.00", "source": "gemini_vision", "verified_by_ocr": True}}
    fake_report = {"overall_status": "NON_COMPLIANT", "passed": 3, "failed": 4, "results": []}

    new_id = save_inspection(fake_extracted, fake_report)
    print(f"Saved test inspection with id: {new_id}")

    print("\nAll inspections:")
    for inspection in get_all_inspections():
        print(inspection)

    print(f"\nFull detail for inspection {new_id}:")
    print(get_inspection_by_id(new_id))