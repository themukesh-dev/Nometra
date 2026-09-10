import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import MobileShell from '../components/MobileShell';
import { useApp } from '../context/AppContext';

const STEPS = [
  { label: 'Images received', detail: 'Front, back panels' },
  { label: 'Image quality verified', detail: 'All checks passed' },
  { label: 'Text extracted', detail: '47 text regions identified' },
  { label: 'Declarations identified', detail: '9 declarations found' },
  { label: 'Determining applicable requirements', detail: 'Personal Care · Imported' },
  { label: 'Evaluating compliance', detail: '8 requirements checked' },
  { label: 'Linking findings to evidence', detail: 'Evidence references attached' },
];

export default function AnalysisScreen() {
  const { navigate, analysisStep, setAnalysisStep } = useApp();

  useEffect(() => {
    setAnalysisStep(0);
    const intervals: ReturnType<typeof setTimeout>[] = [];
    STEPS.forEach((_, i) => {
      intervals.push(
        setTimeout(() => setAnalysisStep(i + 1), (i + 1) * 700)
      );
    });
    const nav = setTimeout(() => navigate('evidence-review'), STEPS.length * 700 + 600);
    return () => {
      intervals.forEach(clearTimeout);
      clearTimeout(nav);
    };
  }, []);

  return (
    <MobileShell title="Analyzing Evidence" hideNav>
      <div className="px-4 pb-6 pt-6">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
          <h2 className="font-display font-bold text-slate-900 text-xl">Analyzing Package Evidence</h2>
          <p className="text-slate-500 text-sm mt-1">
            {analysisStep < STEPS.length
              ? STEPS[analysisStep]?.detail ?? 'Processing…'
              : 'Analysis complete'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {STEPS.map((step, i) => {
            const done = analysisStep > i;
            const active = analysisStep === i;
            return (
              <div
                key={step.label}
                className={`flex items-start gap-3 px-4 py-3.5 transition-colors ${
                  i < STEPS.length - 1 ? 'border-b border-slate-100' : ''
                } ${active ? 'bg-blue-50' : ''}`}
              >
                <div className="shrink-0 mt-0.5">
                  {done ? (
                    <CheckCircle2 size={18} className="text-emerald-500" />
                  ) : active ? (
                    <div className="w-4.5 h-4.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" style={{ width: 18, height: 18 }} />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-200 m-px" />
                  )}
                </div>
                <div>
                  <p className={`text-sm font-medium ${done ? 'text-slate-900' : active ? 'text-blue-800' : 'text-slate-400'}`}>
                    {step.label}
                  </p>
                  {(done || active) && (
                    <p className="text-xs text-slate-500 mt-0.5">{step.detail}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Evidence is extracted and evaluated against applicable Legal Metrology requirements.
        </p>
      </div>
    </MobileShell>
  );
}
