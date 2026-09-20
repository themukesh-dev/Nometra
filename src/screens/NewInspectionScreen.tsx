import { Camera, Upload } from 'lucide-react';
import MobileShell from '../components/MobileShell';
import { useApp } from '../context/AppContext';

export default function NewInspectionScreen() {
  const {
    navigate,
    currentInspection,
  } = useApp();

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

        {/* Product information */}
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
        <div className="mb-6">
          <h3 className="font-display font-semibold text-slate-900 mb-1">
            Capture Package
          </h3>

          <p className="text-sm text-slate-500">
            Capture a clear image of the packaged commodity. Make sure the
            important declarations and label text are visible.
          </p>
        </div>

        {/* Camera */}
        <button
          onClick={() => navigate('capture')}
          className="w-full h-14 bg-blue-700 text-white font-display font-semibold text-base rounded-xl flex items-center justify-center gap-2 mb-3 hover:bg-blue-800 active:scale-[0.98] transition-all"
        >
          <Camera size={20} />
          Scan Product
        </button>

        {/* Upload */}
        <button
          onClick={() => navigate('capture')}
          className="w-full h-12 border border-slate-200 bg-white text-slate-700 font-display font-medium text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
        >
          <Upload size={16} />
          Upload Image
        </button>

        {/* Information */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mt-6">
          <p className="text-blue-800 text-sm font-medium">
            Capture one clear package image
          </p>

          <p className="text-blue-700 text-xs mt-1">
            Nometra will automatically check image quality before extracting
            declarations and verifying compliance.
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">
          Make sure the label is visible, readable, and not significantly
          blurred or obstructed.
        </p>
      </div>
    </MobileShell>
  );
}