import { Search, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import MobileShell from '../components/MobileShell';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import type { ComplianceStatus } from '../types';

const API_BASE_URL = 'http://127.0.0.1:5000';

type BackendInspection = {
  id: number;
  timestamp?: string;
  created_at?: string;

  overall_status?:
    | 'COMPLIANT'
    | 'NON_COMPLIANT'
    | 'VERIFICATION_REQUIRED';

  status?:
    | 'COMPLIANT'
    | 'NON_COMPLIANT'
    | 'VERIFICATION_REQUIRED';

  passed?: number;
  failed?: number;

  extracted_data?: {
    product_name?: string | null;
    manufacturer_name?: string | null;
    [key: string]: unknown;
  };

  compliance_report?: {
    overall_status?:
      | 'COMPLIANT'
      | 'NON_COMPLIANT'
      | 'VERIFICATION_REQUIRED';

    passed?: number;

    failed?: number;

    [key: string]: unknown;
  };
};

type InspectionRow = {
  id: string;
  backendId: number;
  productName: string;
  date: string;
  status: ComplianceStatus;
  passed: number;
  failed: number;
};

type Filter =
  | 'ALL'
  | ComplianceStatus;

function formatDate(value?: string) {
  if (!value) {
    return 'Date unavailable';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  );
}

function normalizeStatus(
  inspection: BackendInspection
): ComplianceStatus {
  const status =
    inspection.overall_status ??
    inspection.status ??
    inspection.compliance_report
      ?.overall_status;

  if (status === 'NON_COMPLIANT') {
    return 'NON_COMPLIANT';
  }

  if (
    status ===
    'VERIFICATION_REQUIRED'
  ) {
    return 'VERIFICATION_REQUIRED';
  }

  return 'COMPLIANT';
}

function normalizeInspection(
  inspection: BackendInspection
): InspectionRow {
  const report =
    inspection.compliance_report;

  return {
    id: String(inspection.id),

    /*
     * Keep the real numeric backend ID
     * separately so historical inspection
     * lookup can call /inspections/<id>.
     */

    backendId: inspection.id,

    productName:
      inspection.extracted_data
        ?.product_name ||
      inspection.extracted_data
        ?.manufacturer_name ||
      'Unnamed Product',

    date: formatDate(
      inspection.timestamp ??
        inspection.created_at
    ),

    status:
      normalizeStatus(inspection),

    passed:
      typeof inspection.passed ===
      'number'
        ? inspection.passed
        : typeof report?.passed ===
          'number'
        ? report.passed
        : 0,

    failed:
      typeof inspection.failed ===
      'number'
        ? inspection.failed
        : typeof report?.failed ===
          'number'
        ? report.failed
        : 0,
  };
}

export default function InspectionsScreen() {
  const {
    navigate,
    setHistoricalInspectionId,
    setHistoricalInspection,
  } = useApp();

  const [
    inspections,
    setInspections,
  ] = useState<InspectionRow[]>([]);

  const [
    query,
    setQuery,
  ] = useState('');

  const [
    filter,
    setFilter,
  ] = useState<Filter>('ALL');

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');

  const loadInspections =
    async () => {
      setLoading(true);

      setError('');

      try {
        const response =
          await fetch(
            `${API_BASE_URL}/inspections`
          );

        if (!response.ok) {
          throw new Error(
            `Backend returned ${response.status}`
          );
        }

        const data =
          await response.json();

        /*
         * Backend currently returns an array.
         *
         * This also safely handles
         * { inspections: [...] }
         * if the API is wrapped later.
         */

        const backendInspections:
          BackendInspection[] =
          Array.isArray(data)
            ? data
            : Array.isArray(
                data.inspections
              )
            ? data.inspections
            : [];

        const rows =
          backendInspections.map(
            normalizeInspection
          );

        setInspections(rows);
      } catch (err) {
        console.error(
          'Failed to load inspections:',
          err
        );

        setError(
          'Could not connect to the inspection database.'
        );

        setInspections([]);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadInspections();
  }, []);

  const filtered =
    useMemo(() => {
      const search =
        query
          .trim()
          .toLowerCase();

      return inspections.filter(
        (inspection) => {
          const matchesQuery =
            !search ||
            inspection.productName
              .toLowerCase()
              .includes(search) ||
            inspection.id
              .toLowerCase()
              .includes(search);

          const matchesFilter =
            filter === 'ALL' ||
            inspection.status ===
              filter;

          return (
            matchesQuery &&
            matchesFilter
          );
        }
      );
    }, [
      inspections,
      query,
      filter,
    ]);

  const openHistoricalInspection =
    (inspection: InspectionRow) => {
      /*
       * Store the real backend inspection ID.
       */

      setHistoricalInspectionId(
        inspection.backendId
      );

      /*
       * Clear any previously loaded
       * historical record so the detail
       * screen knows it must fetch fresh data.
       */

      setHistoricalInspection(null);

      navigate(
        'product-history'
      );
    };

  const filters: {
    value: Filter;
    label: string;
  }[] = [
    {
      value: 'ALL',
      label: 'All',
    },
    {
      value: 'COMPLIANT',
      label: 'Compliant',
    },
    {
      value:
        'NON_COMPLIANT',
      label: 'Non-Compliant',
    },
    {
      value:
        'VERIFICATION_REQUIRED',
      label: 'Review',
    },
  ];

  return (
    <MobileShell
      title="Inspections"
    >
      <div className="px-4 pb-6 pt-3">

        {/* Search */}

        <div className="relative mb-3">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="search"
            value={query}
            onChange={(e) =>
              setQuery(
                e.target.value
              )
            }
            placeholder="Search product or inspection ID…"
            className="w-full h-11 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* Filter chips */}

        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-none">
          {filters.map(
            (item) => (
              <button
                key={
                  item.value
                }
                onClick={() =>
                  setFilter(
                    item.value
                  )
                }
                className={`shrink-0 px-3 h-8 rounded-full text-xs font-semibold border transition-colors ${
                  filter ===
                  item.value
                    ? 'bg-blue-700 border-blue-700 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {item.label}
              </button>
            )
          )}
        </div>

        {/* Header */}

        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-slate-500">
            {loading
              ? 'Loading inspections…'
              : `${filtered.length} inspection${
                  filtered.length !==
                  1
                    ? 's'
                    : ''
                }`}
          </p>

          <button
            onClick={
              loadInspections
            }
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-medium text-blue-700 disabled:opacity-50"
          >
            <RefreshCw
              size={13}
              className={
                loading
                  ? 'animate-spin'
                  : ''
              }
            />

            Refresh
          </button>
        </div>

        {/* Loading */}

        {loading && (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map(
              (item) => (
                <div
                  key={item}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-4 animate-pulse"
                >
                  <div className="h-4 bg-slate-100 rounded w-2/3" />

                  <div className="h-3 bg-slate-100 rounded w-1/3 mt-2" />

                  <div className="h-3 bg-slate-100 rounded w-1/2 mt-2" />
                </div>
              )
            )}
          </div>
        )}

        {/* Backend error */}

        {!loading &&
          error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-sm font-medium text-red-700">
                {error}
              </p>

              <button
                onClick={
                  loadInspections
                }
                className="mt-3 h-9 px-4 bg-red-600 text-white rounded-lg text-xs font-semibold"
              >
                Try Again
              </button>
            </div>
          )}

        {/* Inspection list */}

        {!loading &&
          !error &&
          filtered.length >
            0 && (
            <div className="flex flex-col gap-2">
              {filtered.map(
                (
                  inspection
                ) => (
                  <button
                    key={
                      inspection.id
                    }
                    type="button"
                    onClick={() =>
                      openHistoricalInspection(
                        inspection
                      )
                    }
                    className="w-full text-left bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex items-start justify-between hover:border-blue-300 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="font-medium text-slate-900 text-sm truncate">
                        {
                          inspection.productName
                        }
                      </p>

                      <p className="text-xs text-slate-500 mt-0.5">
                        Legal Metrology Inspection
                      </p>

                      <p className="text-xs text-slate-400 mt-1 font-mono">
                        #
                        {
                          inspection.id
                        }{' '}
                        ·{' '}
                        {
                          inspection.date
                        }
                      </p>

                      <div className="flex gap-3 mt-1.5">
                        <span className="text-[10px] text-emerald-600 font-medium">
                          {
                            inspection.passed
                          }{' '}
                          passed
                        </span>

                        {inspection.failed >
                          0 && (
                          <span className="text-[10px] text-red-600 font-medium">
                            {
                              inspection.failed
                            }{' '}
                            failed
                          </span>
                        )}
                      </div>
                    </div>

                    <StatusBadge
                      status={
                        inspection.status
                      }
                      size="sm"
                    />
                  </button>
                )
              )}
            </div>
          )}

        {/* Empty state */}

        {!loading &&
          !error &&
          filtered.length ===
            0 && (
            <div className="text-center py-12">
              <p className="text-slate-400 text-sm">
                {inspections.length ===
                0
                  ? 'No inspections yet'
                  : 'No inspections found'}
              </p>

              {query ||
              filter !==
                'ALL' ? (
                <button
                  onClick={() => {
                    setQuery('');
                    setFilter(
                      'ALL'
                    );
                  }}
                  className="mt-3 text-blue-700 text-xs font-medium"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          )}
      </div>
    </MobileShell>
  );
}