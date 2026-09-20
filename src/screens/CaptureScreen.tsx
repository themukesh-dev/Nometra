import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Image as ImageIcon,
  RotateCcw,
  ArrowRight,
  X,
  Flashlight,
  FlashlightOff,
} from 'lucide-react';

import MobileShell from '../components/MobileShell';
import { useApp } from '../context/AppContext';

export default function CaptureScreen() {
  const {
    navigate,
    capturedImage,
    setCapturedImage,
  } = useApp();

  /*
   * ==================================================
   * REFS
   * ==================================================
   */

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const galleryInputRef =
    useRef<HTMLInputElement | null>(null);

  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const streamRef =
    useRef<MediaStream | null>(null);

  /*
   * ==================================================
   * STATE
   * ==================================================
   */

  const [cameraOpen, setCameraOpen] =
    useState(false);

  const [cameraError, setCameraError] =
    useState<string | null>(null);

  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);

  const [torchSupported, setTorchSupported] =
    useState(false);

  const [torchOn, setTorchOn] =
    useState(false);

  /*
   * ==================================================
   * CREATE IMAGE PREVIEW
   * ==================================================
   */

  useEffect(() => {
    if (!capturedImage) {
      setPreviewUrl(null);
      return;
    }

    const url =
      URL.createObjectURL(capturedImage);

    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [capturedImage]);

  /*
   * ==================================================
   * STOP CAMERA
   * ==================================================
   */

  const stopCamera = () => {
    /*
     * Turn off torch before stopping
     * the camera if possible.
     */

    const stream =
      streamRef.current;

    if (stream) {
      const track =
        stream.getVideoTracks()[0];

      if (track) {
        try {
          const capabilities =
            track.getCapabilities();

          if ('torch' in capabilities) {
            void track.applyConstraints({
              advanced: [
                {
                  torch: false,
                } as MediaTrackConstraintSet,
              ],
            });
          }
        } catch {
          /*
           * Ignore torch cleanup errors.
           */
        }
      }

      stream
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setTorchOn(false);
    setTorchSupported(false);
    setCameraOpen(false);
  };

  /*
   * ==================================================
   * CLEANUP CAMERA WHEN SCREEN UNMOUNTS
   * ==================================================
   */

  useEffect(() => {
    return () => {
      const stream =
        streamRef.current;

      if (stream) {
        stream
          .getTracks()
          .forEach((track) => {
            track.stop();
          });

        streamRef.current = null;
      }
    };
  }, []);

  /*
   * ==================================================
   * OPEN CAMERA
   * ==================================================
   */

  const openCamera = async () => {
    setCameraError(null);

    try {
      /*
       * Check browser camera support.
       */

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraError(
          'Camera access is not supported in this browser.'
        );

        return;
      }

      /*
       * Request rear camera.
       */

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            video: {
              facingMode: {
                ideal: 'environment',
              },
            },
            audio: false,
          }
        );

      streamRef.current = stream;

      /*
       * Check torch support.
       */

      const videoTrack =
        stream.getVideoTracks()[0];

      if (videoTrack) {
        try {
          const capabilities =
            videoTrack.getCapabilities();

          setTorchSupported(
            'torch' in capabilities
          );
        } catch (error) {
          console.warn(
            'Unable to detect torch support:',
            error
          );

          setTorchSupported(false);
        }
      } else {
        setTorchSupported(false);
      }

      setTorchOn(false);

      /*
       * Open camera UI.
       */

      setCameraOpen(true);

      /*
       * Attach stream after the
       * video element renders.
       */

      requestAnimationFrame(() => {
        if (!videoRef.current) {
          return;
        }

        videoRef.current.srcObject =
          stream;

        videoRef.current
          .play()
          .catch((error) => {
            console.warn(
              'Video autoplay failed:',
              error
            );
          });
      });
    } catch (error) {
      console.error(
        'Camera error:',
        error
      );

      setCameraError(
        'Unable to access the camera. Please allow camera permission or upload an image from your gallery.'
      );

      setCameraOpen(false);
    }
  };

  /*
   * ==================================================
   * TOGGLE FLASH / TORCH
   * ==================================================
   */

  const toggleTorch = async () => {
    const stream =
      streamRef.current;

    if (!stream) {
      return;
    }

    const track =
      stream.getVideoTracks()[0];

    if (!track) {
      return;
    }

    try {
      const capabilities =
        track.getCapabilities();

      /*
       * Browser/device does not expose
       * torch support.
       */

      if (!('torch' in capabilities)) {
        setTorchSupported(false);

        setCameraError(
          'Flash is not supported on this camera.'
        );

        return;
      }

      const newTorchState =
        !torchOn;

      await track.applyConstraints({
        advanced: [
          {
            torch: newTorchState,
          } as MediaTrackConstraintSet,
        ],
      });

      setTorchOn(newTorchState);

      setCameraError(null);
    } catch (error) {
      console.error(
        'Torch error:',
        error
      );

      setCameraError(
        'Unable to control the camera flash on this device.'
      );
    }
  };

  /*
   * ==================================================
   * CAPTURE PHOTO
   * ==================================================
   */

  const capturePhoto = () => {
    const video =
      videoRef.current;

    if (!video) {
      return;
    }

    /*
     * Make sure camera has actually
     * started producing frames.
     */

    if (
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      setCameraError(
        'Camera is not ready yet. Please try again.'
      );

      return;
    }

    /*
     * Create canvas matching the
     * actual camera resolution.
     */

    const canvas =
      document.createElement('canvas');

    canvas.width =
      video.videoWidth;

    canvas.height =
      video.videoHeight;

    const context =
      canvas.getContext('2d');

    if (!context) {
      setCameraError(
        'Unable to capture the image.'
      );

      return;
    }

    /*
     * Draw current camera frame.
     */

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    /*
     * Convert canvas to JPEG.
     */

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError(
            'Unable to create the captured image.'
          );

          return;
        }

        const file =
          new File(
            [blob],
            `nometra-${Date.now()}.jpg`,
            {
              type: 'image/jpeg',
            }
          );

        /*
         * Store exactly ONE image.
         */

        setCapturedImage(file);

        /*
         * Stop camera after capture.
         */

        stopCamera();
      },
      'image/jpeg',
      0.92
    );
  };

  /*
   * ==================================================
   * FILE SELECTION
   * ==================================================
   */

  const handleFileSelected = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    /*
     * Validate file type.
     */

    if (!file.type.startsWith('image/')) {
      setCameraError(
        'Please select a valid image file.'
      );

      event.target.value = '';

      return;
    }

    setCameraError(null);

    /*
     * Store exactly ONE image.
     */

    setCapturedImage(file);

    /*
     * Reset input so the same image
     * can be selected again.
     */

    event.target.value = '';
  };

  /*
   * ==================================================
   * RETAKE PHOTO
   * ==================================================
   */

  const retakePhoto = () => {
    setCapturedImage(null);

    setCameraError(null);

    openCamera();
  };

  /*
   * ==================================================
   * CONTINUE TO IMAGE QUALITY
   * ==================================================
   */

  const continueToImageQuality = () => {
    if (!capturedImage) {
      return;
    }

    navigate('image-quality');
  };

  /*
   * ==================================================
   * CAMERA SCREEN
   * ==================================================
   */

  if (cameraOpen) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col">
        {/* ==========================================
            CAMERA HEADER
            ========================================== */}

        <div className="flex items-center justify-between px-4 py-4 text-white">
          {/* Close */}
          <button
            type="button"
            onClick={stopCamera}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            aria-label="Close camera"
          >
            <X size={22} />
          </button>

          {/* Title */}
          <span className="font-semibold">
            Capture Package
          </span>

          {/* Flash */}
          {torchSupported ? (
            <button
              type="button"
              onClick={toggleTorch}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                torchOn
                  ? 'bg-white text-slate-900'
                  : 'bg-white/10 text-white'
              }`}
              aria-label={
                torchOn
                  ? 'Turn flash off'
                  : 'Turn flash on'
              }
            >
              {torchOn ? (
                <FlashlightOff
                  size={21}
                />
              ) : (
                <Flashlight
                  size={21}
                />
              )}
            </button>
          ) : (
            <div className="w-10" />
          )}
        </div>

        {/* ==========================================
            CAMERA PREVIEW
            ========================================== */}

        <div className="flex-1 flex items-center justify-center px-4">
          <div className="relative w-full max-w-md aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Guide frame */}

            <div className="absolute inset-8 border-2 border-white/70 rounded-xl pointer-events-none" />

            {/* Top instruction */}

            <div className="absolute top-5 left-0 right-0 text-center">
              <span className="inline-block px-3 py-1.5 rounded-full bg-black/50 text-white text-xs">
                Keep the package clearly visible
              </span>
            </div>

            {/* Flash indicator */}

            {torchOn && (
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 text-slate-900 text-xs font-medium">
                  <Flashlight
                    size={14}
                  />

                  Flash On
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ==========================================
            CAMERA ERROR
            ========================================== */}

        {cameraError && (
          <div className="px-4 pb-2">
            <div className="rounded-xl bg-red-500/90 px-4 py-3">
              <p className="text-sm text-white text-center">
                {cameraError}
              </p>
            </div>
          </div>
        )}

        {/* ==========================================
            CAPTURE BUTTON
            ========================================== */}

        <div className="pb-10 pt-5 flex justify-center">
          <button
            type="button"
            onClick={capturePhoto}
            className="w-20 h-20 rounded-full border-4 border-white bg-white/20 flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Take photo"
          >
            <div className="w-14 h-14 rounded-full bg-white" />
          </button>
        </div>
      </div>
    );
  }

  /*
   * ==================================================
   * NORMAL CAPTURE SCREEN
   * ==================================================
   */

  return (
    <MobileShell
      title="Capture Package"
      backScreen="new-inspection"
      hideNav
    >
      <div className="min-h-full px-4 py-5 flex flex-col">
        {/* ==========================================
            HEADING
            ========================================== */}

        <div className="mb-5">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
            Step 1
          </p>

          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Capture the package
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            Take a clear photo of the package
            label for inspection.
          </p>
        </div>

        {/* ==========================================
            CAPTURED IMAGE
            ========================================== */}

        {previewUrl ? (
          <div className="flex-1">
            {/* Image */}

            <div className="relative rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
              <img
                src={previewUrl}
                alt="Captured package"
                className="w-full max-h-[460px] object-contain bg-slate-100"
              />

              {/* Status */}

              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-xs font-medium">
                  Image captured
                </span>
              </div>
            </div>

            {/* Image information */}

            <div className="mt-4 rounded-xl bg-white border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">
                Package image ready
              </p>

              <p className="text-xs text-slate-500 mt-1">
                The image will now be checked
                for quality before analysis.
              </p>
            </div>

            {/* Actions */}

            <div className="mt-5 grid grid-cols-2 gap-3">
              {/* Retake */}

              <button
                type="button"
                onClick={retakePhoto}
                className="h-12 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
              >
                <RotateCcw
                  size={18}
                />

                Retake
              </button>

              {/* Continue */}

              <button
                type="button"
                onClick={
                  continueToImageQuality
                }
                className="h-12 rounded-xl bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 hover:bg-blue-800 transition-colors"
              >
                Verify Image

                <ArrowRight
                  size={18}
                />
              </button>
            </div>
          </div>
        ) : (
          /*
           * ==========================================
           * NO IMAGE YET
           * ==========================================
           */

          <div className="flex-1 flex flex-col">
            {/* Empty capture area */}

            <div className="flex-1 min-h-[360px] rounded-2xl border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Camera
                  size={30}
                  className="text-blue-700"
                />
              </div>

              <h3 className="mt-4 font-semibold text-slate-900">
                Capture one package image
              </h3>

              <p className="text-sm text-slate-500 mt-2 max-w-xs">
                Make sure the required
                declarations are visible and
                readable.
              </p>
            </div>

            {/* Camera error */}

            {cameraError && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-700">
                  {cameraError}
                </p>
              </div>
            )}

            {/* ========================================
                TAKE PHOTO
                ======================================== */}

            <button
              type="button"
              onClick={openCamera}
              className="mt-5 h-13 min-h-[52px] rounded-xl bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 hover:bg-blue-800 transition-colors"
            >
              <Camera size={20} />

              Take Photo
            </button>

            {/* ========================================
                GALLERY
                ======================================== */}

            <button
              type="button"
              onClick={() =>
                galleryInputRef.current?.click()
              }
              className="mt-3 h-13 min-h-[52px] rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
            >
              <ImageIcon size={20} />

              Upload from Gallery
            </button>

            {/* ========================================
                CAMERA FALLBACK INPUT
                ======================================== */}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={
                handleFileSelected
              }
              className="hidden"
            />

            {/* ========================================
                GALLERY INPUT
                ======================================== */}

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={
                handleFileSelected
              }
              className="hidden"
            />

            {/* Supported formats */}

            <p className="text-center text-xs text-slate-400 mt-4">
              JPG, PNG or other supported image
              formats
            </p>
          </div>
        )}
      </div>
    </MobileShell>
  );
}