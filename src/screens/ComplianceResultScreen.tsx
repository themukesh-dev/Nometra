import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MinusCircle,
  Camera,
} from 'lucide-react';
import MobileShell from '../components/MobileShell';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import type { ComplianceStatus } from '../types';

type BackendEvidence = {
  field?: string;
  value?: string | null;
  source?: string;
  verified_by_ocr?: boolean;
};

type BackendTrace = {
  classification?: {
    commodity_type?: string;
    origin?: string;
    sale_type?: string;
  };

  applicability?: {
    applicable?: boolean;
    exempted?: boolean;
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

type BackendRuleResult = {
  rule_id: string;
  status: string;
  description: string;
  reason: string;
  field?: string;
  extracted_value?: string | null;
  legal_reference?: string;
  verified_by_ocr?: boolean;
  evidence?: BackendEvidence;
  trace?: BackendTrace;
};

export default function ComplianceResultScreen() {
  const { navigate, backendResult } = useApp();

  /*
   * Real backend result
   */
  const report = backendResult?.compliance_report;

  const results =
    (report?.results ?? []) as BackendRuleResult[];

  /*
   * Convert backend statuses into the statuses
   * expected by the existing UI.
   *
   * PASS             -> COMPLIANT
   * FAIL             -> NON_COMPLIANT
   * NOT_APPLICABLE   -> COMPLIANT for UI purposes
   *
   * NOT_APPLICABLE is kept separately as
   * originalStatus so the Rule Evaluation section
   * can still display "NOT_APPLICABLE".
   */
  const findings = results.map((result) => {
    const status: ComplianceStatus =
      result.status === 'PASS'
        ? 'COMPLIANT'
        : result.status === 'FAIL'
        ? 'NON_COMPLIANT'
        : 'COMPLIANT';

    return {
      id: result.rule_id,
      requirementId: result.rule_id,
      status,
      explanation: result.reason,
      evidenceIds: [] as string[],
      recommendation:
        result.status === 'FAIL'
          ? 'Review this declaration on the package and verify it manually.'
          : undefined,
      reviewRequired: false,
      description: result.description,
      legalReference: result.legal_reference,
      field: result.field,
      extractedValue: result.extracted_value,
      verifiedByOcr: result.verified_by_ocr,
      originalStatus: result.status,
    };
  });

  /*
   * Overall status comes directly from the backend.
   */
  const overallStatus: ComplianceStatus =
    report?.overall_status === 'COMPLIANT'
      ? 'COMPLIANT'
      : report?.overall_status === 'NON_COMPLIANT'
      ? 'NON_COMPLIANT'
      : 'VERIFICATION_REQUIRED';

  /*
   * Only actual NON_COMPLIANT findings should
   * appear under "Findings Requiring Attention".
   *
   * NOT_APPLICABLE is deliberately excluded.
   */
  const criticalFindings = findings.filter(
    (finding) => finding.status === 'NON_COMPLIANT'
  );

  const statusConfig = {
    COMPLIANT: {
      bg: 'bg-emerald-600',
      icon: <CheckCircle2 size={36} className="text-white" />,
      title: 'Compliant',
      subtitle: 'All checked mandatory requirements satisfied.',
    },

    NON_COMPLIANT: {
      bg: 'bg-red-600',
      icon: <XCircle size={36} className="text-white" />,
      title: 'Non-Compliant',
      subtitle:
        'Potential violations detected. Inspector review required.',
    },

    VERIFICATION_REQUIRED: {
      bg: 'bg-amber-500',
      icon: <AlertTriangle size={36} className="text-white" />,
      title: 'Verification Required',
      subtitle:
        'Insufficient evidence for final determination.',
    },
  };

  const cfg = statusConfig[overallStatus];

  /*
   * If the user somehow reaches this screen
   * without a backend result.
   */
  if (!backendResult || !report) {
    return (
      <MobileShell
        title="Compliance Result"
        backScreen="analysis"
      >
        <div className="px-4 pt-8">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
            <AlertTriangle
              size={32}
              className="text-amber-600 mx-auto mb-3"
            />

            <h2 className="font-display font-bold text-slate-900">
              No Analysis Result
            </h2>

            <p className="text-sm text-slate-600 mt-2">
              No backend compliance result is available yet.
            </p>
          </div>

          <button
            onClick={() => navigate('capture')}
            className="w-full h-12 bg-blue-700 text-white font-display font-semibold rounded-xl mt-5"
          >
            Start Inspection
          </button>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell
      title="Compliance Result"
      backScreen="analysis"
    >
      <div className="pb-6">

        {/* Status header */}
        <div className={`${cfg.bg} px-4 pt-6 pb-8`}>
          <div className="flex flex-col items-center text-center">
            {cfg.icon}

            <h2 className="font-display font-bold text-2xl text-white mt-2">
              {cfg.title}
            </h2>

            <p className="text-white/80 text-sm mt-1">
              {cfg.subtitle}
            </p>
          </div>

          {/* Stats bar */}
          <div className="flex gap-2 mt-5">
            {[
              {
                label: 'Passed',
                count: report.passed,
              },
              {
                label: 'Failed',
                count: report.failed,
              },
              {
                label: 'N/A',
                count: results.filter(
                  (r) => r.status === 'NOT_APPLICABLE'
                ).length,
              },
            ].map((s) => (
              <div
                key={s.label}
                className="flex-1 rounded-xl py-2.5 text-center bg-white/20 text-white"
              >
                <p className="font-display font-bold text-xl">
                  {s.count}
                </p>

                <p className="text-[10px] font-medium">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 pt-4">

          {/* Inspection information */}
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Inspection ID
              </span>

              <span className="text-sm font-semibold text-slate-900">
                #{backendResult.inspection_id}
              </span>
            </div>

            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-slate-500">
                Applicable rules checked
              </span>

              <span className="text-sm font-semibold text-slate-900">
                {report.total_rules_checked}
              </span>
            </div>
          </div>

          {/* Critical findings */}
          {criticalFindings.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Findings Requiring Attention
              </p>

              <div className="flex flex-col gap-3">
                {criticalFindings.map((finding) => (
                  <div
                    key={finding.id}
                    className="rounded-xl border px-4 py-3.5 bg-red-50 border-red-200"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="font-display font-semibold text-sm text-slate-900">
                        {finding.description}
                      </p>

                      <StatusBadge
                        status={finding.status}
                        size="sm"
                      />
                    </div>

                    <p className="text-xs text-slate-600 mb-1.5">
                      {finding.explanation}
                    </p>

                    {finding.extractedValue && (
                      <p className="text-xs text-slate-500 font-medium">
                        Extracted value:{' '}
                        {finding.extractedValue}
                      </p>
                    )}

                    <p className="text-[11px] text-slate-400 mt-2">
                      {finding.legalReference}
                    </p>

                    {finding.recommendation && (
                      <p className="text-xs text-blue-700 mt-1.5 font-medium">
                        {finding.recommendation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All rule results */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Rule Evaluation
            </p>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {results.map((result, index) => {
                const isPass = result.status === 'PASS';
                const isFail = result.status === 'FAIL';
                const isNotApplicable =
                  result.status === 'NOT_APPLICABLE';

                const evidence = result.evidence;
                const trace = result.trace;

                return (
                  <div
                    key={result.rule_id}
                    className={`px-4 py-3.5 ${
                      index < results.length - 1
                        ? 'border-b border-slate-100'
                        : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">

                      {/* Rule status icon */}
                      <div className="shrink-0 mt-0.5">
                        {isPass ? (
                          <CheckCircle2
                            size={18}
                            className="text-emerald-500"
                          />
                        ) : isFail ? (
                          <XCircle
                            size={18}
                            className="text-red-500"
                          />
                        ) : isNotApplicable ? (
                          <MinusCircle
                            size={18}
                            className="text-slate-400"
                          />
                        ) : (
                          <AlertTriangle
                            size={18}
                            className="text-amber-500"
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">

                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {result.description}
                          </p>

                          <span
                            className={`text-[10px] font-bold shrink-0 ${
                              isPass
                                ? 'text-emerald-600'
                                : isFail
                                ? 'text-red-600'
                                : isNotApplicable
                                ? 'text-slate-500'
                                : 'text-amber-600'
                            }`}
                          >
                            {result.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 mt-1">
                          {result.reason}
                        </p>

                        {result.extracted_value && (
                          <p className="text-xs text-slate-600 mt-1.5">
                            <span className="font-medium">
                              Value:
                            </span>{' '}
                            {result.extracted_value}
                          </p>
                        )}

                        <p className="text-[10px] text-slate-400 mt-1.5">
                          {result.legal_reference}
                        </p>

                        {result.verified_by_ocr && (
                          <p className="text-[10px] text-blue-600 mt-1 font-medium">
                            ✓ Verified against OCR
                          </p>
                        )}

                        {/* Evidence */}
                        {evidence && (
                          <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                              Evidence
                            </p>

                            <div className="space-y-1">
                              {evidence.value && (
                                <p className="text-xs text-slate-700">
                                  <span className="font-medium">
                                    Extracted:
                                  </span>{' '}
                                  {evidence.value}
                                </p>
                              )}

                              {evidence.source && (
                                <p className="text-[10px] text-slate-500">
                                  <span className="font-medium">
                                    Source:
                                  </span>{' '}
                                  {evidence.source}
                                </p>
                              )}

                              <p
                                className={`text-[10px] font-medium ${
                                  evidence.verified_by_ocr
                                    ? 'text-blue-600'
                                    : 'text-slate-500'
                                }`}
                              >
                                {evidence.verified_by_ocr
                                  ? '✓ OCR verification available'
                                  : 'OCR verification not available for this field'}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Decision Trace */}
                        {trace && (
                          <details className="mt-2.5">
                            <summary className="cursor-pointer text-[10px] font-semibold text-blue-700 select-none">
                              View decision trace
                            </summary>

                            <div className="mt-2 rounded-lg bg-blue-50/50 border border-blue-100 px-3 py-2.5 space-y-2">

                              {/* Classification */}
                              {trace.classification && (
                                <div>
                                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                                    Classification
                                  </p>

                                  <p className="text-[10px] text-slate-600 mt-0.5">
                                    {trace.classification.origin}
                                    {' · '}
                                    {trace.classification.sale_type}
                                    {' · '}
                                    {trace.classification.commodity_type}
                                  </p>
                                </div>
                              )}

                              {/* Applicability */}
                              {trace.applicability && (
                                <div>
                                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                                    Applicability
                                  </p>

                                  <p className="text-[10px] text-slate-600 mt-0.5">
                                    {trace.applicability.exempted
                                      ? 'Exempted'
                                      : trace.applicability.applicable
                                      ? 'Applicable'
                                      : 'Not applicable'}
                                  </p>

                                  {trace.applicability.decision && (
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      {trace.applicability.decision}
                                    </p>
                                  )}
                                </div>
                              )}

                              {/* Requirement */}
                              {trace.requirement && (
                                <div>
                                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                                    Requirement
                                  </p>

                                  <p className="text-[10px] text-slate-600 mt-0.5">
                                    {trace.requirement.required
                                      ? 'Required'
                                      : 'Not required'}
                                  </p>

                                  {trace.requirement.condition && (
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      Condition:{' '}
                                      {trace.requirement.condition}
                                      {typeof trace.requirement
                                        .condition_result ===
                                        'boolean'
                                        ? trace.requirement
                                            .condition_result
                                          ? ' → true'
                                          : ' → false'
                                        : ''}
                                    </p>
                                  )}

                                  {trace.requirement.decision && (
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                      {trace.requirement.decision}
                                    </p>
                                  )}
                                </div>
                              )}

                            </div>
                          </details>
                        )}

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Important caveat */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-5">
            <p className="text-slate-700 text-sm font-medium">
              Final determination by inspector
            </p>

            <p className="text-slate-500 text-xs mt-0.5">
              This is a system assessment based on available
              evidence. The inspector must review findings and
              make the final compliance determination.
            </p>
          </div>

          {/* Actions */}
          <button
            onClick={() => navigate('inspector-review')}
            className="w-full h-12 bg-blue-700 text-white font-display font-semibold rounded-xl hover:bg-blue-800 active:scale-[0.98] transition-all mb-3"
          >
            Inspector Review →
          </button>

          <button
            onClick={() => navigate('report')}
            className="w-full h-12 border border-slate-200 bg-white text-slate-700 font-display font-medium text-sm rounded-xl hover:bg-slate-50 transition-all"
          >
            Skip to Report
          </button>

        </div>
      </div>
    </MobileShell>
  );
}