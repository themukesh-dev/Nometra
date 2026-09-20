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
  Evidence,
  Finding,
  Requirement,
  ComplianceStatus,
} from '../types';

/*
 * ==================================================
 * BACKEND SCAN RESULT
 * ==================================================
 */

export interface BackendScanResult {
  inspection_id: number;

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
    }>;
  };
}

/*
 * ==================================================
 * HISTORICAL BACKEND INSPECTION
 * ==================================================
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

/*
 * ==================================================
 * CONTEXT TYPE
 * ==================================================
 */

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

  /*
   * -----------------------------------------------
   * SINGLE IMAGE
   * -----------------------------------------------
   */

  capturedImage: File | null;

  setCapturedImage: (
    file: File | null
  ) => void;

  /*
   * -----------------------------------------------
   * BACKEND
   * -----------------------------------------------
   */

  backendResult: BackendScanResult | null;

  setBackendResult: (
    result: BackendScanResult | null
  ) => void;

  applyBackendResultToInspection: (
    result: BackendScanResult
  ) => void;

  /*
   * -----------------------------------------------
   * HISTORICAL INSPECTION
   * -----------------------------------------------
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

  /*
   * -----------------------------------------------
   * ANALYSIS
   * -----------------------------------------------
   */

  analysisStep: number;

  setAnalysisStep: (
    step: number
  ) => void;

  /*
   * -----------------------------------------------
   * FINDING SELECTION
   * -----------------------------------------------
   */

  selectedFindingId: string | null;

  setSelectedFindingId: (
    id: string | null
  ) => void;

  /*
   * -----------------------------------------------
   * INSPECTOR NOTES
   * -----------------------------------------------
   */

  inspectorNotes: Record<string, string>;

  setInspectorNote: (
    findingId: string,
    note: string
  ) => void;

  /*
   * -----------------------------------------------
   * INSPECTOR DECISIONS
   * -----------------------------------------------
   */

  inspectorDecisions: Record<
    string,
    'CONFIRM'
    | 'REJECT'
    | 'MODIFY'
    | 'REQUEST_EVIDENCE'
  >;

  setInspectorDecision: (
    findingId: string,
    decision:
      | 'CONFIRM'
      | 'REJECT'
      | 'MODIFY'
      | 'REQUEST_EVIDENCE'
  ) => void;

  /*
   * -----------------------------------------------
   * REMARKS
   * -----------------------------------------------
   */

  remarksText: string;

  setRemarksText: (
    text: string
  ) => void;
}

/*
 * ==================================================
 * CREATE CONTEXT
 * ==================================================
 */

const AppContext =
  createContext<AppContextValue | null>(null);

/*
 * ==================================================
 * LOCAL INSPECTION ID GENERATOR
 * ==================================================
 */

let inspectionCounter = 148;

function generateId(): string {
  return `INS-2026-00${inspectionCounter++}`;
}

/*
 * ==================================================
 * CALCULATE OVERALL STATUS
 * ==================================================
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

/*
 * ==================================================
 * APP PROVIDER
 * ==================================================
 */

export function AppProvider({
  children,
}: {
  children: ReactNode;
}) {
  /*
   * -----------------------------------------------
   * NAVIGATION
   * -----------------------------------------------
   */

  const [screen, setScreen] =
    useState<Screen>('login');

  /*
   * -----------------------------------------------
   * LOGIN
   * -----------------------------------------------
   */

  const [isLoggedIn, setIsLoggedIn] =
    useState(false);

  /*
   * -----------------------------------------------
   * CURRENT INSPECTION
   * -----------------------------------------------
   */

  const [
    currentInspection,
    setCurrentInspection,
  ] =
    useState<Inspection | null>(null);

  /*
   * -----------------------------------------------
   * SINGLE CAPTURED IMAGE
   * -----------------------------------------------
   */

  const [
    capturedImage,
    setCapturedImage,
  ] =
    useState<File | null>(null);

  /*
   * -----------------------------------------------
   * BACKEND RESULT
   * -----------------------------------------------
   */

  const [
    backendResult,
    setBackendResult,
  ] =
    useState<BackendScanResult | null>(
      null
    );

  /*
   * -----------------------------------------------
   * HISTORICAL INSPECTION
   * -----------------------------------------------
   */

  const [
    historicalInspectionId,
    setHistoricalInspectionId,
  ] =
    useState<number | null>(null);

  const [
    historicalInspection,
    setHistoricalInspection,
  ] =
    useState<
      BackendHistoricalInspection | null
    >(null);

  /*
   * -----------------------------------------------
   * ANALYSIS
   * -----------------------------------------------
   */

  const [
    analysisStep,
    setAnalysisStep,
  ] = useState(0);

  /*
   * -----------------------------------------------
   * FINDING
   * -----------------------------------------------
   */

  const [
    selectedFindingId,
    setSelectedFindingId,
  ] =
    useState<string | null>(null);

  /*
   * -----------------------------------------------
   * INSPECTOR NOTES
   * -----------------------------------------------
   */

  const [
    inspectorNotes,
    setInspectorNotes,
  ] =
    useState<Record<string, string>>({});

  /*
   * -----------------------------------------------
   * INSPECTOR DECISIONS
   * -----------------------------------------------
   */

  const [
    inspectorDecisions,
    setInspectorDecisions,
  ] =
    useState<
      Record<
        string,
        | 'CONFIRM'
        | 'REJECT'
        | 'MODIFY'
        | 'REQUEST_EVIDENCE'
      >
    >({});

  /*
   * -----------------------------------------------
   * REMARKS
   * -----------------------------------------------
   */

  const [
    remarksText,
    setRemarksText,
  ] = useState('');

  /*
   * ==================================================
   * NAVIGATION
   * ==================================================
   */

  const navigate =
    useCallback((s: Screen) => {
      setScreen(s);
    }, []);

  /*
   * ==================================================
   * LOGIN
   * ==================================================
   */

  const login = () => {
    setIsLoggedIn(true);

    setScreen('dashboard');
  };

  /*
   * ==================================================
   * LOGOUT
   * ==================================================
   */

  const logout = () => {
    setIsLoggedIn(false);

    setScreen('login');

    setCurrentInspection(null);

    setCapturedImage(null);

    setBackendResult(null);

    setHistoricalInspectionId(null);

    setHistoricalInspection(null);

    setAnalysisStep(0);

    setSelectedFindingId(null);

    setInspectorNotes({});

    setInspectorDecisions({});

    setRemarksText('');
  };

  /*
   * ==================================================
   * START NEW INSPECTION
   * ==================================================
   */

  const startNewInspection = () => {
    /*
     * Clear historical inspection.
     */

    setHistoricalInspectionId(null);

    setHistoricalInspection(null);

    /*
     * Create new inspection.
     *
     * isImported and saleType are retained internally
     * for compatibility with the existing Inspection type
     * and historical UI. They are no longer selected by
     * the inspector or sent as manual classification.
     */

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

    setCurrentInspection(
      inspection
    );

    /*
     * Reset single image.
     */

    setCapturedImage(null);

    /*
     * Reset backend.
     */

    setBackendResult(null);

    /*
     * Reset analysis.
     */

    setAnalysisStep(0);

    /*
     * Reset review state.
     */

    setSelectedFindingId(null);

    setInspectorNotes({});

    setInspectorDecisions({});

    setRemarksText('');

    /*
     * Go to new inspection.
     */

    setScreen('new-inspection');
  };

  /*
   * ==================================================
   * APPLY BACKEND RESULT
   * ==================================================
   */

  const applyBackendResultToInspection =
    useCallback(
      (result: BackendScanResult) => {
        /*
         * -------------------------------------------
         * EXTRACTED DATA
         * -------------------------------------------
         */

        const extracted =
          result.extracted_data ?? {};

        /*
         * -------------------------------------------
         * BACKEND FINDINGS
         * -------------------------------------------
         */

        const backendFindings =
          result.compliance_report
            ?.results ?? [];

        /*
         * -------------------------------------------
         * REQUIREMENT MAPPING
         * -------------------------------------------
         */

        const fieldToRequirement:
          Record<string, Requirement> = {
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
                'Country of origin/manufacture must be declared when applicable.',

              applicability:
                'Determined from package evidence and classification',
            },
          };

        /*
         * -------------------------------------------
         * ARRAYS
         * -------------------------------------------
         */

        const applicableRequirements:
          Requirement[] = [];

        const evidence:
          Evidence[] = [];

        const findings:
          Finding[] = [];

        /*
         * -------------------------------------------
         * PROCESS BACKEND RESULTS
         * -------------------------------------------
         */

        backendFindings.forEach(
          (item, index) => {
            const requirement =
              fieldToRequirement[
                item.field
              ];

            /*
             * Ignore fields that do not
             * have frontend requirement mapping.
             */

            if (!requirement) {
              return;
            }

            /*
             * Add requirement only once.
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

            /*
             * Evidence ID.
             */

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
             * ---------------------------------------
             * SINGLE IMAGE EVIDENCE
             * ---------------------------------------
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

              imageId:
                'INSPECTION-IMAGE',

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
             * ---------------------------------------
             * FINDING STATUS
             * ---------------------------------------
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

            /*
             * ---------------------------------------
             * FINDING
             * ---------------------------------------
             */

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
         * ==================================================
         * PRODUCT EXTRACTION
         * ==================================================
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
         * -------------------------------------------
         * PRODUCT NAME EVIDENCE
         * -------------------------------------------
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

            imageId:
              'INSPECTION-IMAGE',

            source:
              'VISION',

            status:
              'FOUND',

            rawEvidence:
              'Product name extracted from package image.',
          });
        }

        /*
         * -------------------------------------------
         * MANUFACTURER EVIDENCE
         * -------------------------------------------
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

            imageId:
              'INSPECTION-IMAGE',

            source:
              'VISION',

            status:
              'FOUND',

            rawEvidence:
              'Manufacturer details extracted from package image.',
          });
        }

        /*
         * ==================================================
         * UPDATE CURRENT INSPECTION
         * ==================================================
         */

        setCurrentInspection(
          (
            previousInspection
          ): Inspection | null => {
            /*
             * No active inspection.
             */

            if (!previousInspection) {
              console.warn(
                'Backend result received but no active inspection exists.'
              );

              return null;
            }

            /*
             * Calculate status from the
             * actual findings.
             */

            const overallStatus =
              calculateOverallStatus(
                findings
              );

            /*
             * Explicitly construct an Inspection.
             */

            const updatedInspection:
              Inspection = {
              ...previousInspection,

              product: {
                ...previousInspection.product,

                name:
                  productName ||
                  previousInspection.product
                    .name,

                brand:
                  manufacturerName ||
                  previousInspection.product
                    .brand,

                /*
                 * Backend classification is evidence-derived.
                 * Keep legacy fields synchronized when the
                 * backend provides classification information.
                 */

                isImported:
                  result.compliance_report
                    ?.classification
                    ?.origin ===
                  'imported'
                    ? true
                    : result.compliance_report
                        ?.classification
                        ?.origin ===
                      'domestic'
                    ? false
                    : previousInspection
                        .product.isImported,

                saleType:
                  result.compliance_report
                    ?.classification
                    ?.sale_type ===
                  'wholesale'
                    ? 'wholesale'
                    : result.compliance_report
                        ?.classification
                        ?.sale_type ===
                      'institutional_or_industrial'
                    ? 'institutional_or_industrial'
                    : 'retail',
              },

              evidence,

              applicableRequirements,

              findings,

              overallStatus,
            };

            return updatedInspection;
          }
        );
      },
      []
    );

  /*
   * ==================================================
   * INSPECTOR NOTE
   * ==================================================
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
   * ==================================================
   * INSPECTOR DECISION
   * ==================================================
   */

  const setInspectorDecision = (
    findingId: string,

    decision:
      | 'CONFIRM'
      | 'REJECT'
      | 'MODIFY'
      | 'REQUEST_EVIDENCE'
  ) => {
    /*
     * Save decision.
     */

    setInspectorDecisions(
      (previous) => ({
        ...previous,

        [findingId]:
          decision,
      })
    );

    /*
     * Update inspection.
     */

    setCurrentInspection(
      (
        previousInspection
      ): Inspection | null => {
        if (!previousInspection) {
          return null;
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

        /*
         * CONFIRM
         */

        if (
          decision === 'CONFIRM'
        ) {
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
        }

        /*
         * REJECT
         */

        else if (
          decision === 'REJECT'
        ) {
          updatedStatus =
            'COMPLIANT';
        }

        /*
         * MODIFY / REQUEST EVIDENCE
         */

        else {
          updatedStatus =
            'VERIFICATION_REQUIRED';
        }

        /*
         * Update finding.
         */

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

        /*
         * Recalculate overall status.
         */

        const updatedOverallStatus =
          calculateOverallStatus(
            updatedFindings
          );

        /*
         * Explicit Inspection return.
         */

        const updatedInspection:
          Inspection = {
          ...previousInspection,

          findings:
            updatedFindings,

          overallStatus:
            updatedOverallStatus,
        };

        return updatedInspection;
      }
    );
  };

  /*
   * ==================================================
   * PROVIDER
   * ==================================================
   */

  return (
    <AppContext.Provider
      value={{
        /*
         * Navigation
         */

        screen,

        navigate,

        /*
         * Authentication
         */

        isLoggedIn,

        login,

        logout,

        /*
         * Inspection
         */

        currentInspection,

        setCurrentInspection,

        startNewInspection,

        /*
         * SINGLE IMAGE
         */

        capturedImage,

        setCapturedImage,

        /*
         * Backend
         */

        backendResult,

        setBackendResult,

        applyBackendResultToInspection,

        /*
         * Historical inspection
         */

        historicalInspectionId,

        setHistoricalInspectionId,

        historicalInspection,

        setHistoricalInspection,

        /*
         * Analysis
         */

        analysisStep,

        setAnalysisStep,

        /*
         * Findings
         */

        selectedFindingId,

        setSelectedFindingId,

        /*
         * Inspector notes
         */

        inspectorNotes,

        setInspectorNote,

        /*
         * Inspector decisions
         */

        inspectorDecisions,

        setInspectorDecision,

        /*
         * Remarks
         */

        remarksText,

        setRemarksText,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

/*
 * ==================================================
 * useApp HOOK
 * ==================================================
 */

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