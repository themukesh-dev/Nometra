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

      status:
        | 'PASS'
        | 'FAIL'
        | 'NOT_APPLICABLE';

      reason: string;

      extracted_value: string | null;

      verified_by_ocr: boolean;
    }>;
  };
}

/*
 * --------------------------------------------------
 * HISTORICAL BACKEND INSPECTION
 * --------------------------------------------------
 */

export interface BackendHistoricalInspection {
  id: number;

  timestamp?: string;

  created_at?: string;

  overall_status:
    | 'COMPLIANT'
    | 'NON_COMPLIANT'
    | 'VERIFICATION_REQUIRED';

  passed: number;

  failed: number;

  evidence_hash?: string | null;

  evidence_timestamp?: string | null;

  extracted_data: Record<string, any>;

  compliance_report: {
    overall_status: string;

    total_rules_checked: number;

    passed: number;

    failed: number;

    classification?: {
      commodity_type?: string;

      origin?: string;

      sale_type?: string;
    };

    results: Array<{
      rule_id: string;

      description: string;

      legal_reference: string;

      field: string;

      status:
        | 'PASS'
        | 'FAIL'
        | 'NOT_APPLICABLE';

      reason: string;

      extracted_value: string | null;

      verified_by_ocr: boolean;

      evidence?: {
        field: string;

        value: string | null;

        source: string;

        verified_by_ocr: boolean;

        source_side?: string | null;
      };

      trace?: {
        classification?: {
          commodity_type?: string;

          origin?: string;

          sale_type?: string;
        };

        applicability?: {
          applicable?: boolean;

          exempted?: boolean;

          exemption_reason?: string;

          decision?: string;

          decision_source?: string;
        };

        requirement?: {
          required?: boolean;

          condition?: string;

          condition_result?: boolean;

          decision?: string;

          decision_source?: string;
        };
      };
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

  /*
   * --------------------------------------------------
   * MULTI-IMAGE CAPTURE
   * --------------------------------------------------
   *
   * Stores the actual image File for every captured
   * package side.
   */

  capturedImages: Partial<
    Record<PackageSide, File>
  >;

  setCapturedImages: (
    images: Partial<
      Record<PackageSide, File>
    >
  ) => void;

  setCapturedImageForSide: (
    side: PackageSide,
    file: File | null
  ) => void;

  /*
   * Legacy single-image state.
   *
   * Kept for compatibility with existing screens.
   * It represents the most recently captured image.
   */

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

  /*
   * --------------------------------------------------
   * HISTORICAL INSPECTION STATE
   * --------------------------------------------------
   */

  historicalInspectionId: number | null;

  setHistoricalInspectionId: (
    id: number | null
  ) => void;

  historicalInspection:
    BackendHistoricalInspection | null;

  setHistoricalInspection: (
    inspection:
      | BackendHistoricalInspection
      | null
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

/*
 * --------------------------------------------------
 * RECALCULATE ACTIVE INSPECTION STATUS
 * --------------------------------------------------
 */

function calculateOverallStatus(
  findings: Finding[]
): ComplianceStatus {
  if (
    findings.some(
      (finding) =>
        finding.status === 'NON_COMPLIANT'
    )
  ) {
    return 'NON_COMPLIANT';
  }

  if (
    findings.some(
      (finding) =>
        finding.status ===
        'VERIFICATION_REQUIRED'
    )
  ) {
    return 'VERIFICATION_REQUIRED';
  }

  return 'COMPLIANT';
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

  /*
   * --------------------------------------------------
   * MULTI-IMAGE STATE
   * --------------------------------------------------
   */

  const [capturedImages, setCapturedImages] =
    useState<
      Partial<Record<PackageSide, File>>
    >({});

  /*
   * Legacy latest-image state.
   */

  const [capturedImage, setCapturedImage] =
    useState<File | null>(null);

  const [backendResult, setBackendResult] =
    useState<BackendScanResult | null>(null);

  /*
   * --------------------------------------------------
   * HISTORICAL INSPECTION STATE
   * --------------------------------------------------
   */

  const [
    historicalInspectionId,
    setHistoricalInspectionId,
  ] = useState<number | null>(null);

  const [
    historicalInspection,
    setHistoricalInspection,
  ] =
    useState<BackendHistoricalInspection | null>(
      null
    );

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

  /*
   * --------------------------------------------------
   * NAVIGATION
   * --------------------------------------------------
   *
   * IMPORTANT:
   * useCallback keeps the navigate function stable
   * between AppContext re-renders.
   *
   * AnalysisScreen depends on navigate inside its
   * analysis useEffect. Without useCallback, every
   * context update creates a new navigate function,
   * causing that effect to restart/cancel.
   */

  const navigate = useCallback((s: Screen) => {
    setScreen(s);
  }, []);

  /*
   * --------------------------------------------------
   * STORE IMAGE FOR A SPECIFIC PACKAGE SIDE
   * --------------------------------------------------
   */

  const setCapturedImageForSide = (
    side: PackageSide,
    file: File | null
  ) => {
    setCapturedImages(
      (previous) => {
        const updated = {
          ...previous,
        };

        if (file) {
          updated[side] = file;
        } else {
          delete updated[side];
        }

        return updated;
      }
    );

    /*
     * Keep legacy state synchronized with the
     * most recently captured image.
     */

    setCapturedImage(file);
  };

  const logout = () => {
    setIsLoggedIn(false);

    setScreen('login');

    /*
     * Clear active inspection.
     */

    setCurrentInspection(null);

    setCapturedSides([]);

    setCapturedImages({});

    setCapturedImage(null);

    setBackendResult(null);

    /*
     * Clear historical inspection state.
     */

    setHistoricalInspectionId(null);

    setHistoricalInspection(null);

    setAnalysisStep(0);

    setSelectedFindingId(null);

    setInspectorNotes({});

    setInspectorDecisions({});

    setRemarksText('');
  };

  const login = () => {
    setIsLoggedIn(true);

    setScreen('dashboard');
  };

  /*
   * --------------------------------------------------
   * START NEW REAL INSPECTION
   * --------------------------------------------------
   */

  const startNewInspection = () => {
    /*
     * Starting a new inspection should not retain
     * a previously selected historical inspection.
     */

    setHistoricalInspectionId(null);

    setHistoricalInspection(null);

    const inspection: Inspection = {
      id: generateId(),

      createdAt:
        new Date().toISOString(),

      inspectorId: '',

      inspectorName: '',

      location: '',

      product: {
        id: '',

        name: '',

        brand: '',

        category: 'Other',

        isImported: false,

        saleType: 'retail',

        previousInspections: 0,
      },

      images: [],

      evidence: [],

      applicableRequirements: [],

      findings: [],

      inspectorDecisions: [],

      overallStatus:
        'VERIFICATION_REQUIRED',

      remarks: '',
    };

    setCurrentInspection(inspection);

    setCapturedSides([]);

    setCapturedImages({});

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
   */

  const applyBackendResultToInspection =
    useCallback(
      (result: BackendScanResult) => {
        const extracted =
          result.extracted_data ?? {};

        const backendFindings =
          result.compliance_report?.results ?? [];

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

            if (!requirement) {
              return;
            }

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
             * Backend multi-image extraction may
             * provide source_side inside extracted_data.
             */

            const extractedField =
              extracted[item.field];

            const sourceSide =
              extractedField &&
              typeof extractedField === 'object' &&
              typeof extractedField.source_side ===
                'string'
                ? extractedField.source_side
                : '';

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

              imageId:
                sourceSide
                  ? `SIDE-${sourceSide}`
                  : '',

              source:
                item.verified_by_ocr
                  ? 'OCR+VISION'
                  : 'VISION',

              status:
                evidenceStatus,

              rawEvidence:
                item.reason,
            });

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

        if (productName) {
          const productSide =
            extracted.product_name &&
            typeof extracted.product_name ===
              'object'
              ? extracted.product_name.source_side
              : '';

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

            imageId:
              productSide
                ? `SIDE-${productSide}`
                : '',

            source:
              'VISION',

            status:
              'FOUND',

            rawEvidence:
              'Product name extracted from package image.',
          });
        }

        if (manufacturerName) {
          const manufacturerSide =
            extracted.manufacturer_name &&
            typeof extracted.manufacturer_name ===
              'object'
              ? extracted.manufacturer_name.source_side
              : '';

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

            imageId:
              manufacturerSide
                ? `SIDE-${manufacturerSide}`
                : '',

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

                name:
                  productName,

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

    setCurrentInspection(
      (previousInspection) => {
        if (!previousInspection) {
          return previousInspection;
        }

        const finding =
          previousInspection.findings.find(
            (item) =>
              item.id === findingId
          );

        if (!finding) {
          return previousInspection;
        }

        let updatedStatus:
          ComplianceStatus;

        if (decision === 'CONFIRM') {
          if (
            finding.status ===
            'VERIFICATION_REQUIRED'
          ) {
            updatedStatus =
              'COMPLIANT';
          } else {
            updatedStatus =
              finding.status;
          }
        } else if (
          decision === 'REJECT'
        ) {
          updatedStatus =
            'COMPLIANT';
        } else {
          updatedStatus =
            'VERIFICATION_REQUIRED';
        }

        const updatedFindings =
          previousInspection.findings.map(
            (item) =>
              item.id === findingId
                ? {
                    ...item,
                    status:
                      updatedStatus,
                    reviewRequired:
                      updatedStatus !==
                      'COMPLIANT',
                  }
                : item
          );

        const updatedOverallStatus =
          calculateOverallStatus(
            updatedFindings
          );

        return {
          ...previousInspection,

          findings:
            updatedFindings,

          overallStatus:
            updatedOverallStatus,
        };
      }
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

        capturedImages,

        setCapturedImages,

        setCapturedImageForSide,

        capturedImage,

        setCapturedImage,

        backendResult,

        setBackendResult,

        applyBackendResultToInspection,

        historicalInspectionId,

        setHistoricalInspectionId,

        historicalInspection,

        setHistoricalInspection,

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