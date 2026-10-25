import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Crosshair,
  ExternalLink,
  Filter,
  Layers,
  Loader2,
  MapPin,
  Minus,
  Navigation,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/app-settings";
import { appToast } from "@/lib/app-toast";
import { formatDistanceKm, latToY, lonToX, nearbyMosques, type Mosque } from "@/lib/mosques";

const TILE = 256;
const MIN_ZOOM = 11;
const MAX_ZOOM = 18;
const DEFAULT_ZOOM = 15;

interface MosqueMapProps {
  className?: string;
  initialHeight?: string;
  showAllLink?: boolean;
  onSelectMosque?: (mosque: Mosque) => void;
}

export const MosqueMap = memo(function MosqueMap({
  className = "",
  initialHeight = "h-[250px] sm:h-[270px]",
  showAllLink = true,
  onSelectMosque,
}: MosqueMapProps) {
  const { t: rawT } = useI18n();
  const t = rawT as any;
  const { settings, update } = useSettings();
  const place = settings.place;

  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [mapType, setMapType] = useState<"satellite" | "streets">("satellite");
  const [selectedMosque, setSelectedMosque] = useState<Mosque | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "official" | "jumua">("all");
  const [searchFilter, setSearchFilter] = useState("");

  // Map center panning state in pixel coordinates at current zoom level
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; startPanX: number; startPanY: number }>({
    x: 0,
    y: 0,
    startPanX: 0,
    startPanY: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 360,
    height: 260,
  });

  // Track container dimensions for tile calculations
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const updateSize = () => {
      if (el) {
        setContainerSize({ width: el.clientWidth || 360, height: el.clientHeight || 320 });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const loadMosques = useCallback(
    (force = false) => {
      if (!place) return;
      setLoading(true);
      nearbyMosques(place.lat, place.lon, 15000, force, place.name)
        .then((m) => {
          setMosques(m);
        })
        .catch(() => setMosques([]))
        .finally(() => setLoading(false));
    },
    [place],
  );

  useEffect(() => {
    loadMosques(false);
  }, [loadMosques]);

  // Center coordinate in tiles
  const userCenter = useMemo(() => {
    if (!place) return { x: 0, y: 0 };
    return {
      x: lonToX(place.lon, zoom),
      y: latToY(place.lat, zoom),
    };
  }, [place, zoom]);

  // Current view center factoring in drag offset
  const viewCenterX = userCenter.x - panOffset.x / TILE;
  const viewCenterY = userCenter.y - panOffset.y / TILE;

  // Recenter map on user location
  const handleRecenter = () => {
    setPanOffset({ x: 0, y: 0 });
    setZoom(DEFAULT_ZOOM);
    if (place) {
      appToast.info(`${t.myLocation || "Recentré sur"} ${place.name}`, { category: "prayer" });
    }
  };

  // Focus specific mosque on map
  const handleFocusMosque = (m: Mosque) => {
    setSelectedMosque(m);
    if (!place) return;
    const mX = lonToX(m.lon, zoom);
    const mY = latToY(m.lat, zoom);
    // Adjust pan offset so mosque is in the center
    setPanOffset({
      x: (userCenter.x - mX) * TILE,
      y: (userCenter.y - mY) * TILE,
    });
    if (onSelectMosque) {
      onSelectMosque(m);
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    setZoom((z) => Math.min(z + 1, MAX_ZOOM));
  };
  const handleZoomOut = () => {
    setZoom((z) => Math.max(z - 1, MIN_ZOOM));
  };

  // Pointer drag events for smooth pan
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, a, [data-interactive]")) return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPanX: panOffset.x,
      startPanY: panOffset.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPanOffset({
      x: dragStartRef.current.startPanX + dx,
      y: dragStartRef.current.startPanY + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // Calculate tiles around view center
  const tiles = useMemo(() => {
    const halfWidth = containerSize.width / 2;
    const halfHeight = containerSize.height / 2;
    const spanX = Math.ceil(halfWidth / TILE) + 1;
    const spanY = Math.ceil(halfHeight / TILE) + 1;

    const centerTileX = Math.floor(viewCenterX);
    const centerTileY = Math.floor(viewCenterY);

    const list: { x: number; y: number }[] = [];
    for (let dx = -spanX; dx <= spanX; dx++) {
      for (let dy = -spanY; dy <= spanY; dy++) {
        list.push({ x: centerTileX + dx, y: centerTileY + dy });
      }
    }
    return list;
  }, [viewCenterX, viewCenterY, containerSize.width, containerSize.height]);

  // Compute pixel positions relative to map center
  const getScreenPos = (lon: number, lat: number) => {
    const tx = lonToX(lon, zoom);
    const ty = latToY(lat, zoom);
    const px = (tx - viewCenterX) * TILE + containerSize.width / 2;
    const py = (ty - viewCenterY) * TILE + containerSize.height / 2;
    return { left: px, top: py };
  };

  // Filtered mosques
  const filteredMosques = useMemo(() => {
    const list = Array.isArray(mosques) ? mosques : [];
    return list
      .filter(
        (m): m is Mosque =>
          Boolean(
            m &&
              typeof m === "object" &&
              typeof m.lat === "number" &&
              typeof m.lon === "number",
          ),
      )
      .filter((m) => {
        if (filterMode === "official" && !m.isOfficial) return false;
        if (filterMode === "jumua" && !m.jumua) return false;
        if (searchFilter.trim()) {
          const q = searchFilter.toLowerCase();
          return (
            (m.name && m.name.toLowerCase().includes(q)) ||
            (m.address && m.address.toLowerCase().includes(q))
          );
        }
        return true;
      });
  }, [mosques, filterMode, searchFilter]);

  const syncedMosque = settings.mosque;

  const handleSync = (m: Mosque) => {
    update({
      mosque: {
        id: m.id,
        slug: m.slug,
        name: m.name,
        city: place?.name ?? "",
        country: place?.country,
        address: m.address,
        lat: m.lat,
        lon: m.lon,
        source: m.source,
        isOfficial: m.isOfficial,
        jumua: m.jumua,
        jumua2: m.jumua2,
        shuruq: m.shuruq,
        timezone: m.timezone,
      },
    });
    appToast.success(`${t.syncedWith || "Horaires synchronisés avec"} ${m.name}`, {
      category: "settings",
    });
  };

  if (!place) {
    return (
      <section
        data-widget-card
        className={`rounded-[32px] p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm text-center ${className}`}
      >
        <MapPin className="mx-auto size-8 text-muted-foreground opacity-60 mb-2" />
        <h3 className="font-bold text-sm">{t.mosquesNearby || "Mosquées à proximité"}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {t.enableLocationPrompt || "Sélectionnez votre ville pour afficher les mosquées autour de vous."}
        </p>
      </section>
    );
  }

  const userPos = getScreenPos(place.lon, place.lat);

  return (
    <section
      data-widget-card
      className={`rounded-[32px] p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col gap-3 ${className}`}
    >
      {/* Header with Title, Mosque Count & Refresh */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <span className="text-base">🕌</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-extrabold tracking-tight">
                {t.mosquesNearby || "Mosquées à proximité"}
              </h2>
              {mosques.length > 0 && (
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.2 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  {mosques.length}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate max-w-[210px] sm:max-w-xs">
              {place.name} {place.country ? `• ${place.country}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => loadMosques(true)}
            disabled={loading}
            title={t.refresh || "Actualiser"}
            className="grid size-8 place-items-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-xs">
        <button
          type="button"
          onClick={() => setFilterMode("all")}
          className={`px-3 py-1 rounded-full font-bold transition text-[11px] whitespace-nowrap active:scale-95 ${
            filterMode === "all"
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
              : "bg-slate-100 dark:bg-slate-800/80 text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          {t.allFilter || "Toutes"} ({mosques.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode("official")}
          className={`px-3 py-1 rounded-full font-bold transition text-[11px] whitespace-nowrap flex items-center gap-1 active:scale-95 ${
            filterMode === "official"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-slate-100 dark:bg-slate-800/80 text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          <Sparkles className="size-3 text-amber-300" />
          {t.officialMawaqit || "Officielles (Mawaqit)"}
        </button>
        <button
          type="button"
          onClick={() => setFilterMode("jumua")}
          className={`px-3 py-1 rounded-full font-bold transition text-[11px] whitespace-nowrap active:scale-95 ${
            filterMode === "jumua"
              ? "bg-emerald-600 text-white shadow-xs"
              : "bg-slate-100 dark:bg-slate-800/80 text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          {t.jumuaLabel || "Jumua"}
        </button>
      </div>

      {/* Interactive Map Viewport */}
      <div className="relative rounded-[1.6rem] overflow-hidden border border-slate-200/90 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 shadow-inner">
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`relative w-full ${initialHeight} select-none overflow-hidden touch-none cursor-grab active:cursor-grabbing`}
        >
          {/* Tiles Layer (Satellite Hybride ou Plan classique) */}
          <div
            className={`absolute inset-0 pointer-events-none ${
              mapType === "streets"
                ? "dark:brightness-[0.75] dark:contrast-[1.1] dark:invert-[0.92] dark:hue-rotate-180"
                : ""
            }`}
          >
            {tiles.map((tl) => {
              const maxTile = Math.pow(2, zoom);
              const wrappedX = ((tl.x % maxTile) + maxTile) % maxTile;
              const clampedY = Math.max(0, Math.min(tl.y, maxTile - 1));
              const style = {
                left: (tl.x - viewCenterX) * TILE + containerSize.width / 2,
                top: (tl.y - viewCenterY) * TILE + containerSize.height / 2,
              };

              const srv = Math.abs(tl.x + tl.y) % 4;

              if (mapType === "satellite") {
                const googleSatUrl = `https://mt${srv}.google.com/vt/lyrs=y&x=${wrappedX}&y=${clampedY}&z=${zoom}`;
                const esriFallbackUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${clampedY}/${wrappedX}`;
                return (
                  <div
                    key={`sat-${zoom}-${tl.x}-${tl.y}`}
                    className="absolute size-64 max-w-none"
                    style={style}
                  >
                    {/* Vue Satellite Haute Définition Réaliste Hybride (Végétation verdoyante, routes orange/jaunes, noms des rues) */}
                    <img
                      src={googleSatUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== esriFallbackUrl) {
                          target.src = esriFallbackUrl;
                        }
                      }}
                      className="absolute inset-0 size-full object-cover select-none"
                    />
                  </div>
                );
              }

              const googleRoadmapUrl = `https://mt${srv}.google.com/vt/lyrs=m&x=${wrappedX}&y=${clampedY}&z=${zoom}`;
              const osmFallbackUrl = `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${clampedY}.png`;
              return (
                <img
                  key={`osm-${zoom}-${tl.x}-${tl.y}`}
                  src={googleRoadmapUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== osmFallbackUrl) {
                      target.src = osmFallbackUrl;
                    }
                  }}
                  className="absolute size-64 max-w-none transition-opacity duration-150"
                  style={style}
                />
              );
            })}
          </div>

          {/* User Location Radar Marker */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 transition-transform duration-75"
            style={{ left: userPos.left, top: userPos.top }}
          >
            <div className="relative flex items-center justify-center">
              <span className="absolute size-9 animate-ping rounded-full bg-blue-500/30" />
              <span className="absolute size-6 rounded-full bg-blue-500/20 ring-2 ring-blue-500/40" />
              <span className="relative size-3.5 rounded-full border-2 border-white bg-blue-600 shadow-md" />
            </div>
            <span className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900/90 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-md backdrop-blur-xs">
              {t.youAreHere || "Vous êtes ici"}
            </span>
          </div>

          {/* Mosque Markers */}
          {filteredMosques.map((m) => {
            const pos = getScreenPos(m.lon, m.lat);
            const isSelected = selectedMosque?.id === m.id;
            const isSynced = syncedMosque?.id === m.id || (m.slug && syncedMosque?.slug === m.slug);

            if (
              pos.left < -60 ||
              pos.left > containerSize.width + 60 ||
              pos.top < -60 ||
              pos.top > containerSize.height + 60
            ) {
              return null;
            }

            return (
              <div
                key={m.id}
                data-interactive
                onClick={() => handleFocusMosque(m)}
                className="absolute -translate-x-1/2 -translate-y-full cursor-pointer z-20 transition-all duration-150 hover:scale-110 active:scale-95"
                style={{ left: pos.left, top: pos.top }}
              >
                <div className="flex flex-col items-center">
                  {/* Pin Body */}
                  <div
                    className={`relative flex items-center gap-1 rounded-2xl px-2.5 py-1 shadow-xl border transition-all ${
                      isSynced
                        ? "bg-emerald-600 text-white border-emerald-300 ring-2 ring-emerald-400/50 scale-105"
                        : isSelected
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-amber-400 ring-2 ring-amber-400/50 scale-105"
                          : m.isOfficial
                            ? "bg-emerald-900/90 text-white border-emerald-400/60 shadow-md"
                            : "bg-slate-900/90 text-white border-white/40 shadow-md"
                    }`}
                  >
                    <span className="text-xs">🕌</span>
                    <span className="text-[10px] font-extrabold max-w-[95px] truncate leading-none">
                      {(m.name || "Mosquée").replace(/^Mosquée\s+/i, "")}
                    </span>
                    {isSynced ? (
                      <Check className="size-2.5 text-emerald-200 stroke-[3]" />
                    ) : m.isOfficial ? (
                      <Sparkles className="size-2.5 text-amber-300" />
                    ) : null}
                  </div>

                  {/* Pin needle */}
                  <div
                    className={`size-2 rotate-45 -mt-1 border-r border-b ${
                      isSynced
                        ? "bg-emerald-600 border-emerald-300"
                        : isSelected
                          ? "bg-slate-900 dark:bg-white border-amber-400"
                          : m.isOfficial
                            ? "bg-emerald-900/90 border-emerald-400/60"
                            : "bg-slate-900/90 border-white/40"
                    }`}
                  />
                </div>
              </div>
            );
          })}

          {/* Map Floating Controls (Top Right) */}
          <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-30">
            {/* Toggle Satellite Hybride / Plan */}
            <button
              type="button"
              onClick={() => setMapType((t) => (t === "satellite" ? "streets" : "satellite"))}
              title={mapType === "satellite" ? "Vue Plan" : "Vue Satellite Hybride"}
              className="grid size-8.5 place-items-center rounded-xl bg-slate-900/85 hover:bg-slate-900 text-white shadow-lg border border-white/20 backdrop-blur-md transition active:scale-95"
            >
              <Layers className={`size-4 ${mapType === "satellite" ? "text-emerald-400" : "text-slate-300"}`} />
            </button>

            {/* Recenter button */}
            <button
              type="button"
              onClick={handleRecenter}
              title={t.recenterMap || "Recentrer"}
              className="grid size-8.5 place-items-center rounded-xl bg-slate-900/85 hover:bg-slate-900 text-white shadow-lg border border-white/20 backdrop-blur-md transition active:scale-95"
            >
              <Crosshair className="size-4 text-emerald-400" />
            </button>

            {/* Zoom In */}
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= MAX_ZOOM}
              title={t.zoomIn || "Zoomer"}
              className="grid size-8.5 place-items-center rounded-t-xl bg-slate-900/85 hover:bg-slate-900 text-white shadow-lg border border-white/20 backdrop-blur-md transition active:scale-95 disabled:opacity-40"
            >
              <Plus className="size-4" />
            </button>

            {/* Zoom Out */}
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= MIN_ZOOM}
              title={t.zoomOut || "Dézoomer"}
              className="grid size-8.5 place-items-center rounded-b-xl -mt-1.5 bg-slate-900/85 hover:bg-slate-900 text-white shadow-lg border border-white/20 backdrop-blur-md transition active:scale-95 disabled:opacity-40"
            >
              <Minus className="size-4" />
            </button>
          </div>

          {/* Quick Map Type Badge (Bottom Left) */}
          <div className="absolute bottom-2.5 left-2.5 z-30 pointer-events-none">
            <span className="rounded-lg bg-black/80 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm backdrop-blur-md flex items-center gap-1.5 border border-white/10">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {mapType === "satellite" ? "Satellite Hybride" : "Plan"} • Zoom {zoom}
            </span>
          </div>

          {/* Selected Mosque Floating Card */}
          {selectedMosque && (
            <div className="absolute inset-x-2.5 bottom-2.5 z-40 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="rounded-2xl p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-700 shadow-xl flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-extrabold text-sm truncate">{selectedMosque.name}</h4>
                      {selectedMosque.isOfficial && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/70 px-1.5 py-0.2 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="size-2.5" />
                          {t.officialBadge || "Officiel"}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {selectedMosque.address || place.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px]">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                        <Navigation className="size-3" />
                        {formatDistanceKm(
                          selectedMosque.distance,
                          place?.lat,
                          place?.lon,
                          selectedMosque.lat,
                          selectedMosque.lon,
                        )}
                      </span>
                      {selectedMosque.jumua && (
                        <span className="text-muted-foreground font-medium">
                          {t.jumuaLabel || "Jumua"} : <strong className="font-mono">{selectedMosque.jumua}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMosque(null)}
                    className="grid size-6 place-items-center rounded-full text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>

                {/* Actions: Itinéraire + Synchroniser */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedMosque.lat},${selectedMosque.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 py-2 text-xs font-bold transition active:scale-95"
                  >
                    <Navigation className="size-3 text-blue-500" />
                    {t.directions || "Itinéraire"}
                    <ExternalLink className="size-2.5 opacity-50" />
                  </a>

                  {syncedMosque?.id === selectedMosque.id ? (
                    <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-3 py-2 text-xs font-bold">
                      <Check className="size-3 text-emerald-600" />
                      {t.syncedButton || "Synchronisé"}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSync(selectedMosque)}
                      className="widget inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold shadow-xs transition active:scale-95"
                    >
                      <Sparkles className="size-3" />
                      {t.syncButton || "Synchroniser"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Refonte de la section « Plus proches de vous » : Cartes modernes et défilement vertical fluide */}
      {filteredMosques.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-foreground tracking-tight">
                {t.nearestMosques || "Plus proches de vous"}
              </span>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/70 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                {filteredMosques.length}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">
              {t.clickToLocate || "Toucher pour situer"}
            </span>
          </div>

          {/* Liste défilable verticalement de manière fluide */}
          <div className="max-h-[360px] sm:max-h-[440px] overflow-y-auto space-y-2.5 pr-1 scroll-smooth overscroll-contain">
            {filteredMosques.map((m) => {
              const active = selectedMosque?.id === m.id;
              const isSynced = syncedMosque?.id === m.id || (m.slug && syncedMosque?.slug === m.slug);

              return (
                <div
                  key={m.id}
                  onClick={() => handleFocusMosque(m)}
                  className={`group relative flex items-center justify-between gap-3.5 rounded-2xl p-3 sm:p-3.5 border transition-all duration-200 cursor-pointer ${
                    active
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-amber-400 shadow-md ring-2 ring-amber-400/30 scale-[1.01]"
                      : isSynced
                        ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500/40 shadow-xs hover:shadow-md hover:border-emerald-500/60"
                        : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  {/* À gauche : Icône moderne / emplacement photo avec badge asymétrique */}
                  <div className="relative shrink-0">
                    <div
                      className={`grid size-11 place-items-center rounded-xl shadow-xs transition-transform group-hover:scale-105 ${
                        active
                          ? "bg-white/20 text-white dark:bg-slate-900/15 dark:text-slate-900"
                          : isSynced
                            ? "bg-emerald-600 text-white shadow-emerald-500/20"
                            : "bg-gradient-to-br from-emerald-500/15 to-teal-500/10 dark:from-emerald-950/60 dark:to-slate-800 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      <span className="text-xl leading-none">🕌</span>
                    </div>
                    {isSynced && (
                      <span className="absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full bg-emerald-600 text-white ring-2 ring-background">
                        <Check className="size-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  {/* Au centre : Nom de la mosquée en gras, et adresse en dessous en plus petit et en gris */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4
                        className={`font-bold text-sm sm:text-[15px] truncate leading-snug ${
                          active
                            ? "text-white dark:text-slate-900"
                            : "text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400"
                        }`}
                      >
                        {m.name}
                      </h4>
                      {m.isOfficial && (
                        <span
                          className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.2 text-[9px] font-bold ${
                            active
                              ? "bg-white/20 text-white"
                              : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                          }`}
                        >
                          <Sparkles className="size-2.5 text-amber-400" />
                          Mawaqit
                        </span>
                      )}
                    </div>

                    <p
                      className={`text-xs truncate mt-0.5 ${
                        active ? "text-white/80 dark:text-slate-700" : "text-muted-foreground"
                      }`}
                    >
                      {m.address || place.name}
                    </p>

                    {m.jumua && (
                      <p
                        className={`text-[10px] mt-1 font-medium ${
                          active ? "text-white/75 dark:text-slate-600" : "text-muted-foreground/80"
                        }`}
                      >
                        Jumua : <span className="font-mono font-bold">{m.jumua}</span>
                        {m.jumua2 && <span className="font-mono font-bold"> / {m.jumua2}</span>}
                      </p>
                    )}
                  </div>

                  {/* À droite : La distance (ex: 1.8 km) affichée de façon claire et élégante */}
                  <div className="shrink-0 flex flex-col items-end gap-1.5 pl-1">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold shadow-xs tabular-nums ${
                        active
                          ? "bg-white/25 text-white dark:bg-slate-900/20 dark:text-slate-900"
                          : "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                      }`}
                    >
                      <Navigation className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{formatDistanceKm(m.distance, place?.lat, place?.lon, m.lat, m.lon)}</span>
                    </span>

                    {/* Actions d'accès rapide */}
                    <div className="flex items-center gap-1">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lon}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title={t.directions || "Itinéraire"}
                        className={`grid size-7 place-items-center rounded-lg transition active:scale-90 ${
                          active
                            ? "bg-white/20 text-white hover:bg-white/30"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        <ExternalLink className="size-3" />
                      </a>

                      {isSynced ? (
                        <span
                          title={t.syncedButton || "Synchronisé"}
                          className="grid size-7 place-items-center rounded-lg bg-emerald-600 text-white"
                        >
                          <Check className="size-3.5 stroke-[3]" />
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSync(m);
                          }}
                          title={t.syncButton || "Synchroniser"}
                          className={`grid size-7 place-items-center rounded-lg transition active:scale-90 ${
                            active
                              ? "bg-white text-slate-900 hover:bg-slate-100"
                              : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                          }`}
                        >
                          <Sparkles className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer link to dedicated /mosques page */}
      {showAllLink && (
        <div className="pt-1 flex items-center justify-center">
          <Link
            to="/mosques"
            className="widget inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold shadow-xs transition hover:scale-105 active:scale-95"
          >
            <span>{t.chooseMosque || "Choisir une mosquée"}</span>
            <ChevronRight className="size-3.5" />
          </Link>
        </div>
      )}
    </section>
  );
});