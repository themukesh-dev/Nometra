import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import MobileShell from '../components/MobileShell';
import { useApp } from '../context/AppContext';

const STEPS = [
  {
    label: 'Images received',
    detail: 'Image ready for processing',
  },
  {
    label: 'Image quality verified',
    detail: 'Quality checks completed',
  },
  {
    label: 'Text extracted',
    detail: 'OCR + Vision extraction completed',
  },
  {
    label: 'Declarations identified',
    detail: 'Package declarations normalized',
  },
  {
    label: 'Determining applicable requirements',
    detail: 'Applying Legal Metrology rules',
  },
  {
    label: 'Evaluating compliance',
    detail: 'Rule engine evaluating declarations',
  },
  {
    label: 'Linking findings to evidence',
    detail: 'Evidence references attached',
  },
];

export default function AnalysisScreen() {
  const {
    navigate,
    capturedImage,
    setBackendResult,
    applyBackendResultToInspection,
    setAnalysisStep,
  } = useApp();

  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [backendFinished, setBackendFinished] = useState(false);

  /*
   * Visual progress only.
   * The actual scan is handled separately below.
   */
  useEffect(() => {
    if (!capturedImage) return;

    setCurrentStep(0);
    setAnalysisStep(0);

    const interval = window.setInterval(() => {
      setCurrentStep((previous) => {
        if (previous >= STEPS.length - 1) {
          return previous;
        }

        return previous + 1;
      });
    }, 700);

    return () => {
      window.clearInterval(interval);
    };
  }, [capturedImage, setAnalysisStep]);

  /*
   * Synchronize visual progress with app context.
   */
  useEffect(() => {
    setAnalysisStep(currentStep);
  }, [currentStep, setAnalysisStep]);

  /*
   * Actual backend scan.
   */
  useEffect(() => {
    let cancelled = false;

    const runScan = async () => {
      setError(null);
      setBackendFinished(false);

      if (!capturedImage) {
        setError(
          'No image was captured. Please return to Capture and select an image.'
        );
        return;
      }

      try {
        const formData = new FormData();

        formData.append(
          'image',
          capturedImage
        );

        const response = await fetch(
          'http://127.0.0.1:5000/scan',
          {
            method: 'POST',
            body: formData,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              `Backend returned HTTP ${response.status}`
          );
        }

        if (cancelled) return;

        /*
         * Store complete backend response.
         */
        setBackendResult(data);

        /*
         * Convert backend extraction + compliance
         * results into the current inspection.
         *
         * This replaces the old demo-data flow.
         */
        applyBackendResultToInspection(data);

        setBackendFinished(true);
      } catch (err) {
        if (cancelled) return;

        const message =
          err instanceof Error
            ? err.message
            : 'Unable to connect to the backend.';

        setError(message);
      }
    };

    runScan();

    return () => {
      cancelled = true;
    };
  }, [
    capturedImage,
    setBackendResult,
    applyBackendResultToInspection,
  ]);

  /*
   * Navigate to compliance result after
   * backend processing completes.
   */
  useEffect(() => {
    if (!backendFinished) return;

    setCurrentStep(STEPS.length - 1);
    setAnalysisStep(STEPS.length);

    const timer = window.setTimeout(() => {
      navigate('compliance-result');
    }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    backendFinished,
    navigate,
    setAnalysisStep,
  ]);

  /*
   * Error state.
   */
  if (error) {
    return (
      <MobileShell
        title="Analysis Failed"
        hideNav
      >
        <div className="px-4 pt-10">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <XCircle
              size={42}
              className="text-red-600 mx-auto mb-4"
            />

            <h2 className="font-display font-bold text-lg text-slate-900">
              Analysis Failed
            </h2>

            <p className="text-sm text-slate-600 mt-2">
              {error}
            </p>

            <button
              onClick={() =>
                navigate('capture')
              }
              className="w-full h-12 bg-blue-700 text-white font-display font-semibold rounded-xl mt-6"
            >
              Capture Again
            </button>
          </div>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell
      title="Analyzing Evidence"
      hideNav
    >
      <div className="px-4 pt-6 pb-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-700 rounded-2xl mx-auto flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>

          <h1 className="font-display font-bold text-xl text-slate-900 mt-5">
            Analyzing Package Evidence
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            {
              STEPS[
                Math.min(
                  currentStep,
                  STEPS.length - 1
                )
              ].detail
            }
          </p>
        </div>

        {/* Progress list */}
        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">

          {STEPS.map((step, index) => {
            const isDone =
              index < currentStep ||
              (
                backendFinished &&
                index ===
                  STEPS.length - 1
              );

            const isActive =
              index === currentStep &&
              !isDone;

            return (
              <div
                key={step.label}
                className={`flex items-center gap-3 px-4 py-4 border-b last:border-b-0 transition-colors ${
                  isActive
                    ? 'bg-blue-50'
                    : 'bg-white'
                }`}
              >

                <div className="shrink-0">
                  {isDone ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <CheckCircle2
                        size={14}
                        className="text-white"
                      />
                    </div>
                  ) : isActive ? (
                    <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
                  )}
                </div>

                <div className="min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      isDone
                        ? 'text-slate-700'
                        : isActive
                        ? 'text-blue-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </p>

                  {isActive && (
                    <p className="text-xs text-blue-600 mt-0.5">
                      {step.detail}
                    </p>
                  )}
                </div>

              </div>
            );
          })}

        </div>

        {/* Backend status */}
        <div className="text-center mt-6">
          <p className="text-xs text-slate-400">
            {backendFinished
              ? 'Analysis completed'
              : 'Processing package evidence…'}
          </p>
        </div>

      </div>
    </MobileShell>
  );
}