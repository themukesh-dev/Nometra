# backend/extraction/gemini_vision.py

import os
import json
import sys

from dotenv import load_dotenv
from PIL import Image
from google import genai


# Load environment variables
load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise RuntimeError("GEMINI_API_KEY is not set in your .env file")


# Create Gemini client
client = genai.Client(api_key=API_KEY)


EXTRACTION_PROMPT = """
You are an expert OCR and product-label analysis system.

You are looking at a photo of a packaged retail commodity sold in India.
Carefully inspect THE ENTIRE IMAGE, including small text near the bottom,
edges, folds, barcodes, and contact-information sections.

Extract the following information.

IMPORTANT RULES:
1. Read text from the image carefully.
2. Do NOT guess or invent information.
3. If information is clearly visible, extract it.
4. Preserve values as printed whenever possible.
5. Distinguish product information from packaging-material information.
6. Pay special attention to MRP, quantity, manufacturing date, contact
   details, and country-of-origin statements.
7. Promotional quantity expressions such as
   "140 g + 50 g FREE = 190 g" should be preserved exactly.
8. "MADE IN INDIA" or "PRODUCT OF INDIA" means country_of_origin is "India".

FIELDS:

"mrp":
Maximum Retail Price exactly as printed.
Example: "₹ 10.00"
Return null if not visible.

"net_quantity":
Net quantity/weight/volume exactly as printed.
If a promotional quantity is shown, preserve the complete expression.
Example: "140 g + 50 g FREE = 190 g"
Return null if not visible.

"manufacturer_name":
Identify the manufacturer, packer, or marketer of THE PRODUCT.

IMPORTANT:
Do NOT treat a company mentioned only in wording such as
"Pkg. Material Mfd By" or "Packaging Material Manufactured By"
as the product manufacturer.

If the manufacturer cannot be confidently identified, return null.

"manufacturer_address":
Full address belonging to the product manufacturer, packer, or marketer.
Do not use an address belonging only to a packaging-material manufacturer.
Return null if not visible or not confidently identifiable.

"consumer_care":
Consumer-care contact information, including phone number, email,
complaint contact, or consumer service address.
Preserve the visible contact information.
Return null if not visible.

"date_of_manufacture":
Manufacturing, packing, or MFD date exactly as printed.
Examples:
"MFD : 08/2026"
"MFD 08/2026"
"PKD 08/2026"
Return null if not visible.

"country_of_origin":
Extract the country ONLY when it is explicitly stated on the package.

Examples:
"MADE IN INDIA" → "India"
"MADE IN CHINA" → "China"
"PRODUCT OF INDIA" → "India"

Do not infer the country from the company name, address, phone number,
brand, or other information.

Return null if no explicit country-of-origin statement is visible.

OUTPUT FORMAT:

Return ONLY valid JSON.
Do not use markdown.
Do not use ```json.
Do not add explanations.

Return exactly:

{
  "mrp": null,
  "net_quantity": null,
  "manufacturer_name": null,
  "manufacturer_address": null,
  "consumer_care": null,
  "date_of_manufacture": null,
  "country_of_origin": null
}
""" 


def extract_label_data(image_path: str) -> dict:

    try:
        # Open image
        image = Image.open(image_path)

        # Send image + extraction instructions to Gemini
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=[
                EXTRACTION_PROMPT,
                image
            ]
        )

        # Get Gemini response
        raw_text = response.text.strip()

        # Remove markdown fences defensively
        if raw_text.startswith("```"):
            raw_text = raw_text.replace("```json", "")
            raw_text = raw_text.replace("```", "")
            raw_text = raw_text.strip()

        # Parse JSON
        extracted_data = json.loads(raw_text)

        # Add source
        extracted_data["source"] = "gemini_vision"

        return extracted_data

    except json.JSONDecodeError:
        return {
            "error": "Gemini returned text that wasn't valid JSON",
            "raw_response": raw_text if "raw_text" in locals() else None,
            "source": "gemini_vision"
        }

    except Exception as e:
        return {
            "error": str(e),
            "source": "gemini_vision"
        }


if __name__ == "__main__":

    if len(sys.argv) < 2:
        print("Usage: python extraction/gemini_vision.py <path_to_image>")
        sys.exit(1)

    result = extract_label_data(sys.argv[1])

    print(json.dumps(result, indent=2, ensure_ascii=False))