import { Plus, ChevronRight, TrendingUp } from 'lucide-react';
import MobileShell from '../components/MobileShell';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { RECENT_INSPECTIONS } from '../mockData';
import type { ComplianceStatus } from '../types';

const STATS = [
  { label: 'Total', value: '128', color: 'text-slate-900' },
  { label: 'Compliant', value: '91', color: 'text-emerald-700' },
  { label: 'Non-Compliant', value: '24', color: 'text-red-700' },
  { label: 'Review', value: '13', color: 'text-amber-700' },
];

export default function DashboardScreen() {
  const { startNewInspection, startDemoInspection, navigate } = useApp();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <MobileShell>
      <div className="px-4 pb-6">
        {/* Greeting */}
        <div className="pt-5 pb-4">
          <p className="text-sm text-slate-500">{greeting},</p>
          <h2 className="font-display font-bold text-2xl text-slate-900">Inspector Rajesh</h2>
          <p className="text-sm text-slate-500 mt-0.5">Ready for your next inspection?</p>
        </div>

        {/* Primary CTA */}
        <button
          onClick={startNewInspection}
          className="w-full h-14 bg-blue-700 text-white font-display font-semibold text-base rounded-xl flex items-center justify-center gap-2 shadow-sm hover:bg-blue-800 active:scale-[0.98] transition-all mb-3"
        >
          <Plus size={20} />
          Start New Inspection
        </button>
        <button
          onClick={startDemoInspection}
          className="w-full h-11 border border-slate-200 bg-white text-slate-600 font-display font-medium text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 active:scale-[0.98] transition-all mb-6"
        >
          <TrendingUp size={16} className="text-blue-600" />
          Start Demo Inspection
        </button>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2.5 mb-6">
          {STATS.map(stat => (
            <div key={stat.label} className="bg-white border border-slate-200 rounded-xl px-4 py-3.5">
              <p className={`font-display font-bold text-2xl ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Recent Inspections */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-slate-900 text-sm">Recent Inspections</h3>
          <button
            onClick={() => navigate('inspections')}
            className="flex items-center gap-0.5 text-blue-700 text-xs font-medium"
          >
            View all <ChevronRight size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {RECENT_INSPECTIONS.map(ins => (
            <button
              key={ins.id}
              onClick={() => navigate('inspections')}
              className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex items-start justify-between text-left hover:border-blue-200 transition-colors"
            >
              <div className="flex-1 min-w-0 mr-3">
                <p className="font-medium text-slate-900 text-sm truncate">{ins.productName}</p>
                <p className="text-xs text-slate-500 mt-0.5">{ins.category}</p>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">{ins.date}</p>
              </div>
              <StatusBadge status={ins.status as ComplianceStatus} size="sm" />
            </button>
          ))}
        </div>
      </div>
    </MobileShell>
  );
}
