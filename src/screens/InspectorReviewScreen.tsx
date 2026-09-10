import { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Edit3, RotateCcw, Camera } from 'lucide-react';
import MobileShell from '../components/MobileShell';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import type { ComplianceStatus } from '../types';

type Decision = 'CONFIRM' | 'REJECT' | 'MODIFY' | 'REQUEST_EVIDENCE';

const DECISION_OPTIONS: { value: Decision; label: string; icon: typeof CheckCircle2; color: string }[] = [
  { value: 'CONFIRM', label: 'Confirm', icon: CheckCircle2, color: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
  { value: 'REJECT', label: 'Reject', icon: XCircle, color: 'border-red-300 bg-red-50 text-red-700' },
  { value: 'MODIFY', label: 'Modify', icon: Edit3, color: 'border-blue-300 bg-blue-50 text-blue-700' },
  { value: 'REQUEST_EVIDENCE', label: 'Request Evidence', icon: Camera, color: 'border-amber-300 bg-amber-50 text-amber-700' },
];

function FindingIcon({ status }: { status: ComplianceStatus }) {
  if (status === 'COMPLIANT') return <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />;
  if (status === 'NON_COMPLIANT') return <XCircle size={16} className="text-red-500 shrink-0" />;
  return <AlertTriangle size={16} className="text-amber-500 shrink-0" />;
}

export default function InspectorReviewScreen() {
  const { navigate, currentInspection, inspectorNotes, setInspectorNote, inspectorDecisions, setInspectorDecision, remarksText, setRemarksText } = useApp();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const findings = currentInspection?.findings ?? [];
  const reviewFindings = findings.filter(f => f.status !== 'COMPLIANT');
  const reqs = currentInspection?.applicableRequirements ?? [];

  const getReqName = (reqId: string) => reqs.find(r => r.id === reqId)?.name ?? reqId;

  const allReviewed = reviewFindings.every(f => inspectorDecisions[f.id]);

  return (
    <MobileShell title="Inspector Review" backScreen="compliance-result">
      <div className="px-4 pb-6 pt-4">
        <p className="text-sm text-slate-500 mb-4">
          Review system assessments and make the final determination for each finding. Your decision overrides the system assessment.
        </p>

        {/* Review findings */}
        {reviewFindings.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Findings to Review</p>
            <div className="flex flex-col gap-3">
              {reviewFindings.map(finding => {
                const isExpanded = expandedId === finding.id;
                const decision = inspectorDecisions[finding.id];
                const note = inspectorNotes[finding.id] ?? '';

                return (
                  <div key={finding.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      className="w-full px-4 py-3.5 flex items-start gap-2.5 text-left"
                      onClick={() => setExpandedId(isExpanded ? null : finding.id)}
                    >
                      <FindingIcon status={finding.status} />
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-semibold text-sm text-slate-900">
                          {getReqName(finding.requirementId)}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-500">System: </span>
                          <StatusBadge status={finding.status} size="sm" />
                        </div>
                        {decision && (
                          <p className="text-xs font-semibold text-blue-700 mt-1">
                            ✓ Your decision: {decision.replace('_', ' ')}
                          </p>
                        )}
                      </div>
                      <RotateCcw size={14} className={`text-slate-300 shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {isExpanded && (
                      <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
                        <p className="text-xs text-slate-600 mb-3">{finding.explanation}</p>

                        {/* Decision buttons */}
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Your Decision</p>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {DECISION_OPTIONS.map(opt => {
                            const Icon = opt.icon;
                            const isSelected = decision === opt.value;
                            return (
                              <button
                                key={opt.value}
                                onClick={() => setInspectorDecision(finding.id, opt.value)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                                  isSelected ? opt.color + ' ring-2 ring-offset-1 ring-current' : 'border-slate-200 bg-white text-slate-600'
                                }`}
                              >
                                <Icon size={13} />
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Notes */}
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Inspector Note</p>
                        <textarea
                          value={note}
                          onChange={e => setInspectorNote(finding.id, e.target.value)}
                          placeholder="Add observation or notes…"
                          className="w-full text-sm text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-2 min-h-[64px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All compliant notice */}
        {reviewFindings.length === 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-4 mb-5 text-center">
            <CheckCircle2 size={24} className="text-emerald-600 mx-auto mb-1" />
            <p className="font-display font-semibold text-emerald-800">All requirements compliant</p>
            <p className="text-xs text-emerald-700 mt-0.5">No additional inspector review required.</p>
          </div>
        )}

        {/* Final remarks */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Inspector Remarks</p>
          <textarea
            value={remarksText}
            onChange={e => setRemarksText(e.target.value)}
            placeholder="Overall inspection remarks, observations, or instructions to the establishment…"
            className="w-full text-sm text-slate-800 bg-white border border-slate-200 rounded-xl px-4 py-3 min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* Final decision summary */}
        {allReviewed && reviewFindings.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3.5 mb-5">
            <p className="font-display font-semibold text-blue-900 text-sm">Review complete</p>
            <p className="text-blue-700 text-xs mt-0.5">All findings reviewed. Proceed to generate the official inspection report.</p>
          </div>
        )}

        <button
          onClick={() => navigate('report')}
          className="w-full h-12 bg-blue-700 text-white font-display font-semibold rounded-xl hover:bg-blue-800 active:scale-[0.98] transition-all"
        >
          Generate Inspection Report →
        </button>
      </div>
    </MobileShell>
  );
}
