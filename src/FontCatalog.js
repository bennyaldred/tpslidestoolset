/**
 * Supplies the list of variable fonts the sidebar can offer.
 *
 * Primary source is Google Fonts' public family metadata, which is the only
 * place that publishes per-family axis ranges without an API key. It is cached
 * because it is a ~1MB response and the sidebar asks for it on every open.
 * If the fetch fails (no network scope granted, endpoint moved, quota) we fall
 * back to a bundled catalog so the add-on still works.
 */

var VF_METADATA_URL = 'https://fonts.google.com/metadata/fonts';
var VF_CACHE_KEY = 'vf-catalog-v1';
var VF_CACHE_TTL_SECONDS = 21600; // 6 hours
var VF_CACHE_CHUNK_SIZE = 90000; // CacheService caps a value at 100KB.

/**
 * Bundled fallback. Ranges track the Google Fonts releases these were taken
 * from; the live metadata always wins when it is reachable.
 */
var VF_FALLBACK_CATALOG = [
  { family: 'Google Sans Flex', category: 'Sans Serif', axes: [
    { tag: 'opsz', min: 6, max: 144, defaultValue: 18 },
    { tag: 'slnt', min: -10, max: 0, defaultValue: 0 },
    { tag: 'wdth', min: 25, max: 151, defaultValue: 100 },
    { tag: 'wght', min: 1, max: 1000, defaultValue: 400 },
    { tag: 'GRAD', min: 0, max: 100, defaultValue: 0 },
    { tag: 'ROND', min: 0, max: 100, defaultValue: 0 }
  ] },
  { family: 'Roboto Flex', category: 'Sans Serif', axes: [
    { tag: 'opsz', min: 8, max: 144, defaultValue: 14 },
    { tag: 'slnt', min: -10, max: 0, defaultValue: 0 },
    { tag: 'wdth', min: 25, max: 151, defaultValue: 100 },
    { tag: 'wght', min: 100, max: 1000, defaultValue: 400 },
    { tag: 'GRAD', min: -200, max: 150, defaultValue: 0 }
  ] },
  { family: 'Roboto', category: 'Sans Serif', axes: [
    { tag: 'ital', min: 0, max: 1, defaultValue: 0 },
    { tag: 'wdth', min: 75, max: 100, defaultValue: 100 },
    { tag: 'wght', min: 100, max: 900, defaultValue: 400 }
  ] },
  { family: 'Open Sans', category: 'Sans Serif', axes: [
    { tag: 'ital', min: 0, max: 1, defaultValue: 0 },
    { tag: 'wdth', min: 75, max: 100, defaultValue: 100 },
    { tag: 'wght', min: 300, max: 800, defaultValue: 400 }
  ] },
  { family: 'Inter', category: 'Sans Serif', axes: [
    { tag: 'ital', min: 0, max: 1, defaultValue: 0 },
    { tag: 'opsz', min: 14, max: 32, defaultValue: 14 },
    { tag: 'wght', min: 100, max: 900, defaultValue: 400 }
  ] },
  { family: 'Montserrat', category: 'Sans Serif', axes: [
    { tag: 'ital', min: 0, max: 1, defaultValue: 0 },
    { tag: 'wght', min: 100, max: 900, defaultValue: 400 }
  ] },
  { family: 'Raleway', category: 'Sans Serif', axes: [
    { tag: 'ital', min: 0, max: 1, defaultValue: 0 },
    { tag: 'wght', min: 100, max: 900, defaultValue: 400 }
  ] },
  { family: 'Oswald', category: 'Sans Serif', axes: [
    { tag: 'wght', min: 200, max: 700, defaultValue: 400 }
  ] },
  { family: 'Work Sans', category: 'Sans Serif', axes: [
    { tag: 'ital', min: 0, max: 1, defaultValue: 0 },
    { tag: 'wght', min: 100, max: 900, defaultValue: 400 }
  ] },
  { family: 'Nunito', category: 'Sans Serif', axes: [
    { tag: 'ital', min: 0, max: 1, defaultValue: 0 },
    { tag: 'wght', min: 200, max: 1000, defaultValue: 400 }
  ] },
  { family: 'Manrope', category: 'Sans Serif', axes: [
    { tag: 'wght', min: 200, max: 800, defaultValue: 400 }
  ] },
  { family: 'Figtree', category: 'Sans Serif', axes: [
    { tag: 'ital', min: 0, max: 1, defaultValue: 0 },
    { tag: 'wght', min: 300, max: 900, defaultValue: 400 }
  ] },
  { family: 'Outfit', category: 'Sans Serif', axes: [
    { tag: 'wght', min: 100, max: 900, defaultValue: 400 }
  ] },
  { family: 'Space Grotesk', category: 'Sans Serif', axes: [
    { tag: 'wght', min: 300, max: 700, defaultValue: 400 }
  ] },
  { family: 'Lexend', category: 'Sans Serif', axes: [
    { tag: 'wght', min: 100, max: 900, defaultValue: 400 }
  ] },
  { family: 'Sora', category: 'Sans Serif', axes: [
    { tag: 'wght', min: 100, max: 800, defaultValue: 400 }
  ] },
  { family: 'Jost', category: 'Sans Serif', axes: [
    { tag: 'ital', min: 0, max: 1, defaultValue: 0 },
    { tag: 'wght', min: 100, max: 900, defaultValue: 400 }
  ] },
  { family: 'Public Sans', category: 'Sans Serif', axes: [
    { tag: 'ital', min: 0, max: 1, defaultValue: 0 },
    { tag: 'wght', min: 100, max: 900, defaultValue: 400 }
  ] },
  { family: 'Archivo', category: 'Sans Serif', axes: [
    { tag: 'ital', min: 0, max: 1, defaultValue: 0 },
    { tag: 'wdth', min: 62, max: 125, defaultValue: 100 },
    { tag: 'wght', min: 100, max: 900, defaultValue: 400 }
  ] },
  { family: 'Encode Sans', category: 'Sans Serif', axes: [
    { tag: 'wdth', min: 75, max: 125, defaultValue: 100 },
    { tag: 'wght', min: 100, max: 900, defaultValue: 400 }
  ] },
  { family: 'Saira', category: 'Sans Serif', axes: [
    { tag: 'ital', min: 0, max: 1, defaultValue: 0 },
    { tag: 'wdth', min: 50, max: 125, defaultValue: 100 },
    { tag: 'wght', min: 100, max: 900, defaultValue: 400 }
  ] },
  { family: 'Recursive', category: 'Sans Serif', axes: [
    { tag: 'slnt', min: -15, max: 0, defaultValue: 0 },
    { tag: 'wght', min: 300, max: 1000, defaultValue: 400 },
    { tag: 'CASL', min: 0, max: 1, defaultValue: 0 },
    { tag: 'CRSV', min: 0, max: 1, defaultValue: 0.5 },
    { tag: 'MONO', min: 0, max: 1, defaultValue: 0 }
  ] },
  { family: 'Fraunces', category: 'Serif', axes: [
    { tag: 'ital', min: 0, max: 1, defaultValue: 0 },
    { tag: 'opsz', min: 9, max: 144, defaultValue: 14 },
    { tag: 'wght', min: 100, max: 900, defaultValue: 400 },
    { tag: 'SOFT', min: 0, max: 100, defaultValue: 0 },
    { tag: 'WONK', min: 0, max: 1, defaultValue: 0 }
  ] },
  { family: 'Playfair Display', category: 'Serif', axes: [
    { tag: 'ital', min: 0, max: 1, defaultValue: 0 },
    { tag: 'wght', min: 400, max: 900, defaultValue: 400 }
  ] },
  { family: 'Literata', category: 'Serif', axes: [
    { tag: 'ital', min: 0, max: 1, defaultValue: 0 },
    { tag: 'opsz', min: 7, max: 72, defaultValue: 14 },
    { tag: 'wght', min: 200, max: 900, defaultValue: 400 }
  ] },
  { family: 'Newsreader', category: 'Serif', axes: [
    { tag: 'ital', min: 0, max: 1, defaultValue: 0 },
    { tag: 'opsz', min: 6, max: 72, defaultValue: 16 },
    { tag: 'wght', min: 200, max: 800, defaultValue: 400 }
  ] },
  { family: 'Crimson Pro', category: 'Serif', axes: [
    { tag: 'ital', min: 0, max: 1, defaultValue: 0 },
    { tag: 'wght', min: 200, max: 900, defaultValue: 400 }
  ] },
  { family: 'EB Garamond', category: 'Serif', axes: [
    { tag: 'ital', min: 0, max: 1, defaultValue: 0 },
    { tag: 'wght', min: 400, max: 800, defaultValue: 400 }
  ] },
  { family: 'Bodoni Moda', category: 'Serif', axes: [
    { tag: 'ital', min: 0, max: 1, defaultValue: 0 },
    { tag: 'opsz', min: 6, max: 96, defaultValue: 11 },
    { tag: 'wght', min: 400, max: 900, defaultValue: 400 }
  ] },
  { family: 'Bricolage Grotesque', category: 'Display', axes: [
    { tag: 'opsz', min: 12, max: 96, defaultValue: 14 },
    { tag: 'wdth', min: 75, max: 100, defaultValue: 100 },
    { tag: 'wght', min: 200, max: 800, defaultValue: 400 }
  ] },
  { family: 'Roboto Mono', category: 'Monospace', axes: [
    { tag: 'ital', min: 0, max: 1, defaultValue: 0 },
    { tag: 'wght', min: 100, max: 700, defaultValue: 400 }
  ] },
  { family: 'JetBrains Mono', category: 'Monospace', axes: [
    { tag: 'ital', min: 0, max: 1, defaultValue: 0 },
    { tag: 'wght', min: 100, max: 800, defaultValue: 400 }
  ] },
  { family: 'Unbounded', category: 'Display', axes: [
    { tag: 'wght', min: 200, max: 900, defaultValue: 400 }
  ] },
  { family: 'Syne', category: 'Display', axes: [
    { tag: 'wght', min: 400, max: 800, defaultValue: 400 }
  ] }
];

/** Strip Google's anti-hijacking prefix from the metadata response. */
function vfStripJsonPrefix(text) {
  return text.replace(/^\)\]\}'\s*/, '');
}

function vfNormalizeAxes(rawAxes) {
  return (rawAxes || [])
    .filter(function (axis) {
      return axis && axis.tag && typeof axis.min === 'number' && typeof axis.max === 'number';
    })
    .map(function (axis) {
      return {
        tag: axis.tag,
        min: axis.min,
        max: axis.max,
        defaultValue: typeof axis.defaultValue === 'number' ? axis.defaultValue : axis.min
      };
    });
}

function vfFetchCatalogFromGoogle() {
  var response = UrlFetchApp.fetch(VF_METADATA_URL, {
    muteHttpExceptions: true,
    followRedirects: true
  });
  if (response.getResponseCode() !== 200) {
    throw new Error('Font metadata request returned HTTP ' + response.getResponseCode());
  }
  var payload = JSON.parse(vfStripJsonPrefix(response.getContentText()));
  var families = payload.familyMetadataList || [];
  var catalog = [];
  for (var i = 0; i < families.length; i++) {
    var entry = families[i];
    var axes = vfNormalizeAxes(entry.axes);
    if (!axes.length) continue; // Static families have nothing to vary.
    catalog.push({
      family: entry.family,
      category: entry.category || '',
      axes: axes
    });
  }
  catalog.sort(function (a, b) { return a.family < b.family ? -1 : 1; });
  return catalog;
}

function vfCachePut(cache, key, text) {
  var chunks = [];
  for (var offset = 0; offset < text.length; offset += VF_CACHE_CHUNK_SIZE) {
    chunks.push(text.substring(offset, offset + VF_CACHE_CHUNK_SIZE));
  }
  var map = {};
  for (var i = 0; i < chunks.length; i++) {
    map[key + '-' + i] = chunks[i];
  }
  map[key + '-count'] = String(chunks.length);
  cache.putAll(map, VF_CACHE_TTL_SECONDS);
}

function vfCacheGet(cache, key) {
  var count = Number(cache.get(key + '-count'));
  if (!count) return null;
  var keys = [];
  for (var i = 0; i < count; i++) keys.push(key + '-' + i);
  var map = cache.getAll(keys);
  var text = '';
  for (var j = 0; j < count; j++) {
    var chunk = map[key + '-' + j];
    if (chunk === undefined) return null; // Partially evicted; treat as a miss.
    text += chunk;
  }
  return text;
}

/**
 * @return {{fonts: Array, source: string, warning: (string|undefined)}}
 */
function vfGetCatalog() {
  var cache = CacheService.getScriptCache();
  try {
    var cached = vfCacheGet(cache, VF_CACHE_KEY);
    if (cached) {
      return { fonts: JSON.parse(cached), source: 'cache' };
    }
  } catch (cacheError) {
    // A corrupt cache entry should never break the sidebar; just refetch.
  }

  try {
    var catalog = vfFetchCatalogFromGoogle();
    if (!catalog.length) throw new Error('Font metadata contained no variable families');
    try {
      vfCachePut(cache, VF_CACHE_KEY, JSON.stringify(catalog));
    } catch (putError) {
      // Caching is an optimisation, not a requirement.
    }
    return { fonts: catalog, source: 'google-fonts' };
  } catch (fetchError) {
    return {
      fonts: VF_FALLBACK_CATALOG,
      source: 'bundled',
      warning: 'Could not reach Google Fonts (' + fetchError.message +
        '). Showing the bundled font list.'
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    VF_FALLBACK_CATALOG: VF_FALLBACK_CATALOG,
    vfStripJsonPrefix: vfStripJsonPrefix,
    vfNormalizeAxes: vfNormalizeAxes
  };
}
