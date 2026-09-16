import { CheckCircle2 } from 'lucide-react';
import MobileShell from '../components/MobileShell';
import { useApp } from '../context/AppContext';
import type {
  ProductCategory,
  SaleType,
  Inspection,
} from '../types';

const CATEGORIES: {
  id: ProductCategory;
  icon: string;
  note?: string;
}[] = [
  {
    id: 'Food & Grocery',
    icon: '🥛',
    note: 'Beverages, dairy, packaged foods',
  },
  {
    id: 'Personal Care',
    icon: '🧴',
    note: 'Cosmetics, skincare, hair care',
  },
  {
    id: 'Household',
    icon: '🧹',
    note: 'Cleaning, detergents, utilities',
  },
  {
    id: 'Garments & Textiles',
    icon: '👕',
    note: 'Apparel, fabrics, accessories',
  },
  {
    id: 'Stationery',
    icon: '✏️',
    note: 'Paper, pens, office supplies',
  },
  {
    id: 'Consumer Goods',
    icon: '📦',
    note: 'Electronics accessories, general goods',
  },
  {
    id: 'Agricultural',
    icon: '🌾',
    note: 'Seeds, fertilizers, agrochemicals',
  },
  {
    id: 'Other',
    icon: '⊞',
    note: 'Other packaged commodities',
  },
];

const SALE_TYPES: {
  id: SaleType;
  label: string;
  note: string;
}[] = [
  {
    id: 'retail',
    label: 'Retail',
    note: 'Package intended for retail sale',
  },
  {
    id: 'wholesale',
    label: 'Wholesale',
    note: 'Package intended for wholesale sale',
  },
  {
    id: 'institutional_or_industrial',
    label: 'Institutional / Industrial',
    note: 'Package intended for institutional or industrial consumers',
  },
];

export default function CategoryScreen() {
  const {
    navigate,
    currentInspection,
    setCurrentInspection,
  } = useApp();

  const selectedCategory =
    currentInspection?.product.category ?? 'Other';

  const selectedOrigin =
    currentInspection?.product.isImported
      ? 'imported'
      : 'domestic';

  const selectedSaleType =
    currentInspection?.product.saleType ?? 'retail';

  const updateProduct = (
    updates: Partial<Inspection['product']>
  ) => {
    if (!currentInspection) {
      return;
    }

    const updatedInspection: Inspection = {
      ...currentInspection,
      product: {
        ...currentInspection.product,
        ...updates,
      },
    };

    setCurrentInspection(updatedInspection);
  };

  const handleCategorySelect = (
    category: ProductCategory
  ) => {
    updateProduct({
      category,
    });
  };

  const handleOriginSelect = (
    origin: 'domestic' | 'imported'
  ) => {
    updateProduct({
      isImported: origin === 'imported',
    });
  };

  const handleSaleTypeSelect = (
    saleType: SaleType
  ) => {
    updateProduct({
      saleType,
    });
  };

  const handleContinue = () => {
    if (!currentInspection) {
      return;
    }

    navigate('analysis');
  };

  return (
    <MobileShell
      title="Product Classification"
      backScreen="image-quality"
    >
      <div className="px-4 pb-6 pt-4">

        {/* PRODUCT CATEGORY */}

        <p className="text-sm text-slate-500 mb-4">
          Select the product category and classification
          details for this inspection.
        </p>

        <div className="mb-2">
          <p className="text-sm font-display font-semibold text-slate-900">
            Product Category
          </p>

          <p className="text-xs text-slate-500 mt-1">
            Used as descriptive product information.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {CATEGORIES.map((cat) => {
            const isSelected =
              selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  handleCategorySelect(cat.id)
                }
                className={`flex items-center justify-between px-4 py-3.5 rounded-xl border text-left transition-colors ${
                  isSelected
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {cat.icon}
                  </span>

                  <div>
                    <p
                      className={`font-display font-semibold text-sm ${
                        isSelected
                          ? 'text-blue-800'
                          : 'text-slate-900'
                      }`}
                    >
                      {cat.id}
                    </p>

                    {cat.note && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {cat.note}
                      </p>
                    )}
                  </div>
                </div>

                {isSelected && (
                  <CheckCircle2
                    size={18}
                    className="text-blue-600 shrink-0"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* PRODUCT ORIGIN */}

        <div className="mt-6">
          <p className="text-sm font-display font-semibold text-slate-900">
            Product Origin
          </p>

          <p className="text-xs text-slate-500 mt-1 mb-3">
            Origin determines whether country of origin
            must be checked.
          </p>

          <div className="grid grid-cols-2 gap-2">

            {/* DOMESTIC */}

            <button
              type="button"
              onClick={() =>
                handleOriginSelect('domestic')
              }
              className={`px-4 py-3 rounded-xl border text-left transition-colors ${
                selectedOrigin === 'domestic'
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`font-display font-semibold text-sm ${
                      selectedOrigin === 'domestic'
                        ? 'text-blue-800'
                        : 'text-slate-900'
                    }`}
                  >
                    Domestic
                  </p>

                  <p className="text-xs text-slate-500 mt-0.5">
                    Made in India
                  </p>
                </div>

                {selectedOrigin === 'domestic' && (
                  <CheckCircle2
                    size={18}
                    className="text-blue-600 shrink-0"
                  />
                )}
              </div>
            </button>

            {/* IMPORTED */}

            <button
              type="button"
              onClick={() =>
                handleOriginSelect('imported')
              }
              className={`px-4 py-3 rounded-xl border text-left transition-colors ${
                selectedOrigin === 'imported'
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`font-display font-semibold text-sm ${
                      selectedOrigin === 'imported'
                        ? 'text-blue-800'
                        : 'text-slate-900'
                    }`}
                  >
                    Imported
                  </p>

                  <p className="text-xs text-slate-500 mt-0.5">
                    Imported into India
                  </p>
                </div>

                {selectedOrigin === 'imported' && (
                  <CheckCircle2
                    size={18}
                    className="text-blue-600 shrink-0"
                  />
                )}
              </div>
            </button>

          </div>
        </div>

        {/* SALE TYPE */}

        <div className="mt-6">
          <p className="text-sm font-display font-semibold text-slate-900">
            Intended Sale Type
          </p>

          <p className="text-xs text-slate-500 mt-1 mb-3">
            Sale type determines which Legal Metrology
            declarations are applicable.
          </p>

          <div className="flex flex-col gap-2">
            {SALE_TYPES.map((saleType) => {
              const isSelected =
                selectedSaleType === saleType.id;

              return (
                <button
                  key={saleType.id}
                  type="button"
                  onClick={() =>
                    handleSaleTypeSelect(
                      saleType.id
                    )
                  }
                  className={`flex items-center justify-between px-4 py-3.5 rounded-xl border text-left transition-colors ${
                    isSelected
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <p
                      className={`font-display font-semibold text-sm ${
                        isSelected
                          ? 'text-blue-800'
                          : 'text-slate-900'
                      }`}
                    >
                      {saleType.label}
                    </p>

                    <p className="text-xs text-slate-500 mt-0.5">
                      {saleType.note}
                    </p>
                  </div>

                  {isSelected && (
                    <CheckCircle2
                      size={18}
                      className="text-blue-600 shrink-0"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* CLASSIFICATION SUMMARY */}

        <div className="mt-5 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">
              Classification:
            </span>{' '}
            {selectedOrigin === 'imported'
              ? 'Imported'
              : 'Domestic'}{' '}
            ·{' '}
            {SALE_TYPES.find(
              (item) =>
                item.id === selectedSaleType
            )?.label}
          </p>

          <p className="text-xs text-slate-500 mt-1">
            The selected classification will be used by
            the backend applicability and rule engine.
          </p>
        </div>

        {/* CONTINUE */}

        <button
          type="button"
          onClick={handleContinue}
          className="w-full mt-5 bg-blue-600 hover:bg-blue-700 text-white font-display font-semibold py-3.5 rounded-xl transition-colors"
        >
          Continue to Analysis
        </button>

      </div>
    </MobileShell>
  );
}