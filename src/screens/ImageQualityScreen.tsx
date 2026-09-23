import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import MobileShell from '../components/MobileShell';
import { useApp } from '../context/AppContext';

interface ImageQualityMetrics {
  width: number;
  height: number;
  brightness: number;
  sharpness: number;
}

interface ImageQualityResult {
  is_acceptable: boolean;
  issues: string[];
  metrics: ImageQualityMetrics;
  source: string;
}

interface ImageQualityResponse {
  image_quality?: ImageQualityResult;
  error?: string;
}

interface QualityCheck {
  label: string;
  status: 'GOOD' | 'POOR';
  value: string;
}

export default function ImageQualityScreen() {
  const {
    navigate,
    capturedImage,
  } = useApp();

  const [qualityResult, setQualityResult] =
    useState<ImageQualityResult | null>(null);

  const [checking, setChecking] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const runQualityCheck = async () => {
      if (!capturedImage) {
        setQualityResult(null);
        setError('No captured image is available.');
        return;
      }

      setChecking(true);
      setError(null);
      setQualityResult(null);

      try {
        const formData = new FormData();

        formData.append(
          'image',
          capturedImage,
          capturedImage.name || 'package-image.jpg'
        );

        const response = await fetch(
          '/api/image-quality',
          {
            method: 'POST',
            body: formData,
          }
        );

        const data: ImageQualityResponse =
          await response.json();

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setError(
            data.error ||
              'Image quality analysis failed.'
          );

          if (data.image_quality) {
            setQualityResult(
              data.image_quality
            );
          }

          return;
        }

        if (!data.image_quality) {
          setError(
            'No image quality result was returned.'
          );
          return;
        }

        setQualityResult(
          data.image_quality
        );
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          'Image quality check failed:',
          err
        );

        setError(
          'Unable to connect to the image quality service.'
        );
      } finally {
        if (!cancelled) {
          setChecking(false);
        }
      }
    };

    runQualityCheck();

    return () => {
      cancelled = true;
    };
  }, [capturedImage]);

  const qualityChecks: QualityCheck[] =
    useMemo(() => {
      if (!qualityResult) {
        return [];
      }

      const metrics =
        qualityResult.metrics;

      const resolutionGood =
        metrics.width >= 400 &&
        metrics.height >= 400;

      const brightnessGood =
        metrics.brightness >= 40 &&
        metrics.brightness <= 235;

      const sharpnessGood =
        metrics.sharpness >= 8;

      return [
        {
          label: 'Resolution',
          status: resolutionGood
            ? 'GOOD'
            : 'POOR',
          value:
            `${metrics.width} × ${metrics.height}`,
        },
        {
          label: 'Brightness',
          status: brightnessGood
            ? 'GOOD'
            : 'POOR',
          value:
            metrics.brightness.toFixed(2),
        },
        {
          label: 'Sharpness',
          status: sharpnessGood
            ? 'GOOD'
            : 'POOR',
          value:
            metrics.sharpness.toFixed(2),
        },
        {
          label: 'Blur',
          status: sharpnessGood
            ? 'GOOD'
            : 'POOR',
          value: sharpnessGood
            ? 'Low'
            : 'High',
        },
      ];
    }, [qualityResult]);

  const allGood =
    !checking &&
    !!qualityResult &&
    qualityResult.is_acceptable &&
    qualityChecks.length > 0 &&
    qualityChecks.every(
      check => check.status === 'GOOD'
    );

  const imagePreviewUrl =
    useMemo(() => {
      if (!capturedImage) {
        return null;
      }

      return URL.createObjectURL(
        capturedImage
      );
    }, [capturedImage]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(
          imagePreviewUrl
        );
      }
    };
  }, [imagePreviewUrl]);

  return (
    <MobileShell
      title="Image Quality"
      backScreen="capture"
    >
      <div className="px-4 pb-6 pt-4">

        {/* Image preview */}
        {capturedImage &&
          imagePreviewUrl && (
            <div className="mb-5">
              <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">
                Captured Image
              </p>

              <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                <img
                  src={imagePreviewUrl}
                  alt="Captured package"
                  className="w-full max-h-72 object-contain"
                />
              </div>
            </div>
          )}

        {/* Checking state */}
        {checking && (
          <div className="rounded-xl px-4 py-3.5 mb-5 flex items-center gap-3 bg-blue-50 border border-blue-200">
            <Loader2
              size={22}
              className="text-blue-600 shrink-0 animate-spin"
            />

            <div>
              <p className="font-display font-semibold text-sm text-blue-800">
                Checking image quality
              </p>

              <p className="text-xs mt-0.5 text-blue-700">
                OpenCV is analyzing resolution,
                brightness, and sharpness.
              </p>
            </div>
          </div>
        )}

        {/* Overall result */}
        {!checking &&
          qualityResult && (
            <div
              className={`rounded-xl px-4 py-3.5 mb-5 flex items-center gap-3 ${
                allGood
                  ? 'bg-emerald-50 border border-emerald-200'
                  : 'bg-amber-50 border border-amber-200'
              }`}
            >
              {allGood ? (
                <CheckCircle2
                  size={22}
                  className="text-emerald-600 shrink-0"
                />
              ) : (
                <AlertTriangle
                  size={22}
                  className="text-amber-600 shrink-0"
                />
              )}

              <div>
                <p
                  className={`font-display font-semibold text-sm ${
                    allGood
                      ? 'text-emerald-800'
                      : 'text-amber-800'
                  }`}
                >
                  {allGood
                    ? 'Image quality verified'
                    : 'Image quality insufficient'}
                </p>

                <p
                  className={`text-xs mt-0.5 ${
                    allGood
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}
                >
                  {allGood
                    ? 'The image is suitable for declaration extraction and compliance verification.'
                    : qualityResult.issues.length > 0
                      ? qualityResult.issues.join(
                          ' '
                        )
                      : 'Some declarations may not be reliably verified from this image.'}
                </p>
              </div>
            </div>
          )}

        {/* Error */}
        {!checking &&
          error &&
          !qualityResult && (
            <div className="rounded-xl px-4 py-3.5 mb-5 flex items-center gap-3 bg-amber-50 border border-amber-200">
              <AlertTriangle
                size={22}
                className="text-amber-600 shrink-0"
              />

              <div>
                <p className="font-display font-semibold text-sm text-amber-800">
                  Image quality check failed
                </p>

                <p className="text-xs mt-0.5 text-amber-700">
                  {error}
                </p>
              </div>
            </div>
          )}

        {/* Quality checks */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-5">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="font-display font-semibold text-sm text-slate-900">
              Quality Checks
            </p>
          </div>

          {checking ? (
            <div className="px-4 py-5 text-center">
              <p className="text-xs text-slate-500">
                Analyzing captured image...
              </p>
            </div>
          ) : qualityChecks.length > 0 ? (
            qualityChecks.map(
              (check, index) => (
                <div
                  key={check.label}
                  className={`flex items-center justify-between px-4 py-3 ${
                    index <
                    qualityChecks.length - 1
                      ? 'border-b border-slate-100'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {check.status ===
                    'GOOD' ? (
                      <CheckCircle2
                        size={16}
                        className="text-emerald-500 shrink-0"
                      />
                    ) : (
                      <AlertTriangle
                        size={16}
                        className="text-amber-500 shrink-0"
                      />
                    )}

                    <span className="text-sm text-slate-700">
                      {check.label}
                    </span>
                  </div>

                  <span
                    className={`text-xs font-medium ${
                      check.status ===
                      'GOOD'
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {check.value}
                  </span>
                </div>
              )
            )
          ) : (
            <div className="px-4 py-5 text-center">
              <p className="text-xs text-slate-500">
                No quality metrics available.
              </p>
            </div>
          )}
        </div>

        {/* Detected issues */}
        {!checking &&
          qualityResult &&
          qualityResult.issues.length >
            0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
              <p className="text-amber-800 text-sm font-medium">
                Issues detected
              </p>

              <ul className="mt-1 space-y-1">
                {qualityResult.issues.map(
                  (issue, index) => (
                    <li
                      key={index}
                      className="text-amber-700 text-xs"
                    >
                      • {issue}
                    </li>
                  )
                )}
              </ul>
            </div>
          )}

        {/* Quality principle */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6">
          <p className="text-blue-800 text-sm font-medium">
            Quality principle
          </p>

          <p className="text-blue-700 text-xs mt-0.5">
            Poor image quality does not
            automatically result in a
            violation finding. Inconclusive
            evidence is marked for inspector
            verification.
          </p>
        </div>

        {/* Continue */}
        <button
          onClick={() =>
            navigate('category')
          }
          disabled={
            !capturedImage ||
            checking ||
            !allGood
          }
          className="w-full h-12 bg-blue-700 text-white font-display font-semibold rounded-xl hover:bg-blue-800 active:scale-[0.98] transition-all mb-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {checking
            ? 'Checking Image...'
            : 'Continue — Select Category'}
        </button>

        {/* Retake */}
        <button
          onClick={() =>
            navigate('capture')
          }
          className="w-full h-12 border border-slate-200 bg-white text-slate-700 font-display font-medium text-sm rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
        >
          <RotateCcw size={16} />
          Retake Image
        </button>

        <p className="text-center text-xs text-slate-400 mt-4">
          Make sure the package label is clearly
          visible before continuing.
        </p>
      </div>
    </MobileShell>
  );
}