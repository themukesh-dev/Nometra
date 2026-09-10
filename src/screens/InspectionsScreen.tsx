import { Search } from 'lucide-react';
import { useState } from 'react';
import MobileShell from '../components/MobileShell';
import StatusBadge from '../components/StatusBadge';
import { RECENT_INSPECTIONS } from '../mockData';
import type { ComplianceStatus } from '../types';

const ALL_INSPECTIONS = [
  ...RECENT_INSPECTIONS,
  { id: 'INS-2026-00142', productName: 'Clinic Plus Shampoo', category: 'Personal Care', date: '06 Sep 2026', status: 'COMPLIANT' as const },
  { id: 'INS-2026-00141', productName: 'Haldiram Namkeen Mixture', category: 'Food & Grocery', date: '05 Sep 2026', status: 'COMPLIANT' as const },
  { id: 'INS-2026-00140', productName: 'Imported Olive Oil', category: 'Food & Grocery', date: '05 Sep 2026', status: 'NON_COMPLIANT' as const },
  { id: 'INS-2026-00139', productName: 'Rin Advanced Detergent', category: 'Household', date: '04 Sep 2026', status: 'COMPLIANT' as const },
];

type Filter = 'ALL' | ComplianceStatus;

export default function InspectionsScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');

  const filtered = ALL_INSPECTIONS.filter(ins => {
    const matchesQuery = ins.productName.toLowerCase().includes(query.toLowerCase()) ||
      ins.id.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === 'ALL' || ins.status === filter;
    return matchesQuery && matchesFilter;
  });

  const filters: { value: Filter; label: string }[] = [
    { value: 'ALL', label: 'All' },
    { value: 'COMPLIANT', label: 'Compliant' },
    { value: 'NON_COMPLIANT', label: 'Non-Compliant' },
    { value: 'VERIFICATION_REQUIRED', label: 'Review' },
  ];

  return (
    <MobileShell title="Inspections">
      <div className="px-4 pb-6 pt-3">
        {/* Search */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search product or inspection ID…"
            className="w-full h-11 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-none">
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`shrink-0 px-3 h-8 rounded-full text-xs font-semibold border transition-colors ${
                filter === f.value
                  ? 'bg-blue-700 border-blue-700 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-500 mb-3">{filtered.length} inspection{filtered.length !== 1 ? 's' : ''}</p>

        <div className="flex flex-col gap-2">
          {filtered.map(ins => (
            <div
              key={ins.id}
              className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex items-start justify-between"
            >
              <div className="flex-1 min-w-0 mr-3">
                <p className="font-medium text-slate-900 text-sm truncate">{ins.productName}</p>
                <p className="text-xs text-slate-500 mt-0.5">{ins.category}</p>
                <p className="text-xs text-slate-400 mt-1 font-mono">{ins.id} · {ins.date}</p>
              </div>
              <StatusBadge status={ins.status as ComplianceStatus} size="sm" />
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-sm">No inspections found</p>
          </div>
        )}
      </div>
    </MobileShell>
  );
}
