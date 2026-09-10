You are a senior frontend engineer and product designer specializing in mobile-first regulatory inspection applications.

Build the frontend for:

PROJECT: Nometra
PRODUCT: Legal Metrology Compliance & Inspection Assistant
PROBLEM STATEMENT: SIH26034
TAGLINE: "Scan. Verify. Prove Compliance."

TECH STACK:
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide React icons
- Framer Motion for subtle animations
- Responsive mobile-first architecture
- PWA-friendly structure
- No React Native. This is a Next.js web application optimized specifically for mobile browsers.

IMPORTANT:
The application will primarily be used on MOBILE PHONES by Legal Metrology inspectors in the field.

DO NOT design this like a desktop SaaS dashboard.

The main user is an inspector standing in a shop/warehouse/market and checking an actual packaged commodity using their phone camera.

The UI must prioritize:
1. Camera/photo capture
2. Evidence
3. Regulatory requirements
4. Verification
5. Inspector decision
6. Inspection report

The core mental model is:

INSPECTOR → PRODUCT → EVIDENCE → RULES → VERIFICATION → DECISION → REPORT

Nometra is NOT a generic AI scanner.

Nometra is NOT a chatbot.

Nometra does NOT replace the Legal Metrology inspector.

AI assists with extracting and organizing package information.
Rules perform deterministic compliance verification.
The inspector makes the final decision.

==================================================
1. DESIGN DIRECTION
==================================================

Create a professional government/regulatory inspection application.

Visual style:
- Clean
- Professional
- Trustworthy
- Minimal
- Modern
- Mobile-first
- Information-dense but not cluttered
- Suitable for government officers
- Strong visual hierarchy
- High readability outdoors
- Large touch targets
- Clear status indicators

Avoid:
- Neon colors
- Glassmorphism
- Excessive gradients
- 3D UI
- Huge illustrations
- Gaming-style UI
- Excessive animations
- Generic AI dashboard aesthetics
- Excessive cards inside cards
- Desktop-style sidebars
- Tiny text
- Tiny buttons
- Complex charts on the main inspection screen

Use:
- White/light neutral background
- Dark navy text
- Professional blue/green accents
- Red only for violations
- Amber/yellow for verification required
- Green for compliant
- Neutral gray for supporting information
- Thin borders
- Subtle shadows
- Rounded corners, but not excessively rounded
- Lucide icons

The application should visually communicate:
"Official inspection tool"
rather than:
"AI startup dashboard"

==================================================
2. MOBILE DESIGN RULES
==================================================

Design for approximately:

320px – 480px screen width

Primary target:
390px × 844px

The application must work properly on:
- Android phones
- iPhones
- Mobile Chrome
- Mobile Safari

Use mobile-first Tailwind breakpoints.

DO NOT assume landscape orientation.

Touch targets:
- Minimum approximately 44px
- Primary buttons should be large
- Camera/upload actions should be easy to tap
- Avoid small icon-only controls unless universally recognizable

Use:
- sticky bottom navigation
- sticky action buttons where appropriate
- bottom sheets instead of desktop modal dialogs
- full-screen image viewers
- swipeable image galleries
- horizontal scrolling chips where appropriate

Avoid:
- hover-dependent interactions
- complex dropdown menus
- desktop tables
- multi-column layouts on the primary mobile screens

==================================================
3. APPLICATION STRUCTURE
==================================================

Create these major screens:

1. Login
2. Mobile Dashboard
3. New Inspection
4. Product Capture
5. Product Category
6. Image Quality Check
7. Evidence Extraction
8. Evidence Review
9. Applicable Legal Metrology Requirements
10. Compliance Result
11. Detailed Inspection Report
12. Inspection Repository
13. Product History
14. Rules
15. Profile / Settings

Primary flow:

LOGIN
 ↓
DASHBOARD
 ↓
NEW INSPECTION
 ↓
CAPTURE PRODUCT
 ↓
IMAGE QUALITY CHECK
 ↓
EXTRACT EVIDENCE
 ↓
REVIEW EVIDENCE
 ↓
DETERMINE APPLICABLE REQUIREMENTS
 ↓
RULE VERIFICATION
 ↓
COMPLIANCE RESULT
 ↓
INSPECTOR REVIEW
 ↓
INSPECTION REPORT
 ↓
SAVE INSPECTION


==================================================
4. MOBILE APP SHELL
==================================================

Create a mobile application shell.

Top header:
- Nometra logo/name
- Current page title
- Optional notification/status icon
- Inspector profile avatar

Bottom navigation:

Home
Inspections
Products
Reports
Profile

Use Lucide icons.

The "New Inspection" action should be visually prominent.

On the Dashboard, use a floating/prominent:
"+ New Inspection"

button.

Do NOT use a desktop sidebar on mobile.

On secondary pages:
- back arrow
- page title
- optional action

Use safe-area spacing for modern mobile devices.

==================================================
5. LOGIN SCREEN
==================================================

Create a professional login screen.

Elements:

Nometra logo

"Legal Metrology Inspection Assistant"

Fields:
- Inspector ID
- Password

Button:
"Sign In"

Secondary:
"Use demo account"

Small footer:
"Authorized inspection personnel"

Do not make this look like a consumer social app.

==================================================
6. MOBILE DASHBOARD
==================================================

The dashboard should immediately help the inspector start an inspection.

Header:

Good morning, Inspector

"Ready for your next inspection?"

Primary CTA:

+ Start New Inspection

Show compact statistics:

Total Inspections
128

Compliant
91

Non-Compliant
24

Verification Required
13

Do NOT make these huge desktop cards.

Use compact 2-column mobile cards.

Below:

"Recent Inspections"

Each inspection should show:

Product name
Category
Date
Status

Example:

Amul Taaza Milk
Food & Grocery
Today, 10:42 AM
COMPLIANT

Another:

Imported Cosmetic
Personal Care
Yesterday
VERIFICATION REQUIRED

Use clear status badges.

==================================================
7. NEW INSPECTION
==================================================

This is one of the most important screens.

Title:

"New Inspection"

Show:

Inspection ID
Auto-generated

Product capture section:

"Capture the packaged commodity"

Large primary button:

📷 Scan Product

Secondary:

Upload Images

Explain:

"Capture multiple sides of the package when required."

Show capture checklist:

Front ✓
Back +
Left +
Right +
Bottom +

Important:

Do NOT assume that a declaration missing from one photograph is actually missing from the package.

For example:

MRP not visible in front image
→ request back/side image
→ inspect complete package evidence

This concept should be visually obvious.

==================================================
8. PRODUCT CAPTURE SCREEN
==================================================

Build a camera-oriented mobile UI.

The screen should feel like an actual inspection camera.

Show:
- camera preview area
- capture button
- flash toggle
- gallery/upload option
- image count
- side being captured

Example:

CAPTURE FRONT

[ camera preview ]

"Align the package inside the frame"

Bottom:
Retake
Capture

After capture:

Front ✓

Then:

"Capture Back"

"Capture Side"

etc.

Support multiple images.

Do NOT create a fake camera implementation that requires actual backend camera processing.

For frontend MVP:
Use browser camera APIs where appropriate.
Provide a fallback file upload.

==================================================
9. IMAGE QUALITY CHECK
==================================================

Before analysis, show a quality assessment.

Title:

"Image Quality"

Show checks:

Resolution        ✓ Good
Orientation       ✓ Good
Package detected  ✓
Text visibility   ✓ Good
Blur              ✓ Low
Lighting          ✓ Good

If quality is poor:

"Image quality insufficient"

"Some declarations may not be reliably verified."

Buttons:

Retake Image
Continue Anyway

Important philosophy:

The system must not silently convert poor evidence into a confident violation.

==================================================
10. PRODUCT CATEGORY
==================================================

Create a simple mobile category selector.

Title:

"Product Category"

Categories:

Food & Grocery
Personal Care
Household
Garments & Textiles
Stationery
Consumer Goods
Agricultural
Other

Show subcategory when applicable.

Supporting text:

"Category determines which Legal Metrology requirements apply."

Make selection extremely easy on mobile.

Use selectable cards/list rows rather than a complicated dropdown.

==================================================
11. AI ANALYSIS SCREEN
==================================================

Do NOT call it:

"AI Magic"

Do NOT make it look like a chatbot.

Use professional terminology.

Title:

"Analyzing Package Evidence"

Show progress timeline:

✓ Images received
✓ Image quality verified
✓ Text extracted
✓ Declarations identified
● Determining applicable requirements
○ Evaluating compliance

Show:

"Extracting package evidence"

"Evaluating applicable Legal Metrology requirements"

"Linking findings to evidence"

Use subtle Framer Motion animations.

==================================================
12. EVIDENCE REVIEW
==================================================

THIS IS ONE OF THE MOST IMPORTANT SCREENS.

The user should understand:

"What did the system actually see?"

Title:

"Evidence Review"

Show the captured package image prominently.

Below/alongside it, show extracted declarations.

Example:

PRODUCT NAME
Amul Taaza

NET QUANTITY
1 L

MRP
₹68

MANUFACTURER
GCMMF

PACKED ON
08/2026

CONSUMER CARE
1800-258-3333

Each field should display:

Value
Confidence
Evidence status

Example:

MRP
₹68

High confidence
✓ Evidence found

For uncertain values:

Consumer Care
Not clearly detected

Medium confidence
⚠ Review required

When the inspector taps a declaration:

Open a mobile bottom sheet.

Show:

Value
₹68

Source
OCR + Vision

Confidence
94%

Raw evidence
"...MRP ₹68..."

Button:

"View Evidence"

When "View Evidence" is pressed:

Show the package image with the corresponding text region highlighted.

This evidence-to-value relationship is a core Nometra feature.

==================================================
13. APPLICABLE LEGAL METROLOGY REQUIREMENTS
==================================================

This screen is extremely important.

Title:

"Applicable Requirements"

Summary:

12 Requirements
9 Compliant
2 Non-Compliant
1 Verification Required

Do NOT simply show a generic checklist.

Each requirement should connect:

Requirement
→ Evidence
→ Rule
→ Evaluation
→ Result

Example:

MRP

Requirement:
Maximum Retail Price must be declared as required.

Evidence:
"MRP ₹68"

Rule evaluation:
Declaration detected and readable.

Status:
✓ COMPLIANT

Another:

Country of Origin

Requirement:
Required for applicable imported packaged commodities.

Evidence:
Not detected in available images.

Status:
⚠ VERIFICATION REQUIRED

Important:

If OCR does not find something, do NOT automatically mark it missing.

Possible states:

COMPLIANT
NON-COMPLIANT
VERIFICATION REQUIRED

==================================================
14. RULE TRACE
==================================================

Create a detailed bottom sheet/page for a requirement.

Title:

"Requirement Verification"

Show:

Requirement:
Country of Origin

Applicability:
Imported packaged commodity

Rule:
Applicable Legal Metrology requirement

Evidence:
No clear country-of-origin declaration detected in available package images.

Evaluation:
Evidence insufficient

Result:
VERIFICATION REQUIRED

Recommendation:
Capture the back/side panel where the declaration may appear.

Buttons:

Capture Additional Evidence
Mark for Review

This is much stronger than a generic "AI says FAIL" screen.

==================================================
15. ADAPTIVE INSPECTION
==================================================

This is a signature Nometra feature.

The application should be able to say:

"Additional evidence required"

Example:

MRP:
✓ Verified

Net Quantity:
✓ Verified

Manufacturer:
✓ Verified

Consumer Care:
⚠ Not visible in current images

Then:

"Capture the back panel to continue verification."

Button:

📷 Capture Back Panel

After capturing:

"New evidence received"

"Re-evaluating requirement..."

This should make the application feel like an actual inspection assistant rather than a static OCR scanner.

==================================================
16. COMPLIANCE RESULT
==================================================

Create a clear result screen.

Possible outcomes:

COMPLIANT
NON-COMPLIANT
VERIFICATION REQUIRED

Example:

NON-COMPLIANT

12 Requirements
9 Compliant
2 Non-Compliant
1 Verification Required

Show critical findings.

Example:

Missing / Non-compliant:
Consumer Care Details

Potential issue:
Declaration not detected in available evidence.

Evidence:
Back panel image

Rule:
Applicable requirement

Recommendation:
Verify declaration physically before final determination.

Important:

Use wording like:

"Potential violation"

when the evidence is not sufficient for a definitive conclusion.

The inspector must make the final determination.

==================================================
17. INSPECTOR DECISION
==================================================

Create a dedicated inspector review section.

Title:

"Inspector Review"

For every finding:

System Assessment
Potential Non-Compliance

Inspector decision:

Confirm
Reject
Modify
Request Evidence

Allow inspector notes.

Example:

Inspector Note:
"Declaration present on lower side of package."

Then:

"Final Decision"

Confirmed Non-Compliant

or

Compliant

or

Verification Required

This establishes:

AI assists.
Rules verify.
Inspector decides.

==================================================
18. EVIDENCE GRAPH / TRACEABILITY UI
==================================================

Create a visually simple traceability component.

Do NOT make it a complicated developer-style graph.

Show a vertical or horizontal mobile-friendly chain:

PACKAGE
↓
IMAGE
↓
EVIDENCE
↓
RULE
↓
EVALUATION
↓
FINDING
↓
INSPECTOR DECISION

Example:

Package
"Imported Cosmetic"

↓

Back Image

↓

Country of Origin
Not detected

↓

Applicable Requirement

↓

Evidence insufficient

↓

Verification Required

↓

Inspector Review

The purpose is to prove how the system reached a finding.

==================================================
19. INSPECTION REPORT
==================================================

Create a professional mobile report preview.

Header:

Nometra
Legal Metrology Inspection Report

Inspection ID

Product

Category

Date & Time

Inspector

Summary:

Compliant
9

Non-Compliant
2

Verification Required
1

Then:

Requirements

For every requirement:

Requirement
Evidence
Result
Rule reference

Then:

Evidence photographs

Then:

Inspector decision

Then:

Inspector remarks

Buttons:

Export PDF
Export Excel
Save Inspection

The report should look like an official inspection record, not an AI-generated summary.

==================================================
20. INSPECTION REPOSITORY
==================================================

Mobile list.

Title:

"Inspections"

Search bar:

Search product / inspection ID

Filter chips:

All
Compliant
Non-Compliant
Verification Required

Each item:

Product
Inspection ID
Date
Status

Use infinite scroll/pagination-ready architecture.

==================================================
21. PRODUCT HISTORY
==================================================

Product detail page.

Show:

Product Name
Category

Current Compliance Status

Inspection History

Declaration History

Compliance History

Inspection Images

Reports

Example:

MRP History

₹90
Aug 2026

₹85
May 2026

This allows future historical comparison of package information.

==================================================
22. RULES SCREEN
==================================================

Create a mobile-friendly Legal Metrology rules browser.

Show:

Rule ID
Requirement
Category
Version
Effective Date
Source

Example:

Rule 6
Mandatory declarations
Packaged Commodities
Version 2026.1

Allow search.

Do NOT make it look like a legal document reader.

==================================================
23. COMPLIANCE ASSISTANT
==================================================

If an assistant is included, it must NOT be a generic chatbot.

It should be contextual to the current inspection.

Example button:

"Why is this verification required?"

Then show:

Requirement:
Country of Origin

Why it applies:
The product is classified as an imported packaged commodity.

What evidence is missing:
The declaration was not clearly identified in the available package images.

What to capture:
Back/side panel.

Relevant rule:
[View Rule]

This is a contextual compliance explanation.

==================================================
24. DATA MODEL FRONTEND
==================================================

Create strong TypeScript types.

Example concepts:

Inspection
Product
PackageImage
Evidence
Declaration
Requirement
Rule
Finding
InspectorDecision
InspectionReport

Use TypeScript interfaces/types.

Example conceptual structure:

Inspection
{
  id,
  product,
  images[],
  category,
  evidence[],
  applicableRequirements[],
  findings[],
  inspectorDecision,
  status,
  createdAt
}

Evidence should contain:

{
  id,
  type,
  value,
  confidence,
  imageId,
  boundingBox,
  source
}

Finding should contain:

{
  requirementId,
  status,
  evidenceIds[],
  ruleId,
  explanation,
  recommendation,
  confidence,
  reviewRequired
}

Do not use "any" everywhere.

==================================================
25. MOCK DATA
==================================================

Build realistic mock data so the entire frontend works without a backend.

Include:

1 compliant product
1 non-compliant product
1 verification-required product
1 imported product
1 product with multiple images
1 product with conflicting declarations

Example contradiction:

Front image:
MRP ₹100

Back image:
MRP ₹120

The UI should show:

"Contradictory evidence detected"

and:

"Inspector verification required"

==================================================
26. COMPONENT ARCHITECTURE
==================================================

Use reusable components.

Suggested structure:

components/
  layout/
  navigation/
  inspection/
  camera/
  evidence/
  rules/
  compliance/
  reports/
  products/
  ui/

Examples:

MobileHeader
BottomNavigation
InspectionCard
StatusBadge
CaptureButton
ImageQualityCard
EvidenceField
EvidenceViewer
EvidenceHighlight
RequirementCard
RuleTrace
FindingCard
InspectorDecision
InspectionTimeline
ReportPreview
BottomSheet
ConfirmDialog

==================================================
27. STATE MANAGEMENT
==================================================

Keep architecture simple.

Use React state/context or a lightweight state solution.

The inspection should persist across screens.

For example:

New Inspection
→ Capture
→ Evidence
→ Rules
→ Result
→ Report

Do not lose data when navigating.

Create a central inspection state.

==================================================
28. RESPONSIVENESS
==================================================

MOBILE FIRST.

At 320–480px:
Everything must remain usable.

At tablet:
Use additional horizontal space intelligently.

At desktop:
The UI may expand, but mobile remains the priority.

Do not design desktop first and then shrink it.

==================================================
29. ACCESSIBILITY
==================================================

Use:
- proper labels
- semantic HTML
- keyboard accessibility
- sufficient contrast
- large touch targets
- visible focus states
- aria labels for icon buttons
- readable typography

==================================================
30. ANIMATIONS
==================================================

Use Framer Motion only for subtle interactions.

Good:
- page transitions
- progress animation
- evidence highlight
- bottom sheet animation
- status transition

Avoid:
- excessive bouncing
- spinning AI animations
- flashy transitions
- distracting effects

==================================================
31. IMPORTANT PRODUCT PRINCIPLE
==================================================

The application must constantly communicate this hierarchy:

1. WHAT PRODUCT IS BEING INSPECTED?
2. WHAT EVIDENCE WAS CAPTURED?
3. WHAT INFORMATION WAS EXTRACTED?
4. WHICH LEGAL METROLOGY REQUIREMENTS APPLY?
5. WHAT DOES THE RULE ENGINE DETERMINE?
6. WHAT EVIDENCE SUPPORTS THE FINDING?
7. DOES THE INSPECTOR NEED TO REVIEW IT?
8. WHAT IS THE FINAL INSPECTOR DECISION?
9. WHAT GOES INTO THE INSPECTION REPORT?

Do NOT make "AI" the center of the interface.

Make:

PRODUCT → EVIDENCE → REQUIREMENT → DECISION

the center of the interface.

==================================================
32. MOST IMPORTANT UX FLOW
==================================================

The most polished flow should be:

Dashboard
↓
Start New Inspection
↓
Capture Front
↓
Capture Back
↓
Image Quality Check
↓
Extract Evidence
↓
Evidence Review
↓
Applicable Requirements
↓
Potential Issue
↓
"Additional Evidence Required"
↓
Capture Back/Side
↓
Re-evaluate
↓
Rule Trace
↓
Inspector Review
↓
Final Decision
↓
Inspection Report

This flow should be extremely polished because it will be the primary hackathon demonstration.

==================================================
33. DEMO MODE
==================================================

Create a Demo Inspection option.

The judge should be able to experience the complete flow without needing a backend.

Demo:

"Start Demo Inspection"

Then automatically load a realistic packaged commodity dataset.

Allow the user to go through:

Capture
→ Evidence
→ Rules
→ Finding
→ Inspector Review
→ Report

Do not make the demo look fake or childish.

==================================================
34. PERFORMANCE
==================================================

Optimize for mobile devices.

Use:
- Next.js image optimization
- lazy loading
- compressed image previews
- minimal JavaScript
- avoid unnecessary dependencies
- skeleton loading states
- efficient lists

The application should feel fast on a mid-range Android phone.

==================================================
35. SECURITY / TRUST UI
==================================================

Because this is a government/regulatory application:

Show subtle trust indicators.

Example:

"Inspection evidence securely stored"

"Final determination by authorized inspector"

Do not make exaggerated security claims.

==================================================
36. FINAL IMPLEMENTATION REQUIREMENT
==================================================

Build the frontend as a REAL working Next.js TypeScript application.

Do not only generate static HTML mockups.

Create:

- routing
- reusable components
- TypeScript types
- mock data
- working navigation
- working inspection state
- working image upload
- camera/file input fallback
- evidence review interactions
- rule trace interactions
- status transitions
- inspector decision flow
- report preview
- responsive mobile UI

Every major button should perform a meaningful frontend action.

Use mock backend data where APIs do not yet exist.

Clearly isolate mock services so they can later be replaced with FastAPI APIs.

==================================================
37. DO NOT BUILD
==================================================

Do NOT build:

- generic AI chatbot homepage
- generic admin dashboard
- desktop-first layout
- blockchain
- cryptocurrency
- social features
- marketplace
- unnecessary analytics
- complex ML training UI
- AI prompt interface
- generic "AI Score: 94%"
- autonomous legal decision-making
- fake government API integration
- fake OCR accuracy claims
- fake physical font-size measurements

The application should never imply:

"AI has legally declared this product non-compliant."

Instead use:

"Potential non-compliance detected"

"Evidence required"

"Inspector review required"

"Final determination by inspector"

==================================================
38. VISUAL PRIORITY
==================================================

If screen space is limited, prioritize:

1. Product image
2. Evidence
3. Requirement
4. Finding
5. Inspector action

Deprioritize:

- analytics
- charts
- decorative elements
- secondary metadata

The field inspector should be able to operate the core inspection flow with one hand.

==================================================
39. FINAL DESIGN TEST
==================================================

Before considering the UI complete, test every screen at:

390 × 844

Ask:

"Can a Legal Metrology inspector standing in a shop use this comfortably with one hand?"

If not, simplify the UI.

The final result should feel like:

"Professional mobile inspection software"

not:

"AI-generated dashboard."

Build the application with production-quality TypeScript and clean component architecture.