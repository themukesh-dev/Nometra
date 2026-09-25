
import { Plus, ChevronRight, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import MobileShell from '../components/MobileShell';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import type { ComplianceStatus } from '../types';

const API_BASE_URL = '/api';

type BackendInspection = {
  id: number;
  timestamp?: string;
  created_at?: string;

  // Final product name after inspector review
  product_name?: string | null;

  overall_status?: ComplianceStatus | string;
  status?: ComplianceStatus | string;

  passed?: number;
  failed?: number;

  extracted_data?: {
    product_name?: string | null;
    manufacturer_name?: string | null;
    [key: string]: unknown;
  };

  compliance_report?: {
    overall_status?: ComplianceStatus | string;
    passed?: number;
    failed?: number;
  };
};

type DashboardInspection = {
  id: string;
  productName: string;
  date: string;
  status: ComplianceStatus;
};

function getStatus(
  inspection: BackendInspection
): ComplianceStatus {
  const status =
    inspection.overall_status ??
    inspection.status ??
    inspection.compliance_report?.overall_status ??
    'VERIFICATION_REQUIRED';

  return status as ComplianceStatus;
}

function formatDate(value?: string) {
  if (!value) return 'Date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function normalizeInspection(
  inspection: BackendInspection
): DashboardInspection {
  return {
    id: String(inspection.id),

    // Prefer final inspector-confirmed name.
    // Fall back to the extracted Gemini name for older records.
    productName:
      inspection.product_name ||
      inspection.extracted_data?.product_name ||
      inspection.extracted_data?.manufacturer_name ||
      'Unnamed Product',

    date: formatDate(
      inspection.timestamp ??
      inspection.created_at
    ),

    status: getStatus(inspection),
  };
}

export default function DashboardScreen() {
  const {
    startNewInspection,
    navigate,
  } = useApp();

  const [inspections, setInspections] = useState<
    DashboardInspection[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/inspections`
      );

      if (!response.ok) {
        throw new Error(
          `Backend returned ${response.status}`
        );
      }

      const data = await response.json();

      const backendInspections: BackendInspection[] =
        Array.isArray(data)
          ? data
          : Array.isArray(data.inspections)
          ? data.inspections
          : [];

      const normalized =
        backendInspections.map(
          normalizeInspection
        );

      setInspections(normalized);
    } catch (err) {
      console.error(
        'Failed to load dashboard data:',
        err
      );

      setError(
        'Could not load inspection data.'
      );

      setInspections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const total = inspections.length;

  const compliant = inspections.filter(
    inspection =>
      inspection.status === 'COMPLIANT'
  ).length;

  const nonCompliant = inspections.filter(
    inspection =>
      inspection.status === 'NON_COMPLIANT'
  ).length;

  const review = inspections.filter(
    inspection =>
      inspection.status ===
      'VERIFICATION_REQUIRED'
  ).length;

  const recentInspections =
    inspections.slice(0, 5);

  const hour = new Date().getHours();

  const greeting =
    hour < 12
      ? 'Good morning'
      : hour < 17
      ? 'Good afternoon'
      : 'Good evening';

  return (
    <MobileShell>
      <div className="px-4 pb-6">

        {/* Greeting */}
        <div className="pt-5 pb-4">
          <p className="text-sm text-slate-500">
            {greeting},
          </p>

          <h2 className="font-display font-bold text-2xl text-slate-900">
            Inspector
          </h2>

          <p className="text-sm text-slate-500 mt-0.5">
            Ready for your next inspection?
          </p>
        </div>

        {/* Primary CTA */}
        <button
          onClick={startNewInspection}
          className="w-full h-14 bg-blue-700 text-white font-display font-semibold text-base rounded-xl flex items-center justify-center gap-2 shadow-sm hover:bg-blue-800 active:scale-[0.98] transition-all mb-6"
        >
          <Plus size={20} />
          Start New Inspection
        </button>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2.5 mb-6">

          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5">
            <p className="font-display font-bold text-2xl text-slate-900">
              {loading ? '—' : total}
            </p>

            <p className="text-xs text-slate-500 mt-0.5">
              Total Inspections
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5">
            <p className="font-display font-bold text-2xl text-emerald-700">
              {loading ? '—' : compliant}
            </p>

            <p className="text-xs text-slate-500 mt-0.5">
              Compliant
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5">
            <p className="font-display font-bold text-2xl text-red-700">
              {loading ? '—' : nonCompliant}
            </p>

            <p className="text-xs text-slate-500 mt-0.5">
              Non-Compliant
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5">
            <p className="font-display font-bold text-2xl text-amber-700">
              {loading ? '—' : review}
            </p>

            <p className="text-xs text-slate-500 mt-0.5">
              Review Required
            </p>
          </div>

        </div>

        {/* Recent Inspections */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-slate-900 text-sm">
            Recent Inspections
          </h3>

          <button
            onClick={() =>
              navigate('inspections')
            }
            className="flex items-center gap-0.5 text-blue-700 text-xs font-medium"
          >
            View all
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
            <p className="text-xs text-red-700">
              {error}
            </p>

            <button
              onClick={loadDashboardData}
              className="mt-2 flex items-center gap-1 text-xs font-semibold text-red-700"
            >
              <RefreshCw size={12} />
              Retry
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map(item => (
              <div
                key={item}
                className="bg-white border border-slate-200 rounded-xl px-4 py-4 animate-pulse"
              >
                <div className="h-4 bg-slate-100 rounded w-2/3" />
                <div className="h-3 bg-slate-100 rounded w-1/3 mt-2" />
                <div className="h-3 bg-slate-100 rounded w-1/2 mt-2" />
              </div>
            ))}
          </div>
        )}

        {/* Real recent inspections */}
        {!loading &&
          !error &&
          recentInspections.length > 0 && (
            <div className="flex flex-col gap-2">
              {recentInspections.map(
                inspection => (
                  <button
                    key={inspection.id}
                    onClick={() =>
                      navigate('inspections')
                    }
                    className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex items-start justify-between text-left hover:border-blue-200 transition-colors"
                  >
                    <div className="flex-1 min-w-0 mr-3">

                      <p className="font-medium text-slate-900 text-sm truncate">
                        {inspection.productName}
                      </p>

                      <p className="text-xs text-slate-500 mt-0.5">
                        Legal Metrology Inspection
                      </p>

                      <p className="text-xs text-slate-400 mt-1 font-mono">
                        #{inspection.id} ·{' '}
                        {inspection.date}
                      </p>

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
          recentInspections.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-8 text-center">
              <p className="text-sm text-slate-400">
                No inspections yet
              </p>

              <p className="text-xs text-slate-400 mt-1">
                Start a new inspection to begin.
              </p>
            </div>
          )}

      </div>
    </MobileShell>
  );
}
