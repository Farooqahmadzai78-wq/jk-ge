import { useCallback, useEffect, useRef, useState } from "react";
import { useSettings } from "@/lib/app-settings";
import {
  fetchDayTimes,
  getCachedDayTimes,
  reverseGeocode,
  type DayTimes,
  nextPrayer,
  zonedNow,
  type PrayerKey,
} from "@/lib/prayer-times";

/**
 * La localisation automatique n'est utilisee QUE si l'utilisateur l'a
 * explicitement activee et n'a pas choisi une ville manuellement.
 * (fonction pure : testable)
 */
export function shouldUseAutomaticLocation(settings: {
  manualPlace?: boolean;
  autoGeolocation?: boolean;
}): boolean {
  return !settings.manualPlace && settings.autoGeolocation === true;
}

export function usePrayerTimes(options?: { disableClock?: boolean }) {
  const disableClock = options?.disableClock === true;
  const { settings, update, ready } = useSettings();

  const place = settings.place;
  // A manually synced mosque overrides the city centre for the timings query.
  const mosque = settings.mosque && settings.mosque.city === place?.name ? settings.mosque : null;
  const coords = mosque ?? place;

  const [dateKey, setDateKey] = useState(() => new Date().toDateString());

  const initialCached = coords
    ? getCachedDayTimes(
        coords.lat,
        coords.lon,
        settings.method,
        settings.school,
        new Date(),
        coords.timezone,
        mosque,
      )
    : undefined;

  const [data, setData] = useState<DayTimes | null>(() => initialCached || null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialCached);
  const locating = useRef(false);

  // Resolve a location once (browser geolocation) unless the user picked a city.
  useEffect(() => {
    // La ville choisie n'est remplacee que si l'utilisateur l'a explicitement
    // demande : soit il a choisi une ville (manualPlace), soit il a active la
    // localisation automatique (autoGeolocation). Sans cela, la ville reste
    // celle du premier lancement (La Mecque) et n'est jamais remplacee en silence.
    if (!ready || !shouldUseAutomaticLocation(settings) || locating.current) return;
    locating.current = true;

    const fallback = () =>
      update({
        place: {
          name: "La Mecque",
          country: "Arabie saoudite",
          lat: 21.4225,
          lon: 39.8262,
          timezone: "Asia/Riyadh",
        },
      });

    if (!("geolocation" in navigator)) return fallback();
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        const geo = await reverseGeocode(lat, lon);
        update({ place: { ...geo, lat, lon } });
      },
      () => fallback(),
      { timeout: 10000, maximumAge: 600000 },
    );
  }, [ready, settings.manualPlace, settings.autoGeolocation, update]);

  const load = useCallback(async () => {
    if (!coords) return;
    const now = new Date();
    const cached = getCachedDayTimes(
      coords.lat,
      coords.lon,
      settings.method,
      settings.school,
      now,
      coords.timezone,
      mosque,
    );
    if (cached) {
      setData(cached);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const res = await fetchDayTimes(
        coords.lat,
        coords.lon,
        settings.method,
        settings.school,
        now,
        coords.timezone,
        mosque,
      );
      setData(res);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, [coords?.lat, coords?.lon, coords?.timezone, settings.method, settings.school, mosque]);

  useEffect(() => {
    void load();
  }, [load, dateKey]);

  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    if (disableClock) {
      // Pour les consommateurs d'arrière-plan sans affichage de secondes en direct,
      // une simple vérification toutes les 60 secondes suffit pour basculer la date à minuit.
      const id = window.setInterval(() => {
        const curKey = new Date().toDateString();
        if (curKey !== dateKey) {
          setDateKey(curKey);
        }
      }, 60000);
      return () => window.clearInterval(id);
    }

    // L'horloge declenche un rendu de chaque composant qui la consomme une
    // fois par seconde : on ne la fait tourner que si l'application est
    // visible, et on la redemarre aussitot au retour au premier plan.
    let id: number | null = null;

    const start = () => {
      if (id !== null) return;
      id = window.setInterval(() => {
        const current = new Date();
        setClock(current);
        // Check if date turned midnight
        const curKey = current.toDateString();
        if (curKey !== dateKey) {
          setDateKey(curKey);
        }
      }, 1000);
    };

    const stop = () => {
      if (id !== null) {
        window.clearInterval(id);
        id = null;
      }
    };

    const onVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        stop();
      } else {
        setClock(new Date());
        start();
      }
    };

    if (typeof document === "undefined" || document.visibilityState !== "hidden") {
      start();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [dateKey, disableClock]);

  // "now" follows the timezone of the selected city, not the phone's timezone.
  const resolvedTz = data?.timezone || coords?.timezone;
  const now = zonedNow(resolvedTz, clock);
  const next = data ? nextPrayer(data.timings, now) : null;

  return {
    place,
    mosque,
    data,
    next: next as { key: PrayerKey; at: Date; tomorrow: boolean } | null,
    now,
    clock,
    timezone: resolvedTz,
    loading,
    error,
    reload: load,
    isMosqueOfficial: Boolean(data?.isMosqueOfficial || mosque?.isOfficial),
    source: data?.source,
    sourceType: data?.sourceType,
    iqama: data?.iqama,
    iqamaDisplay: data?.iqamaDisplay,
    jumua: data?.jumua || mosque?.jumua,
    jumua2: data?.jumua2 || mosque?.jumua2,
    jumua3: data?.jumua3,
    shuruq: data?.shuruq || data?.timings?.Sunrise,
  };
}
