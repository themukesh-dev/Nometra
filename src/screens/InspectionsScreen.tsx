import {
  AlertTriangle,
  Search,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
} from 'react';
import MobileShell from '../components/MobileShell';
import StatusBadge from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import type { ComplianceStatus } from '../types';

const API_BASE_URL = '/api';

const DELETE_CONFIRMATION_TEXT = 'DELETE SCAN';

type BackendInspection = {
  id: number;
  timestamp?: string;
  created_at?: string;

  product_name?: string | null;

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

    backendId: inspection.id,

    productName:
      inspection.product_name ||
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

  /*
   * Delete confirmation state.
   */
  const [
    inspectionToDelete,
    setInspectionToDelete,
  ] = useState<InspectionRow | null>(
    null
  );

  const [
    deleteConfirmation,
    setDeleteConfirmation,
  ] = useState('');

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const [
    deleteError,
    setDeleteError,
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
      setHistoricalInspectionId(
        inspection.backendId
      );

      setHistoricalInspection(null);

      navigate(
        'product-history'
      );
    };

  /*
   * Open delete confirmation modal.
   */
  const openDeleteModal =
    (
      event: MouseEvent,
      inspection: InspectionRow
    ) => {
      event.stopPropagation();

      setInspectionToDelete(
        inspection
      );

      setDeleteConfirmation('');

      setDeleteError('');
    };

  /*
   * Close delete confirmation modal.
   */
  const closeDeleteModal = () => {
    if (deleting) {
      return;
    }

    setInspectionToDelete(null);

    setDeleteConfirmation('');

    setDeleteError('');
  };

  /*
   * Permanently delete the inspection.
   */
  const deleteInspection =
    async () => {
      if (
        !inspectionToDelete ||
        deleteConfirmation !==
          DELETE_CONFIRMATION_TEXT
      ) {
        return;
      }

      const deletingInspectionId =
        inspectionToDelete.backendId;

      setDeleting(true);

      setDeleteError('');

      try {
        const response =
          await fetch(
            `${API_BASE_URL}/inspections/${deletingInspectionId}`,
            {
              method: 'DELETE',
            }
          );

        let data: {
          detail?: string;
          message?: string;
        } = {};

        try {
          data =
            await response.json();
        } catch {
          /*
           * Response may not contain JSON.
           */
        }

        if (!response.ok) {
          throw new Error(
            data.detail ||
              data.message ||
              `Failed to delete inspection (${response.status})`
          );
        }

        /*
         * Remove deleted inspection
         * immediately from the local list.
         */
        setInspections(
          (current) =>
            current.filter(
              (item) =>
                item.backendId !==
                deletingInspectionId
            )
        );

        /*
         * Clear historical state.
         *
         * This prevents the deleted inspection
         * from remaining available in the
         * frontend state.
         */
        setHistoricalInspectionId(
          null
        );

        setHistoricalInspection(
          null
        );

        /*
         * IMPORTANT:
         *
         * Do NOT call closeDeleteModal()
         * here because deleting is still true.
         *
         * Clear the modal state directly
         * after successful deletion.
         */
        setInspectionToDelete(null);

        setDeleteConfirmation('');

        setDeleteError('');
      } catch (err) {
        console.error(
          'Failed to delete inspection:',
          err
        );

        setDeleteError(
          err instanceof Error
            ? err.message
            : 'Failed to delete inspection.'
        );
      } finally {
        setDeleting(false);
      }
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
                  <div
                    key={
                      inspection.id
                    }
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 hover:border-blue-300 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          openHistoricalInspection(
                            inspection
                          )
                        }
                        className="flex-1 min-w-0 text-left active:bg-slate-100 rounded-lg"
                      >
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
                      </button>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <StatusBadge
                          status={
                            inspection.status
                          }
                          size="sm"
                        />

                        <button
                          type="button"
                          onClick={(
                            event
                          ) =>
                            openDeleteModal(
                              event,
                              inspection
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 text-[10px] font-semibold hover:bg-red-100 hover:border-red-300 transition-colors"
                        >
                          <Trash2
                            size={12}
                          />

                          Delete Scan
                        </button>
                      </div>
                    </div>
                  </div>
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

      {/* Delete confirmation modal */}

      {inspectionToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeDeleteModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-scan-title"
            className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
          >
            {/* Modal header */}

            <div className="flex items-start justify-between px-5 pt-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle
                    size={20}
                    className="text-red-600"
                  />
                </div>

                <div>
                  <h2
                    id="delete-scan-title"
                    className="text-base font-semibold text-slate-900"
                  >
                    Delete Scan
                  </h2>

                  <p className="text-xs text-slate-500 mt-1">
                    This action permanently
                    deletes this inspection.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={
                  closeDeleteModal
                }
                disabled={deleting}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Product being deleted */}

            <div className="mx-5 mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
                Inspection
              </p>

              <p className="text-sm font-medium text-slate-900 mt-1 truncate">
                {
                  inspectionToDelete.productName
                }
              </p>

              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                #
                {
                  inspectionToDelete.id
                }
              </p>
            </div>

            {/* Confirmation instruction */}

            <div className="px-5 mt-5">
              <p className="text-sm text-slate-700">
                To permanently delete this
                scan, type:
              </p>

              <div className="mt-2 rounded-lg bg-slate-100 border border-slate-200 px-3 py-2 text-center">
                <code className="text-sm font-bold tracking-wider text-slate-900">
                  {DELETE_CONFIRMATION_TEXT}
                </code>
              </div>

              <input
                type="text"
                value={
                  deleteConfirmation
                }
                onChange={(event) =>
                  setDeleteConfirmation(
                    event.target.value
                  )
                }
                placeholder="Type DELETE SCAN"
                autoFocus
                disabled={deleting}
                className="mt-3 w-full h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-100"
              />

              {deleteConfirmation &&
                deleteConfirmation !==
                  DELETE_CONFIRMATION_TEXT && (
                  <p className="mt-2 text-xs text-red-600">
                    Text does not match. Type
                    exactly{' '}
                    <span className="font-semibold">
                      DELETE SCAN
                    </span>
                    .
                  </p>
                )}

              {deleteError && (
                <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                  <p className="text-xs text-red-700">
                    {deleteError}
                  </p>
                </div>
              )}
            </div>

            {/* Modal actions */}

            <div className="flex gap-2 px-5 py-5 mt-1">
              <button
                type="button"
                onClick={
                  closeDeleteModal
                }
                disabled={deleting}
                className="flex-1 h-10 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  deleteInspection
                }
                disabled={
                  deleting ||
                  deleteConfirmation !==
                    DELETE_CONFIRMATION_TEXT
                }
                className="flex-1 h-10 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
              >
                {deleting
                  ? 'Deleting…'
                  : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileShell>
  );
}