import { useState } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import MobileShell from '../components/MobileShell';
import BottomSheet from '../components/BottomSheet';
import { MOCK_RULES } from '../mockData';
import type { Rule } from '../types';

export default function RulesScreen() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Rule | null>(null);

  const filtered = MOCK_RULES.filter(r =>
    r.name.toLowerCase().includes(query.toLowerCase()) ||
    r.id.toLowerCase().includes(query.toLowerCase()) ||
    r.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <MobileShell title="Legal Metrology Rules">
      <div className="px-4 pb-6 pt-3">
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search rules…"
            className="w-full h-11 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="flex flex-col gap-2">
          {filtered.map(rule => (
            <button
              key={rule.id}
              onClick={() => setSelected(rule)}
              className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex items-start gap-3 text-left hover:border-slate-300 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                    {rule.id}
                  </span>
                  {rule.mandatory && (
                    <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">MANDATORY</span>
                  )}
                </div>
                <p className="font-display font-semibold text-sm text-slate-900 mt-1">{rule.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{rule.category} · {rule.version}</p>
              </div>
              <ChevronRight size={14} className="text-slate-300 shrink-0 mt-1" />
            </button>
          ))}
        </div>
      </div>

      <BottomSheet
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.id}
      >
        {selected && (
          <div className="px-4 py-4">
            <h3 className="font-display font-bold text-slate-900 text-base mb-4">{selected.name}</h3>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Category', value: selected.category },
                { label: 'Version', value: selected.version },
                { label: 'Effective Date', value: selected.effectiveDate },
                { label: 'Source', value: selected.source },
                { label: 'Mandatory', value: selected.mandatory ? 'Yes' : 'No' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{item.label}</span>
                  <span className="text-sm text-slate-900 font-medium text-right max-w-[60%]">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl px-3 py-3">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Description</p>
              <p className="text-sm text-slate-700">{selected.description}</p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="w-full h-11 mt-4 bg-blue-700 text-white font-display font-semibold rounded-xl text-sm"
            >
              Close
            </button>
          </div>
        )}
      </BottomSheet>
    </MobileShell>
  );
}
