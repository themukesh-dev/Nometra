import { CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react';
import MobileShell from '../components/MobileShell';
import { useApp } from '../context/AppContext';

interface QualityCheck {
  label: string;
  status: 'GOOD' | 'POOR';
  value: string;
}

const QUALITY_CHECKS: QualityCheck[] = [
  {
    label: 'Resolution',
    status: 'GOOD',
    value: 'Sufficient',
  },
  {
    label: 'Orientation',
    status: 'GOOD',
    value: 'Portrait',
  },
  {
    label: 'Package detected',
    status: 'GOOD',
    value: 'Yes',
  },
  {
    label: 'Text visibility',
    status: 'GOOD',
    value: 'Good',
  },
  {
    label: 'Blur',
    status: 'GOOD',
    value: 'Low',
  },
  {
    label: 'Lighting',
    status: 'GOOD',
    value: 'Adequate',
  },
];

export default function ImageQualityScreen() {
  const {
    navigate,
    capturedImage,
  } = useApp();

  const allGood = QUALITY_CHECKS.every(
    check => check.status === 'GOOD'
  );

  return (
    <MobileShell
      title="Image Quality"
      backScreen="capture"
    >
      <div className="px-4 pb-6 pt-4">

        {/* Image preview */}
        {capturedImage && (
          <div className="mb-5">
            <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">
              Captured Image
            </p>

            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              <img
                src={URL.createObjectURL(capturedImage)}
                alt="Captured package"
                className="w-full max-h-72 object-contain"
              />
            </div>
          </div>
        )}

        {/* Overall result */}
        <div
          className={`rounded-xl px-4 py-3.5 mb-5 flex items-center gap-3 ${
            allGood
              ? 'bg-emerald-50 border border-emerald-200'
              : 'bg-amber-50 border border-amber-200'
          }`}
        >
          {allGood ? (
            <CheckCircle2
              size={22}
              className="text-emerald-600 shrink-0"
            />
          ) : (
            <AlertTriangle
              size={22}
              className="text-amber-600 shrink-0"
            />
          )}

          <div>
            <p
              className={`font-display font-semibold text-sm ${
                allGood
                  ? 'text-emerald-800'
                  : 'text-amber-800'
              }`}
            >
              {allGood
                ? 'Image quality verified'
                : 'Image quality insufficient'}
            </p>

            <p
              className={`text-xs mt-0.5 ${
                allGood
                  ? 'text-emerald-700'
                  : 'text-amber-700'
              }`}
            >
              {allGood
                ? 'The image is suitable for declaration extraction and compliance verification.'
                : 'Some declarations may not be reliably verified from this image.'}
            </p>
          </div>
        </div>

        {/* Quality checks */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-5">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="font-display font-semibold text-sm text-slate-900">
              Quality Checks
            </p>
          </div>

          {QUALITY_CHECKS.map((check, index) => (
            <div
              key={check.label}
              className={`flex items-center justify-between px-4 py-3 ${
                index < QUALITY_CHECKS.length - 1
                  ? 'border-b border-slate-100'
                  : ''
              }`}
            >
              <div className="flex items-center gap-2.5">
                {check.status === 'GOOD' ? (
                  <CheckCircle2
                    size={16}
                    className="text-emerald-500 shrink-0"
                  />
                ) : (
                  <AlertTriangle
                    size={16}
                    className="text-amber-500 shrink-0"
                  />
                )}

                <span className="text-sm text-slate-700">
                  {check.label}
                </span>
              </div>

              <span
                className={`text-xs font-medium ${
                  check.status === 'GOOD'
                    ? 'text-emerald-700'
                    : 'text-amber-700'
                }`}
              >
                {check.value}
              </span>
            </div>
          ))}
        </div>

        {/* Quality principle */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6">
          <p className="text-blue-800 text-sm font-medium">
            Quality principle
          </p>

          <p className="text-blue-700 text-xs mt-0.5">
            Poor image quality does not automatically result in a
            violation finding. Inconclusive evidence is marked for
            inspector verification.
          </p>
        </div>

        {/* Continue */}
        <button
          onClick={() => navigate('category')}
          disabled={!capturedImage || !allGood}
          className="w-full h-12 bg-blue-700 text-white font-display font-semibold rounded-xl hover:bg-blue-800 active:scale-[0.98] transition-all mb-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue — Select Category
        </button>

        {/* Retake */}
        <button
          onClick={() => navigate('capture')}
          className="w-full h-12 border border-slate-200 bg-white text-slate-700 font-display font-medium text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
        >
          <RotateCcw size={16} />
          Retake Image
        </button>

        <p className="text-center text-xs text-slate-400 mt-4">
          Make sure the package label is clearly visible before continuing.
        </p>
      </div>
    </MobileShell>
  );
}
