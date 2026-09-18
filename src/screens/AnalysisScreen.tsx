import { useEffect, useState } from 'react';

import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
} from 'lucide-react';

import { useApp } from '../context/AppContext';

type AnalysisStatus =
  | 'pending'
  | 'active'
  | 'complete'
  | 'error';

interface AnalysisStep {
  label: string;
  status: AnalysisStatus;
}

export default function AnalysisScreen() {
  const {
    navigate,
    capturedImage,
    capturedImages,
    currentInspection,
    setBackendResult,
    applyBackendResultToInspection,
    setAnalysisStep,
  } = useApp();

  const [steps, setSteps] = useState<
    AnalysisStep[]
  >([
    {
      label: 'Images received',
      status: 'pending',
    },
    {
      label: 'Image quality verified',
      status: 'pending',
    },
    {
      label: 'Text extracted',
      status: 'pending',
    },
    {
      label: 'Declarations identified',
      status: 'pending',
    },
    {
      label:
        'Determining applicable requirements',
      status: 'pending',
    },
    {
      label: 'Evaluating compliance',
      status: 'pending',
    },
    {
      label: 'Linking findings to evidence',
      status: 'pending',
    },
  ]);

  const [error, setError] =
    useState<string | null>(null);

  /*
   * --------------------------------------------------
   * HELPERS
   * --------------------------------------------------
   */

  const updateStep = (
    index: number,
    status: AnalysisStatus
  ) => {
    setSteps((previous) =>
      previous.map((step, stepIndex) =>
        stepIndex === index
          ? {
              ...step,
              status,
            }
          : step
      )
    );

    setAnalysisStep(index);
  };

  /*
   * --------------------------------------------------
   * RUN BACKEND ANALYSIS
   * --------------------------------------------------
   */

  useEffect(() => {
    let cancelled = false;

    const runAnalysis = async () => {
      setError(null);

      /*
       * ------------------------------------------------
       * COLLECT ALL CAPTURED IMAGES
       * ------------------------------------------------
       *
       * capturedImages contains:
       *
       * {
       *   FRONT: File,
       *   BACK: File,
       *   LEFT: File,
       *   RIGHT: File,
       *   BOTTOM: File
       * }
       *
       * We send every available image.
       */

      const multiViewEntries =
        Object.entries(capturedImages).filter(
          (
            entry
          ): entry is [
            string,
            File
          ] =>
            entry[1] instanceof File
        );

      /*
       * ------------------------------------------------
       * SINGLE IMAGE FALLBACK
       * ------------------------------------------------
       *
       * This keeps the existing flow working if
       * capturedImages is empty but capturedImage exists.
       */

      if (
        multiViewEntries.length === 0 &&
        !capturedImage
      ) {
        setError(
          'No package image was captured. Please capture at least one image.'
        );

        updateStep(0, 'error');

        return;
      }

      /*
       * ------------------------------------------------
       * SORT SIDES INTO A DETERMINISTIC ORDER
       * ------------------------------------------------
       */

      const sideOrder = [
        'FRONT',
        'BACK',
        'LEFT',
        'RIGHT',
        'BOTTOM',
      ];

      multiViewEntries.sort(
        ([sideA], [sideB]) => {
          const indexA =
            sideOrder.indexOf(sideA);

          const indexB =
            sideOrder.indexOf(sideB);

          return (
            (indexA === -1
              ? 999
              : indexA) -
            (indexB === -1
              ? 999
              : indexB)
          );
        }
      );

      /*
       * ------------------------------------------------
       * BUILD IMAGE LIST
       * ------------------------------------------------
       */

      const images =
        multiViewEntries.length > 0
          ? multiViewEntries.map(
              ([, file]) => file
            )
          : capturedImage
          ? [capturedImage]
          : [];

      const sides =
        multiViewEntries.length > 0
          ? multiViewEntries.map(
              ([side]) => side
            )
          : ['FRONT'];

      /*
       * ------------------------------------------------
       * STEP 1 — IMAGES RECEIVED
       * ------------------------------------------------
       */

      updateStep(0, 'active');

      await new Promise((resolve) =>
        setTimeout(resolve, 350)
      );

      if (cancelled) return;

      updateStep(0, 'complete');

      /*
       * ------------------------------------------------
       * STEP 2 — IMAGE QUALITY
       * ------------------------------------------------
       *
       * The backend currently performs the real
       * processing. This step represents the pipeline
       * stage before extraction.
       */

      updateStep(1, 'active');

      await new Promise((resolve) =>
        setTimeout(resolve, 350)
      );

      if (cancelled) return;

      updateStep(1, 'complete');

      /*
       * ------------------------------------------------
       * CREATE FORMDATA
       * ------------------------------------------------
       */

      const formData =
        new FormData();

      /*
       * Multi-image request.
       *
       * Every image is appended under the same
       * "images" field.
       *
       * Flask will later read them using:
       *
       * request.files.getlist("images")
       */

      images.forEach((file) => {
        formData.append(
          'images',
          file,
          file.name
        );
      });

      /*
       * Side information is sent in exactly the
       * same order as the images above.
       */

      formData.append(
        'image_sides',
        JSON.stringify(sides)
      );

      /*
       * ------------------------------------------------
       * CLASSIFICATION
       * ------------------------------------------------
       */

      const category =
        currentInspection?.product
          ?.category ?? 'Other';

      const origin =
        currentInspection?.product
          ?.isImported
          ? 'imported'
          : 'domestic';

      const saleType =
        currentInspection?.product
          ?.saleType ?? 'retail';

      formData.append(
        'category',
        category
      );

      formData.append(
        'origin',
        origin
      );

      formData.append(
        'sale_type',
        saleType
      );

      /*
       * ------------------------------------------------
       * STEP 3 — TEXT EXTRACTION
       * ------------------------------------------------
       */

      updateStep(2, 'active');

      /*
       * Give the UI a short delay so the user can
       * actually see the processing stage.
       */

      await new Promise((resolve) =>
        setTimeout(resolve, 450)
      );

      if (cancelled) return;

      /*
       * ------------------------------------------------
       * BACKEND REQUEST
       * ------------------------------------------------
       */

      let response: Response;

      try {
        response = await fetch(
          'http://127.0.0.1:5000/scan',
          {
            method: 'POST',
            body: formData,
          }
        );
      } catch (networkError) {
        console.error(
          'Backend connection error:',
          networkError
        );

        throw new Error(
          'Unable to connect to the Nometra backend. Make sure the Flask server is running on port 5000.'
        );
      }

      if (!response.ok) {
        let backendMessage =
          `Backend returned HTTP ${response.status}.`;

        try {
          const errorData =
            await response.json();

          if (
            typeof errorData?.error ===
            'string'
          ) {
            backendMessage =
              errorData.error;
          }
        } catch {
          /*
           * Keep the default HTTP error message
           * if the backend response is not JSON.
           */
        }

        throw new Error(
          backendMessage
        );
      }

      const result =
        await response.json();

      if (cancelled) return;

      /*
       * ------------------------------------------------
       * STORE REAL BACKEND RESULT
       * ------------------------------------------------
       */

      setBackendResult(result);

      /*
       * ------------------------------------------------
       * TEXT EXTRACTION COMPLETE
       * ------------------------------------------------
       */

      updateStep(2, 'complete');

      /*
       * ------------------------------------------------
       * STEP 4 — DECLARATIONS IDENTIFIED
       * ------------------------------------------------
       */

      updateStep(3, 'active');

      await new Promise((resolve) =>
        setTimeout(resolve, 350)
      );

      if (cancelled) return;

      updateStep(3, 'complete');

      /*
       * ------------------------------------------------
       * STEP 5 — APPLICABLE REQUIREMENTS
       * ------------------------------------------------
       */

      updateStep(4, 'active');

      await new Promise((resolve) =>
        setTimeout(resolve, 350)
      );

      if (cancelled) return;

      updateStep(4, 'complete');

      /*
       * ------------------------------------------------
       * STEP 6 — COMPLIANCE EVALUATION
       * ------------------------------------------------
       */

      updateStep(5, 'active');

      await new Promise((resolve) =>
        setTimeout(resolve, 350)
      );

      if (cancelled) return;

      updateStep(5, 'complete');

      /*
       * ------------------------------------------------
       * STEP 7 — EVIDENCE LINKING
       * ------------------------------------------------
       */

      updateStep(6, 'active');

      await new Promise((resolve) =>
        setTimeout(resolve, 350)
      );

      if (cancelled) return;

      /*
       * Apply the complete backend result to the
       * current frontend inspection.
       *
       * This also maps source_side from multi-view
       * extraction into SIDE-FRONT / SIDE-BACK etc.
       */

      applyBackendResultToInspection(
        result
      );

      updateStep(6, 'complete');

      /*
       * ------------------------------------------------
       * FINISH
       * ------------------------------------------------
       */

      await new Promise((resolve) =>
        setTimeout(resolve, 500)
      );

      if (cancelled) return;

      navigate(
        'compliance-result'
      );
    };

    runAnalysis().catch(
      (analysisError) => {
        if (cancelled) {
          return;
        }

        console.error(
          'Analysis failed:',
          analysisError
        );

        const message =
          analysisError instanceof
          Error
            ? analysisError.message
            : 'Analysis failed. Please try again.';

        setError(message);

        setSteps((previous) =>
          previous.map(
            (step) =>
              step.status ===
                'active'
                ? {
                    ...step,
                    status: 'error',
                  }
                : step
          )
        );
      }
    );

    return () => {
      cancelled = true;
    };
  }, [
    capturedImage,
    capturedImages,
    navigate,
    setBackendResult,
    applyBackendResultToInspection,
    setAnalysisStep,
  ]);

  /*
   * --------------------------------------------------
   * RENDER STATUS ICON
   * --------------------------------------------------
   */

  const renderStatusIcon = (
    status: AnalysisStatus
  ) => {
    if (status === 'active') {
      return (
        <Loader2
          size={20}
          className="animate-spin"
        />
      );
    }

    if (status === 'complete') {
      return (
        <CheckCircle2
          size={20}
        />
      );
    }

    if (status === 'error') {
      return (
        <XCircle
          size={20}
        />
      );
    }

    return (
      <Circle size={20} />
    );
  };

  /*
   * --------------------------------------------------
   * IMAGE COUNT
   * --------------------------------------------------
   */

  const imageCount =
    Object.values(
      capturedImages
    ).filter(
      (file) =>
        file instanceof File
    ).length;

  /*
   * --------------------------------------------------
   * UI
   * --------------------------------------------------
   */

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <div className="flex-1 px-6 pt-12 pb-8">
        <div className="max-w-md mx-auto">
          <div className="mb-8">
            <p className="text-sm font-medium text-slate-500 mb-2">
              INSPECTION ANALYSIS
            </p>

            <h1 className="text-2xl font-semibold text-slate-900">
              Analysing package
            </h1>

            <p className="text-sm text-slate-500 mt-2">
              {imageCount > 0
                ? `Processing ${imageCount} package image${
                    imageCount === 1
                      ? ''
                      : 's'
                  }`
                : 'Processing package image'}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="space-y-5">
              {steps.map(
                (
                  step,
                  index
                ) => (
                  <div
                    key={`${step.label}-${index}`}
                    className="flex items-center gap-4"
                  >
                    <div
                      className={`flex-shrink-0 ${
                        step.status ===
                        'pending'
                          ? 'text-slate-300'
                          : step.status ===
                            'active'
                          ? 'text-slate-700'
                          : step.status ===
                            'complete'
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}
                    >
                      {renderStatusIcon(
                        step.status
                      )}
                    </div>

                    <div className="flex-1">
                      <p
                        className={`text-sm ${
                          step.status ===
                          'pending'
                            ? 'text-slate-400'
                            : step.status ===
                              'active'
                            ? 'text-slate-900 font-medium'
                            : step.status ===
                              'complete'
                            ? 'text-slate-700'
                            : 'text-red-700 font-medium'
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">
                Analysis failed
              </p>

              <p className="text-sm text-red-700 mt-1">
                {error}
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    'capture'
                  )
                }
                className="mt-4 text-sm font-medium text-red-800 underline underline-offset-2"
              >
                Capture images again
              </button>
            </div>
          )}

          {!error && (
            <div className="mt-6 text-center">
              <p className="text-xs text-slate-400">
                Nometra is comparing package
                declarations against the
                applicable inspection rules.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}