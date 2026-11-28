/**
 * shared/search/searchRecent.js
 * Shared localStorage recent-searches store per country & workspace key.
 */

export function readRecentSearches(country, storageKey = 'lp_recent_searches_v1') {
  try {
    const all = JSON.parse(localStorage.getItem(storageKey) || '{}');
    return Array.isArray(all[country]) ? all[country].slice(0, 6) : [];
  } catch (_) {
    return [];
  }
}

export function saveRecentSearch(country, category, location, storageKey = 'lp_recent_searches_v1') {
  if (!category || !location) return;
  try {
    const all = JSON.parse(localStorage.getItem(storageKey) || '{}');
    const list = Array.isArray(all[country]) ? all[country] : [];
    const text = `${category} in ${location}`;
    const filtered = list.filter((x) => x.text?.toLowerCase() !== text.toLowerCase());
    all[country] = [{ text, category, city: location, ts: Date.now() }, ...filtered].slice(0, 6);
    localStorage.setItem(storageKey, JSON.stringify(all));
  } catch (_) {}
}

export function clearRecentSearches(country, storageKey = 'lp_recent_searches_v1') {
  try {
    const all = JSON.parse(localStorage.getItem(storageKey) || '{}');
    delete all[country];
    localStorage.setItem(storageKey, JSON.stringify(all));
  } catch (_) {}
}
