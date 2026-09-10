import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export default function BottomSheet({ isOpen, onClose, title, children }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-slate-900/40 fade-in"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className="relative bg-white rounded-t-2xl max-h-[85vh] flex flex-col slide-up"
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100">
          <div className="w-10 h-1 bg-slate-200 rounded-full absolute top-2 left-1/2 -translate-x-1/2" />
          {title && (
            <span className="font-display font-semibold text-slate-900 text-base">{title}</span>
          )}
          <button
            onClick={onClose}
            className="ml-auto p-1 rounded-full hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X size={18} className="text-slate-500" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 pb-safe-bottom">
          {children}
        </div>
      </div>
    </div>
  );
}
