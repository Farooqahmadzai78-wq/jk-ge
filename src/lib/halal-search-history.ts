const RECENT_SEARCHES_KEY = "islamnoor_recent_halal_searches";

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(term: string) {
  if (typeof window === "undefined") return;
  const cleaned = term.trim();
  if (cleaned.length < 2) return;
  try {
    const current = getRecentSearches();
    const filtered = [cleaned, ...current.filter((s) => s.toLowerCase() !== cleaned.toLowerCase())].slice(0, 8);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(filtered));
  } catch {
    /* ignore localStorage error */
  }
}

export function clearRecentSearches() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    /* ignore */
  }
}
