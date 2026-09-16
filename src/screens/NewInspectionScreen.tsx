import { Camera, Upload, CheckCircle2, Circle } from 'lucide-react';
import MobileShell from '../components/MobileShell';
import { useApp } from '../context/AppContext';
import type { PackageSide } from '../types';

const SIDES: { side: PackageSide; label: string }[] = [
  { side: 'FRONT', label: 'Front' },
  { side: 'BACK', label: 'Back' },
  { side: 'LEFT', label: 'Left' },
  { side: 'RIGHT', label: 'Right' },
  { side: 'BOTTOM', label: 'Bottom' },
];

export default function NewInspectionScreen() {
  const {
    navigate,
    currentInspection,
    capturedSides,
    setCapturedSides,
  } = useApp();

  const hasFront = capturedSides.includes('FRONT');
  const canProceed = capturedSides.length > 0;

  const productName = currentInspection?.product.name?.trim();

  return (
    <MobileShell title="New Inspection" backScreen="dashboard">
      <div className="px-4 pb-6 pt-4">

        {/* Inspection ID */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-5">
          <p className="text-xs text-slate-500 mb-0.5">
            Inspection ID
          </p>

          <p className="font-mono font-medium text-slate-900 text-sm">
            {currentInspection?.id ?? 'INS-2026-00148'}
          </p>
        </div>

        {/* Product info */}
        {currentInspection && productName && (
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 mb-5">
            <p className="text-xs text-slate-500 mb-0.5">
              Product
            </p>

            <p className="font-medium text-slate-900 text-sm">
              {productName}
            </p>

            <p className="text-xs text-slate-400 mt-0.5">
              {currentInspection.product.category}
            </p>
          </div>
        )}

        {/* Capture section */}
        <div className="mb-5">
          <h3 className="font-display font-semibold text-slate-900 mb-1">
            Capture Package
          </h3>

          <p className="text-sm text-slate-500 mb-4">
            Capture multiple sides of the package. A declaration missing from one image may be present on another panel.
          </p>

          {/* Sides checklist */}
          <div className="flex flex-wrap gap-2 mb-4">
            {SIDES.map(({ side, label }) => {
              const captured = capturedSides.includes(side);

              return (
                <button
                  key={side}
                  onClick={() => {
                    if (captured) {
                      setCapturedSides(
                        capturedSides.filter(
                          s => s !== side
                        )
                      );
                    } else {
                      setCapturedSides([
                        ...capturedSides,
                        side,
                      ]);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                    captured
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  {captured ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <Circle size={14} />
                  )}

                  {label}
                </button>
              );
            })}
          </div>

          {/* Notice about missing declarations */}
          {hasFront &&
            !capturedSides.includes('BACK') && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                <p className="text-amber-800 text-sm font-medium">
                  Back panel not captured
                </p>

                <p className="text-amber-700 text-xs mt-0.5">
                  Declarations such as MRP, consumer care, and country of origin may appear on the back panel. Capture it before proceeding.
                </p>
              </div>
            )}
        </div>

        {/* Capture buttons */}
        <button
          onClick={() => navigate('capture')}
          className="w-full h-14 bg-blue-700 text-white font-display font-semibold text-base rounded-xl flex items-center justify-center gap-2 mb-3 hover:bg-blue-800 active:scale-[0.98] transition-all"
        >
          <Camera size={20} />
          Scan Product
        </button>

        <button
          onClick={() => {
            setCapturedSides(['FRONT', 'BACK']);
            navigate('image-quality');
          }}
          className="w-full h-12 border border-slate-200 bg-white text-slate-700 font-display font-medium text-sm rounded-xl flex items-center justify-center gap-2 mb-6 hover:bg-slate-50 transition-all"
        >
          <Upload size={16} />
          Upload Images
        </button>

        {/* Proceed */}
        {canProceed && (
          <button
            onClick={() => navigate('image-quality')}
            className="w-full h-12 bg-slate-900 text-white font-display font-semibold text-sm rounded-xl hover:bg-slate-800 active:scale-[0.98] transition-all"
          >
            Continue — Verify Image Quality →
          </button>
        )}

        <p className="text-center text-xs text-slate-400 mt-4">
          Do not assume a declaration is missing because it is not visible in one image.
        </p>
      </div>
    </MobileShell>
  );
}