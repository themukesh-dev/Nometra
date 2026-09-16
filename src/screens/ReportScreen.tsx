import {
  Download,
  FileText,
  Save,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import MobileShell from '../components/MobileShell';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import type { ComplianceStatus } from '../types';

function FindingIcon({ status }: { status: ComplianceStatus }) {
  if (status === 'COMPLIANT') {
    return (
      <CheckCircle2
        size={14}
        className="text-emerald-500 shrink-0"
      />
    );
  }

  if (status === 'NON_COMPLIANT') {
    return (
      <XCircle
        size={14}
        className="text-red-500 shrink-0"
      />
    );
  }

  return (
    <AlertTriangle
      size={14}
      className="text-amber-500 shrink-0"
    />
  );
}

export default function ReportScreen() {
  const {
    navigate,
    currentInspection,
    backendResult,
    inspectorNotes,
    inspectorDecisions,
    remarksText,
  } = useApp();

  const inspection = currentInspection;

  if (!inspection) return null;

  const findings = inspection.findings;
  const reqs = inspection.applicableRequirements;
  const evidence = inspection.evidence;

  const getReqName = (reqId: string) =>
    reqs.find((r) => r.id === reqId)?.name ?? reqId;

  const getEvidenceForFinding = (evidenceIds: string[]) =>
    evidence.filter((e) => evidenceIds.includes(e.id));

  const date = new Date(inspection.createdAt);

  const dateStr = date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const timeStr = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  /*
   * Export PDF
   *
   * The backend exposes:
   * GET /reports/<inspection_id>/pdf
   *
   * IMPORTANT:
   * Use the inspection ID returned by the backend,
   * not the locally generated frontend inspection ID.
   */
  const handleExportPDF = () => {
    const inspectionId = backendResult?.inspection_id;

    if (!inspectionId) {
      alert('No backend inspection ID found.');
      return;
    }

    const pdfUrl =
      `http://127.0.0.1:5000/reports/${inspectionId}/pdf`;

    window.open(pdfUrl, '_blank');
  };

  return (
    <MobileShell
      title="Inspection Report"
      backScreen="inspector-review"
    >
      <div className="px-4 pb-6 pt-4">

        {/* Report header */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-4">

          <div className="bg-blue-700 px-5 py-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-white font-display font-bold text-lg">
                N
              </span>
            </div>

            <div>
              <p className="text-white font-display font-bold text-base">
                Nometra
              </p>

              <p className="text-white/80 text-xs">
                Legal Metrology Inspection Report
              </p>
            </div>
          </div>

          <div className="px-5 py-4 grid grid-cols-2 gap-y-3 gap-x-4 border-b border-slate-100">
            {[
              {
                label: 'Inspection ID',
                value:
                  backendResult?.inspection_id ??
                  inspection.id,
              },
              {
                label: 'Date',
                value: dateStr,
              },
              {
                label: 'Time',
                value: timeStr,
              },
              {
                label: 'Inspector',
                value: inspection.inspectorName,
              },
              {
                label: 'Inspector ID',
                value: inspection.inspectorId,
              },
              {
                label: 'Location',
                value:
                  inspection.location ??
                  'Not specified',
              },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {item.label}
                </p>

                <p className="text-sm font-medium text-slate-900 mt-0.5 font-mono">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Product
            </p>

            <p className="font-display font-bold text-slate-900">
              {inspection.product.name}
            </p>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500">
                {inspection.product.brand}
              </span>

              <span className="text-slate-300">
                ·
              </span>

              <span className="text-xs text-slate-500">
                {inspection.product.category}
              </span>

              {inspection.product.isImported && (
                <>
                  <span className="text-slate-300">
                    ·
                  </span>

                  <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                    Imported
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white border border-slate-200 rounded-2xl px-4 py-4 mb-4">

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Summary
          </p>

          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-600">
              Overall Status
            </span>

            <StatusBadge
              status={inspection.overallStatus}
            />
          </div>

          <div className="flex gap-2">

            <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl py-2.5 text-center">
              <p className="font-display font-bold text-lg text-emerald-700">
                {
                  findings.filter(
                    (f) =>
                      f.status === 'COMPLIANT'
                  ).length
                }
              </p>

              <p className="text-[10px] text-emerald-700 font-semibold uppercase">
                Compliant
              </p>
            </div>

            <div className="flex-1 bg-red-50 border border-red-200 rounded-xl py-2.5 text-center">
              <p className="font-display font-bold text-lg text-red-700">
                {
                  findings.filter(
                    (f) =>
                      f.status ===
                      'NON_COMPLIANT'
                  ).length
                }
              </p>

              <p className="text-[10px] text-red-700 font-semibold uppercase">
                Non-Compliant
              </p>
            </div>

            <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl py-2.5 text-center">
              <p className="font-display font-bold text-lg text-amber-700">
                {
                  findings.filter(
                    (f) =>
                      f.status ===
                      'VERIFICATION_REQUIRED'
                  ).length
                }
              </p>

              <p className="text-[10px] text-amber-700 font-semibold uppercase">
                Review
              </p>
            </div>

          </div>
        </div>

        {/* Requirements detail */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-4">

          <div className="px-4 py-3 border-b border-slate-100">
            <p className="font-display font-semibold text-sm text-slate-900">
              Requirements
            </p>
          </div>

          {findings.map((finding, i) => {

            const ev = getEvidenceForFinding(
              finding.evidenceIds
            );

            const decision =
              inspectorDecisions[finding.id];

            const note =
              inspectorNotes[finding.id];

            return (
              <div
                key={finding.id}
                className={`px-4 py-3.5 ${
                  i < findings.length - 1
                    ? 'border-b border-slate-100'
                    : ''
                }`}
              >
                <div className="flex items-start gap-2 mb-1.5">

                  <FindingIcon
                    status={finding.status}
                  />

                  <div className="flex-1 min-w-0">

                    <div className="flex items-start justify-between gap-2">

                      <p className="font-medium text-sm text-slate-900">
                        {getReqName(
                          finding.requirementId
                        )}
                      </p>

                      <StatusBadge
                        status={finding.status}
                        size="sm"
                      />

                    </div>

                    {ev.map((e) => (
                      <p
                        key={e.id}
                        className="text-xs text-slate-500 mt-0.5"
                      >
                        {e.label}:{' '}
                        <span className="text-slate-700">
                          {e.value}
                        </span>
                      </p>
                    ))}

                    {decision && (
                      <p className="text-xs font-medium text-blue-700 mt-1">
                        Inspector:{' '}
                        {decision.replace(
                          '_',
                          ' '
                        )}
                      </p>
                    )}

                    {note && (
                      <p className="text-xs text-slate-600 mt-0.5 italic">
                        "{note}"
                      </p>
                    )}

                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Inspector remarks */}
        {remarksText && (
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3.5 mb-4">

            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Inspector Remarks
            </p>

            <p className="text-sm text-slate-800">
              {remarksText}
            </p>

          </div>
        )}

        {/* Trust indicator */}
        <div className="flex items-center gap-2 justify-center mb-5">

          <Shield
            size={12}
            className="text-slate-400"
          />

          <p className="text-[11px] text-slate-400">
            Final determination by authorized inspector ·
            Inspection evidence securely stored
          </p>

        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">

          {/* EXPORT PDF */}
          <button
            onClick={handleExportPDF}
            className="w-full h-12 bg-blue-700 text-white font-display font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-800 transition-all"
          >
            <Download size={16} />
            Export PDF
          </button>

          {/* EXPORT EXCEL */}
          <button
            className="w-full h-12 border border-slate-200 bg-white text-slate-700 font-display font-medium text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
          >
            <FileText size={16} />
            Export Excel
          </button>

          {/* SAVE & CLOSE */}
          <button
            onClick={() =>
              navigate('dashboard')
            }
            className="w-full h-12 bg-slate-900 text-white font-display font-semibold text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
          >
            <Save size={16} />
            Save &amp; Close Inspection
          </button>

        </div>

      </div>
    </MobileShell>
  );
}