import { CheckCircle2 } from 'lucide-react';
import MobileShell from '../components/MobileShell';
import { useApp } from '../context/AppContext';
import type { ProductCategory } from '../types';

const CATEGORIES: { id: ProductCategory; icon: string; note?: string }[] = [
  { id: 'Food & Grocery', icon: '🥛', note: 'Beverages, dairy, packaged foods' },
  { id: 'Personal Care', icon: '🧴', note: 'Cosmetics, skincare, hair care' },
  { id: 'Household', icon: '🧹', note: 'Cleaning, detergents, utilities' },
  { id: 'Garments & Textiles', icon: '👕', note: 'Apparel, fabrics, accessories' },
  { id: 'Stationery', icon: '✏️', note: 'Paper, pens, office supplies' },
  { id: 'Consumer Goods', icon: '📦', note: 'Electronics accessories, general goods' },
  { id: 'Agricultural', icon: '🌾', note: 'Seeds, fertilizers, agrochemicals' },
  { id: 'Other', icon: '⊞', note: 'Other packaged commodities' },
];

export default function CategoryScreen() {
  const { navigate, currentInspection } = useApp();
  const selected = currentInspection?.product.category ?? 'Personal Care';

  return (
    <MobileShell title="Product Category" backScreen="image-quality">
      <div className="px-4 pb-6 pt-4">
        <p className="text-sm text-slate-500 mb-4">
          Category determines which Legal Metrology requirements apply to this inspection.
        </p>

        <div className="flex flex-col gap-2">
          {CATEGORIES.map(cat => {
            const isSelected = selected === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => navigate('analysis')}
                className={`flex items-center justify-between px-4 py-3.5 rounded-xl border text-left transition-colors ${
                  isSelected
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{cat.icon}</span>
                  <div>
                    <p className={`font-display font-semibold text-sm ${isSelected ? 'text-blue-800' : 'text-slate-900'}`}>
                      {cat.id}
                    </p>
                    {cat.note && (
                      <p className="text-xs text-slate-500 mt-0.5">{cat.note}</p>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <CheckCircle2 size={18} className="text-blue-600 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Imported product?</span> Select the relevant category — country of origin and importer declaration requirements will apply automatically.
          </p>
        </div>
      </div>
    </MobileShell>
  );
}
