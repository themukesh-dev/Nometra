import { ChevronRight } from 'lucide-react';
import MobileShell from '../components/MobileShell';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';

const MRP_HISTORY = [
  { price: '₹899', date: 'Sep 2026' },
  { price: '₹849', date: 'May 2026' },
  { price: '₹799', date: 'Jan 2026' },
];

export default function ProductHistoryScreen() {
  const { navigate, currentInspection } = useApp();
  const product = currentInspection?.product;

  if (!product) {
    return (
      <MobileShell title="Product History" backScreen="dashboard">
        <div className="px-4 py-12 text-center">
          <p className="text-slate-400 text-sm">No product selected</p>
          <button onClick={() => navigate('dashboard')} className="mt-3 text-blue-700 text-sm font-medium">
            Go to Dashboard
          </button>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell title="Product History" backScreen="compliance-result">
      <div className="px-4 pb-6 pt-4">
        {/* Product header */}
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 mb-4">
          <p className="font-display font-bold text-slate-900">{product.name}</p>
          <p className="text-sm text-slate-500">{product.brand} · {product.category}</p>
          {product.isImported && (
            <span className="inline-block mt-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">Imported</span>
          )}
        </div>

        {/* Current status */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Current Status</p>
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3.5 flex items-center justify-between">
            <div>
              <p className="font-display font-semibold text-red-800">Last Inspection</p>
              <p className="text-xs text-red-600 mt-0.5">Today, 10:42 AM</p>
            </div>
            <StatusBadge status="NON_COMPLIANT" size="sm" />
          </div>
        </div>

        {/* Inspection history */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Inspection History</p>
          <div className="flex flex-col gap-2">
            {[
              { date: 'Sep 2026', status: 'NON_COMPLIANT' as const, id: 'INS-2026-00147' },
              { date: 'Jul 2026', status: 'COMPLIANT' as const, id: 'INS-2026-00098' },
              { date: 'Mar 2026', status: 'VERIFICATION_REQUIRED' as const, id: 'INS-2026-00052' },
            ].map(ins => (
              <div key={ins.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{ins.date}</p>
                  <p className="text-xs font-mono text-slate-400">{ins.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={ins.status} size="sm" />
                  <ChevronRight size={14} className="text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MRP history */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">MRP History</p>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {MRP_HISTORY.map((item, i) => (
              <div
                key={item.date}
                className={`flex items-center justify-between px-4 py-3 ${
                  i < MRP_HISTORY.length - 1 ? 'border-b border-slate-100' : ''
                }`}
              >
                <span className="text-sm text-slate-600">{item.date}</span>
                <span className="font-display font-bold text-slate-900 font-mono">{item.price}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => navigate('requirements')}
          className="w-full h-12 bg-blue-700 text-white font-display font-semibold rounded-xl hover:bg-blue-800 transition-all"
        >
          View Current Findings →
        </button>
      </div>
    </MobileShell>
  );
}
