import { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ChevronRight, Camera } from 'lucide-react';
import MobileShell from '../components/MobileShell';
import BottomSheet from '../components/BottomSheet';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import type { Finding, ComplianceStatus } from '../types';

function FindingIcon({ status }: { status: ComplianceStatus }) {
  if (status === 'COMPLIANT') return <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />;
  if (status === 'NON_COMPLIANT') return <XCircle size={18} className="text-red-500 shrink-0" />;
  return <AlertTriangle size={18} className="text-amber-500 shrink-0" />;
}

export default function RequirementsScreen() {
  const { navigate, currentInspection } = useApp();
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);

  const findings = currentInspection?.findings ?? [];
  const reqs = currentInspection?.applicableRequirements ?? [];

  const compliant = findings.filter(f => f.status === 'COMPLIANT').length;
  const nonCompliant = findings.filter(f => f.status === 'NON_COMPLIANT').length;
  const verificationReq = findings.filter(f => f.status === 'VERIFICATION_REQUIRED').length;

  const getReqForFinding = (finding: Finding) =>
    reqs.find(r => r.id === finding.requirementId);

  const getEvidenceForFinding = (finding: Finding) =>
    currentInspection?.evidence.filter(e => finding.evidenceIds.includes(e.id)) ?? [];

  return (
    <MobileShell title="Applicable Requirements" backScreen="evidence-review">
      <div className="px-4 pb-6 pt-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl py-3 text-center">
            <p className="font-display font-bold text-xl text-emerald-700">{compliant}</p>
            <p className="text-[10px] text-emerald-700 font-semibold uppercase">Compliant</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl py-3 text-center">
            <p className="font-display font-bold text-xl text-red-700">{nonCompliant}</p>
            <p className="text-[10px] text-red-700 font-semibold uppercase">Non-Compliant</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl py-3 text-center">
            <p className="font-display font-bold text-xl text-amber-700">{verificationReq}</p>
            <p className="text-[10px] text-amber-700 font-semibold uppercase">Review Reqd.</p>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-3 font-semibold uppercase tracking-wider">
          {findings.length} Requirements
        </p>

        {/* Findings list */}
        <div className="flex flex-col gap-2 mb-5">
          {findings.map(finding => {
            const req = getReqForFinding(finding);
            return (
              <button
                key={finding.id}
                onClick={() => setSelectedFinding(finding)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex items-start gap-3 text-left hover:border-slate-300 transition-colors"
              >
                <FindingIcon status={finding.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display font-semibold text-sm text-slate-900">{req?.name ?? finding.requirementId}</p>
                    <StatusBadge status={finding.status} size="sm" />
                  </div>
                  {finding.reviewRequired && (
                    <p className="text-xs text-amber-600 mt-1 font-medium">Inspector review required</p>
                  )}
                </div>
                <ChevronRight size={14} className="text-slate-300 shrink-0 mt-0.5" />
              </button>
            );
          })}
        </div>

        <button
          onClick={() => navigate('compliance-result')}
          className="w-full h-12 bg-blue-700 text-white font-display font-semibold rounded-xl hover:bg-blue-800 active:scale-[0.98] transition-all"
        >
          View Compliance Result →
        </button>
      </div>

      {/* Finding detail bottom sheet */}
      <BottomSheet
        isOpen={!!selectedFinding}
        onClose={() => setSelectedFinding(null)}
        title="Requirement Verification"
      >
        {selectedFinding && (() => {
          const req = getReqForFinding(selectedFinding);
          const evidence = getEvidenceForFinding(selectedFinding);
          return (
            <div className="px-4 py-4">
              <div className="flex items-center gap-2 mb-4">
                <FindingIcon status={selectedFinding.status} />
                <div>
                  <p className="font-display font-semibold text-slate-900">{req?.name}</p>
                  <StatusBadge status={selectedFinding.status} size="sm" />
                </div>
              </div>

              <div className="flex flex-col gap-3 mb-4">
                <div className="bg-slate-50 rounded-xl px-3 py-3">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Requirement</p>
                  <p className="text-sm text-slate-800">{req?.description}</p>
                </div>
                <div className="bg-slate-50 rounded-xl px-3 py-3">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Applicability</p>
                  <p className="text-sm text-slate-800">{req?.applicability}</p>
                </div>
                <div className="bg-slate-50 rounded-xl px-3 py-3">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Evidence</p>
                  {evidence.map(ev => (
                    <p key={ev.id} className="text-sm text-slate-800">
                      <span className="text-slate-500">{ev.label}:</span>{' '}
                      <span className={ev.status === 'NOT_FOUND' ? 'text-red-600' : 'text-slate-900'}>
                        {ev.value}
                      </span>
                    </p>
                  ))}
                </div>
                <div className="bg-slate-50 rounded-xl px-3 py-3">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Evaluation</p>
                  <p className="text-sm text-slate-800">{selectedFinding.explanation}</p>
                </div>
              </div>

              {selectedFinding.recommendation && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-3 mb-4">
                  <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider mb-1">Recommendation</p>
                  <p className="text-sm text-blue-800">{selectedFinding.recommendation}</p>
                </div>
              )}

              <div className="flex gap-2">
                {selectedFinding.reviewRequired && (
                  <button
                    onClick={() => { setSelectedFinding(null); navigate('capture'); }}
                    className="flex-1 h-11 bg-blue-700 text-white font-display font-semibold rounded-xl text-sm flex items-center justify-center gap-1.5"
                  >
                    <Camera size={15} />
                    Capture Evidence
                  </button>
                )}
                <button
                  onClick={() => setSelectedFinding(null)}
                  className="flex-1 h-11 border border-slate-200 bg-white text-slate-700 font-display font-medium rounded-xl text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          );
        })()}
      </BottomSheet>
    </MobileShell>
  );
}
