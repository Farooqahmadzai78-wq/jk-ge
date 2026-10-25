import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Camera, CameraOff, Check, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

function KaabaIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <ellipse cx="32" cy="54" rx="20" ry="5" fill="black" opacity="0.25" />
      <path d="M32 10 L52 20 L52 48 L32 58 L12 48 L12 20 Z" fill="#18181b" />
      <path d="M12 20 L32 30 L32 58 L12 48 Z" fill="#09090b" opacity="0.85" />
      <path d="M32 30 L52 20 L52 48 L32 58 Z" fill="#27272a" />
      <path d="M32 10 L52 20 L32 30 L12 20 Z" fill="#3f3f46" />
      <path d="M12 26 L32 36 L52 26 L52 29.5 L32 39.5 L12 29.5 Z" fill="url(#goldGradientAr)" />
      <path
        d="M37 36.5 L45 32.5 L45 46 L37 50 Z"
        fill="url(#goldGradientAr)"
        stroke="#fef08a"
        strokeWidth="0.5"
      />
      <defs>
        <linearGradient id="goldGradientAr" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#ca8a04" />
        </linearGradient>
      </defs>
    </svg>
  );
}

interface QiblaARViewProps {
  heading: number | null;
  qiblaBearing: number | null;
  angularError: number | null;
  isAligned: boolean;
  kaabaDistanceKm: number | null;
  cityName?: string;
  onClose?: () => void;
}

export function QiblaARView({
  heading,
  qiblaBearing,
  angularError: _angularError,
  isAligned,
  kaabaDistanceKm,
  cityName: _cityName,
  onClose,
}: QiblaARViewProps) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<
    "idle" | "loading" | "active" | "denied" | "unsupported"
  >("idle");

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose?.();
  }, [stopCamera, onClose]);

  // Lock body scroll and intercept Escape key while in full-screen AR
  useEffect(() => {
    if (typeof document === "undefined") return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClose]);

  const startCamera = useCallback(async () => {
    setCameraState("loading");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraState("unsupported");
        return;
      }

      // Stop any existing stream before opening a new one
      stopCamera();

      let stream: MediaStream | null = null;

      // 1. Enumerate devices to identify explicit rear/back camera deviceId if available
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        const backDevice = videoDevices.find((d) => {
          const lbl = d.label.toLowerCase();
          return (
            lbl.includes("back") ||
            lbl.includes("rear") ||
            lbl.includes("environment") ||
            lbl.includes("arrière") ||
            lbl.includes("outer") ||
            lbl.includes("camera 0")
          );
        });

        if (backDevice && backDevice.deviceId) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: backDevice.deviceId },
              width: { ideal: 1920, min: 1280 },
              height: { ideal: 1080, min: 720 },
            },
          });
        }
      } catch {
        /* proceed to facingMode constraints */
      }

      // 2. Try exact environment facingMode
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { exact: "environment" },
              width: { ideal: 1920, min: 1280 },
              height: { ideal: 1080, min: 720 },
            },
          });
        } catch {
          /* proceed to ideal environment constraint */
        }
      }

      // 3. Fallback to ideal environment constraint
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
          },
        });
      }

      // 4. Strict check: Verify acquired video track is NOT user-facing (front camera forbidden)
      const track = stream.getVideoTracks()[0];
      if (track) {
        const settings = track.getSettings?.();
        const label = (track.label || "").toLowerCase();

        if (
          settings?.facingMode === "user" ||
          label.includes("front") ||
          label.includes("user") ||
          label.includes("selfie") ||
          label.includes("avant")
        ) {
          track.stop();
          stream.getTracks().forEach((t) => t.stop());
          console.warn("[QiblaAR] Front camera detected and rejected for AR mode");
          setCameraState("denied");
          return;
        }
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState("active");
    } catch (err) {
      console.warn("[QiblaAR] Back camera access failed:", err);
      setCameraState("denied");
    }
  }, [stopCamera]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const currentHeading = heading ?? 0;
  const targetBearing = qiblaBearing ?? 0;

  // Relative angle delta in range [-180, 180]
  const deltaAngle =
    qiblaBearing !== null && heading !== null ? ((qiblaBearing - heading + 540) % 360) - 180 : 0;

  // Field of View calculation (assume camera FOV ~ 60deg)
  // Mapping deltaAngle [-30deg, +30deg] to xPercent [0%, 100%]
  const fovHalf = 30;
  const rawXPercent = 50 + (deltaAngle / fovHalf) * 50;
  const isOffScreen = rawXPercent < 8 || rawXPercent > 92;
  const clampedXPercent = Math.max(10, Math.min(90, rawXPercent));

  const arContent = (
    <div
      id="qibla-ar-fullscreen-overlay"
      className="fixed inset-0 z-[9999] w-screen h-screen m-0 p-0 overflow-hidden bg-black text-white select-none overscroll-none animate-in fade-in duration-300"
      style={{ width: "100vw", height: "100dvh" }}
    >
      {/* FULLSCREEN VIDEO FEED */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 size-full object-cover scale-105 pointer-events-none"
      />

      {/* Simulated background or camera fallback gradient when camera is denied or loading */}
      {cameraState !== "active" && (
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-zinc-950 flex flex-col items-center justify-center p-6 text-center text-white z-10">
          {cameraState === "loading" && (
            <div className="flex flex-col items-center gap-3">
              <div className="size-12 rounded-full border-4 border-amber-500/30 border-t-amber-500 animate-spin" />
              <p className="text-sm font-bold text-amber-400">{t.arLaunching || "Lancement de la caméra AR..."}</p>
            </div>
          )}

          {cameraState === "denied" && (
            <div className="flex flex-col items-center gap-3 max-w-xs">
              <div className="size-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 grid place-items-center shadow-lg">
                <CameraOff className="size-7" />
              </div>
              <div>
                <p className="text-base font-bold text-white">{t.arCameraUnavailable || "Caméra non disponible"}</p>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {t.arCameraPermissionPrompt || "Autorisez l'accès à la caméra arrière pour superposer la direction de la Mecque en réalité augmentée."}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mt-2 w-full">
                <Button
                  size="sm"
                  onClick={startCamera}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl px-4 text-xs shadow-lg shadow-amber-500/20 flex-1"
                >
                  <Camera className="size-3.5 mr-1.5" />
                  {t.allowCamera || "Autoriser la caméra"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleClose}
                  className="border-white/20 hover:bg-white/10 text-white rounded-xl text-xs"
                >
                  {t.backToCompass || "Retour boussole"}
                </Button>
              </div>
            </div>
          )}

          {cameraState === "unsupported" && (
            <div className="flex flex-col items-center gap-3 max-w-xs">
              <AlertTriangle className="size-10 text-amber-400" />
              <p className="text-sm font-bold text-slate-200">{t.arCameraNotSupported || "Caméra non gérée sur ce navigateur"}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleClose}
                className="mt-2 border-white/20 hover:bg-white/10 text-white rounded-xl text-xs"
              >
                {t.backToCompass || "Retour boussole"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* TOP FLOATING CONTROLS: ELEGANT BACK BUTTON (TOP-LEFT) & HUD HEADING INFO */}
      <div className="absolute top-0 left-0 right-0 z-40 pt-[max(1rem,env(safe-area-inset-top))] px-4 pointer-events-none flex items-center justify-between">
        {/* Back / Close Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label={t.closeArMode || "Fermer le mode Réalité Augmentée"}
          className="pointer-events-auto size-11 sm:size-12 rounded-full bg-black/45 hover:bg-black/65 active:scale-90 text-white backdrop-blur-xl border border-white/20 shadow-2xl flex items-center justify-center transition cursor-pointer group"
        >
          <ArrowLeft className="size-6 transition-transform group-hover:-translate-x-0.5" />
        </button>

        {/* Heading & Qibla HUD Pills */}
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-black/45 backdrop-blur-xl border border-white/20 shadow-xl">
            <span className="flex items-center gap-1.5 text-xs font-black text-amber-400">
              <Sparkles className="size-3.5" />
              <span>AR Qibla</span>
            </span>
            <span className="w-px h-3 bg-white/20" />
            <span className="font-mono text-xs font-extrabold text-emerald-300">
              {Math.round(currentHeading)}°
            </span>
          </div>
        </div>
      </div>

      {/* TOP CAMERA OVERLAY HUD (DEGREE SCALE / RULER) */}
      <div className="absolute top-[max(4.25rem,calc(env(safe-area-inset-top)+3.5rem))] left-4 right-4 z-30 pointer-events-none max-w-sm mx-auto">
        <div className="rounded-2xl bg-black/50 backdrop-blur-xl border border-white/20 p-2.5 shadow-2xl text-white">
          <div className="flex items-center justify-between text-[11px] font-bold pb-1.5 border-b border-white/10 px-1">
            <span className="text-slate-300">
              Direction Kaaba : <strong className="text-amber-400">{Math.round(targetBearing)}°</strong>
            </span>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-emerald-300 font-extrabold border border-white/10">
              Cap : {Math.round(currentHeading)}°
            </span>
          </div>

          {/* Scrolling Horizontal Degree Scale */}
          <div className="relative h-9 mt-1 flex items-center justify-center overflow-hidden">
            {/* Central Target Notch Line */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-emerald-400 z-10 shadow-[0_0_8px_#34d399]" />

            {/* Rotating / Sliding degree marks */}
            <div className="relative w-full h-full">
              {Array.from({ length: 13 }).map((_, i) => {
                const step = (i - 6) * 10; // -60deg to +60deg relative to current heading
                const tickDeg = (Math.round(currentHeading) + step + 360) % 360;
                const isTargetNear = Math.abs(tickDeg - Math.round(targetBearing)) < 5;

                return (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 flex flex-col items-center justify-between transition-transform duration-100"
                    style={{
                      left: `calc(50% + ${step * 2.5}px)`,
                      transform: "translateX(-50%)",
                    }}
                  >
                    <span
                      className={`w-0.5 ${
                        step === 0
                          ? "h-4 bg-emerald-400"
                          : isTargetNear
                            ? "h-4 bg-amber-400"
                            : i % 2 === 0
                              ? "h-3 bg-white/60"
                              : "h-2 bg-white/30"
                      }`}
                    />
                    <span
                      className={`text-[9px] font-mono ${
                        isTargetNear
                          ? "text-amber-400 font-black"
                          : step === 0
                            ? "text-emerald-300 font-bold"
                            : "text-white/60"
                      }`}
                    >
                      {tickDeg}°
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* CENTER TARGET RETICLE (Crosshair) */}
      <div className="absolute inset-0 grid place-items-center pointer-events-none z-20">
        <div
          className={`relative size-28 rounded-full border-2 transition-all duration-300 grid place-items-center ${
            isAligned
              ? "border-emerald-400 bg-emerald-500/25 shadow-[0_0_35px_rgba(16,185,129,0.8)] ring-4 ring-emerald-300 scale-110"
              : "border-white/35 bg-black/25 backdrop-blur-[2px]"
          }`}
        >
          {/* Target Reticle Crosshair Ticks */}
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-0.5 h-2.5 bg-white/80" />
          <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-0.5 h-2.5 bg-white/80" />
          <span className="absolute left-[-10px] top-1/2 -translate-y-1/2 w-2.5 h-0.5 bg-white/80" />
          <span className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-2.5 h-0.5 bg-white/80" />

          {/* Center Point */}
          <span
            className={`size-2.5 rounded-full transition-colors ${
              isAligned ? "bg-emerald-400 shadow-[0_0_12px_#34d399]" : "bg-amber-400"
            }`}
          />
        </div>
      </div>

      {/* FLOATING KAABA AR MARKER OVERLAY */}
      <div
        className="absolute top-1/2 -translate-y-1/2 transition-all duration-200 pointer-events-none z-30"
        style={{
          left: `${clampedXPercent}%`,
          transform: `translate(-50%, -50%)`,
        }}
      >
        <div className="flex flex-col items-center gap-2">
          {/* Directional Off-screen Arrow (if Kaaba is outside current viewport) */}
          {isOffScreen && (
            <div className="animate-bounce text-amber-300 font-black text-xs px-3 py-1 rounded-full bg-black/80 border border-amber-500/60 shadow-xl flex items-center gap-1.5">
              {deltaAngle < 0 ? (
                <>
                  <span>◄</span>
                  <span>{Math.round(Math.abs(deltaAngle))}°</span>
                </>
              ) : (
                <>
                  <span>{Math.round(Math.abs(deltaAngle))}°</span>
                  <span>➔</span>
                </>
              )}
            </div>
          )}

          {/* KAABA BADGE / REPERE (Changes color to emerald green when aligned) */}
          <div
            className={`flex flex-col items-center p-3 rounded-2xl border transition-all duration-500 backdrop-blur-xl ${
              isAligned
                ? "bg-emerald-500 text-white border-emerald-300 shadow-[0_0_40px_rgba(16,185,129,0.9)] scale-110 animate-pulse"
                : "bg-black/75 text-amber-300 border-amber-500/50 shadow-2xl"
            }`}
          >
            <div
              className={`grid size-12 place-items-center rounded-xl p-1 transition-transform ${
                isAligned ? "bg-emerald-600 scale-105" : "bg-zinc-950/80"
              }`}
            >
              <KaabaIcon className="size-8" />
            </div>

            <div className="text-center mt-1">
              <span
                className={`text-[10px] font-black uppercase tracking-widest block ${
                  isAligned ? "text-white" : "text-amber-300"
                }`}
              >
                KAABA (QIBLA)
              </span>
              <span className="text-[9px] font-bold opacity-90 block">
                {kaabaDistanceKm ? `${kaabaDistanceKm} km` : "La Mecque"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM AR ALIGNMENT STATUS BANNER */}
      <div className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-4 right-4 z-40 pointer-events-none max-w-md mx-auto">
        <div
          className={`p-3.5 rounded-2xl backdrop-blur-xl text-center transition-all duration-300 border shadow-2xl ${
            isAligned
              ? "bg-emerald-500/95 text-white border-emerald-300 shadow-[0_0_35px_rgba(16,185,129,0.7)]"
              : "bg-black/65 text-white border-white/20"
          }`}
        >
          {isAligned ? (
            <div className="flex items-center justify-center gap-2 text-sm font-black tracking-wide">
              <Check className="size-5 stroke-[3]" />
              <span>ALIGNÉ AVEC LA KAABA (QIBLA)</span>
            </div>
          ) : (
            <div className="text-xs sm:text-sm font-bold">
              {deltaAngle > 0 ? (
                <span className="text-amber-300">
                  Tournez votre téléphone vers la droite ➔ (
                  <strong className="text-white">{Math.round(Math.abs(deltaAngle))}°</strong>)
                </span>
              ) : (
                <span className="text-amber-300">
                  ◄ Tournez votre téléphone vers la gauche (
                  <strong className="text-white">{Math.round(Math.abs(deltaAngle))}°</strong>)
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return arContent;
  }

  return createPortal(arContent, document.body);
}
