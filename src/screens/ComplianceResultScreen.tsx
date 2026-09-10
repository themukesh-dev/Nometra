import { CheckCircle2, XCircle, AlertTriangle, Camera } from 'lucide-react';
import MobileShell from '../components/MobileShell';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';

export default function ComplianceResultScreen() {
  const { navigate, currentInspection } = useApp();

  const findings = currentInspection?.findings ?? [];
  const overallStatus = currentInspection?.overallStatus ?? 'VERIFICATION_REQUIRED';

  const criticalFindings = findings.filter(f =>
    f.status === 'NON_COMPLIANT' || (f.status === 'VERIFICATION_REQUIRED' && f.reviewRequired)
  );

  const reqs = currentInspection?.applicableRequirements ?? [];
  const evidence = currentInspection?.evidence ?? [];

  const getReqName = (requirementId: string) =>
    reqs.find(r => r.id === requirementId)?.name ?? requirementId;

  const getEvidenceValue = (evidenceIds: string[]) =>
    evidence.filter(e => evidenceIds.includes(e.id)).map(e => `${e.label}: ${e.value}`).join(' · ');

  const statusConfig = {
    COMPLIANT: {
      bg: 'bg-emerald-600',
      icon: <CheckCircle2 size={36} className="text-white" />,
      title: 'Compliant',
      subtitle: 'All mandatory requirements satisfied.',
    },
    NON_COMPLIANT: {
      bg: 'bg-red-600',
      icon: <XCircle size={36} className="text-white" />,
      title: 'Non-Compliant',
      subtitle: 'Potential violations detected. Inspector review required.',
    },
    VERIFICATION_REQUIRED: {
      bg: 'bg-amber-500',
      icon: <AlertTriangle size={36} className="text-white" />,
      title: 'Verification Required',
      subtitle: 'Insufficient evidence for final determination.',
    },
  };

  const cfg = statusConfig[overallStatus];

  return (
    <MobileShell title="Compliance Result" backScreen="requirements">
      <div className="pb-6">
        {/* Status header */}
        <div className={`${cfg.bg} px-4 pt-6 pb-8`}>
          <div className="flex flex-col items-center text-center">
            {cfg.icon}
            <h2 className="font-display font-bold text-2xl text-white mt-2">{cfg.title}</h2>
            <p className="text-white/80 text-sm mt-1">{cfg.subtitle}</p>
          </div>

          {/* Stats bar */}
          <div className="flex gap-2 mt-5">
            {[
              { label: 'Compliant', count: findings.filter(f => f.status === 'COMPLIANT').length, color: 'bg-white/20 text-white' },
              { label: 'Non-Compliant', count: findings.filter(f => f.status === 'NON_COMPLIANT').length, color: 'bg-white/20 text-white' },
              { label: 'Review', count: findings.filter(f => f.status === 'VERIFICATION_REQUIRED').length, color: 'bg-white/20 text-white' },
            ].map(s => (
              <div key={s.label} className={`flex-1 rounded-xl py-2.5 text-center ${s.color}`}>
                <p className="font-display font-bold text-xl">{s.count}</p>
                <p className="text-[10px] font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 pt-4">
          {/* Critical findings */}
          {criticalFindings.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Findings Requiring Attention
              </p>
              <div className="flex flex-col gap-3">
                {criticalFindings.map(finding => (
                  <div
                    key={finding.id}
                    className={`rounded-xl border px-4 py-3.5 ${
                      finding.status === 'NON_COMPLIANT'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-amber-50 border-amber-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="font-display font-semibold text-sm text-slate-900">
                        {getReqName(finding.requirementId)}
                      </p>
                      <StatusBadge status={finding.status} size="sm" />
                    </div>
                    <p className="text-xs text-slate-600 mb-1.5">{finding.explanation}</p>
                    {getEvidenceValue(finding.evidenceIds) && (
                      <p className="text-xs text-slate-500 font-medium">Evidence: {getEvidenceValue(finding.evidenceIds)}</p>
                    )}
                    {finding.recommendation && (
                      <p className="text-xs text-blue-700 mt-1.5 font-medium">{finding.recommendation}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Important caveat */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-5">
            <p className="text-slate-700 text-sm font-medium">Final determination by inspector</p>
            <p className="text-slate-500 text-xs mt-0.5">
              This is a system assessment based on available evidence. The inspector must review findings and make the final compliance determination.
            </p>
          </div>

          {/* Adaptive inspection prompt */}
          {findings.some(f => f.status === 'VERIFICATION_REQUIRED') && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3.5 mb-5">
              <p className="text-blue-800 font-semibold text-sm mb-1">Additional evidence required</p>
              <p className="text-blue-700 text-xs mb-3">
                Some requirements could not be verified from the available images. Capturing additional panels may resolve these findings.
              </p>
              <button
                onClick={() => navigate('capture')}
                className="flex items-center gap-1.5 h-9 bg-blue-700 text-white text-sm font-semibold rounded-lg px-4"
              >
                <Camera size={14} />
                Capture Additional Evidence
              </button>
            </div>
          )}

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
