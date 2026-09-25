import {
  ChevronRight,
  ShieldCheck,
  Clock3,
  Hash,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import MobileShell from '../components/MobileShell';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';

const API_BASE_URL = '/api';

type HistoricalRuleResult = {
  rule_id?: string;
  field?: string;
  status?: 'PASS' | 'FAIL' | 'NOT_APPLICABLE';
  legal_reference?: string;
  source?: string;
  implementation_scope?: string;
  implementation_status?: string;
  evidence?: {
    field?: string;
    value?: string | null;
    source?: string;
    verified_by_ocr?: boolean;
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
      exemption_reason?: string | null;
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
};

type HistoricalInspection = {
  id: number;
  timestamp?: string;
  created_at?: string;

  overall_status?:
    | 'COMPLIANT'
    | 'NON_COMPLIANT'
    | 'VERIFICATION_REQUIRED';

  status?:
    | 'COMPLIANT'
    | 'NON_COMPLIANT'
    | 'VERIFICATION_REQUIRED';

  passed?: number;
  failed?: number;

  evidence_hash?: string | null;
  evidence_timestamp?: string | null;

  extracted_data?: {
    product_name?: {
      value?: string | null;
      source?: string;
      verified_by_ocr?: boolean;
    } | string | null;

    manufacturer_name?: {
      value?: string | null;
      source?: string;
      verified_by_ocr?: boolean;
    } | string | null;

    mrp?: {
      value?: string | null;
      source?: string;
      verified_by_ocr?: boolean;
    } | string | null;

    net_quantity?: {
      value?: string | null;
      source?: string;
      verified_by_ocr?: boolean;
    } | string | null;

    [key: string]: unknown;
  };

  compliance_report?: {
    overall_status?:
      | 'COMPLIANT'
      | 'NON_COMPLIANT'
      | 'VERIFICATION_REQUIRED';

    passed?: number;
    failed?: number;
    total_rules_checked?: number;

    classification?: {
      commodity_type?: string;
      origin?: string;
      sale_type?: string;
    };

    results?: HistoricalRuleResult[];

    [key: string]: unknown;
  };
};

function formatDateTime(value?: string) {
  if (!value) {
    return 'Date unavailable';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(value?: string) {
  if (!value) {
    return 'Date unavailable';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function normalizeStatus(
  inspection: HistoricalInspection
) {
  return (
    inspection.overall_status ??
    inspection.status ??
    inspection.compliance_report
      ?.overall_status ??
    'VERIFICATION_REQUIRED'
  );
}

function getExtractedValue(
  value:
    | {
        value?: string | null;
        source?: string;
        verified_by_ocr?: boolean;
      }
    | string
    | null
    | undefined
) {
  if (typeof value === 'string') {
    return value;
  }

  return value?.value ?? null;
}

function getProductName(
  inspection: HistoricalInspection
) {
  const productName = getExtractedValue(
    inspection.extracted_data?.product_name
  );

  if (productName) {
    return productName;
  }

  const manufacturerName =
    getExtractedValue(
      inspection.extracted_data
        ?.manufacturer_name
    );

  if (manufacturerName) {
    return manufacturerName;
  }

  return 'Inspected Product';
}

function shortHash(
  hash?: string | null
) {
  if (!hash) {
    return 'Not recorded';
  }

  if (hash.length <= 24) {
    return hash;
  }

  return `${hash.slice(
    0,
    12
  )}…${hash.slice(-12)}`;
}

function humanize(value?: string) {
  if (!value) {
    return 'Not specified';
  }

 return value
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (char) =>
    char.toUpperCase()
  );
}

function RuleStatusIcon({
  status,
}: {
  status?: HistoricalRuleResult['status'];
}) {
  if (status === 'PASS') {
    return (
      <CheckCircle2
        size={16}
        className="text-emerald-600"
      />
    );
  }

  if (status === 'FAIL') {
    return (
      <AlertTriangle
        size={16}
        className="text-red-600"
      />
    );
  }

  return (
    <ChevronRight
      size={15}
      className="text-slate-300"
    />
  );
}

export default function ProductHistoryScreen() {
  const {
    navigate,
    currentInspection,
    historicalInspectionId,
    historicalInspection,
    setHistoricalInspection,
  } = useApp();

  const [loading, setLoading] =
    useState(
      historicalInspection === null &&
        historicalInspectionId !== null
    );

  const [error, setError] =
    useState('');

  useEffect(() => {
    if (!historicalInspectionId) {
      return;
    }

    if (historicalInspection) {
      return;
    }

    let cancelled = false;

    const loadInspection =
      async () => {
        setLoading(true);
        setError('');

        try {
          const response =
            await fetch(
              `${API_BASE_URL}/inspections/${historicalInspectionId}`
            );

          if (!response.ok) {
            throw new Error(
              `Backend returned ${response.status}`
            );
          }

          const data: HistoricalInspection =
            await response.json();

          if (!cancelled) {
            setHistoricalInspection(
              data as any
            );
          }
        } catch (err) {
          console.error(
            'Failed to load historical inspection:',
            err
          );

          if (!cancelled) {
            setError(
              'Could not load this historical inspection.'
            );
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };

    loadInspection();

    return () => {
      cancelled = true;
    };
  }, [
    historicalInspectionId,
    historicalInspection,
    setHistoricalInspection,
  ]);

  const inspection =
    historicalInspection as HistoricalInspection | null;

  const product =
    currentInspection?.product;

  const status = inspection
    ? normalizeStatus(inspection)
    : 'VERIFICATION_REQUIRED';

  const report =
    inspection?.compliance_report;

  const classification =
    report?.classification;

  const results =
    report?.results ?? [];

  const passed =
    typeof inspection?.passed ===
    'number'
      ? inspection.passed
      : report?.passed ?? 0;

  const failed =
    typeof inspection?.failed ===
    'number'
      ? inspection.failed
      : report?.failed ?? 0;

  const totalChecked =
    report?.total_rules_checked ??
    results.filter(
      (result) =>
        result.status !==
        'NOT_APPLICABLE'
    ).length;

  const inspectionDate =
    inspection?.timestamp ??
    inspection?.created_at;

  const productName = inspection
    ? getProductName(inspection)
    : product?.name ??
      'Historical Inspection';

  const productBrand =
    product?.brand ??
    getExtractedValue(
      inspection?.extracted_data
        ?.manufacturer_name
    );

  const displayCategory =
    product?.category ??
    humanize(
      classification?.commodity_type
    );

  const currentStatusClass =
    status === 'COMPLIANT'
      ? 'bg-emerald-50 border-emerald-200'
      : status === 'NON_COMPLIANT'
      ? 'bg-red-50 border-red-200'
      : 'bg-amber-50 border-amber-200';

  const currentStatusTextClass =
    status === 'COMPLIANT'
      ? 'text-emerald-800'
      : status === 'NON_COMPLIANT'
      ? 'text-red-800'
      : 'text-amber-800';

  const currentStatusDateClass =
    status === 'COMPLIANT'
      ? 'text-emerald-600'
      : status === 'NON_COMPLIANT'
      ? 'text-red-600'
      : 'text-amber-600';

  const resultSummary =
    useMemo(() => {
      return {
        passed,
        failed,
        notApplicable:
          results.filter(
            (result) =>
              result.status ===
              'NOT_APPLICABLE'
          ).length,
      };
    }, [
      passed,
      failed,
      results,
    ]);

  if (
    !historicalInspectionId &&
    !currentInspection
  ) {
    return (
      <MobileShell
        title="Product History"
        backScreen="dashboard"
      >
        <div className="px-4 py-12 text-center">
          <p className="text-slate-400 text-sm">
            No inspection selected
          </p>

          <button
            onClick={() =>
              navigate('dashboard')
            }
            className="mt-3 text-blue-700 text-sm font-medium"
          >
            Go to Dashboard
          </button>
        </div>
      </MobileShell>
    );
  }

  if (loading) {
    return (
      <MobileShell
        title="Product History"
        backScreen="inspections"
      >
        <div className="px-4 pb-6 pt-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
            <div className="h-5 bg-slate-100 rounded w-2/3" />
            <div className="h-3 bg-slate-100 rounded w-1/2 mt-2" />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 mt-4 animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-1/3" />
            <div className="h-12 bg-slate-100 rounded mt-3" />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 mt-4 animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-1/3" />
            <div className="h-4 bg-slate-100 rounded w-full mt-4" />
            <div className="h-4 bg-slate-100 rounded w-5/6 mt-3" />
            <div className="h-4 bg-slate-100 rounded w-4/6 mt-3" />
          </div>
        </div>
      </MobileShell>
    );
  }

  if (error || !inspection) {
    return (
      <MobileShell
        title="Product History"
        backScreen="inspections"
      >
        <div className="px-4 py-12 text-center">
          <div className="mx-auto w-11 h-11 rounded-full bg-red-50 flex items-center justify-center">
            <AlertTriangle
              size={20}
              className="text-red-600"
            />
          </div>

          <p className="text-slate-900 text-sm font-medium mt-3">
            {error ||
              'Historical inspection not found'}
          </p>

          <button
            onClick={() =>
              navigate('inspections')
            }
            className="mt-3 text-blue-700 text-sm font-medium"
          >
            Back to Inspections
          </button>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell
      title="Product History"
      backScreen={
        historicalInspectionId
          ? 'inspections'
          : 'compliance-result'
      }
    >
      <div className="px-4 pb-6 pt-4">

        {/* Product header */}

        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display font-bold text-slate-900">
                {productName}
              </p>

              <p className="text-sm text-slate-500">
                {productBrand ||
                  'Product details unavailable'}
                {' · '}
                {displayCategory}
              </p>

              {classification?.origin && (
                <span className="inline-block mt-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                  {humanize(
                    classification.origin
                  )}
                </span>
              )}
            </div>

            <span className="text-xs font-mono text-slate-400 shrink-0">
              #{inspection.id}
            </span>
          </div>
        </div>

        {/* Current status */}

        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Inspection Status
          </p>

          <div
            className={`${currentStatusClass} border rounded-xl px-4 py-3.5 flex items-center justify-between`}
          >
            <div>
              <p
                className={`font-display font-semibold ${currentStatusTextClass}`}
              >
                Inspection #{inspection.id}
              </p>

              <p
                className={`text-xs ${currentStatusDateClass} mt-0.5`}
              >
                {formatDateTime(
                  inspectionDate
                )}
              </p>
            </div>

            <StatusBadge
              status={status}
              size="sm"
            />
          </div>
        </div>

        {/* Classification */}

        {classification && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Package Classification
            </p>

            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                    Commodity
                  </p>

                  <p className="text-xs font-medium text-slate-800 mt-1">
                    {humanize(
                      classification.commodity_type
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                    Origin
                  </p>

                  <p className="text-xs font-medium text-slate-800 mt-1">
                    {humanize(
                      classification.origin
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                    Sale Type
                  </p>

                  <p className="text-xs font-medium text-slate-800 mt-1">
                    {humanize(
                      classification.sale_type
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inspection summary */}

        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Inspection Summary
          </p>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-3 divide-x divide-slate-100">
              <div className="px-3 py-3 text-center">
                <p className="text-lg font-display font-bold text-slate-900">
                  {totalChecked}
                </p>

                <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                  Checked
                </p>
              </div>

              <div className="px-3 py-3 text-center">
                <p className="text-lg font-display font-bold text-emerald-600">
                  {resultSummary.passed}
                </p>

                <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                  Passed
                </p>
              </div>

              <div className="px-3 py-3 text-center">
                <p className="text-lg font-display font-bold text-red-600">
                  {resultSummary.failed}
                </p>

                <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                  Failed
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Rule results */}

        {results.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Rules Checked
            </p>

            <div className="flex flex-col gap-2">
              {results.map(
                (result, index) => (
                  <div
                    key={
                      result.rule_id ||
                      `${result.field}-${index}`
                    }
                    className="bg-white border border-slate-200 rounded-xl px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="mt-0.5">
                          <RuleStatusIcon
                            status={
                              result.status
                            }
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">
                            {humanize(
                              result.field
                            )}
                          </p>

                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {result.rule_id ||
                              'Rule ID unavailable'}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-semibold shrink-0 ${
                          result.status ===
                          'PASS'
                            ? 'text-emerald-600'
                            : result.status ===
                              'FAIL'
                            ? 'text-red-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {result.status ||
                          'UNKNOWN'}
                      </span>
                    </div>

                    {result.evidence && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                          Evidence
                        </p>

                        <p className="text-xs text-slate-700 mt-1 break-words">
                          {result.evidence
                            .value ||
                            'No extracted value'}
                        </p>

                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                          {result.evidence
                            .source && (
                            <span className="text-[10px] text-slate-400">
                              Source:{' '}
                              {
                                result
                                  .evidence
                                  .source
                              }
                            </span>
                          )}

                          {typeof result
                            .evidence
                            .verified_by_ocr ===
                            'boolean' && (
                            <span
                              className={`text-[10px] ${
                                result
                                  .evidence
                                  .verified_by_ocr
                                  ? 'text-emerald-600'
                                  : 'text-slate-400'
                              }`}
                            >
                              OCR:{' '}
                              {result
                                .evidence
                                .verified_by_ocr
                                ? 'Verified'
                                : 'Not verified'}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {result.legal_reference && (
                      <p className="text-[10px] text-slate-400 mt-2">
                        Legal reference:{' '}
                        {
                          result.legal_reference
                        }
                      </p>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Evidence integrity */}

        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Evidence Integrity
          </p>

          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5">

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <ShieldCheck
                  size={17}
                  className="text-blue-700"
                />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  Evidence record sealed
                </p>

                <p className="text-xs text-slate-500 mt-0.5">
                  SHA-256 hash recorded with
                  the inspection evidence.
                </p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100">

              <div className="flex items-start gap-2">
                <Hash
                  size={14}
                  className="text-slate-400 mt-0.5 shrink-0"
                />

                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                    SHA-256 Evidence Hash
                  </p>

                  <p className="text-[10px] font-mono text-slate-600 mt-1 break-all">
                    {inspection.evidence_hash ||
                      'Not recorded'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 mt-3">
                <Clock3
                  size={14}
                  className="text-slate-400 mt-0.5 shrink-0"
                />

                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                    Evidence Timestamp
                  </p>

                  <p className="text-xs text-slate-700 mt-1">
                    {formatDateTime(
                      inspection.evidence_timestamp ||
                        undefined
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Audit note */}

        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Audit Record
          </p>

          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
            This view displays the recorded
            result of inspection #
            {inspection.id}. Evidence,
            classification and rule decisions
            are loaded from the inspection
            database rather than mock history
            data.
          </p>
        </div>

        <button
          onClick={() =>
            navigate('requirements')
          }
          className="w-full h-12 bg-blue-700 text-white font-display font-semibold rounded-xl hover:bg-blue-800 transition-all"
        >
          View Current Findings →
        </button>
      </div>
    </MobileShell>
  );
}