/**
 * Variable Type — variable-font designer for Google Slides.
 *
 * GENERATED FILE — do not edit here.
 * Built from src/ by tools/build-appsscript.mjs. Edit the source and rebuild:
 *     node tools/build-appsscript.mjs
 *
 * Paste this alongside Sidebar.html and appsscript.json. Apps Script evaluates
 * every .gs file into one shared global scope, so this concatenation behaves
 * exactly as the separate source files do.
 */

// ==========================================================================
// AxisRegistry.js
// ==========================================================================

/**
 * Display metadata for OpenType variation axes.
 *
 * Google's font metadata endpoint ships its own axis registry, but it is not
 * always reachable and never covers unregistered axes from third-party fonts.
 * This table is the baseline; anything missing falls back to the raw tag.
 *
 * `step` is the slider granularity, `precision` the digits we show.
 */
var VF_AXIS_REGISTRY = {
  // Registered axes.
  wght: { name: 'Weight', step: 1, precision: 0, order: 10 },
  wdth: { name: 'Width', step: 0.5, precision: 1, order: 20, unit: '%' },
  opsz: { name: 'Optical size', step: 0.5, precision: 1, order: 30 },
  slnt: { name: 'Slant', step: 0.5, precision: 1, order: 40, unit: '°' },
  ital: { name: 'Italic', step: 1, precision: 0, order: 50, discrete: true },

  // Widely used unregistered axes.
  GRAD: { name: 'Grade', step: 1, precision: 0, order: 60 },
  CASL: { name: 'Casual', step: 0.01, precision: 2, order: 70 },
  CRSV: { name: 'Cursive', step: 0.1, precision: 1, order: 71 },
  MONO: { name: 'Monospace', step: 0.01, precision: 2, order: 72 },
  SOFT: { name: 'Softness', step: 1, precision: 0, order: 73 },
  WONK: { name: 'Wonky', step: 1, precision: 0, order: 74, discrete: true },
  FILL: { name: 'Fill', step: 0.01, precision: 2, order: 75 },
  ROND: { name: 'Roundness', step: 1, precision: 0, order: 76 },
  SHRP: { name: 'Sharpness', step: 1, precision: 0, order: 77 },
  FLAR: { name: 'Flare', step: 1, precision: 0, order: 78 },
  VOLM: { name: 'Volume', step: 1, precision: 0, order: 79 },
  ELGR: { name: 'Element grid', step: 0.1, precision: 1, order: 80 },
  ELSH: { name: 'Element shape', step: 0.1, precision: 1, order: 81 },
  EDPT: { name: 'Extrude depth', step: 1, precision: 0, order: 82 },
  EHLT: { name: 'Edge highlight', step: 1, precision: 0, order: 83 },
  HEXP: { name: 'Expansion', step: 0.01, precision: 2, order: 84 },
  YEAR: { name: 'Year', step: 1, precision: 0, order: 85 },
  MORF: { name: 'Morph', step: 1, precision: 0, order: 86 },
  BLED: { name: 'Bleed', step: 1, precision: 0, order: 87 },
  SCAN: { name: 'Scanlines', step: 1, precision: 0, order: 88 },
  INFM: { name: 'Informality', step: 1, precision: 0, order: 89 },
  SZP1: { name: 'Size particle 1', step: 1, precision: 0, order: 90 },
  SZP2: { name: 'Size particle 2', step: 1, precision: 0, order: 91 },
  XPN1: { name: 'Position particle 1', step: 1, precision: 0, order: 92 },
  XPN2: { name: 'Position particle 2', step: 1, precision: 0, order: 93 },
  YELA: { name: 'Vertical element alignment', step: 1, precision: 0, order: 94 },

  // Parametric (Roboto Flex and friends).
  XOPQ: { name: 'Thick stroke', step: 1, precision: 0, order: 200 },
  XTRA: { name: 'Counter width', step: 1, precision: 0, order: 201 },
  YOPQ: { name: 'Thin stroke', step: 1, precision: 0, order: 202 },
  YTAS: { name: 'Ascender height', step: 1, precision: 0, order: 203 },
  YTDE: { name: 'Descender depth', step: 1, precision: 0, order: 204 },
  YTFI: { name: 'Figure height', step: 1, precision: 0, order: 205 },
  YTLC: { name: 'Lowercase height', step: 1, precision: 0, order: 206 },
  YTUC: { name: 'Uppercase height', step: 1, precision: 0, order: 207 }
};

function vfAxisInfo(tag) {
  var known = VF_AXIS_REGISTRY[tag];
  if (known) {
    return {
      tag: tag,
      name: known.name,
      step: known.step,
      precision: known.precision,
      order: known.order,
      unit: known.unit || '',
      discrete: !!known.discrete
    };
  }
  return { tag: tag, name: tag, step: 1, precision: 0, order: 500, unit: '', discrete: false };
}


// ==========================================================================
// FontCatalog.js
// ==========================================================================

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


// ==========================================================================
// Outline.js
// ==========================================================================

/**
 * Converts glyph outlines into DrawingML custom geometry.
 *
 * The sidebar extracts outlines with opentype.js at the exact axis values and
 * sends them here as compact command arrays. This module turns them into the
 * `<a:custGeom>` path that PowerPoint (and therefore the Google Slides PPTX
 * importer) understands as a freeform vector shape.
 *
 * Command arrays use the SVG-ish shape opentype.js produces, in points, with
 * y growing downward and the baseline at y = 0:
 *   ['M', x, y] ['L', x, y] ['C', x1, y1, x2, y2, x, y] ['Q', x1, y1, x, y] ['Z']
 */

/** English Metric Units per point. DrawingML measures everything in EMU. */
var VF_EMU_PER_POINT = 12700;

function vfPointsToEmu(points) {
  return Math.round(points * VF_EMU_PER_POINT);
}

function vfEscapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Bounding box of a command list, in the incoming point coordinates.
 * Control points are included: a curve never leaves its control hull, so this
 * is a safe (if slightly generous) box, and it keeps the maths cheap.
 */
function vfCommandsBounds(commands) {
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (var i = 0; i < commands.length; i++) {
    var command = commands[i];
    for (var j = 1; j < command.length; j += 2) {
      var x = command[j];
      var y = command[j + 1];
      if (typeof x !== 'number' || typeof y !== 'number') continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (minX === Infinity) return { x1: 0, y1: 0, x2: 0, y2: 0, width: 0, height: 0 };
  return { x1: minX, y1: minY, x2: maxX, y2: maxY, width: maxX - minX, height: maxY - minY };
}

/**
 * Emit the `<a:pathLst>` body for a command list.
 *
 * All contours go into a single `<a:path>`: TrueType draws counters as
 * reverse-wound contours, and a renderer using the nonzero winding rule turns
 * those into holes only when they share one path element.
 *
 * @param {Array} commands Command arrays in points.
 * @param {{x1: number, y1: number}} origin Translation applied before scaling.
 * @return {string}
 */
function vfCommandsToPathXml(commands, origin, widthEmu, heightEmu) {
  var parts = [];
  parts.push('<a:path w="' + widthEmu + '" h="' + heightEmu + '">');

  function point(x, y) {
    return '<a:pt x="' + vfPointsToEmu(x - origin.x1) + '" y="' + vfPointsToEmu(y - origin.y1) + '"/>';
  }

  // Track the current point so quadratic segments can be promoted to cubics.
  var currentX = 0;
  var currentY = 0;
  var open = false;

  for (var i = 0; i < commands.length; i++) {
    var command = commands[i];
    var type = command[0];

    if (type === 'M') {
      if (open) parts.push('<a:close/>');
      parts.push('<a:moveTo>' + point(command[1], command[2]) + '</a:moveTo>');
      currentX = command[1];
      currentY = command[2];
      open = true;
    } else if (type === 'L') {
      parts.push('<a:lnTo>' + point(command[1], command[2]) + '</a:lnTo>');
      currentX = command[1];
      currentY = command[2];
    } else if (type === 'C') {
      parts.push('<a:cubicBezTo>' +
        point(command[1], command[2]) +
        point(command[3], command[4]) +
        point(command[5], command[6]) +
        '</a:cubicBezTo>');
      currentX = command[5];
      currentY = command[6];
    } else if (type === 'Q') {
      // DrawingML has quadBezTo, but PowerPoint and the Slides importer are
      // both happiest with cubics, so raise the degree here.
      var qx = command[1];
      var qy = command[2];
      var endX = command[3];
      var endY = command[4];
      var c1x = currentX + (2 / 3) * (qx - currentX);
      var c1y = currentY + (2 / 3) * (qy - currentY);
      var c2x = endX + (2 / 3) * (qx - endX);
      var c2y = endY + (2 / 3) * (qy - endY);
      parts.push('<a:cubicBezTo>' +
        point(c1x, c1y) + point(c2x, c2y) + point(endX, endY) +
        '</a:cubicBezTo>');
      currentX = endX;
      currentY = endY;
    } else if (type === 'Z') {
      parts.push('<a:close/>');
      open = false;
    }
  }
  if (open) parts.push('<a:close/>');
  parts.push('</a:path>');
  return parts.join('');
}

/**
 * ---------------------------------------------------------------------------
 * Contour grouping
 * ---------------------------------------------------------------------------
 *
 * Google Slides fills imported geometry with the even-odd rule, but TrueType
 * glyphs are drawn for the nonzero rule and variable fonts routinely emit
 * overlapping contours (interpolating between masters leaves them overlapping;
 * nonzero resolves that silently). Under even-odd each overlap becomes a hole.
 *
 * The obvious fix — boolean-union the contours — turned out to be the wrong
 * one: every library tried mangled some fonts, filling counters solid or
 * shearing curves, because glyph outlines are full of tangential and
 * near-degenerate intersections.
 *
 * The fix used instead relies on even-odd applying *within a single path*.
 * Split the design into one shape per outer contour, each carrying only the
 * counters nested inside it:
 *
 *   - a counter inside its own outer contour  -> even-odd makes a hole. Correct.
 *   - two outer contours that overlap         -> separate shapes that overlap
 *                                                on the slide. Correct.
 *
 * No boolean arithmetic runs, so not a single coordinate changes: the geometry
 * on the slide is exactly what the font produced.
 */

/** Samples per curve when flattening. Only ever used to classify contours. */
var VF_CLASSIFY_SAMPLES = 12;

/** Split a flat command list into one list per contour. */
function vfSplitContours(commands) {
  var contours = [];
  var current = null;
  for (var i = 0; i < commands.length; i++) {
    var command = commands[i];
    if (command[0] === 'M') {
      current = [command];
      contours.push(current);
    } else if (current) {
      current.push(command);
    }
  }
  return contours.filter(function (contour) { return contour.length > 1; });
}

function vfCubicPoint(p0, p1, p2, p3, t) {
  var u = 1 - t;
  var a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]
  ];
}

/**
 * Flatten a contour to a polygon. This is used only to decide which contour
 * sits inside which; the emitted geometry keeps its original curves.
 */
function vfFlattenContour(contour) {
  var points = [];
  var current = [0, 0];
  for (var i = 0; i < contour.length; i++) {
    var command = contour[i];
    if (command[0] === 'M' || command[0] === 'L') {
      current = [command[1], command[2]];
      points.push(current);
    } else if (command[0] === 'C' || command[0] === 'Q') {
      var c1, c2, end;
      if (command[0] === 'C') {
        c1 = [command[1], command[2]];
        c2 = [command[3], command[4]];
        end = [command[5], command[6]];
      } else {
        // Raise the quadratic so one sampler covers both cases.
        var q = [command[1], command[2]];
        end = [command[3], command[4]];
        c1 = [current[0] + (2 / 3) * (q[0] - current[0]), current[1] + (2 / 3) * (q[1] - current[1])];
        c2 = [end[0] + (2 / 3) * (q[0] - end[0]), end[1] + (2 / 3) * (q[1] - end[1])];
      }
      for (var s = 1; s <= VF_CLASSIFY_SAMPLES; s++) {
        points.push(vfCubicPoint(current, c1, c2, end, s / VF_CLASSIFY_SAMPLES));
      }
      current = end;
    }
  }
  return points;
}

function vfPolygonArea(points) {
  var area = 0;
  for (var i = 0, j = points.length - 1; i < points.length; j = i++) {
    area += (points[j][0] * points[i][1]) - (points[i][0] * points[j][1]);
  }
  return area / 2;
}

function vfPointInPolygon(point, polygon) {
  var inside = false;
  for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    var xi = polygon[i][0], yi = polygon[i][1];
    var xj = polygon[j][0], yj = polygon[j][1];
    var intersects = ((yi > point[1]) !== (yj > point[1])) &&
      (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * Is `inner` fully inside `outer`?
 *
 * Containment has to be strict. An earlier version took a majority vote, which
 * misread a contour that merely *overlaps* another — the crossbar of a heavy
 * `e`, say — as nested inside it, and subtracted it as a hole.
 */
function vfContourInside(innerPoints, outerPoints, outerBounds, innerBounds) {
  if (innerBounds.x1 < outerBounds.x1 - 1e-6 || innerBounds.x2 > outerBounds.x2 + 1e-6 ||
      innerBounds.y1 < outerBounds.y1 - 1e-6 || innerBounds.y2 > outerBounds.y2 + 1e-6) {
    // A contour that escapes the other's bounding box cannot be nested in it.
    return false;
  }
  var inside = 0;
  var tested = 0;
  var step = Math.max(1, Math.floor(innerPoints.length / 32));
  for (var i = 0; i < innerPoints.length; i += step) {
    tested++;
    if (vfPointInPolygon(innerPoints[i], outerPoints)) inside++;
  }
  // Allow a single ambiguous sample, for points that land on the boundary.
  return tested > 0 && inside >= tested - 1;
}

function vfPointsBounds(points) {
  var b = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
  for (var i = 0; i < points.length; i++) {
    if (points[i][0] < b.x1) b.x1 = points[i][0];
    if (points[i][0] > b.x2) b.x2 = points[i][0];
    if (points[i][1] < b.y1) b.y1 = points[i][1];
    if (points[i][1] > b.y2) b.y2 = points[i][1];
  }
  return b;
}

/**
 * Group contours into {outer, holes} sets, one group per emitted shape.
 *
 * Winding direction decides the role. TrueType draws a glyph's outer contours
 * one way round and its counters the other, so the sign of a contour's signed
 * area separates them — and, crucially, two *overlapping* outer contours share
 * a winding, so neither can ever be mistaken for a hole in the other. They
 * simply become separate shapes that overlap on the slide, which is right
 * under any fill rule.
 *
 * @param {Array} commands Flat command list.
 * @return {Array<Array>} One command list per shape: an outer contour followed
 *     by the holes nested inside it.
 */
function vfGroupContours(commands) {
  var contours = vfSplitContours(commands);
  if (contours.length < 2) return contours.length ? [commands] : [];

  var info = contours.map(function (contour) {
    var points = vfFlattenContour(contour);
    var signed = vfPolygonArea(points);
    return {
      contour: contour,
      points: points,
      bounds: vfPointsBounds(points),
      signed: signed,
      area: Math.abs(signed)
    };
  });

  // The largest contour is an outer one by definition; its winding sets the
  // convention for the rest of the design.
  var dominant = info[0];
  for (var d = 1; d < info.length; d++) {
    if (info[d].area > dominant.area) dominant = info[d];
  }
  var outerSign = dominant.signed >= 0 ? 1 : -1;

  var outers = [];
  var holes = [];
  for (var i = 0; i < info.length; i++) {
    if (!info[i].area) continue; // Degenerate contour; nothing to draw.
    var sign = info[i].signed >= 0 ? 1 : -1;
    if (sign === outerSign) outers.push(info[i]);
    else holes.push(info[i]);
  }

  // A font with no counter-wound contours at all: fall back to treating every
  // contour as its own shape rather than guessing at holes.
  if (!outers.length) {
    return info.map(function (entry) { return entry.contour.slice(); });
  }

  var groups = outers.map(function (entry) { return entry.contour.slice(); });

  for (var h = 0; h < holes.length; h++) {
    var best = -1;
    for (var o = 0; o < outers.length; o++) {
      if (!vfContourInside(holes[h].points, outers[o].points, outers[o].bounds, holes[h].bounds)) {
        continue;
      }
      if (best === -1 || outers[o].area < outers[best].area) best = o;
    }
    if (best === -1) {
      // Counter-wound but nested in nothing: keep it rather than drop it.
      groups.push(holes[h].contour.slice());
    } else {
      groups[best] = groups[best].concat(holes[h].contour);
    }
  }

  return groups;
}

/**
 * Build the `<p:sp>` elements for a design: one shape per outer contour.
 *
 * Every shape is given the same transform and the same path coordinate space
 * (the whole design's bounding box), so they line up exactly when Slides
 * reassembles them — only the contours inside each path differ.
 *
 * @param {{commands: Array, color: string, name: string, firstId: number,
 *          offsetXEmu: number, offsetYEmu: number,
 *          extWidthEmu: (number|undefined), extHeightEmu: (number|undefined)}} options
 * @return {{xml: string, count: number, widthEmu: number, heightEmu: number,
 *           naturalWidthEmu: number, naturalHeightEmu: number}}
 */
function vfBuildShapesXml(options) {
  var bounds = vfCommandsBounds(options.commands);
  var naturalWidthEmu = Math.max(1, vfPointsToEmu(bounds.width));
  var naturalHeightEmu = Math.max(1, vfPointsToEmu(bounds.height));
  var widthEmu = Math.max(1, Math.round(options.extWidthEmu || naturalWidthEmu));
  var heightEmu = Math.max(1, Math.round(options.extHeightEmu || naturalHeightEmu));
  var color = (options.color || '#000000').replace('#', '').toUpperCase();
  var offsetX = options.offsetXEmu || 0;
  var offsetY = options.offsetYEmu || 0;
  var baseName = options.name || 'Variable type';
  var id = options.firstId || 2;

  var groups = vfGroupContours(options.commands);
  if (!groups.length) groups = [options.commands];

  var parts = [];
  for (var i = 0; i < groups.length; i++) {
    // Share the design-wide bounds so every shape uses one coordinate frame.
    var pathXml = vfCommandsToPathXml(groups[i], bounds, naturalWidthEmu, naturalHeightEmu);
    parts.push(
      '<p:sp>' +
        '<p:nvSpPr>' +
          '<p:cNvPr id="' + (id + i) + '" name="' +
            vfEscapeXml(baseName + ' ' + (i + 1)) + '"/>' +
          '<p:cNvSpPr/><p:nvPr/>' +
        '</p:nvSpPr>' +
        '<p:spPr>' +
          '<a:xfrm>' +
            '<a:off x="' + offsetX + '" y="' + offsetY + '"/>' +
            '<a:ext cx="' + widthEmu + '" cy="' + heightEmu + '"/>' +
          '</a:xfrm>' +
          '<a:custGeom>' +
            '<a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/>' +
            '<a:rect l="0" t="0" r="' + naturalWidthEmu + '" b="' + naturalHeightEmu + '"/>' +
            '<a:pathLst>' + pathXml + '</a:pathLst>' +
          '</a:custGeom>' +
          '<a:solidFill><a:srgbClr val="' + color + '"/></a:solidFill>' +
          '<a:ln><a:noFill/></a:ln>' +
        '</p:spPr>' +
        '<p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>' +
      '</p:sp>');
  }

  return {
    xml: parts.join(''),
    count: groups.length,
    widthEmu: widthEmu,
    heightEmu: heightEmu,
    naturalWidthEmu: naturalWidthEmu,
    naturalHeightEmu: naturalHeightEmu
  };
}


// ==========================================================================
// Pptx.js
// ==========================================================================

/**
 * Builds a minimal, valid PPTX containing the outlined text as freeform
 * vector shapes.
 *
 * This exists because the Slides API cannot create custom geometry — the only
 * documented shape constructor takes a fixed enum of preset shapes. The PPTX
 * importer, on the other hand, maps `<a:custGeom>` onto the freeform shape
 * type Slides already has (the one its own polyline/curve tool draws). So we
 * round-trip through a one-slide deck to get true vectors into the editor.
 *
 * Returns parts as {path, xml} so the caller can zip them however it likes.
 */

var VF_PPTX_NS =
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';

var VF_XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n';

/** Google Slides' default 16:9 canvas, in EMU (10in x 5.625in). */
var VF_DEFAULT_SLIDE_WIDTH_EMU = 9144000;
var VF_DEFAULT_SLIDE_HEIGHT_EMU = 5143500;

function vfContentTypesXml() {
  return VF_XML_DECL +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
    '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>' +
    '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>' +
    '<Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>' +
    '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' +
    '</Types>';
}

function vfRootRelsXml() {
  return VF_XML_DECL +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>' +
    '</Relationships>';
}

function vfPresentationXml(widthEmu, heightEmu) {
  return VF_XML_DECL +
    '<p:presentation ' + VF_PPTX_NS + '>' +
    '<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>' +
    '<p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst>' +
    '<p:sldSz cx="' + widthEmu + '" cy="' + heightEmu + '"/>' +
    '<p:notesSz cx="6858000" cy="9144000"/>' +
    '</p:presentation>';
}

function vfPresentationRelsXml() {
  return VF_XML_DECL +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>' +
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>' +
    '</Relationships>';
}

/** Empty placeholder-free background, shared by the master and the layout. */
function vfEmptyCommonSlideData(name) {
  return '<p:cSld' + (name ? ' name="' + name + '"' : '') + '>' +
    '<p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>' +
    '<p:spTree>' +
    '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
    '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>' +
    '<a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
    '</p:spTree>' +
    '</p:cSld>';
}

var VF_COLOR_MAP =
  '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" ' +
  'accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" ' +
  'hlink="hlink" folHlink="folHlink"/>';

function vfSlideMasterXml() {
  return VF_XML_DECL +
    '<p:sldMaster ' + VF_PPTX_NS + '>' +
    vfEmptyCommonSlideData() +
    VF_COLOR_MAP +
    '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>' +
    '</p:sldMaster>';
}

function vfSlideMasterRelsXml() {
  return VF_XML_DECL +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>' +
    '</Relationships>';
}

function vfSlideLayoutXml() {
  return VF_XML_DECL +
    '<p:sldLayout ' + VF_PPTX_NS + ' type="blank" preserve="1">' +
    vfEmptyCommonSlideData('Blank') +
    '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>' +
    '</p:sldLayout>';
}

function vfSlideLayoutRelsXml() {
  return VF_XML_DECL +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>' +
    '</Relationships>';
}

function vfSlideRelsXml() {
  return VF_XML_DECL +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>' +
    '</Relationships>';
}

/**
 * @param {string} shapesXml Concatenated `<p:sp>` (and/or `<p:grpSp>`) elements.
 */
function vfSlideXml(shapesXml) {
  return VF_XML_DECL +
    '<p:sld ' + VF_PPTX_NS + '>' +
    '<p:cSld><p:spTree>' +
    '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
    '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>' +
    '<a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>' +
    shapesXml +
    '</p:spTree></p:cSld>' +
    '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>' +
    '</p:sld>';
}

/** A minimal theme that still satisfies the required schema sequence. */
function vfThemeXml() {
  var fill =
    '<a:fillStyleLst>' +
    '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
    '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
    '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
    '</a:fillStyleLst>';
  var line =
    '<a:lnStyleLst>' +
    '<a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>' +
    '<a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>' +
    '<a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>' +
    '</a:lnStyleLst>';
  var effect =
    '<a:effectStyleLst>' +
    '<a:effectStyle><a:effectLst/></a:effectStyle>' +
    '<a:effectStyle><a:effectLst/></a:effectStyle>' +
    '<a:effectStyle><a:effectLst/></a:effectStyle>' +
    '</a:effectStyleLst>';
  var bgFill =
    '<a:bgFillStyleLst>' +
    '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
    '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
    '<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>' +
    '</a:bgFillStyleLst>';

  return VF_XML_DECL +
    '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Variable Type">' +
    '<a:themeElements>' +
    '<a:clrScheme name="Office">' +
    '<a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>' +
    '<a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>' +
    '<a:dk2><a:srgbClr val="44546A"/></a:dk2>' +
    '<a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>' +
    '<a:accent1><a:srgbClr val="4472C4"/></a:accent1>' +
    '<a:accent2><a:srgbClr val="ED7D31"/></a:accent2>' +
    '<a:accent3><a:srgbClr val="A5A5A5"/></a:accent3>' +
    '<a:accent4><a:srgbClr val="FFC000"/></a:accent4>' +
    '<a:accent5><a:srgbClr val="5B9BD5"/></a:accent5>' +
    '<a:accent6><a:srgbClr val="70AD47"/></a:accent6>' +
    '<a:hlink><a:srgbClr val="0563C1"/></a:hlink>' +
    '<a:folHlink><a:srgbClr val="954F72"/></a:folHlink>' +
    '</a:clrScheme>' +
    '<a:fontScheme name="Office">' +
    '<a:majorFont><a:latin typeface="Calibri Light"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>' +
    '<a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>' +
    '</a:fontScheme>' +
    '<a:fmtScheme name="Office">' + fill + line + effect + bgFill + '</a:fmtScheme>' +
    '</a:themeElements>' +
    '<a:objectDefaults/><a:extraClrSchemeLst/>' +
    '</a:theme>';
}

/**
 * Assemble the full package.
 *
 * @param {{shapesXml: string, slideWidthEmu: (number|undefined),
 *          slideHeightEmu: (number|undefined)}} options
 * @return {Array<{path: string, xml: string}>} Parts in the order they should
 *     be zipped; `[Content_Types].xml` must come first.
 */
function vfBuildPptxParts(options) {
  var width = options.slideWidthEmu || VF_DEFAULT_SLIDE_WIDTH_EMU;
  var height = options.slideHeightEmu || VF_DEFAULT_SLIDE_HEIGHT_EMU;
  return [
    { path: '[Content_Types].xml', xml: vfContentTypesXml() },
    { path: '_rels/.rels', xml: vfRootRelsXml() },
    { path: 'ppt/presentation.xml', xml: vfPresentationXml(width, height) },
    { path: 'ppt/_rels/presentation.xml.rels', xml: vfPresentationRelsXml() },
    { path: 'ppt/theme/theme1.xml', xml: vfThemeXml() },
    { path: 'ppt/slideMasters/slideMaster1.xml', xml: vfSlideMasterXml() },
    { path: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', xml: vfSlideMasterRelsXml() },
    { path: 'ppt/slideLayouts/slideLayout1.xml', xml: vfSlideLayoutXml() },
    { path: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', xml: vfSlideLayoutRelsXml() },
    { path: 'ppt/slides/slide1.xml', xml: vfSlideXml(options.shapesXml) },
    { path: 'ppt/slides/_rels/slide1.xml.rels', xml: vfSlideRelsXml() }
  ];
}


// ==========================================================================
// VectorInsert.js
// ==========================================================================

/**
 * The vector route: turn glyph outlines into native Slides freeform shapes.
 *
 * Slides can hold freeform vector shapes — its own polyline/curve tool draws
 * them — but neither the Apps Script API nor the REST API will create one.
 * The PPTX importer will, so we take that road:
 *
 *   outlines -> <a:custGeom> -> one-slide .pptx -> Drive converts it to a
 *   Slides file -> copy the shapes onto the user's slide -> delete the temp.
 *
 * The user never sees the round trip; it replaces the manual
 * "export SVG, paste into PowerPoint, upload, copy across" workflow.
 */

/**
 * The slide the user is looking at, falling back to the first one when the
 * selection does not resolve to a slide (a master or layout, say).
 */
function vfActiveSlide() {
  var presentation = SlidesApp.getActivePresentation();
  var selection = presentation.getSelection();
  if (selection) {
    var page = selection.getCurrentPage();
    if (page && page.getPageType() === SlidesApp.PageType.SLIDE) {
      return page.asSlide();
    }
  }
  var slides = presentation.getSlides();
  if (!slides.length) {
    throw new Error('This presentation has no slides to insert into.');
  }
  return slides[0];
}

var VF_DRIVE_UPLOAD_URL =
  'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id';
var VF_DRIVE_FILE_URL = 'https://www.googleapis.com/drive/v3/files/';
var VF_PPTX_MIME =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';
var VF_SLIDES_MIME = 'application/vnd.google-apps.presentation';

/** Keep the design inside the slide with a small breathing margin. */
var VF_FIT_MARGIN_RATIO = 0.06;

function vfAuthHeaders() {
  return { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() };
}

/**
 * Upload the .pptx and let Drive convert it to a Google Slides file.
 * Uses the REST API directly so the add-on does not need the broad DriveApp
 * scope — `drive.file` covers files this add-on creates.
 *
 * @return {string} The converted presentation's file id.
 */
function vfUploadAndConvert(pptxBlob, name) {
  var boundary = '-------vf' + Utilities.getUuid();
  var metadata = { name: name, mimeType: VF_SLIDES_MIME };

  // Build the multipart/related body as bytes: the PPTX part is binary, so it
  // cannot go through string concatenation without corrupting the zip.
  var head = Utilities.newBlob(
    '--' + boundary + '\r\n' +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) + '\r\n' +
    '--' + boundary + '\r\n' +
    'Content-Type: ' + VF_PPTX_MIME + '\r\n\r\n'
  ).getBytes();
  var tail = Utilities.newBlob('\r\n--' + boundary + '--\r\n').getBytes();
  var body = head.concat(pptxBlob.getBytes()).concat(tail);

  var response = UrlFetchApp.fetch(VF_DRIVE_UPLOAD_URL, {
    method: 'post',
    contentType: 'multipart/related; boundary=' + boundary,
    payload: body,
    headers: vfAuthHeaders(),
    muteHttpExceptions: true
  });

  var code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error(vfExplainDriveError(code, response.getContentText()));
  }
  return JSON.parse(response.getContentText()).id;
}

/**
 * Turn a Drive API failure into something the user can act on.
 *
 * The common one by far is a fresh script whose Cloud project has never had
 * the Drive API switched on. Google's raw message is three sentences of
 * boilerplate wrapped in JSON, so name the actual fix instead.
 */
function vfExplainDriveError(code, body) {
  var parsed = null;
  try {
    parsed = JSON.parse(body);
  } catch (ignored) {
    // Non-JSON error bodies fall through to the generic message below.
  }
  var detail = parsed && parsed.error && parsed.error.message ? parsed.error.message : body;

  if (code === 403 && /has not been used in project|accessNotConfigured|is disabled/i.test(detail)) {
    return 'Vector mode needs the Drive API, which is not switched on for this ' +
      'script yet. In the Apps Script editor: Services (left sidebar) → + → ' +
      'Drive API → Add. Then wait a minute and try again. ' +
      '(Editable text mode works without this.)';
  }
  if (code === 401 || (code === 403 && /insufficient|permission|scope/i.test(detail))) {
    return 'Vector mode is not authorised. Re-run the add-on and accept the ' +
      'permission prompt; if the manifest was narrowed to ' +
      'presentations.currentonly, vector mode needs the broader ' +
      'presentations and drive.file scopes.';
  }
  if (code === 429 || code >= 500) {
    return 'Drive is temporarily unavailable (HTTP ' + code + '). Try again in a moment.';
  }
  return 'Drive could not convert the vector file (HTTP ' + code + '): ' +
    String(detail).slice(0, 300);
}

function vfDeleteDriveFile(fileId) {
  try {
    UrlFetchApp.fetch(VF_DRIVE_FILE_URL + fileId + '?supportsAllDrives=true', {
      method: 'delete',
      headers: vfAuthHeaders(),
      muteHttpExceptions: true
    });
  } catch (ignored) {
    // A stray temp file is untidy, not broken.
  }
}

/**
 * Work out the on-slide size for a design, scaled down if it would overflow.
 * @return {{width: number, height: number, scale: number}} Points.
 */
function vfFitToSlide(naturalWidthPt, naturalHeightPt) {
  var presentation = SlidesApp.getActivePresentation();
  var maxWidth = presentation.getPageWidth() * (1 - VF_FIT_MARGIN_RATIO * 2);
  var maxHeight = presentation.getPageHeight() * (1 - VF_FIT_MARGIN_RATIO * 2);
  var scale = Math.min(1, maxWidth / naturalWidthPt, maxHeight / naturalHeightPt);
  return {
    width: naturalWidthPt * scale,
    height: naturalHeightPt * scale,
    scale: scale
  };
}

/**
 * Zip the PPTX parts. `Utilities.zip` builds the directory tree from blob
 * names, and `[Content_Types].xml` must be the first entry.
 */
function vfZipPptx(parts) {
  var blobs = parts.map(function (part) {
    return Utilities.newBlob(part.xml, 'application/xml', part.path);
  });
  return Utilities.zip(blobs, 'variable-type.pptx').setContentType(VF_PPTX_MIME);
}

/**
 * Insert the design as native vector shapes.
 *
 * @param {{commands: Array, color: string, text: string, family: string,
 *          spec: Object, newSlide: boolean}} payload
 * @return {{ok: boolean, message: string}}
 */
function vfInsertVector(payload) {
  if (!payload || !payload.commands || !payload.commands.length) {
    throw new Error('No outlines were produced. Try a different font or some text.');
  }

  var presentation = SlidesApp.getActivePresentation();
  var bounds = vfCommandsBounds(payload.commands);
  if (!bounds.width || !bounds.height) {
    throw new Error('The outlines are empty — check that the text has visible characters.');
  }

  var fitted = vfFitToSlide(bounds.width, bounds.height);
  var slideWidthEmu = vfPointsToEmu(presentation.getPageWidth());
  var slideHeightEmu = vfPointsToEmu(presentation.getPageHeight());
  var extWidthEmu = vfPointsToEmu(fitted.width);
  var extHeightEmu = vfPointsToEmu(fitted.height);

  // One shape per outer contour: overlapping contours become overlapping
  // shapes, which renders correctly whatever fill rule Slides applies.
  var shapes = vfBuildShapesXml({
    commands: payload.commands,
    color: payload.color,
    name: (payload.text || 'Variable type').slice(0, 40),
    firstId: 2,
    offsetXEmu: Math.round((slideWidthEmu - extWidthEmu) / 2),
    offsetYEmu: Math.round((slideHeightEmu - extHeightEmu) / 2),
    extWidthEmu: extWidthEmu,
    extHeightEmu: extHeightEmu
  });

  var parts = vfBuildPptxParts({
    shapesXml: shapes.xml,
    slideWidthEmu: slideWidthEmu,
    slideHeightEmu: slideHeightEmu
  });

  var fileId = vfUploadAndConvert(vfZipPptx(parts), 'Variable Type import (temporary)');
  try {
    var imported = SlidesApp.openById(fileId);
    var sourceSlides = imported.getSlides();
    if (!sourceSlides.length) throw new Error('The converted file had no slides.');
    var sourceSlide = sourceSlides[0];

    // Copy the shapes straight onto the slide the user is looking at.
    var target = vfActiveSlide();
    var sourceElements = sourceSlide.getPageElements();
    var copied = [];
    for (var i = 0; i < sourceElements.length; i++) {
      var element = sourceElements[i];
      if (element.getPageElementType() !== SlidesApp.PageElementType.SHAPE) continue;
      var placed = target.insertShape(element.asShape());
      placed.setLeft(element.getLeft())
        .setTop(element.getTop())
        .setWidth(element.getWidth())
        .setHeight(element.getHeight());
      copied.push(placed);
    }
    if (!copied.length) {
      throw new Error('The converted file contained no shapes to copy.');
    }

    var result = copied.length > 1 ? target.group(copied) : copied[0];
    result.select();

    return {
      ok: true,
      message: 'Inserted ' + copied.length +
        (copied.length === 1 ? ' vector shape.' : ' vector shapes (grouped).'),
      scale: fitted.scale
    };
  } finally {
    vfDeleteDriveFile(fileId);
  }
}


// ==========================================================================
// Code.js
// ==========================================================================

/**
 * Add-on entry points and the API the sidebar calls through google.script.run.
 *
 * Every api* function returns a plain object rather than throwing where it can
 * help it, so the sidebar can show a useful message instead of a stack trace.
 */

var VF_SIDEBAR_TITLE = 'Variable Type';

function onOpen(e) {
  SlidesApp.getUi()
    .createAddonMenu()
    .addItem('Open Variable Type', 'showSidebar')
    .addToUi();
}

function onInstall(e) {
  onOpen(e);
}

function showSidebar() {
  var html = HtmlService.createTemplateFromFile('Sidebar')
    .evaluate()
    .setTitle(VF_SIDEBAR_TITLE);
  SlidesApp.getUi().showSidebar(html);
}

/** Lets the sidebar template pull in the CSS and JS partials. */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function vfWrap(action) {
  try {
    var result = action();
    if (result && result.ok === undefined) result.ok = true;
    return result;
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

/** Everything the sidebar needs on open, in one round trip. */
function apiBootstrap() {
  return vfWrap(function () {
    var catalog = vfGetCatalog(false);
    return {
      fonts: catalog.fonts,
      source: catalog.source,
      warning: catalog.warning,
      axisRegistry: VF_AXIS_REGISTRY,
      presets: vfListPresets()
    };
  });
}

function apiInsertVector(payload) {
  return vfWrap(function () { return vfInsertVector(payload); });
}
