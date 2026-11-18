/**
 * Engine-name matching, in one place.
 *
 * The UI sends engine keys as labels ("Google Maps", "JustDial", "local-finder",
 * "deep-serp"), the queue uses task names, and the operators type shorthand.
 * This module maps all of those onto stable keys so the scope engines and the
 * orchestrator agree on what is enabled.
 */

function normaliseEngines(engines) {
  return (Array.isArray(engines) ? engines : [])
    .map(engine => String(engine).toLowerCase().replace(/[^a-z0-9]/g, ''));
}

/**
 * @param {string[]} engines engine labels chosen by the operator
 * @returns {(key: string) => boolean}
 */
function makeHasEngine(engines) {
  const normEngines = normaliseEngines(engines);
  const isAutoMode = normEngines.length === 0 || normEngines.includes('auto');

  return (key) => {
    if (isAutoMode) {
      // Brave is rate-limited (HTTP 429) and is not part of any country bundle,
      // so it only ever runs when the operator selects it explicitly. Every
      // other bundled engine — including the India social dorks — runs by
      // default, so the engine board never advertises an engine that auto mode
      // silently refuses to dispatch.
      if (key === 'brave') return false;
      return true;
    }
    switch (key) {
      case 'local_finder':
        return normEngines.some(e => e.includes('localfinder') || (e.includes('local') && !e.includes('social')) || e.includes('finder') || e.includes('deepserp'));
      case 'google-serp':
      case 'serp':
        return normEngines.some(e => e.includes('googleserp') || (e.includes('serp') && !e.includes('local')) || e.includes('webpage') || e.includes('organic'));
      case 'maps':
        return normEngines.some(e => e.includes('map') || e.includes('place') || e.includes('geospatial') || e.includes('mesh') || e.includes('radar') || e.includes('gps'));
      case 'justdial':
        return normEngines.some(e => e.includes('justdial') || e.includes('jd') || e.includes('telecom') || e.includes('mobile') || e.includes('direct'));
      case 'openstreetmap':
        return normEngines.some(e => e.includes('openstreetmap') || e.includes('osm') || e.includes('openmap') || e.includes('nominatim') || e.includes('overpass'));
      case 'indiamart':
        return normEngines.some(e => e.includes('indiamart') || e.includes('mart') || e.includes('b2b') || e.includes('enterprise') || e.includes('supplier'));
      case 'social':
        return normEngines.some(e => e.includes('dork') || e.includes('social') || e.includes('duckduckgo') || e.includes('ddg') || e.includes('instagram') || e.includes('facebook') || e.includes('footprint') || e.includes('digital'));
      case 'weddingbazaar':
        return normEngines.some(e => e.includes('weddingbazaar') || e.includes('bazaar') || e.includes('hospitality') || e.includes('venue'));
      case 'weddingwire':
        return normEngines.some(e => e.includes('weddingwire') || e.includes('wedding-wire') || e.includes('hospitality') || e.includes('venue'));
      case 'mandap':
        return normEngines.some(e => e.includes('mandap') || e.includes('hospitality') || e.includes('venue'));
      case 'web-discovery':
        return normEngines.some(e => e.includes('webdiscovery') || e.includes('websites') || e.includes('websearch'));
      case 'brave':
        return normEngines.some(e => e.includes('brave'));
      case 'yelp':
        return normEngines.some(e => e.includes('yelp'));
      case 'bing-places':
      case 'bing':
        return normEngines.some(e => e.includes('bing') || e.includes('bingplaces'));
      case 'tripadvisor':
        return normEngines.some(e => e.includes('tripadvisor') || e.includes('advisor') || e.includes('ta'));
      case 'wikidata':
        return normEngines.some(e => e.includes('wikidata') || e.includes('wiki'));
      case 'yellowpages':
      case 'yell':
        return normEngines.some(e => e.includes('yellowpages') || e.includes('yellow') || e.includes('yell') || e.includes('yp'));
      case 'freeindex':
        return normEngines.some(e => e.includes('freeindex'));
      case 'goldenpages':
        return normEngines.some(e => e.includes('goldenpages') || e.includes('golden'));
      case 'cylex':
        return normEngines.some(e => e.includes('cylex'));
      case 'trustpilot':
        return normEngines.some(e => e.includes('trustpilot') || e.includes('tp'));
      case 'social-dork':
        return normEngines.some(e => e.includes('dork') || e.includes('social') || e.includes('duckduckgo') || e.includes('ddg') || e.includes('instagram') || e.includes('facebook') || e.includes('footprint') || e.includes('digital'));
      default:
        return normEngines.includes(String(key).toLowerCase().replace(/[^a-z0-9]/g, ''));
    }
  };
}

module.exports = { normaliseEngines, makeHasEngine };
