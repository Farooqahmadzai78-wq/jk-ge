import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Flashlight, RotateCw, Camera, AlertCircle, Sparkles, Loader2, Focus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import {
  findBestRearCamera,
  getOptimalCameraStream,
  optimizeTrackForReading,
  setTrackZoom,
  triggerRefocus,
  captureHighResPhoto,
  type CameraCapabilitiesInfo,
} from "@/lib/camera-utils";

interface IngredientCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string) => void;
}

export function IngredientCameraModal({
  isOpen,
  onClose,
  onCapture,
}: IngredientCameraModalProps) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraCaps, setCameraCaps] = useState<CameraCapabilitiesInfo | null>(null);
  const [activeZoom, setActiveZoom] = useState<number>(1);
  const [focusRing, setFocusRing] = useState<{ x: number; y: number; visible: boolean } | null>(null);

  // Stop all media stream tracks cleanly
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // ignore
          }
        });
      } catch {
        // ignore
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setTorchOn(false);
    setTorchAvailable(false);
    setCameraCaps(null);
    setFocusRing(null);
  }, []);

  // Initialize camera with best device selection and high resolution
  const startCamera = useCallback(async () => {
    stopStream();
    setIsInitializing(true);
    setError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError(t.cameraNotSupported || "La caméra n'est pas supportée par votre navigateur.");
      setIsInitializing(false);
      return;
    }

    try {
      let targetDeviceId: string | undefined;

      // When in environment mode, find the primary rear camera (avoiding ultra-wide / macro / front)
      if (facingMode === "environment") {
        const bestRear = await findBestRearCamera();
        if (bestRear?.deviceId) {
          targetDeviceId = bestRear.deviceId;
        }
      }

      // Acquire stream using high-res multi-tier negotiation
      const stream = await getOptimalCameraStream({
        facingMode,
        preferHighRes: true,
        deviceId: targetDeviceId,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const track = stream.getVideoTracks()[0];
      if (track) {
        // Apply continuous focus, auto-exposure, and retrieve capabilities
        const caps = await optimizeTrackForReading(track);
        setCameraCaps(caps);
        setTorchAvailable(caps.torchSupported);
        setActiveZoom(caps.currentZoom || 1);
      }

      setIsInitializing(false);
    } catch (err: unknown) {
      console.warn("Camera start error:", err);
      const str = String(err).toLowerCase();
      if (str.includes("permission") || str.includes("denied") || str.includes("notallowed")) {
        setError(t.cameraAccessDenied || "Accès caméra refusé. Veuillez autoriser l'accès à la caméra dans vos réglages.");
      } else {
        setError(t.cannotAccessRearCamera || "Impossible d'accéder à la caméra arrière. Réessayez.");
      }
      setIsInitializing(false);
    }
  }, [facingMode, stopStream, t]);

  useEffect(() => {
    if (isOpen) {
      void startCamera();
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [isOpen, startCamera, stopStream]);

  // Toggle torch / flash
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextState = !torchOn;
      await (track as MediaStreamTrack & {
        applyConstraints: (c: MediaTrackConstraints) => Promise<void>;
      }).applyConstraints({
        advanced: [{ torch: nextState }] as unknown as MediaTrackConstraints[],
      });
      setTorchOn(nextState);
    } catch {
      setTorchAvailable(false);
    }
  };

  // Flip camera between environment and user
  const flipCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Handle zoom change
  const handleZoomChange = async (targetZoom: number) => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    const ok = await setTrackZoom(track, targetZoom);
    if (ok) {
      setActiveZoom(targetZoom);
    }
  };

  // Handle tap-to-focus on viewfinder
  const handleViewfinderTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isInitializing || error || !streamRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setFocusRing({ x, y, visible: true });

    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      void triggerRefocus(track);
    }

    setTimeout(() => {
      setFocusRing((prev) => (prev ? { ...prev, visible: false } : null));
    }, 800);
  };

  // Capture frame in highest possible resolution
  const handleCapture = async () => {
    if (!videoRef.current || isCapturing) return;

    setIsCapturing(true);

    // Haptic feedback
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(60);
      } catch {
        // ignore
      }
    }

    try {
      const track = streamRef.current ? streamRef.current.getVideoTracks()[0] : null;
      // High-resolution hardware capture via ImageCapture API with canvas fallback
      const highResDataUrl = await captureHighResPhoto(videoRef.current, track, facingMode);

      // Stop camera tracks immediately
      stopStream();

      // Send to callback
      onCapture(highResDataUrl);
      onClose();
    } catch (err) {
      console.error("Frame capture error:", err);
      setIsCapturing(false);
    }
  };

  if (!isOpen || typeof document === "undefined") return null;

  // Compute available zoom pills if supported
  const zoomOptions =
    cameraCaps?.zoomSupported && cameraCaps.maxZoom > 1
      ? [1, 1.5, 2, 3]
          .filter((z) => z <= cameraCaps.maxZoom && z >= cameraCaps.minZoom)
          .concat(
            cameraCaps.maxZoom > 2 && cameraCaps.maxZoom <= 4 && ![1, 1.5, 2, 3].includes(cameraCaps.maxZoom)
              ? [cameraCaps.maxZoom]
              : [],
          )
      : [];

  return createPortal(
    <div
      id="ingredient-camera-viewfinder-fullscreen-root"
      data-scanner-active="true"
      className="fixed inset-0 z-[9999] w-screen h-screen m-0 p-0 flex flex-col justify-between bg-slate-950 text-white select-none overflow-hidden overscroll-contain animate-in fade-in duration-200"
    >
      {/* Top Floating Frosted Header Bar */}
      <div className="relative z-30 pt-[max(1rem,env(safe-area-inset-top))] px-4 sm:px-6">
        <div className="p-3 sm:p-3.5 rounded-2xl sm:rounded-3xl bg-slate-950/75 backdrop-blur-xl border border-white/15 shadow-2xl flex items-center justify-between gap-3">
          {/* Close button */}
          <button
            type="button"
            onClick={() => {
              stopStream();
              onClose();
            }}
            className="size-11 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 active:scale-90 text-white border border-white/15 flex items-center justify-center transition cursor-pointer shadow-md"
            aria-label={t.closeCamera || "Fermer la caméra"}
          >
            <X className="size-6" />
          </button>

          {/* Title and Badge */}
          <div className="flex flex-col items-center justify-center text-center min-w-0 flex-1">
            <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-[10.5px] font-extrabold uppercase tracking-wider mb-0.5">
              <Sparkles className="size-3 text-sky-300 animate-pulse" />
              <span>{t.aiAnalysis || "Analyse IA"}</span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white font-display tracking-tight drop-shadow-sm truncate">
              {t.photoIngredients || "Photo des ingrédients"}
            </h3>
          </div>

          {/* Flashlight & Camera switch */}
          <div className="flex items-center gap-2 shrink-0">
            {torchAvailable && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`size-11 rounded-xl sm:rounded-2xl flex items-center justify-center backdrop-blur-md transition-all active:scale-90 cursor-pointer border ${
                  torchOn
                    ? "bg-amber-400 text-slate-950 border-amber-300 shadow-lg shadow-amber-400/50 scale-105"
                    : "bg-white/10 hover:bg-white/20 text-white border-white/15"
                }`}
                aria-label={t.flashlight || "Torche"}
              >
                <Flashlight className="size-5" />
              </button>
            )}

            <button
              type="button"
              onClick={flipCamera}
              className="size-11 rounded-xl sm:rounded-2xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/15 flex items-center justify-center transition active:scale-90 cursor-pointer shadow-md"
              aria-label={t.switchCamera || "Changer de caméra"}
            >
              <RotateCw className="size-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Viewfinder Area */}
      <div
        className="relative flex-1 flex items-center justify-center overflow-hidden cursor-crosshair px-4"
        onClick={handleViewfinderTap}
      >
        {/* Live video with maximum sharpness */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            isInitializing ? "opacity-0" : "opacity-100"
          }`}
        />

        {/* Shutter flash animation when taking picture */}
        {isCapturing && <div className="absolute inset-0 bg-white z-30 animate-out fade-out duration-300" />}

        {/* Tap-to-focus ring animation */}
        {focusRing?.visible && (
          <div
            className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-1/2 flex items-center justify-center animate-in zoom-in-50 duration-200"
            style={{ left: `${focusRing.x}px`, top: `${focusRing.y}px` }}
          >
            <div className="size-16 rounded-2xl border-2 border-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.8)] animate-pulse flex items-center justify-center">
              <Focus className="size-6 text-emerald-300 opacity-90" />
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {isInitializing && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 p-6 text-center">
            <Loader2 className="size-10 text-emerald-400 animate-spin mb-3" />
            <p className="text-sm font-medium text-white/90">{t.startingHighResCamera || "Démarrage de la caméra haute résolution..."}</p>
          </div>
        )}

        {/* Error overlay */}
        {error && !isInitializing && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center space-y-4">
            <div className="size-14 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
              <AlertCircle className="size-8" />
            </div>
            <div className="max-w-xs space-y-1">
              <h4 className="text-base font-bold text-white">{t.cameraAccess || "Accès caméra"}</h4>
              <p className="text-xs text-white/70">{error}</p>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={startCamera}
              className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-full px-5"
            >
              <RotateCw className="size-4 mr-2" />
              {t.retry || "Réessayer"}
            </Button>
          </div>
        )}

        {/* Framing Guides Overlay */}
        {!error && !isInitializing && (
          <div className="pointer-events-none relative z-10 flex flex-col items-center w-full">
            {/* Viewfinder Rectangular Card with Spotlight Cutout Shadow */}
            <div className="relative w-[88vw] max-w-[350px] aspect-[4/3] rounded-3xl overflow-hidden border border-emerald-400/40 shadow-[0_0_0_9999px_rgba(2,6,23,0.65)] flex flex-col justify-between p-3.5">
              {/* Glowing Corner Brackets */}
              <div className="absolute top-0 left-0 size-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl shadow-[0_0_14px_#34d399]" />
              <div className="absolute top-0 right-0 size-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl shadow-[0_0_14px_#34d399]" />
              <div className="absolute bottom-0 left-0 size-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl shadow-[0_0_14px_#34d399]" />
              <div className="absolute bottom-0 right-0 size-8 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl shadow-[0_0_14px_#34d399]" />

              {/* Subtle grid watermark */}
              <div
                className="absolute inset-0 opacity-[0.08]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(52,211,153,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(52,211,153,0.6) 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
                }}
              />

              {/* Top Instruction Pill */}
              <div className="text-center w-full">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-[11px] font-semibold text-emerald-300 border border-emerald-400/30 shadow-xs">
                  {t.frameIngredientsList || "Cadrez la liste des ingrédients"}
                </span>
              </div>

              {/* Bottom Instruction Text */}
              <div className="text-center w-full">
                <span className="text-[11px] font-medium text-white/90 drop-shadow-md">
                  {t.clearTextInstruction || "Texte net et bien éclairé pour l'analyse IA"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Shutter Controls with Smart Zoom Selector */}
      <div className="relative z-30 flex flex-col items-center justify-center p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
        {/* Smart Zoom Selector Pills if device supports hardware zoom */}
        {zoomOptions.length > 1 && !isInitializing && !error && (
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/20 mb-4 shadow-lg animate-in fade-in duration-200">
            {zoomOptions.map((z) => (
              <button
                key={z}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleZoomChange(z);
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  Math.abs(activeZoom - z) < 0.1
                    ? "bg-emerald-500 text-slate-950 shadow-md scale-105"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                {z}x
              </button>
            ))}
          </div>
        )}

        {/* Shutter Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void handleCapture();
          }}
          disabled={isInitializing || !!error || isCapturing}
          className="group relative flex size-20 items-center justify-center rounded-full bg-white/20 p-1.5 transition-all duration-200 active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xl"
          aria-label={t.takeIngredientsPhoto || "Prendre la photo des ingrédients"}
        >
          <div className="size-full rounded-full bg-white group-hover:scale-105 transition flex items-center justify-center shadow-lg shadow-white/30">
            <Camera className="size-7 text-slate-900 group-hover:scale-110 transition" />
          </div>
        </button>
        <span className="text-xs font-medium text-white/80 mt-3 drop-shadow-xs">
          {t.tapToAnalyzeIngredients || "Appuyez pour analyser les ingrédients"}
        </span>
      </div>
    </div>,
    document.body,
  );
}
