import { useRef, useState } from 'react';
import { Zap, ZapOff, ImageIcon, RotateCcw } from 'lucide-react';
import MobileShell from '../components/MobileShell';
import { useApp } from '../context/AppContext';
import type { PackageSide } from '../types';

const SIDE_ORDER: PackageSide[] = ['FRONT', 'BACK', 'LEFT', 'RIGHT', 'BOTTOM'];

export default function CaptureScreen() {
  const { navigate, capturedSides, setCapturedSides } = useApp();
  const [flash, setFlash] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(() => {
    const nextIdx = SIDE_ORDER.findIndex(s => !capturedSides.includes(s));
    return nextIdx === -1 ? 0 : nextIdx;
  });
  const [capturedThisSide, setCapturedThisSide] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSide = SIDE_ORDER[currentIdx];

  const handleCapture = () => {
    setCapturedThisSide(true);
    if (!capturedSides.includes(currentSide)) {
      setCapturedSides([...capturedSides, currentSide]);
    }
  };

  const handleRetake = () => {
    setCapturedThisSide(false);
  };

  const handleNext = () => {
    const nextIdx = SIDE_ORDER.findIndex((s, i) => i > currentIdx && !capturedSides.includes(s));
    if (nextIdx !== -1) {
      setCurrentIdx(nextIdx);
      setCapturedThisSide(false);
    } else {
      navigate('image-quality');
    }
  };

  const sideColor: Record<PackageSide, string> = {
    FRONT: 'from-blue-900 to-blue-700',
    BACK: 'from-slate-800 to-slate-600',
    LEFT: 'from-indigo-900 to-indigo-700',
    RIGHT: 'from-violet-900 to-violet-700',
    BOTTOM: 'from-slate-900 to-slate-700',
    OTHER: 'from-gray-900 to-gray-700',
  };

  return (
    <MobileShell title={`Capture ${currentSide}`} backScreen="new-inspection" hideNav>
      <div className="flex flex-col h-full">
        {/* Side indicator */}
        <div className="px-4 py-2 flex gap-2">
          {SIDE_ORDER.slice(0, 5).map((side) => (
            <div
              key={side}
              className={`flex-1 h-1.5 rounded-full ${
                capturedSides.includes(side)
                  ? 'bg-emerald-500'
                  : side === currentSide
                  ? 'bg-blue-600'
                  : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Camera viewport */}
        <div className="mx-4 mt-2 rounded-2xl overflow-hidden bg-slate-900 relative" style={{ aspectRatio: '3/4' }}>
          {capturedThisSide ? (
            <div className={`absolute inset-0 bg-gradient-to-b ${sideColor[currentSide]} flex flex-col items-center justify-center`}>
              <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mb-3">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-white font-display font-semibold text-lg">{currentSide} Captured</p>
            </div>
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-b ${sideColor[currentSide]}`}>
              {/* Alignment guide */}
              <div className="absolute inset-6 border-2 border-white/30 rounded-xl" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <p className="text-white/60 text-sm">Align package inside frame</p>
                <p className="text-white font-display font-bold text-xl mt-1">CAPTURE {currentSide}</p>
              </div>
              {/* Corner guides */}
              {[
                'top-4 left-4 border-l-2 border-t-2',
                'top-4 right-4 border-r-2 border-t-2',
                'bottom-4 left-4 border-l-2 border-b-2',
                'bottom-4 right-4 border-r-2 border-b-2',
              ].map((cls, i) => (
                <div key={i} className={`absolute w-6 h-6 border-white ${cls}`} />
              ))}
            </div>
          )}

          {/* Flash toggle */}
          <button
            onClick={() => setFlash(f => !f)}
            className="absolute top-3 right-3 w-9 h-9 bg-black/40 rounded-full flex items-center justify-center"
            aria-label="Toggle flash"
          >
            {flash ? <Zap size={16} className="text-yellow-400" /> : <ZapOff size={16} className="text-white/70" />}
          </button>
        </div>

        <p className="text-center text-xs text-slate-500 mt-2 px-4">
          {capturedThisSide ? `${currentSide} image captured` : 'Position the package clearly and tap Capture'}
        </p>

        {/* Controls */}
        <div className="px-4 mt-4 pb-4 flex items-center gap-3">
          {capturedThisSide ? (
            <>
              <button
                onClick={handleRetake}
                className="flex-1 h-12 border border-slate-200 bg-white text-slate-700 font-display font-medium rounded-xl flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} />
                Retake
              </button>
              <button
                onClick={handleNext}
                className="flex-1 h-12 bg-blue-700 text-white font-display font-semibold rounded-xl flex items-center justify-center"
              >
                {SIDE_ORDER.findIndex((s, i) => i > currentIdx && !capturedSides.includes(s)) !== -1
                  ? 'Next Side →'
                  : 'Done →'
                }
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 border border-slate-200 bg-white rounded-xl flex items-center justify-center shrink-0"
                aria-label="Upload from gallery"
              >
                <ImageIcon size={18} className="text-slate-500" />
              </button>
              <button
                onClick={handleCapture}
                className="flex-1 h-12 bg-blue-700 text-white font-display font-semibold rounded-xl"
              >
                Capture
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleCapture}
              />
            </>
          )}
        </div>

        {/* Skip to quality check */}
        {capturedSides.length > 0 && (
          <button
            onClick={() => navigate('image-quality')}
            className="mx-4 mb-4 h-10 text-blue-700 text-sm font-medium underline underline-offset-2"
          >
            Done capturing — verify quality
          </button>
        )}
      </div>
    </MobileShell>
  );
}
