import { useEffect, useRef, useState } from 'react';
import { Zap, ZapOff, ImageIcon, RotateCcw } from 'lucide-react';
import MobileShell from '../components/MobileShell';
import { useApp } from '../context/AppContext';
import type { PackageSide } from '../types';

const SIDE_ORDER: PackageSide[] = [
  'FRONT',
  'BACK',
  'LEFT',
  'RIGHT',
  'BOTTOM',
];

export default function CaptureScreen() {
  const {
    navigate,
    capturedSides,
    setCapturedSides,
    setCapturedImage,
    setCapturedImageForSide,
  } = useApp();

  const [flash, setFlash] = useState(false);

  const [currentIdx, setCurrentIdx] = useState(() => {
    const nextIdx = SIDE_ORDER.findIndex(
      side => !capturedSides.includes(side)
    );

    return nextIdx === -1 ? 0 : nextIdx;
  });

  const [capturedThisSide, setCapturedThisSide] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Camera references
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Gallery reference
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const currentSide = SIDE_ORDER[currentIdx];

  /**
   * Stop the active camera stream.
   */
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  };

  /**
   * Clean up camera when leaving the screen.
   */
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });

        streamRef.current = null;
      }

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  /**
   * Start the laptop/phone camera.
   */
  const startCamera = async () => {
    setCameraError(null);

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCameraError(
        'Camera access is not supported by this browser.'
      );
      return;
    }

    try {
      // Stop any previous stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });

        streamRef.current = null;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: {
              ideal: 'environment',
            },
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
          },
          audio: false,
        });

      streamRef.current = stream;

      /*
       * Activate the camera UI first.
       * This guarantees that the <video> element
       * exists before assigning the stream.
       */
      setCameraActive(true);

      requestAnimationFrame(() => {
        const video = videoRef.current;

        if (!video) {
          setCameraError(
            'Camera preview could not be initialized.'
          );
          return;
        }

        video.srcObject = stream;

        video.onloadedmetadata = () => {
          video
            .play()
            .then(() => {
              setCameraError(null);
            })
            .catch(error => {
              console.error(
                'Video playback error:',
                error
              );

              setCameraError(
                'Camera started but the preview could not be displayed.'
              );
            });
        };
      });
    } catch (error) {
      console.error('Camera error:', error);

      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          setCameraError(
            'Camera permission was denied. Please allow camera access in your browser.'
          );
        } else if (error.name === 'NotFoundError') {
          setCameraError(
            'No camera was found on this device.'
          );
        } else if (error.name === 'NotReadableError') {
          setCameraError(
            'The camera is already being used by another application.'
          );
        } else {
          setCameraError(
            'Unable to access the camera.'
          );
        }
      } else {
        setCameraError(
          'Unable to access the camera.'
        );
      }

      setCameraActive(false);
    }
  };

  /**
   * Capture the current video frame.
   */
  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      setCameraError(
        'Camera is not ready.'
      );
      return;
    }

    if (video.readyState < 2) {
      setCameraError(
        'Camera is not ready yet. Please wait a moment.'
      );
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      setCameraError(
        'Unable to capture the camera frame.'
      );
      return;
    }

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');

    if (!context) {
      setCameraError(
        'Unable to process the captured image.'
      );
      return;
    }

    // Draw current webcam frame onto canvas
    context.drawImage(
      video,
      0,
      0,
      width,
      height
    );

    canvas.toBlob(
      blob => {
        if (!blob) {
          setCameraError(
            'Unable to create the captured image.'
          );
          return;
        }

        const file = new File(
          [blob],
          `nometra-${currentSide.toLowerCase()}-${Date.now()}.jpg`,
          {
            type: 'image/jpeg',
          }
        );

        // Store the image both as the legacy captured image and
        // against the exact package side for multi-view analysis.
        setCapturedImage(file);
        setCapturedImageForSide(currentSide, file);

        // Create preview
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }

        const url = URL.createObjectURL(blob);

        setPreviewUrl(url);
        setCapturedThisSide(true);
        setCameraError(null);

        if (!capturedSides.includes(currentSide)) {
          setCapturedSides([
            ...capturedSides,
            currentSide,
          ]);
        }

        // Stop camera after photo
        stopCamera();
      },
      'image/jpeg',
      0.92
    );
  };

  /**
   * Handle gallery image selection.
   */
  const handleFileSelected = (file: File) => {
    stopCamera();

    // Store the image both as the legacy captured image and
    // against the exact package side for multi-view analysis.
    setCapturedImage(file);
    setCapturedImageForSide(currentSide, file);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const url = URL.createObjectURL(file);

    setPreviewUrl(url);
    setCapturedThisSide(true);
    setCameraError(null);

    if (!capturedSides.includes(currentSide)) {
      setCapturedSides([
        ...capturedSides,
        currentSide,
      ]);
    }
  };

  /**
   * Handle gallery input.
   */
  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    handleFileSelected(file);
  };

  /**
   * Capture button.
   * Opens the actual webcam.
   */
  const handleCapture = () => {
    startCamera();
  };

  /**
   * Gallery button.
   */
  const handleGallery = () => {
    galleryInputRef.current?.click();
  };

  /**
   * Retake current side.
   */
  const handleRetake = () => {
    stopCamera();

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setCapturedThisSide(false);
    setPreviewUrl(null);
    setCameraError(null);

    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
    }

    // Reopen camera
    setTimeout(() => {
      startCamera();
    }, 150);
  };

  /**
   * Move to next side.
   */
  const handleNext = () => {
    stopCamera();

    const nextIdx = SIDE_ORDER.findIndex(
      (side, index) =>
        index > currentIdx &&
        !capturedSides.includes(side)
    );

    if (nextIdx !== -1) {
      setCurrentIdx(nextIdx);
      setCapturedThisSide(false);

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setPreviewUrl(null);
      setCameraError(null);

      if (galleryInputRef.current) {
        galleryInputRef.current.value = '';
      }
    } else {
      navigate('image-quality');
    }
  };

  const sideColor: Record<PackageSide, string> = {
    FRONT: 'from-blue-900 to-blue-700',
    BACK: 'from-slate-800 to-slate-600',
    LEFT: 'from-indigo-900 to-indigo-700',
    RIGHT: 'from-violet-900 to-violet-700',
    BOTTOM: 'from-slate-900 to-slate-700',
    OTHER: 'from-gray-900 to-gray-700',
  };

  return (
    <MobileShell
      title={`Capture ${currentSide}`}
      backScreen="new-inspection"
      hideNav
    >
      <div className="flex flex-col h-full">

        {/* Side indicator */}
        <div className="px-4 py-2 flex gap-2">
          {SIDE_ORDER.map(side => (
            <div
              key={side}
              className={`flex-1 h-1.5 rounded-full ${
                capturedSides.includes(side)
                  ? 'bg-emerald-500'
                  : side === currentSide
                  ? 'bg-blue-600'
                  : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Camera viewport */}
        <div
          className="mx-4 mt-2 rounded-2xl overflow-hidden bg-slate-900 relative"
          style={{ aspectRatio: '3/4' }}
        >

          {/* ================================
              CAPTURED IMAGE
              ================================= */}
          {capturedThisSide && previewUrl ? (
            <div className="absolute inset-0">
              <img
                src={previewUrl}
                alt={`${currentSide} package`}
                className="w-full h-full object-cover"
              />

              {/* Capture confirmation */}
              <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mb-3">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>

                <p className="text-white font-display font-semibold text-lg drop-shadow">
                  {currentSide} Captured
                </p>
              </div>
            </div>

          ) : cameraActive ? (

            /* ================================
               LIVE CAMERA
               ================================= */
            <div className="absolute inset-0 bg-black">

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{
                  display: 'block',
                  backgroundColor: 'black',
                }}
              />

              {/* Alignment guide */}
              <div className="absolute inset-6 border-2 border-white/40 rounded-xl pointer-events-none" />

              {/* Corner guides */}
              {[
                'top-4 left-4 border-l-2 border-t-2',
                'top-4 right-4 border-r-2 border-t-2',
                'bottom-4 left-4 border-l-2 border-b-2',
                'bottom-4 right-4 border-r-2 border-b-2',
              ].map((cls, i) => (
                <div
                  key={i}
                  className={`absolute w-6 h-6 border-white ${cls}`}
                />
              ))}

              {/* Flash toggle */}
              <button
                onClick={() =>
                  setFlash(f => !f)
                }
                className="absolute top-3 right-3 w-9 h-9 bg-black/40 rounded-full flex items-center justify-center"
                aria-label="Toggle flash"
              >
                {flash ? (
                  <Zap
                    size={16}
                    className="text-yellow-400"
                  />
                ) : (
                  <ZapOff
                    size={16}
                    className="text-white/70"
                  />
                )}
              </button>

              {/* Camera instruction */}
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <p className="text-white text-sm font-medium drop-shadow">
                  Align package inside frame
                </p>
              </div>
            </div>

          ) : (

            /* ================================
               CAMERA NOT ACTIVE
               ================================= */
            <div
              className={`absolute inset-0 bg-gradient-to-b ${sideColor[currentSide]}`}
            >

              {/* Alignment guide */}
              <div className="absolute inset-6 border-2 border-white/30 rounded-xl" />

              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <p className="text-white/60 text-sm">
                  Align package inside frame
                </p>

                <p className="text-white font-display font-bold text-xl mt-1">
                  CAPTURE {currentSide}
                </p>
              </div>

              {/* Corner guides */}
              {[
                'top-4 left-4 border-l-2 border-t-2',
                'top-4 right-4 border-r-2 border-t-2',
                'bottom-4 left-4 border-l-2 border-b-2',
                'bottom-4 right-4 border-r-2 border-b-2',
              ].map((cls, i) => (
                <div
                  key={i}
                  className={`absolute w-6 h-6 border-white ${cls}`}
                />
              ))}

              {/* Flash toggle */}
              <button
                onClick={() =>
                  setFlash(f => !f)
                }
                className="absolute top-3 right-3 w-9 h-9 bg-black/40 rounded-full flex items-center justify-center"
                aria-label="Toggle flash"
              >
                {flash ? (
                  <Zap
                    size={16}
                    className="text-yellow-400"
                  />
                ) : (
                  <ZapOff
                    size={16}
                    className="text-white/70"
                  />
                )}
              </button>
            </div>
          )}

          {/* Hidden canvas for webcam capture */}
          <canvas
            ref={canvasRef}
            className="hidden"
          />
        </div>

        {/* Camera error */}
        {cameraError && (
          <p className="text-center text-xs text-red-500 mt-2 px-4">
            {cameraError}
          </p>
        )}

        {/* Status text */}
        {!cameraError && (
          <p className="text-center text-xs text-slate-500 mt-2 px-4">
            {capturedThisSide
              ? `${currentSide} image captured`
              : cameraActive
              ? 'Position the package clearly and take the photo'
              : 'Position the package clearly and tap Capture'}
          </p>
        )}

        {/* Controls */}
        <div className="px-4 mt-4 pb-4 flex items-center gap-3">

          {capturedThisSide ? (

            /* ================================
               AFTER CAPTURE
               ================================= */
            <>
              <button
                onClick={handleRetake}
                className="flex-1 h-12 border border-slate-200 bg-white text-slate-700 font-display font-medium rounded-xl flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} />
                Retake
              </button>

              <button
                onClick={handleNext}
                className="flex-1 h-12 bg-blue-700 text-white font-display font-semibold rounded-xl flex items-center justify-center"
              >
                {SIDE_ORDER.findIndex(
                  (side, index) =>
                    index > currentIdx &&
                    !capturedSides.includes(side)
                ) !== -1
                  ? 'Next Side →'
                  : 'Done →'}
              </button>
            </>

          ) : cameraActive ? (

            /* ================================
               CAMERA ACTIVE
               ================================= */
            <>
              {/* Close camera */}
              <button
                onClick={stopCamera}
                className="w-12 h-12 border border-slate-200 bg-white text-slate-700 rounded-xl flex items-center justify-center shrink-0"
                aria-label="Close camera"
              >
                ✕
              </button>

              {/* Take Photo */}
              <button
                onClick={takePhoto}
                className="flex-1 h-12 bg-blue-700 text-white font-display font-semibold rounded-xl"
              >
                Take Photo
              </button>
            </>

          ) : (

            /* ================================
               INITIAL CONTROLS
               ================================= */
            <>
              {/* Gallery */}
              <button
                onClick={handleGallery}
                className="w-12 h-12 border border-slate-200 bg-white rounded-xl flex items-center justify-center shrink-0"
                aria-label="Upload from gallery"
              >
                <ImageIcon
                  size={18}
                  className="text-slate-500"
                />
              </button>

              {/* Capture */}
              <button
                onClick={handleCapture}
                className="flex-1 h-12 bg-blue-700 text-white font-display font-semibold rounded-xl"
              >
                Capture
              </button>

              {/* Gallery input */}
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                className="hidden"
                onChange={handleFileChange}
              />
            </>
          )}
        </div>

        {/* Skip to quality check */}
        {capturedSides.length > 0 &&
          !cameraActive && (
            <button
              onClick={() =>
                navigate('image-quality')
              }
              className="mx-4 mb-4 h-10 text-blue-700 text-sm font-medium underline underline-offset-2"
            >
              Done capturing — verify quality
            </button>
          )}
      </div>
    </MobileShell>
  );
}