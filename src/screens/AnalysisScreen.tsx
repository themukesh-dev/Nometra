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
    currentInspection,
    setBackendResult,
    applyBackendResultToInspection,
    setAnalysisStep,
  } = useApp();

  /*
   * ==================================================
   * CLASSIFICATION
   * ==================================================
   */

  const category =
    currentInspection?.product?.category ??
    'Other';

  /*
   * ==================================================
   * ANALYSIS STEPS
   * ==================================================
   */

  const [steps, setSteps] =
    useState<AnalysisStep[]>([
      {
        label: 'Image received',
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
        label:
          'Linking findings to evidence',
        status: 'pending',
      },
    ]);

  const [error, setError] =
    useState<string | null>(null);

  /*
   * ==================================================
   * UPDATE ANALYSIS STEP
   * ==================================================
   */

  const updateStep = (
    index: number,
    status: AnalysisStatus
  ) => {
    setSteps((previous) =>
      previous.map(
        (step, stepIndex) =>
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
   * ==================================================
   * RUN ANALYSIS
   * ==================================================
   */

  useEffect(() => {
    console.log(
      'ANALYSIS: Starting analysis'
    );

    const wait = (
      milliseconds: number
    ) =>
      new Promise<void>((resolve) =>
        setTimeout(
          resolve,
          milliseconds
        )
      );

    const runAnalysis = async () => {
      try {
        setError(null);

        /*
         * ==================================================
         * VALIDATE IMAGE
         * ==================================================
         */

        if (!capturedImage) {
          throw new Error(
            'No package image was captured. Please capture an image first.'
          );
        }

        console.log(
          'ANALYSIS: Image found:',
          capturedImage.name
        );

        /*
         * ==================================================
         * STEP 1 — IMAGE RECEIVED
         * ==================================================
         */

        console.log(
          'ANALYSIS: Step 1 active'
        );

        updateStep(
          0,
          'active'
        );

        await wait(350);

        updateStep(
          0,
          'complete'
        );

        console.log(
          'ANALYSIS: Step 1 complete'
        );

        /*
         * ==================================================
         * STEP 2 — IMAGE QUALITY
         * ==================================================
         */

        console.log(
          'ANALYSIS: Step 2 active'
        );

        updateStep(
          1,
          'active'
        );

        await wait(350);

        updateStep(
          1,
          'complete'
        );

        console.log(
          'ANALYSIS: Step 2 complete'
        );

        /*
         * ==================================================
         * CREATE FORM DATA
         * ==================================================
         */

        const formData =
          new FormData();

        /*
         * ==================================================
         * SINGLE IMAGE
         * ==================================================
         *
         * The backend supports multi-view inspection
         * using:
         *
         *     images
         *     image_sides
         *
         * This screen currently sends one captured image,
         * so the image is identified as FRONT.
         *
         * The number of image_sides MUST match the
         * number of images.
         * ==================================================
         */

        formData.append(
          'images',
          capturedImage,
          capturedImage.name
        );

        formData.append(
          'image_sides',
          JSON.stringify([
            'FRONT',
          ])
        );

        console.log(
          'ANALYSIS: Image side:',
          'FRONT'
        );

        /*
         * ==================================================
         * PRODUCT CATEGORY
         * ==================================================
         */

        formData.append(
          'category',
          category
        );

        console.log(
          'ANALYSIS: Product category:',
          category
        );

        /*
         * ==================================================
         * STEP 3 — TEXT EXTRACTION
         * ==================================================
         */

        updateStep(
          2,
          'active'
        );

        console.log(
          'ANALYSIS: Sending image to backend...'
        );

        console.log(
          'ANALYSIS: Backend URL:',
          '/api/scan'
        );

        /*
         * ==================================================
         * SEND TO FLASK BACKEND
         * ==================================================
         */

        let response: Response;

        try {
          response =
            await fetch(
              '/api/scan',
              {
                method: 'POST',
                body: formData,
              }
            );
        } catch (networkError) {
          console.error(
            'ANALYSIS: Backend connection error:',
            networkError
          );

          throw new Error(
            'Unable to connect to the Nometra backend. Please make sure the backend is available.'
          );
        }

        console.log(
          'ANALYSIS: Backend HTTP status:',
          response.status
        );

        /*
         * ==================================================
         * HANDLE HTTP ERROR
         * ==================================================
         */

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
             * Keep default HTTP message.
             */
          }

          throw new Error(
            backendMessage
          );
        }

        /*
         * ==================================================
         * READ BACKEND RESULT
         * ==================================================
         */

        const result =
          await response.json();

        console.log(
          'ANALYSIS: Backend result received:',
          result
        );

        /*
         * ==================================================
         * STEP 3 COMPLETE
         * ==================================================
         */

        setBackendResult(
          result
        );

        updateStep(
          2,
          'complete'
        );

        console.log(
          'ANALYSIS: Step 3 complete'
        );

        /*
         * ==================================================
         * STEP 4 — DECLARATIONS IDENTIFIED
         * ==================================================
         */

        updateStep(
          3,
          'active'
        );

        await wait(350);

        updateStep(
          3,
          'complete'
        );

        console.log(
          'ANALYSIS: Declarations identified'
        );

        /*
         * ==================================================
         * STEP 5 — APPLICABLE REQUIREMENTS
         * ==================================================
         */

        updateStep(
          4,
          'active'
        );

        await wait(350);

        updateStep(
          4,
          'complete'
        );

        console.log(
          'ANALYSIS: Applicable requirements determined'
        );

        /*
         * ==================================================
         * STEP 6 — COMPLIANCE EVALUATION
         * ==================================================
         */

        updateStep(
          5,
          'active'
        );

        await wait(350);

        updateStep(
          5,
          'complete'
        );

        console.log(
          'ANALYSIS: Compliance evaluation complete'
        );

        /*
         * ==================================================
         * STEP 7 — EVIDENCE LINKING
         * ==================================================
         */

        updateStep(
          6,
          'active'
        );

        await wait(350);

        /*
         * ==================================================
         * APPLY BACKEND RESULT
         * ==================================================
         */

        console.log(
          'ANALYSIS: Applying backend result'
        );

        applyBackendResultToInspection(
          result
        );

        console.log(
          'ANALYSIS: Backend result applied'
        );

        updateStep(
          6,
          'complete'
        );

        /*
         * ==================================================
         * FINISH
         * ==================================================
         */

        await wait(500);

        console.log(
          'ANALYSIS: Navigating to compliance result'
        );

        navigate(
          'compliance-result'
        );

      } catch (analysisError) {
        console.error(
          'Analysis failed:',
          analysisError
        );

        const message =
          analysisError instanceof Error
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
    };

    runAnalysis();

  }, [
    capturedImage,
    category,
    navigate,
    setBackendResult,
    applyBackendResultToInspection,
    setAnalysisStep,
  ]);

  /*
   * ==================================================
   * STATUS ICON
   * ==================================================
   */

  const renderStatusIcon = (
    status: AnalysisStatus
  ) => {
    if (
      status === 'active'
    ) {
      return (
        <Loader2
          size={20}
          className="animate-spin"
        />
      );
    }

    if (
      status === 'complete'
    ) {
      return (
        <CheckCircle2
          size={20}
        />
      );
    }

    if (
      status === 'error'
    ) {
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
   * ==================================================
   * UI
   * ==================================================
   */

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">

      <div className="flex-1 px-6 pt-12 pb-8">

        <div className="max-w-md mx-auto">

          {/* HEADER */}

          <div className="mb-8">

            <p className="text-sm font-medium text-slate-500 mb-2">
              INSPECTION ANALYSIS
            </p>

            <h1 className="text-2xl font-semibold text-slate-900">
              Analysing package
            </h1>

            <p className="text-sm text-slate-500 mt-2">
              Processing package image
            </p>

          </div>

          {/* ANALYSIS STEPS */}

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

                    {/* STATUS ICON */}

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

                    {/* LABEL */}

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

          {/* ERROR */}

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
                Capture image again
              </button>

            </div>

          )}

          {/* INFORMATION */}

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
