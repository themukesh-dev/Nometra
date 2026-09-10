# Legal Metrology Compliance Backend — SIH PS 26034

Backend that checks packaged commodity labels against the Legal Metrology
(Packaged Commodities) Rules, 2011. Send a label photo in, get a compliance
report back.

## What this does

`POST /scan` an image → the backend:
1. Extracts label fields using Gemini Vision (AI image understanding)
2. Cross-checks with OCR (Tesseract) as a fallback/verification method
3. Runs the extracted data through hardcoded Legal Metrology rule checks
4. Returns a JSON compliance report (pass/fail per rule)

## Requirements

- Python 3.10+
- Tesseract OCR installed as a **system program** (not just the Python
  package — see below)
- A free Gemini API key from https://aistudio.google.com/apikey

## Setup

### 1. Install Python packages

```bash
pip install -r requirements.txt --break-system-packages
```

### 2. Install Tesseract OCR (system-level, separate from the pip install above)

- **Mac**: `brew install tesseract`
- **Linux**: `sudo apt install tesseract-ocr`
- **Windows**: install from https://github.com/UB-Mannheim/tesseract/wiki,
  then open `backend/extraction/ocr.py` and uncomment/set this line to your
  install path:
  ```python
  pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
  ```

### 3. Add your Gemini API key

Create a file called `.env` in the `backend/` root folder:
```
GEMINI_API_KEY=your_actual_key_here
```

### 4. Run the server

```bash
python api/scan.py
```

You should see:
```
 * Running on http://127.0.0.1:5000
```

Leave this running. Test it's alive by visiting `http://127.0.0.1:5000/health`
in a browser — should show `{"status": "ok"}`.

## API contract (for frontend integration)

### `POST /scan`

**Request**: `multipart/form-data`, one field:
| Key     | Type | Notes                              |
|---------|------|-------------------------------------|
| `image` | File | jpg, jpeg, png, or webp             |

**Response** (`200`):
```json
{
  "extracted_data": {
    "mrp": { "value": "Rs. 45.00", "source": "gemini_vision", "verified_by_ocr": true },
    "net_quantity": { "value": "500 g", "source": "gemini_vision", "verified_by_ocr": true },
    "manufacturer_name": { "value": "...", "source": "gemini_vision", "verified_by_ocr": false },
    "manufacturer_address": { "value": null, "source": "none", "verified_by_ocr": false },
    "consumer_care": { "value": "...", "source": "ocr_fallback", "verified_by_ocr": true },
    "date_of_manufacture": { "value": "...", "source": "gemini_vision", "verified_by_ocr": true },
    "country_of_origin": { "value": null, "source": "none", "verified_by_ocr": false }
  },
  "compliance_report": {
    "overall_status": "COMPLIANT | NON_COMPLIANT",
    "total_rules_checked": 6,
    "passed": 5,
    "failed": 1,
    "results": [
      {
        "rule_id": "LM-MRP-01",
        "description": "Maximum Retail Price (MRP) must be declared on the label",
        "legal_reference": "Rule 6(1)(e), Legal Metrology (Packaged Commodities) Rules, 2011",
        "field": "mrp",
        "status": "PASS | FAIL | NOT_APPLICABLE",
        "reason": "human-readable explanation",
        "extracted_value": "Rs. 45.00",
        "verified_by_ocr": true
      }
    ]
  }
}
```

**Error responses** (`400`/`500`):
```json
{ "error": "description of what went wrong" }
```

### `GET /health`

Returns `{ "status": "ok" }`. Use this to confirm the backend is reachable
before letting a user scan anything.

### Coming soon
- `GET /inspections` — list of past scans (summary)
- `GET /inspections/<id>` — full detail of one past scan

## Frontend integration notes

- The form field key **must** be exactly `image` — anything else returns a
  400 error.
- `extracted_data` fields with `"value": null` mean that field wasn't found
  on the label at all — the frontend should probably show these as
  "Not detected" rather than blank.
- `"verified_by_ocr": false` doesn't necessarily mean the field is wrong —
  it means only one extraction method (usually Gemini) found it. Consider
  showing a subtle "unverified" flag rather than treating it as an error.
- `NOT_APPLICABLE` rule results (currently only `country_of_origin` for
  non-imported products) should probably be shown differently from `FAIL`
  in the UI — they're not compliance violations.

## Project structure

```
backend/
├── api/scan.py                              → the /scan endpoint (this is what you call)
├── extraction/
│   ├── gemini_vision.py                     → Gemini Vision extraction
│   ├── ocr.py                               → OCR fallback
│   └── evidence_fusion.py                   → merges both into extracted_data
├── rules/packaged_commodities/
│   └── mandatory_declarations.py            → the 7 hardcoded LM rules
├── engine/evaluator.py                      → runs rules, builds compliance_report
├── database/inspections.py                  → SQLite storage (in progress)
└── requirements.txt
```

## Who's doing what

- **Backend/DB**: SQLite storage of past scans, remaining API polish
- **Frontend**: build against the `/scan` contract above — point fetch calls
  at whatever URL the backend is running on (see teammate running the
  server for the current address if not `127.0.0.1:5000`)