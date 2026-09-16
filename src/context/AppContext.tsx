import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';

import type {
  Screen,
  Inspection,
  PackageSide,
  Evidence,
  Finding,
  Requirement,
  ComplianceStatus,
} from '../types';

export interface BackendScanResult {
  inspection_id: number;

  extracted_data: Record<string, any>;

  compliance_report: {
    overall_status: string;
    total_rules_checked: number;
    passed: number;
    failed: number;

    results: Array<{
      rule_id: string;
      description: string;
      legal_reference: string;
      field: string;

      status: 'PASS' | 'FAIL' | 'NOT_APPLICABLE';

      reason: string;

      extracted_value: string | null;

      verified_by_ocr: boolean;
    }>;
  };
}

interface AppContextValue {
  screen: Screen;

  navigate: (screen: Screen) => void;

  isLoggedIn: boolean;

  login: () => void;

  logout: () => void;

  currentInspection: Inspection | null;

  setCurrentInspection: (
    inspection: Inspection | null
  ) => void;

  startNewInspection: () => void;

  capturedSides: PackageSide[];

  setCapturedSides: (
    sides: PackageSide[]
  ) => void;

  capturedImage: File | null;

  setCapturedImage: (
    file: File | null
  ) => void;

  backendResult: BackendScanResult | null;

  setBackendResult: (
    result: BackendScanResult | null
  ) => void;

  applyBackendResultToInspection: (
    result: BackendScanResult
  ) => void;

  analysisStep: number;

  setAnalysisStep: (
    step: number
  ) => void;

  selectedFindingId: string | null;

  setSelectedFindingId: (
    id: string | null
  ) => void;

  inspectorNotes: Record<string, string>;

  setInspectorNote: (
    findingId: string,
    note: string
  ) => void;

  inspectorDecisions: Record<
    string,
    'CONFIRM' | 'REJECT' | 'MODIFY' | 'REQUEST_EVIDENCE'
  >;

  setInspectorDecision: (
    findingId: string,
    decision:
      | 'CONFIRM'
      | 'REJECT'
      | 'MODIFY'
      | 'REQUEST_EVIDENCE'
  ) => void;

  remarksText: string;

  setRemarksText: (
    text: string
  ) => void;
}

const AppContext =
  createContext<AppContextValue | null>(null);

let inspectionCounter = 148;

function generateId(): string {
  return `INS-2026-00${inspectionCounter++}`;
}

export function AppProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [screen, setScreen] =
    useState<Screen>('login');

  const [isLoggedIn, setIsLoggedIn] =
    useState(false);

  const [currentInspection, setCurrentInspection] =
    useState<Inspection | null>(null);

  const [capturedSides, setCapturedSides] =
    useState<PackageSide[]>([]);

  const [capturedImage, setCapturedImage] =
    useState<File | null>(null);

  const [backendResult, setBackendResult] =
    useState<BackendScanResult | null>(null);

  const [analysisStep, setAnalysisStep] =
    useState(0);

  const [selectedFindingId, setSelectedFindingId] =
    useState<string | null>(null);

  const [inspectorNotes, setInspectorNotes] =
    useState<Record<string, string>>({});

  const [inspectorDecisions, setInspectorDecisions] =
    useState<
      Record<
        string,
        'CONFIRM' | 'REJECT' | 'MODIFY' | 'REQUEST_EVIDENCE'
      >
    >({});

  const [remarksText, setRemarksText] =
    useState('');

  const navigate = (s: Screen) => {
    setScreen(s);
  };

  const login = () => {
    setIsLoggedIn(true);
    setScreen('dashboard');
  };

  const logout = () => {
    setIsLoggedIn(false);
    setScreen('login');

    /*
     * Clear any active inspection when logging out.
     */
    setCurrentInspection(null);
    setCapturedSides([]);
    setCapturedImage(null);
    setBackendResult(null);
    setAnalysisStep(0);
    setSelectedFindingId(null);
    setInspectorNotes({});
    setInspectorDecisions({});
    setRemarksText('');
  };

  /*
   * --------------------------------------------------
   * START NEW REAL INSPECTION
   * --------------------------------------------------
   *
   * NO DEMO DATA IS USED HERE.
   *
   * The inspection starts completely empty.
   */

  const startNewInspection = () => {
    const inspection: Inspection = {
      id: generateId(),

      createdAt:
        new Date().toISOString(),

      /*
       * These will be populated by the
       * authenticated inspector / application
       * workflow later.
       */
      inspectorId: '',

      inspectorName: '',

      location: '',

      /*
       * Product starts empty because the product
       * will be identified from the captured package.
       */
      product: {
        id: '',
        name: '',
        brand: '',
        category: 'Other',
        isImported: false,
        saleType: 'retail',
        previousInspections: 0,
      },

      /*
       * No fake images.
       */
      images: [],

      /*
       * No fake OCR/evidence.
       */
      evidence: [],

      /*
       * No fake requirements.
       * Backend will populate these after scanning.
       */
      applicableRequirements: [],

      /*
       * No fake findings.
       */
      findings: [],

      inspectorDecisions: [],

      overallStatus:
        'VERIFICATION_REQUIRED',

      remarks: '',
    };

    setCurrentInspection(inspection);

    setCapturedSides([]);

    setCapturedImage(null);

    setBackendResult(null);

    setAnalysisStep(0);

    setSelectedFindingId(null);

    setInspectorNotes({});

    setInspectorDecisions({});

    setRemarksText('');

    setScreen('new-inspection');
  };

  /*
   * --------------------------------------------------
   * APPLY REAL BACKEND RESULT
   * --------------------------------------------------
   *
   * Backend:
   *
   * Image
   *   ↓
   * Gemini Vision
   *   ↓
   * OCR
   *   ↓
   * Evidence Fusion
   *   ↓
   * Rule Engine
   *
   * This function converts that backend result
   * into the frontend Inspection structure.
   */

  const applyBackendResultToInspection =
    useCallback(
      (result: BackendScanResult) => {
        const extracted =
          result.extracted_data ?? {};

        const backendFindings =
          result.compliance_report?.results ?? [];

        /*
         * Backend field → frontend requirement.
         */

        const fieldToRequirement: Record<
          string,
          Requirement
        > = {
          mrp: {
            id: 'REQ-BE-001',

            ruleId: 'LM-R003',

            name:
              'Maximum Retail Price',

            description:
              'MRP inclusive of all taxes must be declared.',

            applicability:
              'All packaged commodities sold in India',
          },

          net_quantity: {
            id: 'REQ-BE-002',

            ruleId: 'LM-R002',

            name:
              'Net Quantity',

            description:
              'Net quantity must be declared in standard units.',

            applicability:
              'All packaged commodities',
          },

          consumer_care: {
            id: 'REQ-BE-003',

            ruleId: 'LM-R005',

            name:
              'Consumer Care Details',

            description:
              'Telephone number, email, or postal address for consumer grievance.',

            applicability:
              'All packaged commodities',
          },

          date_of_manufacture: {
            id: 'REQ-BE-004',

            ruleId: 'LM-R006',

            name:
              'Date of Manufacture',

            description:
              'Month and year of manufacture or packing must be declared.',

            applicability:
              'All packaged commodities',
          },

          country_of_origin: {
            id: 'REQ-BE-005',

            ruleId: 'LM-R004',

            name:
              'Country of Origin',

            description:
              'Country of origin/manufacture must be declared for imported commodities.',

            applicability:
              'Imported packaged commodities',
          },
        };

        const applicableRequirements:
          Requirement[] = [];

        const evidence:
          Evidence[] = [];

        const findings:
          Finding[] = [];

        /*
         * ------------------------------------------------
         * BACKEND COMPLIANCE RESULTS
         * ------------------------------------------------
         */

        backendFindings.forEach(
          (item, index) => {
            const requirement =
              fieldToRequirement[
                item.field
              ];

            /*
             * Ignore fields that don't have a
             * frontend requirement mapping.
             */
            if (!requirement) {
              return;
            }

            /*
             * Avoid duplicate requirements.
             */
            const requirementExists =
              applicableRequirements.some(
                (req) =>
                  req.id ===
                  requirement.id
              );

            if (!requirementExists) {
              applicableRequirements.push(
                requirement
              );
            }

            const evidenceId =
              `EV-BE-${String(
                index + 1
              ).padStart(3, '0')}`;

            /*
             * Evidence status.
             */

            let evidenceStatus:
              Evidence['status'] =
              'FOUND';

            if (
              item.status === 'FAIL' &&
              !item.extracted_value
            ) {
              evidenceStatus =
                'NOT_FOUND';
            }

            if (
              item.status ===
              'NOT_APPLICABLE'
            ) {
              evidenceStatus =
                'NOT_FOUND';
            }

            /*
             * Real extracted value from backend.
             *
             * Nothing here comes from mockData.ts.
             */

            evidence.push({
              id: evidenceId,

              type:
                item.field.toUpperCase(),

              label:
                requirement.name,

              value:
                item.extracted_value ??
                'Not detected',

              confidence:
                item.verified_by_ocr
                  ? 95
                  : 80,

              /*
               * Image linking will be connected
               * once captured image metadata is
               * stored in Inspection.images.
               */
              imageId: '',

              source:
                item.verified_by_ocr
                  ? 'OCR+VISION'
                  : 'VISION',

              status:
                evidenceStatus,

              rawEvidence:
                item.reason,
            });

            /*
             * Backend status →
             * frontend status.
             */

            let status:
              ComplianceStatus;

            if (
              item.status === 'PASS'
            ) {
              status =
                'COMPLIANT';
            } else if (
              item.status === 'FAIL'
            ) {
              status =
                'NON_COMPLIANT';
            } else {
              status =
                'VERIFICATION_REQUIRED';
            }

            findings.push({
              id:
                `FND-BE-${String(
                  index + 1
                ).padStart(3, '0')}`,

              requirementId:
                requirement.id,

              status,

              evidenceIds: [
                evidenceId,
              ],

              ruleId:
                item.rule_id,

              explanation:
                item.reason,

              recommendation:
                item.status === 'FAIL'
                  ? 'Inspect the package and verify the declaration physically.'
                  : '',

              confidence:
                item.verified_by_ocr
                  ? 95
                  : 80,

              reviewRequired:
                item.status !==
                'PASS',
            });
          }
        );

        /*
         * ------------------------------------------------
         * REAL PRODUCT EXTRACTION
         * ------------------------------------------------
         */

        const productName =
          typeof extracted.product_name ===
            'string'
            ? extracted.product_name
            : typeof extracted.name ===
              'string'
            ? extracted.name
            : '';

        const manufacturerName =
          typeof extracted.manufacturer_name ===
            'string'
            ? extracted.manufacturer_name
            : '';

        /*
         * Product name is real extracted evidence.
         */

        if (productName) {
          evidence.push({
            id:
              'EV-EXTRACT-PRODUCT',

            type:
              'PRODUCT_NAME',

            label:
              'Product Name',

            value:
              productName,

            confidence: 90,

            imageId: '',

            source:
              'VISION',

            status:
              'FOUND',

            rawEvidence:
              'Product name extracted from package image.',
          });
        }

        /*
         * Manufacturer is real extracted evidence.
         */

        if (manufacturerName) {
          evidence.push({
            id:
              'EV-EXTRACT-MANUFACTURER',

            type:
              'MANUFACTURER',

            label:
              'Manufacturer / Importer Details',

            value:
              manufacturerName,

            confidence: 90,

            imageId: '',

            source:
              'VISION',

            status:
              'FOUND',

            rawEvidence:
              'Manufacturer details extracted from package image.',
          });
        }

        /*
         * ------------------------------------------------
         * UPDATE CURRENT INSPECTION
         * ------------------------------------------------
         *
         * Functional state update prevents stale
         * React state from being used.
         */

        setCurrentInspection(
          (previousInspection) => {
            if (!previousInspection) {
              console.warn(
                'Backend result received but no active inspection exists.'
              );

              return previousInspection;
            }

            return {
              ...previousInspection,

              product: {
                ...previousInspection.product,

                /*
                 * Actual product name extracted
                 * from the scanned package.
                 */
                name:
                  productName,

                /*
                 * Until Product has a dedicated
                 * manufacturer field, retain the
                 * extracted manufacturer here.
                 */
                brand:
                  manufacturerName,
              },

              evidence,

              applicableRequirements,

              findings,

              overallStatus:
                result.compliance_report
                  .failed > 0
                  ? 'NON_COMPLIANT'
                  : 'COMPLIANT',
            };
          }
        );
      },
      []
    );

  /*
   * --------------------------------------------------
   * INSPECTOR NOTES
   * --------------------------------------------------
   */

  const setInspectorNote = (
    findingId: string,
    note: string
  ) => {
    setInspectorNotes(
      (previous) => ({
        ...previous,

        [findingId]: note,
      })
    );
  };

  /*
   * --------------------------------------------------
   * INSPECTOR DECISIONS
   * --------------------------------------------------
   */

  const setInspectorDecision = (
    findingId: string,

    decision:
      | 'CONFIRM'
      | 'REJECT'
      | 'MODIFY'
      | 'REQUEST_EVIDENCE'
  ) => {
    setInspectorDecisions(
      (previous) => ({
        ...previous,

        [findingId]: decision,
      })
    );
  };

  return (
    <AppContext.Provider
      value={{
        screen,

        navigate,

        isLoggedIn,

        login,

        logout,

        currentInspection,

        setCurrentInspection,

        startNewInspection,

        capturedSides,

        setCapturedSides,

        capturedImage,

        setCapturedImage,

        backendResult,

        setBackendResult,

        applyBackendResultToInspection,

        analysisStep,

        setAnalysisStep,

        selectedFindingId,

        setSelectedFindingId,

        inspectorNotes,

        setInspectorNote,

        inspectorDecisions,

        setInspectorDecision,

        remarksText,

        setRemarksText,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx =
    useContext(AppContext);

  if (!ctx) {
    throw new Error(
      'useApp must be used within AppProvider'
    );
  }

  return ctx;
}