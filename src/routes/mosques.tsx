import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Check,
  CheckCircle2,
  ExternalLink,
  Globe,
  List as ListIcon,
  Loader2,
  Map as MapIcon,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { appToast } from "@/lib/app-toast";
import { useSettings } from "@/lib/app-settings";
import { useI18n } from "@/lib/i18n";
import { formatDistanceKm, nearbyMosques, type Mosque } from "@/lib/mosques";
import { Input } from "@/components/ui/input";
import { MosqueMap } from "@/components/MosqueMap";
import { PageTutorialModal, usePageTutorial } from "@/components/PageTutorialModal";
import { PageTutorialButton } from "@/components/PageTutorialButton";

export const Route = createFileRoute("/mosques")({
  head: () => ({
    meta: [
      { title: "Choisir une mosquée — Islam-Noor" },
      {
        name: "description",
        content:
          "Sélectionnez manuellement une mosquée de votre ville pour synchroniser vos horaires officiels de prière.",
      },
      { property: "og:title", content: "Choisir une mosquée — Islam-Noor" },
      {
        property: "og:description",
        content: "Synchronisez vos horaires avec la mosquée officielle de votre choix.",
      },
    ],
  }),
  component: MosquesPage,
});

function MosquesPage() {
  const navigate = useNavigate();
  const { t: rawT } = useI18n();
  const t = rawT as any;
  const { settings, update } = useSettings();
  const {
    isOpen: isTutorialOpen,
    openTutorial: handleOpenTutorial,
    closeTutorial: handleCloseTutorial,
  } = usePageTutorial("mosques");
  const place = settings.place;
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  const city = place?.name ?? "";
  const current = settings.mosque?.city === city ? settings.mosque : null;

  const loadMosques = (force = false, query?: string) => {
    if (!place) return;
    setLoading(true);
    const effectiveCity = query && query.trim().length >= 2 ? query.trim() : city;
    nearbyMosques(place.lat, place.lon, 15000, force, effectiveCity)
      .then((m) => setMosques(Array.isArray(m) ? m : []))
      .catch(() => setMosques([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMosques(false);
  }, [place?.lat, place?.lon]); // eslint-disable-line react-hooks/exhaustive-deps

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
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          (m.name && m.name.toLowerCase().includes(q)) ||
          (m.address && m.address.toLowerCase().includes(q))
        );
      });
  }, [mosques, searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      loadMosques(true, searchQuery.trim());
    }
  };

  return (
    <div className="space-y-4 px-4 pb-12 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="relative flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-extrabold">{t.chooseMosque}</h1>
          <button
            type="button"
            onClick={() => loadMosques(true, searchQuery)}
            disabled={loading}
            title={t.refreshSearch}
            className="grid size-8 place-items-center rounded-full bg-muted text-muted-foreground transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <PageTutorialButton onClick={handleOpenTutorial} variant="pill" />
          <button
            type="button"
            aria-label={t.close}
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                window.history.back();
              } else {
                navigate({ to: "/" });
              }
            }}
            className="grid size-9 place-items-center rounded-full border border-border text-muted-foreground transition-transform active:scale-95"
          >
            <X className="size-5" />
          </button>
        </div>
      </header>

      {/* Mosque and City Quick Search */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`${t.searchMosqueIn || "Rechercher une mosquée à"} ${city || t.yourCity || "votre ville"}…`}
          className="pl-10 pr-10 rounded-2xl h-11 bg-white/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              loadMosques(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </form>

      {/* Active Mosque Banner */}
      {current && (
        <div className="rounded-2xl p-4 bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{t.mosqueCurrentlySynced || "Mosquée actuellement synchronisée"}</span>
            </div>
            <p className="font-extrabold text-sm truncate mt-0.5">{current.name}</p>
            {current.isOfficial && (
              <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                {t.officialMawaqitTimes || "Horaires officiels Mawaqit"}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              update({ mosque: null });
              appToast.info(t.backToCityCalculations || "Retour aux calculs astronomiques de la ville", {
                category: "settings",
              });
            }}
            className="shrink-0 text-xs font-bold text-muted-foreground hover:text-destructive underline px-2 py-1"
          >
            {t.unsyncMosque || "Désynchroniser"}
          </button>
        </div>
      )}

      {/* View Mode Switcher: Carte / Liste */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="inline-flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
          <button
            type="button"
            onClick={() => setViewMode("map")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 ${
              viewMode === "map"
                ? "bg-white dark:bg-slate-900 text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MapIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{t.mapView || "Carte"}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all active:scale-95 ${
              viewMode === "list"
                ? "bg-white dark:bg-slate-900 text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ListIcon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{t.listView || "Liste"} ({filteredMosques.length})</span>
          </button>
        </div>

        <span className="text-[11px] font-bold text-muted-foreground">
          {filteredMosques.length} {t.mosquesCount || "mosquées"}
        </span>
      </div>

      {/* Map View Mode */}
      {viewMode === "map" && (
        <div className="animate-in fade-in duration-150">
          <MosqueMap
            initialHeight="h-[250px] sm:h-[270px]"
            showAllLink={false}
          />
        </div>
      )}

      {/* List View Mode */}
      {viewMode === "list" && (
        <div className="space-y-3 animate-in fade-in duration-150">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="size-8 animate-spin text-[var(--w-from)]" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">{t.searchingMosques}</p>
            </div>
          )}

          {!loading && !filteredMosques.length && (
            <div className="rounded-3xl p-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center">
              <p className="text-sm text-muted-foreground">
                {t.noMosqueFound} {city ? `(${city})` : ""}.
              </p>
              <button
                type="button"
                onClick={() => loadMosques(true, searchQuery)}
                className="widget mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold shadow"
              >
                <RefreshCw className="size-3.5" /> {t.retry}
              </button>
            </div>
          )}

      <ul className="space-y-2.5">
        {filteredMosques.map((m, idx) => {
          const active = Boolean(
            m && (
              (current?.id && m.id && current.id === m.id) ||
              (current?.slug && m.slug && current.slug === m.slug)
            )
          );
          const mosqueKey = m.id || (m.slug ? `mosque-${m.slug}` : `mosque-${idx}-${m.lat}-${m.lon}`);
          return (
            <li
              key={mosqueKey}
              data-widget-card
              className={`group relative flex items-center justify-between gap-3.5 rounded-2xl p-3.5 sm:p-4 border transition-all duration-200 ${
                active
                  ? "bg-white dark:bg-slate-900 border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
                  : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              {/* À gauche : Icône moderne */}
              <div className="relative shrink-0">
                <div
                  className={`grid size-12 place-items-center rounded-xl shadow-xs transition-transform group-hover:scale-105 ${
                    active
                      ? "bg-emerald-600 text-white shadow-emerald-500/20"
                      : "bg-gradient-to-br from-emerald-500/15 to-teal-500/10 dark:from-emerald-950/60 dark:to-slate-800 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  <span className="text-2xl leading-none">🕌</span>
                </div>
                {active && (
                  <span className="absolute -bottom-1 -right-1 grid size-4.5 place-items-center rounded-full bg-emerald-600 text-white ring-2 ring-background">
                    <Check className="size-3 stroke-[3]" />
                  </span>
                )}
              </div>

              {/* Au centre : Nom de la mosquée en gras, adresse en dessous en plus petit et en gris */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-bold text-sm sm:text-base text-foreground truncate leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {m.name}
                  </h3>
                  {m.isOfficial && (
                    <span className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      <Sparkles className="size-2.5 text-amber-500" />
                      Mawaqit
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {m.address || `${city}${place?.country ? `, ${place.country}` : ""}`}
                </p>
                {m.jumua && (
                  <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                    {t.jumuaLabel || "Jumua"} : <span className="font-mono font-bold text-foreground">{m.jumua}</span>
                    {m.jumua2 && <span className="font-mono font-bold text-foreground"> / {m.jumua2}</span>}
                  </p>
                )}
              </div>

              {/* À droite : Distance affichée de façon claire et élégante + actions */}
              <div className="shrink-0 flex flex-col items-end gap-2 pl-1">
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 shadow-xs tabular-nums">
                  <Navigation className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{formatDistanceKm(m.distance, place?.lat, place?.lon, m.lat, m.lon)}</span>
                </span>

                <div className="flex items-center gap-1.5">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="grid size-8 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition active:scale-90 shadow-xs"
                    title={t.directions || "Itinéraire"}
                  >
                    <ExternalLink className="size-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      update({
                        mosque: {
                          id: m.id,
                          slug: m.slug,
                          name: m.name,
                          city,
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
                      navigate({ to: "/" });
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-xs active:scale-95 ${
                      active ? "bg-emerald-600 text-white" : "widget hover:opacity-95"
                    }`}
                  >
                    {active ? (
                      <>
                        <Check className="size-3.5" />
                        <span>{t.syncedButton || "Synchronisé"}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-3.5" />
                        <span>{t.syncButton || "Synchroniser"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      </div>
      )}

      {/* Interactive Page Tutorial Modal */}
      <PageTutorialModal
        pageId="mosques"
        isOpen={isTutorialOpen}
        onClose={handleCloseTutorial}
      />
    </div>
  );
}
