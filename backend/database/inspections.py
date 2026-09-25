import sqlite3
import json
import os
from datetime import datetime, timezone


# ============================================================
# DATABASE CONFIGURATION
# ============================================================

DATABASE_URL = os.getenv("DATABASE_URL")

DB_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "compliance.db",
)


def _utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


# ============================================================
# CONNECTION
# ============================================================

def _get_connection():
    if DATABASE_URL:
        import psycopg2
        return psycopg2.connect(DATABASE_URL)

    return sqlite3.connect(DB_PATH)


def _is_postgresql() -> bool:
    return bool(DATABASE_URL)


# ============================================================
# PRODUCT NAME EXTRACTION
# ============================================================

def _extract_product_name(extracted_data) -> str:
    """
    Extract product name from extracted/fused evidence.
    """

    if not isinstance(extracted_data, dict):
        return ""

    product_name = extracted_data.get("product_name")

    if isinstance(product_name, dict):
        value = product_name.get("value")

        if value is not None and str(value).strip():
            return str(value).strip()

        return ""

    if product_name is not None and str(product_name).strip():
        return str(product_name).strip()

    return ""


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

def init_db():
    conn = _get_connection()
    cursor = conn.cursor()

    if _is_postgresql():

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS inspections (
                id BIGSERIAL PRIMARY KEY,
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
                final_status TEXT,
                gemini_product_name TEXT,
                product_name TEXT
            )
        """)

        # ----------------------------------------------------
        # Migrations for existing PostgreSQL database
        # ----------------------------------------------------

        cursor.execute("""
            ALTER TABLE inspections
            ADD COLUMN IF NOT EXISTS gemini_product_name TEXT
        """)

        cursor.execute("""
            ALTER TABLE inspections
            ADD COLUMN IF NOT EXISTS product_name TEXT
        """)

    else:

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
                final_status TEXT,
                gemini_product_name TEXT,
                product_name TEXT
            )
        """)

        cursor.execute(
            "PRAGMA table_info(inspections)"
        )

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
            "gemini_product_name": """
                ALTER TABLE inspections
                ADD COLUMN gemini_product_name TEXT
            """,
            "product_name": """
                ALTER TABLE inspections
                ADD COLUMN product_name TEXT
            """,
        }

        for column_name, sql in migrations.items():

            if column_name not in existing_columns:
                cursor.execute(sql)

    conn.commit()
    cursor.close()
    conn.close()


# ============================================================
# SAVE INSPECTION
# ============================================================

def save_inspection(
    extracted_data: dict,
    compliance_report: dict,
    evidence_hash: str | None = None,
    evidence_timestamp: str | None = None,
    inspector_decisions: dict | None = None,
    inspector_notes: dict | None = None,
    inspector_remarks: str | None = None,
    final_status: str | None = None,
    gemini_product_name: str | None = None,
    product_name: str | None = None,
) -> int:

    if evidence_timestamp is None:
        evidence_timestamp = _utc_timestamp()

    # --------------------------------------------------------
    # Determine Gemini's original product name
    # --------------------------------------------------------

    if not gemini_product_name:
        gemini_product_name = _extract_product_name(
            extracted_data
        )

    if gemini_product_name:
        gemini_product_name = str(
            gemini_product_name
        ).strip()

    # --------------------------------------------------------
    # Initial final product name
    #
    # At scan time the inspector has not edited anything yet,
    # so the final name starts as Gemini's suggestion.
    # --------------------------------------------------------

    if not product_name:
        product_name = gemini_product_name

    if product_name:
        product_name = str(product_name).strip()

    if not product_name:
        product_name = "Unnamed Product"

    conn = _get_connection()
    cursor = conn.cursor()

    if _is_postgresql():

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
                final_status,
                gemini_product_name,
                product_name
            )
            VALUES (
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s
            )
            RETURNING id
        """, (
            _utc_timestamp(),
            compliance_report["overall_status"],
            compliance_report["passed"],
            compliance_report["failed"],
            json.dumps(extracted_data),
            json.dumps(compliance_report),
            evidence_hash,
            evidence_timestamp,
            json.dumps(
                inspector_decisions or {}
            ),
            json.dumps(
                inspector_notes or {}
            ),
            inspector_remarks or "",
            final_status,
            gemini_product_name,
            product_name,
        ))

        new_id = cursor.fetchone()[0]

    else:

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
                final_status,
                gemini_product_name,
                product_name
            )
            VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
        """, (
            _utc_timestamp(),
            compliance_report["overall_status"],
            compliance_report["passed"],
            compliance_report["failed"],
            json.dumps(extracted_data),
            json.dumps(compliance_report),
            evidence_hash,
            evidence_timestamp,
            json.dumps(
                inspector_decisions or {}
            ),
            json.dumps(
                inspector_notes or {}
            ),
            inspector_remarks or "",
            final_status,
            gemini_product_name,
            product_name,
        ))

        new_id = cursor.lastrowid

    conn.commit()
    cursor.close()
    conn.close()

    return new_id


# ============================================================
# UPDATE INSPECTOR REVIEW
# ============================================================

def update_inspector_review(
    inspection_id: int,
    inspector_decisions: dict,
    inspector_notes: dict | None = None,
    inspector_remarks: str | None = None,
    final_status: str | None = None,
    product_name: str | None = None,
) -> bool:

    conn = _get_connection()
    cursor = conn.cursor()

    if product_name is not None:
        product_name = str(
            product_name
        ).strip()

        if not product_name:
            product_name = None

    if _is_postgresql():

        cursor.execute("""
            UPDATE inspections
            SET
                inspector_decisions = %s,
                inspector_notes = %s,
                inspector_remarks = %s,
                final_status = %s,
                product_name = COALESCE(
                    %s,
                    product_name
                )
            WHERE id = %s
        """, (
            json.dumps(
                inspector_decisions or {}
            ),
            json.dumps(
                inspector_notes or {}
            ),
            inspector_remarks or "",
            final_status,
            product_name,
            inspection_id,
        ))

    else:

        cursor.execute("""
            UPDATE inspections
            SET
                inspector_decisions = ?,
                inspector_notes = ?,
                inspector_remarks = ?,
                final_status = ?,
                product_name = COALESCE(
                    ?,
                    product_name
                )
            WHERE id = ?
        """, (
            json.dumps(
                inspector_decisions or {}
            ),
            json.dumps(
                inspector_notes or {}
            ),
            inspector_remarks or "",
            final_status,
            product_name,
            inspection_id,
        ))

    updated = cursor.rowcount > 0

    conn.commit()
    cursor.close()
    conn.close()

    return updated


# ============================================================
# GET ALL INSPECTIONS
# ============================================================

def get_all_inspections() -> list:

    conn = _get_connection()

    if _is_postgresql():

        from psycopg2.extras import RealDictCursor

        cursor = conn.cursor(
            cursor_factory=RealDictCursor
        )

    else:

        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

    cursor.execute("""
        SELECT
            id,
            timestamp,
            overall_status,
            passed,
            failed,
            gemini_product_name,
            product_name,
            extracted_data,
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

    cursor.close()
    conn.close()

    results = []

    for row in rows:

        result = dict(row)

        # --------------------------------------------------
        # Gemini original product name
        # --------------------------------------------------

        gemini_product_name = (
            result.get(
                "gemini_product_name"
            )
            or ""
        )

        if isinstance(
            gemini_product_name,
            str
        ):
            gemini_product_name = (
                gemini_product_name.strip()
            )

        # --------------------------------------------------
        # Final product name
        # --------------------------------------------------

        product_name = (
            result.get("product_name")
            or ""
        )

        if isinstance(
            product_name,
            str
        ):
            product_name = product_name.strip()

        # --------------------------------------------------
        # Fallback for older records
        # --------------------------------------------------

        if not gemini_product_name or not product_name:

            try:
                extracted_data = json.loads(
                    result.get(
                        "extracted_data",
                        "{}",
                    )
                )

            except (
                json.JSONDecodeError,
                TypeError,
            ):

                extracted_data = {}

            extracted_name = _extract_product_name(
                extracted_data
            )

            if not gemini_product_name:
                gemini_product_name = extracted_name

            if not product_name:
                product_name = extracted_name

        result["gemini_product_name"] = (
            gemini_product_name
            if gemini_product_name
            else "Unnamed Product"
        )

        result["product_name"] = (
            product_name
            if product_name
            else "Unnamed Product"
        )

        # --------------------------------------------------
        # Remove large extracted_data from history response
        # --------------------------------------------------

        result.pop(
            "extracted_data",
            None,
        )

        # --------------------------------------------------
        # Parse inspector JSON
        # --------------------------------------------------

        result["inspector_decisions"] = (
            json.loads(
                result["inspector_decisions"]
            )
            if result["inspector_decisions"]
            else {}
        )

        result["inspector_notes"] = (
            json.loads(
                result["inspector_notes"]
            )
            if result["inspector_notes"]
            else {}
        )

        results.append(result)

    return results


# ============================================================
# GET SINGLE INSPECTION
# ============================================================

def get_inspection_by_id(
    inspection_id: int,
):

    conn = _get_connection()

    if _is_postgresql():

        from psycopg2.extras import RealDictCursor

        cursor = conn.cursor(
            cursor_factory=RealDictCursor
        )

        cursor.execute(
            """
            SELECT *
            FROM inspections
            WHERE id = %s
            """,
            (inspection_id,),
        )

    else:

        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT *
            FROM inspections
            WHERE id = ?
            """,
            (inspection_id,),
        )

    row = cursor.fetchone()

    cursor.close()
    conn.close()

    if row is None:
        return None

    result = dict(row)

    # --------------------------------------------------------
    # Parse stored JSON
    # --------------------------------------------------------

    try:
        result["extracted_data"] = json.loads(
            result["extracted_data"]
        )
    except (
        json.JSONDecodeError,
        TypeError,
    ):
        result["extracted_data"] = {}

    try:
        result["compliance_report"] = json.loads(
            result["compliance_report"]
        )
    except (
        json.JSONDecodeError,
        TypeError,
    ):
        result["compliance_report"] = {}

    result["inspector_decisions"] = (
        json.loads(
            result["inspector_decisions"]
        )
        if result.get("inspector_decisions")
        else {}
    )

    result["inspector_notes"] = (
        json.loads(
            result["inspector_notes"]
        )
        if result.get("inspector_notes")
        else {}
    )

    # --------------------------------------------------------
    # Gemini original product name
    # --------------------------------------------------------

    gemini_product_name = (
        result.get(
            "gemini_product_name"
        )
        or ""
    )

    if isinstance(
        gemini_product_name,
        str
    ):
        gemini_product_name = (
            gemini_product_name.strip()
        )

    # --------------------------------------------------------
    # Final product name
    # --------------------------------------------------------

    product_name = (
        result.get("product_name")
        or ""
    )

    if isinstance(
        product_name,
        str
    ):
        product_name = product_name.strip()

    # --------------------------------------------------------
    # Fallback for older records
    # --------------------------------------------------------

    extracted_name = _extract_product_name(
        result["extracted_data"]
    )

    if not gemini_product_name:
        gemini_product_name = extracted_name

    if not product_name:
        product_name = extracted_name

    result["gemini_product_name"] = (
        gemini_product_name
        if gemini_product_name
        else "Unnamed Product"
    )

    result["product_name"] = (
        product_name
        if product_name
        else "Unnamed Product"
    )

    return result


# ============================================================
# STANDALONE TEST RUNNER
# ============================================================

if __name__ == "__main__":

    init_db()

    if DATABASE_URL:

        print(
            "Database initialized using PostgreSQL."
        )

    else:

        print(
            f"Database initialized using SQLite at: {DB_PATH}"
        )

    fake_extracted = {
        "product_name": {
            "value": "TEST PRODUCT",
            "source": "gemini_vision",
            "verified_by_ocr": True,
        },
        "mrp": {
            "value": "Rs. 20.00",
            "source": "gemini_vision",
            "verified_by_ocr": True,
        },
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
            "FND-TEST-001":
                "Inspector confirmed declaration."
        },
        inspector_remarks="Test inspector review.",
        final_status="COMPLIANT",
        gemini_product_name="TEST PRODUCT",
        product_name="TEST PRODUCT",
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
