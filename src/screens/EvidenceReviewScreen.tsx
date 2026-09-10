import { useState } from 'react';
import { AlertTriangle, CheckCircle2, HelpCircle, ChevronRight } from 'lucide-react';
import MobileShell from '../components/MobileShell';
import BottomSheet from '../components/BottomSheet';
import { useApp } from '../context/AppContext';
import type { Evidence } from '../types';

function ConfidencePill({ confidence }: { confidence: number }) {
  const color =
    confidence >= 85 ? 'text-emerald-700 bg-emerald-50' :
    confidence >= 55 ? 'text-amber-700 bg-amber-50' :
    'text-red-700 bg-red-50';
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded font-mono ${color}`}>
      {confidence}%
    </span>
  );
}

function EvidenceIcon({ status }: { status: Evidence['status'] }) {
  if (status === 'FOUND') return <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />;
  if (status === 'NOT_FOUND') return <AlertTriangle size={16} className="text-red-500 shrink-0" />;
  if (status === 'CONFLICTING') return <AlertTriangle size={16} className="text-amber-500 shrink-0" />;
  return <HelpCircle size={16} className="text-amber-400 shrink-0" />;
}

export default function EvidenceReviewScreen() {
  const { navigate, currentInspection } = useApp();
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);

  const evidence = currentInspection?.evidence ?? [];

  return (
    <MobileShell title="Evidence Review" backScreen="new-inspection">
      <div className="px-4 pb-6 pt-4">
        {/* Product image placeholder */}
        <div
          className="w-full rounded-xl bg-gradient-to-br from-blue-900 to-slate-700 flex flex-col items-center justify-center mb-4"
          style={{ aspectRatio: '16/7' }}
        >
          <div className="text-white/60 text-xs mb-1">FRONT PANEL</div>
          <div className="font-display font-bold text-white text-center px-6 text-sm">
            {currentInspection?.product.name ?? 'Product Image'}
          </div>
          <div className="text-white/40 text-[10px] mt-1">Tap any declaration to view source evidence</div>
        </div>

        <p className="text-sm text-slate-500 mb-4">
          Review what the system extracted from the package. Tap any field to see the source evidence.
        </p>

        {/* Evidence fields */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
          {evidence.map((ev, i) => (
            <button
              key={ev.id}
              onClick={() => setSelectedEvidence(ev)}
              className={`w-full flex items-start justify-between px-4 py-3.5 text-left hover:bg-slate-50 transition-colors ${
                i < evidence.length - 1 ? 'border-b border-slate-100' : ''
              }`}
            >
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <EvidenceIcon status={ev.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{ev.label}</p>
                  <p className={`text-sm font-medium mt-0.5 truncate ${
                    ev.status === 'NOT_FOUND' ? 'text-red-600' :
                    ev.status === 'UNCERTAIN' ? 'text-amber-700' :
                    'text-slate-900'
                  }`}>
                    {ev.value}
                  </p>
                  {ev.status === 'CONFLICTING' && (
                    <p className="text-[10px] text-amber-600 mt-0.5 font-medium">⚠ Contradictory evidence detected</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 ml-2 shrink-0">
                <ConfidencePill confidence={ev.confidence} />
                <ChevronRight size={14} className="text-slate-300" />
              </div>
            </button>
          ))}
        </div>

        {/* Summary row */}
        <div className="flex gap-2 mb-5">
          {[
            { label: 'Found', count: evidence.filter(e => e.status === 'FOUND').length, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
            { label: 'Uncertain', count: evidence.filter(e => e.status === 'UNCERTAIN').length, color: 'text-amber-700 bg-amber-50 border-amber-200' },
            { label: 'Not found', count: evidence.filter(e => e.status === 'NOT_FOUND').length, color: 'text-red-700 bg-red-50 border-red-200' },
          ].map(s => (
            <div key={s.label} className={`flex-1 text-center py-2 rounded-lg border ${s.color}`}>
              <p className="font-display font-bold text-base">{s.count}</p>
              <p className="text-[10px] font-medium uppercase">{s.label}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('requirements')}
          className="w-full h-12 bg-blue-700 text-white font-display font-semibold rounded-xl hover:bg-blue-800 active:scale-[0.98] transition-all"
        >
          View Applicable Requirements →
        </button>
      </div>

      {/* Evidence detail bottom sheet */}
      <BottomSheet
        isOpen={!!selectedEvidence}
        onClose={() => setSelectedEvidence(null)}
        title="Evidence Detail"
      >
        {selectedEvidence && (
          <div className="px-4 py-4">
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{selectedEvidence.label}</p>
              <p className={`text-xl font-display font-bold ${
                selectedEvidence.status === 'NOT_FOUND' ? 'text-red-600' :
                selectedEvidence.status === 'UNCERTAIN' ? 'text-amber-700' :
                'text-slate-900'
              }`}>
                {selectedEvidence.value}
              </p>
            </div>

            <div className="flex gap-3 mb-4">
              <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Source</p>
                <p className="text-sm font-medium text-slate-900">{selectedEvidence.source}</p>
              </div>
              <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Confidence</p>
                <p className={`text-sm font-bold font-mono ${
                  selectedEvidence.confidence >= 85 ? 'text-emerald-700' :
                  selectedEvidence.confidence >= 55 ? 'text-amber-700' : 'text-red-700'
                }`}>{selectedEvidence.confidence}%</p>
              </div>
            </div>

            {selectedEvidence.rawEvidence && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 mb-4">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Raw Evidence</p>
                <p className="text-sm text-slate-700 italic">"{selectedEvidence.rawEvidence}"</p>
              </div>
            )}

            {selectedEvidence.conflictingValues && selectedEvidence.conflictingValues.length > 1 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-3 mb-4">
                <p className="text-amber-800 font-semibold text-sm mb-2">Contradictory evidence detected</p>
                {selectedEvidence.conflictingValues.map(cv => (
                  <div key={cv.imageId} className="flex justify-between text-sm text-amber-700">
                    <span>{cv.side} panel</span>
                    <span className="font-mono font-medium">{cv.value}</span>
                  </div>
                ))}
                <p className="text-amber-700 text-xs mt-2">Inspector verification is required.</p>
              </div>
            )}

            {selectedEvidence.status === 'NOT_FOUND' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 mb-4">
                <p className="text-slate-700 text-sm font-medium">Declaration not found in available images</p>
                <p className="text-slate-500 text-xs mt-0.5">
                  This does not automatically constitute a violation. Capture additional panel images if the declaration may be elsewhere on the package.
                </p>
              </div>
            )}

            <button
              onClick={() => setSelectedEvidence(null)}
              className="w-full h-11 bg-blue-700 text-white font-display font-semibold rounded-xl text-sm"
            >
              Done
            </button>
          </div>
        )}
      </BottomSheet>
    </MobileShell>
  );
}
