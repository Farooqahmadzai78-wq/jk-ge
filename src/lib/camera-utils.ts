/**
 * High-performance, resilient camera helper for mobile web (Android & iOS).
 * Handles multi-camera enumeration, high-resolution negotiation, continuous autofocus,
 * optical/digital zoom, and full-sensor photo capture via ImageCapture / high-DPI canvas.
 */

export interface CameraCapabilitiesInfo {
  zoomSupported: boolean;
  minZoom: number;
  maxZoom: number;
  stepZoom: number;
  currentZoom: number;
  torchSupported: boolean;
  focusModeSupported: boolean;
  supportedFocusModes: string[];
  maxResolution?: { width: number; height: number };
}

export interface BestCameraDevice {
  deviceId?: string;
  label: string;
  isBack: boolean;
}

/**
 * Enumerates all video input devices and identifies the primary rear/back camera.
 * Avoids ultra-wide (0.5x), macro, depth, telephoto, and front cameras when labels exist.
 */
export async function findBestRearCamera(): Promise<BestCameraDevice | null> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
    return null;
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((d) => d.kind === "videoinput");

    if (videoDevices.length === 0) return null;

    // Filter for back cameras
    const backCameras = videoDevices.filter((d) => {
      const lbl = (d.label || "").toLowerCase();
      // Exclude front/selfie cameras
      if (
        lbl.includes("front") ||
        lbl.includes("avant") ||
        lbl.includes("selfie") ||
        lbl.includes("user")
      ) {
        return false;
      }
      return true;
    });

    if (backCameras.length === 0) {
      return { label: videoDevices[0].label, isBack: true };
    }

    // Rank back cameras: Prioritize main / primary / camera 0, penalize wide/ultra-wide/macro
    const ranked = backCameras.map((device) => {
      const lbl = (device.label || "").toLowerCase();
      let score = 50;

      if (lbl.includes("back") || lbl.includes("rear") || lbl.includes("arrière") || lbl.includes("environment")) {
        score += 30;
      }
      if (lbl.includes("0") || lbl.includes("main") || lbl.includes("primary") || lbl.includes("principal")) {
        score += 40;
      }
      if (lbl.includes("wide") || lbl.includes("ultra") || lbl.includes("0.5") || lbl.includes("macro") || lbl.includes("tele") || lbl.includes("depth")) {
        score -= 40;
      }

      return { device, score };
    });

    ranked.sort((a, b) => b.score - a.score);
    const chosen = ranked[0].device;

    return {
      deviceId: chosen.deviceId,
      label: chosen.label,
      isBack: true,
    };
  } catch (err) {
    console.debug("Camera enumeration:", err);
    return null;
  }
}

/**
 * Multi-tiered stream acquisition:
 * Tries from highest resolution (4K/1080p + 60/30fps + ideal environment) down to standard fallbacks.
 * Guarantees a stream is returned if the hardware supports any camera.
 */
export async function getOptimalCameraStream(options: {
  facingMode?: "environment" | "user";
  preferHighRes?: boolean;
  deviceId?: string;
}): Promise<MediaStream> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("getUserMedia is not supported by this browser");
  }

  const { facingMode = "environment", preferHighRes = true, deviceId } = options;

  // Tier 1: Primary Rear Camera with 4K/1080p, 30fps, no downscale
  const tier1Video: MediaTrackConstraints = {
    facingMode: facingMode ? { ideal: facingMode } : undefined,
    width: preferHighRes ? { ideal: 3840, min: 1920 } : { ideal: 1920 },
    height: preferHighRes ? { ideal: 2160, min: 1080 } : { ideal: 1080 },
    frameRate: { ideal: 30, max: 60 },
  };
  if (deviceId) {
    tier1Video.deviceId = { ideal: deviceId };
  }

  // Tier 2: 1080p Standard Full HD
  const tier2Video: MediaTrackConstraints = {
    facingMode: facingMode ? { ideal: facingMode } : undefined,
    width: { ideal: 1920, min: 1280 },
    height: { ideal: 1080, min: 720 },
    frameRate: { ideal: 30 },
  };

  // Tier 3: 720p HD
  const tier3Video: MediaTrackConstraints = {
    facingMode: facingMode ? { ideal: facingMode } : undefined,
    width: { ideal: 1280 },
    height: { ideal: 720 },
  };

  // Tier 4: Basic constraints
  const tier4Video: MediaTrackConstraints = {
    facingMode: facingMode ? { ideal: facingMode } : undefined,
  };

  const candidateTiers = [tier1Video, tier2Video, tier3Video, tier4Video, true];

  let lastError: unknown = null;

  for (const videoConstraint of candidateTiers) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraint,
        audio: false,
      });
      if (stream && stream.getVideoTracks().length > 0) {
        return stream;
      }
    } catch (err) {
      lastError = err;
      // continue to next fallback tier
    }
  }

  throw lastError || new Error("Failed to open camera stream");
}

/**
 * Optimizes the active video track for crisp text reading:
 * Applies continuous autofocus, continuous auto-exposure, and auto white-balance.
 */
export async function optimizeTrackForReading(track: MediaStreamTrack): Promise<CameraCapabilitiesInfo> {
  const caps = (typeof track.getCapabilities === "function" ? track.getCapabilities() : {}) as {
    zoom?: { min: number; max: number; step: number };
    torch?: boolean;
    focusMode?: string[];
    exposureMode?: string[];
    whiteBalanceMode?: string[];
    width?: { max: number };
    height?: { max: number };
  };

  const supportedFocusModes = caps.focusMode || [];
  const focusModeSupported = supportedFocusModes.length > 0;
  const zoomSupported = !!caps.zoom && caps.zoom.max > (caps.zoom.min || 1);
  const torchSupported = !!caps.torch;

  const minZoom = caps.zoom?.min ?? 1;
  const maxZoom = caps.zoom?.max ?? 1;
  const stepZoom = caps.zoom?.step ?? 0.1;

  // Retrieve current settings
  const settings = (typeof track.getSettings === "function" ? track.getSettings() : {}) as {
    zoom?: number;
  };
  const currentZoom = settings.zoom ?? minZoom;

  // Build advanced constraints safely
  const advancedList: Array<Record<string, unknown>> = [];

  const advanced: Record<string, unknown> = {};

  if (supportedFocusModes.includes("continuous")) {
    advanced.focusMode = "continuous";
  }

  if (caps.exposureMode?.includes("continuous")) {
    advanced.exposureMode = "continuous";
  }

  if (caps.whiteBalanceMode?.includes("continuous")) {
    advanced.whiteBalanceMode = "continuous";
  }

  if (Object.keys(advanced).length > 0) {
    advancedList.push(advanced);
  }

  if (advancedList.length > 0 && typeof track.applyConstraints === "function") {
    try {
      await track.applyConstraints({ advanced: advancedList as unknown as MediaTrackConstraints[] });
    } catch {
      // ignore constraint application errors if unsupported
    }
  }

  return {
    zoomSupported,
    minZoom,
    maxZoom,
    stepZoom,
    currentZoom,
    torchSupported,
    focusModeSupported,
    supportedFocusModes,
    maxResolution: caps.width && caps.height ? { width: caps.width.max, height: caps.height.max } : undefined,
  };
}

/**
 * Triggers re-focus on tap if supported by camera hardware
 */
export async function triggerRefocus(track: MediaStreamTrack | null): Promise<boolean> {
  if (!track || typeof track.applyConstraints !== "function") return false;
  try {
    const caps = (track.getCapabilities?.() || {}) as { focusMode?: string[] };
    if (caps.focusMode?.includes("continuous")) {
      // Toggle to trigger camera autofocus cycle
      await track.applyConstraints({
        advanced: [{ focusMode: "continuous" }] as unknown as MediaTrackConstraints[],
      });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Sets zoom level on the active track safely
 */
export async function setTrackZoom(track: MediaStreamTrack | null, zoom: number): Promise<boolean> {
  if (!track || typeof track.applyConstraints !== "function") return false;
  try {
    await track.applyConstraints({
      advanced: [{ zoom }] as unknown as MediaTrackConstraints[],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Captures the absolute highest quality photo from the camera:
 * 1. Uses ImageCapture API (Chromium / Android) for full hardware sensor resolution.
 * 2. Falls back to full native resolution Canvas drawing from <video> with high smoothing.
 */
export async function captureHighResPhoto(
  video: HTMLVideoElement,
  track: MediaStreamTrack | null,
  facingMode: "environment" | "user" = "environment",
): Promise<string> {
  // 1. Try ImageCapture API if available
  if (track && typeof window !== "undefined" && "ImageCapture" in window) {
    try {
      type ImageCaptureInstance = {
        takePhoto: (options?: { imageWidth?: number; imageHeight?: number }) => Promise<Blob>;
      };
      const ImageCaptureConstructor = (
        window as unknown as { ImageCapture: new (t: MediaStreamTrack) => ImageCaptureInstance }
      ).ImageCapture;

      const imageCapture = new ImageCaptureConstructor(track);
      const photoBlob = await imageCapture.takePhoto();

      if (photoBlob && photoBlob.size > 0) {
        // Read blob as Data URL or load into canvas if orientation/scaling needed
        const dataUrl = await blobToDataUrl(photoBlob);
        if (dataUrl && dataUrl.length > 100) {
          // If image is very huge (> 2560px), scale down with bicubic smoothing so base64 stays < 4MB
          return await optimizeCapturedImage(dataUrl, facingMode === "user");
        }
      }
    } catch (icError) {
      console.debug("ImageCapture takePhoto fallback to video canvas:", icError);
    }
  }

  // 2. High-DPI Video Canvas fallback
  const videoW = video.videoWidth || 1920;
  const videoH = video.videoHeight || 1080;

  // Max dimension 2560px for high-res crisp text without exceeding memory
  const maxDim = 2560;
  let targetW = videoW;
  let targetH = videoH;

  if (targetW > maxDim || targetH > maxDim) {
    if (targetW > targetH) {
      targetH = Math.round((targetH * maxDim) / targetW);
      targetW = maxDim;
    } else {
      targetW = Math.round((targetW * maxDim) / targetH);
      targetH = maxDim;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d", { willReadFrequently: false });

  if (!ctx) {
    throw new Error("Unable to create canvas context");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (facingMode === "user") {
    ctx.translate(targetW, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(video, 0, 0, targetW, targetH);

  return canvas.toDataURL("image/jpeg", 0.92);
}

/** Helper to convert Blob to base64 Data URL */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Optimizes an image captured via ImageCapture to ensure crisp text and reasonable payload size */
async function optimizeCapturedImage(dataUrl: string, flipHorizontal: boolean): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;

      const maxDim = 2560;
      let targetW = origW;
      let targetH = origH;

      if (targetW > maxDim || targetH > maxDim) {
        if (targetW > targetH) {
          targetH = Math.round((targetH * maxDim) / targetW);
          targetW = maxDim;
        } else {
          targetW = Math.round((targetW * maxDim) / targetH);
          targetH = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      if (flipHorizontal) {
        ctx.translate(targetW, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(img, 0, 0, targetW, targetH);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
