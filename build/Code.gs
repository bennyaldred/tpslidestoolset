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

/** Axes the Slides text engine can express, in some form. */
var VF_MAPPABLE_AXES = ['wght', 'ital', 'slnt', 'wdth'];

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
// FontMapping.js
// ==========================================================================

/**
 * Translates a variable-font design (family + axis values) into something the
 * Google Slides text engine can actually render, and reports honestly about
 * what got lost along the way.
 *
 * Slides has no variable-font support. A text run can carry only:
 *   - a font family name (any Google Font),
 *   - a weight that is a multiple of 100 in [100, 900] (weightedFontFamily),
 *   - an italic flag.
 *
 * So `wght` maps cleanly, `ital`/`slnt` collapse onto the italic flag, `wdth`
 * can sometimes be redirected to a sibling family that ships at that width,
 * and everything else is dropped. Callers surface the returned notes so the
 * user knows before they insert.
 */

/** Slides only accepts weights on this grid. */
var VF_SLIDES_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

/**
 * Families published on Google Fonts as separate width cuts. Each entry maps a
 * nominal `wdth` value to the family name that ships at that width, so a width
 * axis can be honoured by swapping families instead of being dropped.
 */
var VF_WIDTH_SIBLINGS = {
  'Roboto': [[100, 'Roboto'], [75, 'Roboto Condensed']],
  'Open Sans': [[100, 'Open Sans'], [75, 'Open Sans Condensed']],
  'Archivo': [[100, 'Archivo'], [75, 'Archivo Narrow']],
  'Barlow': [[100, 'Barlow'], [87.5, 'Barlow Semi Condensed'], [75, 'Barlow Condensed']],
  'Fira Sans': [[100, 'Fira Sans'], [87.5, 'Fira Sans Condensed'], [75, 'Fira Sans Extra Condensed']],
  'IBM Plex Sans': [[100, 'IBM Plex Sans'], [85, 'IBM Plex Sans Condensed']],
  'Encode Sans': [
    [125, 'Encode Sans Expanded'],
    [112.5, 'Encode Sans Semi Expanded'],
    [100, 'Encode Sans'],
    [87.5, 'Encode Sans Semi Condensed'],
    [75, 'Encode Sans Condensed']
  ],
  'Saira': [
    [100, 'Saira'],
    [87.5, 'Saira Semi Condensed'],
    [75, 'Saira Condensed'],
    [62.5, 'Saira Extra Condensed']
  ],
  'Cabin': [[100, 'Cabin'], [75, 'Cabin Condensed']],
  'PT Sans': [[100, 'PT Sans'], [75, 'PT Sans Narrow']],
  'Noto Sans': [[100, 'Noto Sans'], [62.5, 'Noto Sans Display']]
};

/** Below this slant (in degrees, negative = forward lean) we reach for italic. */
var VF_SLANT_ITALIC_THRESHOLD = 4;

/** A width this close to a sibling's nominal width counts as an exact hit. */
var VF_WIDTH_EXACT_TOLERANCE = 0.5;

function vfClamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function vfRound(value, precision) {
  var factor = Math.pow(10, precision || 0);
  return Math.round(value * factor) / factor;
}

/**
 * Snap a weight onto the Slides grid, staying inside the range the font's own
 * `wght` axis covers so we never ask for a cut that does not exist.
 */
function vfSnapWeight(requested, axis) {
  var min = axis ? axis.min : 100;
  var max = axis ? axis.max : 900;
  var target = vfClamp(requested, min, max);
  var best = null;
  var bestDistance = Infinity;
  for (var i = 0; i < VF_SLIDES_WEIGHTS.length; i++) {
    var candidate = VF_SLIDES_WEIGHTS[i];
    // Only consider grid weights the font actually spans, unless the font's
    // whole range sits between two grid stops.
    if (candidate < min - 50 || candidate > max + 50) continue;
    var distance = Math.abs(candidate - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  if (best === null) {
    best = VF_SLIDES_WEIGHTS[0];
    for (var j = 0; j < VF_SLIDES_WEIGHTS.length; j++) {
      if (Math.abs(VF_SLIDES_WEIGHTS[j] - target) < Math.abs(best - target)) best = VF_SLIDES_WEIGHTS[j];
    }
  }
  return best;
}

/** Pick the sibling family closest to the requested width, if one exists. */
function vfResolveWidthFamily(family, requestedWidth) {
  var siblings = VF_WIDTH_SIBLINGS[family];
  if (!siblings) return null;
  var best = null;
  var bestDistance = Infinity;
  for (var i = 0; i < siblings.length; i++) {
    var distance = Math.abs(siblings[i][0] - requestedWidth);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { width: siblings[i][0], family: siblings[i][1] };
    }
  }
  if (!best) return null;
  best.distance = bestDistance;
  return best;
}

function vfFindAxis(axes, tag) {
  if (!axes) return null;
  for (var i = 0; i < axes.length; i++) {
    if (axes[i].tag === tag) return axes[i];
  }
  return null;
}

/**
 * @param {{family: string, axes: Array<{tag: string, min: number, max: number, defaultValue: number}>,
 *          values: Object<string, number>, allowFauxItalic: (boolean|undefined)}} spec
 * @return {{fontFamily: string, weight: number, italic: boolean, exact: boolean,
 *           notes: Array<{tag, name, requested, applied, status, detail}>}}
 */
function vfResolveSlidesStyle(spec) {
  var family = spec.family;
  var axes = spec.axes || [];
  var values = spec.values || {};
  var allowFauxItalic = spec.allowFauxItalic !== false;

  var resolvedFamily = family;
  var italic = false;
  var notes = [];

  function note(tag, requested, applied, status, detail) {
    var info = typeof vfAxisInfo === 'function' ? vfAxisInfo(tag) : { name: tag };
    notes.push({
      tag: tag,
      name: info.name,
      requested: requested,
      applied: applied,
      status: status,
      detail: detail
    });
  }

  // --- Width: redirect to a sibling family when one is published. ---
  var widthAxis = vfFindAxis(axes, 'wdth');
  if (widthAxis) {
    var requestedWidth = vfRound(
      values.wdth === undefined ? widthAxis.defaultValue : values.wdth, 1);
    var match = vfResolveWidthFamily(family, requestedWidth);
    if (match && match.distance <= VF_WIDTH_EXACT_TOLERANCE) {
      resolvedFamily = match.family;
      note('wdth', requestedWidth, match.width, 'exact',
        match.family === family
          ? 'Rendered at the family’s default width.'
          : 'Swapped to "' + match.family + '", which ships at this width.');
    } else if (match) {
      resolvedFamily = match.family;
      note('wdth', requestedWidth, match.width, 'approximate',
        'Closest published cut is "' + match.family + '" at ' + match.width + '%.');
    } else {
      note('wdth', requestedWidth, widthAxis.defaultValue, 'dropped',
        'Slides cannot vary width and this family has no condensed/expanded cut.');
    }
  }

  // --- Weight: the one axis that maps cleanly. ---
  var weightAxis = vfFindAxis(axes, 'wght');
  var requestedWeight = weightAxis
    ? (values.wght === undefined ? weightAxis.defaultValue : values.wght)
    : 400;
  var weight = vfSnapWeight(requestedWeight, weightAxis);
  if (weightAxis) {
    note('wght', vfRound(requestedWeight, 0), weight,
      Math.abs(requestedWeight - weight) < 0.5 ? 'exact' : 'approximate',
      Math.abs(requestedWeight - weight) < 0.5
        ? 'Applied exactly.'
        : 'Slides only accepts weights in steps of 100.');
  }

  // --- Italic / slant: both collapse onto the single italic flag. ---
  var italAxis = vfFindAxis(axes, 'ital');
  var slantAxis = vfFindAxis(axes, 'slnt');
  if (italAxis) {
    var italValue = values.ital === undefined ? italAxis.defaultValue : values.ital;
    italic = italValue >= 0.5;
    note('ital', italValue, italic ? 1 : 0, 'exact',
      italic ? 'Applied as the family’s italic cut.' : 'Applied as upright.');
  }
  if (slantAxis) {
    var slantValue = values.slnt === undefined ? slantAxis.defaultValue : values.slnt;
    var wantsSlant = slantValue <= -VF_SLANT_ITALIC_THRESHOLD;
    if (!wantsSlant) {
      note('slnt', vfRound(slantValue, 1), 0,
        Math.abs(slantValue) < 0.05 ? 'exact' : 'dropped',
        Math.abs(slantValue) < 0.05
          ? 'Applied as upright.'
          : 'Slides has no slant control; too shallow to substitute italic.');
    } else if (italAxis && italic) {
      note('slnt', vfRound(slantValue, 1), 'italic', 'approximate',
        'Folded into the italic cut already applied.');
    } else if (allowFauxItalic) {
      italic = true;
      note('slnt', vfRound(slantValue, 1), 'italic', 'approximate',
        'Substituted italic — Slides cannot set an arbitrary slant angle.');
    } else {
      note('slnt', vfRound(slantValue, 1), 0, 'dropped',
        'Slides has no slant control and italic substitution is off.');
    }
  }

  // --- Everything else is unreachable from the Slides text model. ---
  for (var i = 0; i < axes.length; i++) {
    var axis = axes[i];
    if (VF_MAPPABLE_AXES.indexOf(axis.tag) !== -1) continue;
    var value = values[axis.tag] === undefined ? axis.defaultValue : values[axis.tag];
    var isDefault = Math.abs(value - axis.defaultValue) < 1e-6;
    note(axis.tag, vfRound(value, 2), axis.defaultValue, isDefault ? 'exact' : 'dropped',
      isDefault
        ? 'At the font’s default, so nothing is lost.'
        : 'Slides renders the static cut, which is fixed at ' + axis.defaultValue + '.');
  }

  notes.sort(function (a, b) {
    var orderA = typeof vfAxisInfo === 'function' ? vfAxisInfo(a.tag).order : 0;
    var orderB = typeof vfAxisInfo === 'function' ? vfAxisInfo(b.tag).order : 0;
    return orderA - orderB;
  });

  var exact = true;
  for (var k = 0; k < notes.length; k++) {
    if (notes[k].status !== 'exact') exact = false;
  }

  return {
    fontFamily: resolvedFamily,
    weight: weight,
    italic: italic,
    exact: exact,
    notes: notes
  };
}

/**
 * Build a Google Fonts CSS2 URL that exposes the font's full axis ranges, so
 * the sidebar preview can move continuously rather than in static steps.
 *
 * CSS2 requires axis tags in ASCII order (uppercase custom axes before
 * lowercase registered ones), and treats `ital` as a discrete axis that
 * selects a separate face, which forces the tuple-list syntax.
 */
function vfBuildFontCssUrl(family, axes) {
  var base = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(family).replace(/%20/g, '+');
  var usable = (axes || []).filter(function (axis) {
    return axis && axis.tag && typeof axis.min === 'number' && typeof axis.max === 'number';
  });
  if (!usable.length) return base + '&display=swap';

  var sorted = usable.slice().sort(function (a, b) {
    return a.tag < b.tag ? -1 : (a.tag > b.tag ? 1 : 0);
  });

  function fmt(value) {
    return String(Number(value));
  }
  function rangeFor(axis) {
    return axis.min === axis.max ? fmt(axis.min) : fmt(axis.min) + '..' + fmt(axis.max);
  }

  var tags = sorted.map(function (axis) { return axis.tag; }).join(',');
  var hasItal = sorted.some(function (axis) { return axis.tag === 'ital'; });

  var valueSpec;
  if (!hasItal) {
    valueSpec = sorted.map(rangeFor).join(',');
  } else {
    valueSpec = ['0', '1'].map(function (italValue) {
      return sorted.map(function (axis) {
        return axis.tag === 'ital' ? italValue : rangeFor(axis);
      }).join(',');
    }).join(';');
  }

  return base + ':' + tags + '@' + valueSpec + '&display=swap';
}

/** CSS `font-variation-settings` string for a set of axis values. */
function vfBuildVariationSettings(axes, values) {
  var parts = [];
  (axes || []).forEach(function (axis) {
    var value = values && values[axis.tag] !== undefined ? values[axis.tag] : axis.defaultValue;
    parts.push('"' + axis.tag + '" ' + vfRound(value, 3));
  });
  return parts.join(', ');
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
 * @param {boolean=} forceRefresh Bypass the cache (used by the "Refresh fonts" action).
 * @return {{fonts: Array, source: string, warning: (string|undefined)}}
 */
function vfGetCatalog(forceRefresh) {
  var cache = CacheService.getScriptCache();
  if (!forceRefresh) {
    try {
      var cached = vfCacheGet(cache, VF_CACHE_KEY);
      if (cached) {
        return { fonts: JSON.parse(cached), source: 'cache' };
      }
    } catch (cacheError) {
      // A corrupt cache entry should never break the sidebar; just refetch.
    }
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
 * Build one `<p:sp>` holding the whole design as a single freeform shape.
 *
 * The path keeps its natural coordinate space while `<a:ext>` may be smaller,
 * which is how DrawingML scales geometry: that lets us fit an oversized design
 * onto the slide without touching a single coordinate.
 *
 * @param {{commands: Array, color: string, name: string, id: number,
 *          offsetXEmu: number, offsetYEmu: number,
 *          extWidthEmu: (number|undefined), extHeightEmu: (number|undefined)}} options
 * @return {{xml: string, widthEmu: number, heightEmu: number,
 *           naturalWidthEmu: number, naturalHeightEmu: number}}
 */
function vfBuildShapeXml(options) {
  var bounds = vfCommandsBounds(options.commands);
  var naturalWidthEmu = Math.max(1, vfPointsToEmu(bounds.width));
  var naturalHeightEmu = Math.max(1, vfPointsToEmu(bounds.height));
  var widthEmu = Math.max(1, Math.round(options.extWidthEmu || naturalWidthEmu));
  var heightEmu = Math.max(1, Math.round(options.extHeightEmu || naturalHeightEmu));
  var color = (options.color || '#000000').replace('#', '').toUpperCase();
  var pathXml = vfCommandsToPathXml(
    options.commands, bounds, naturalWidthEmu, naturalHeightEmu);

  var xml =
    '<p:sp>' +
      '<p:nvSpPr>' +
        '<p:cNvPr id="' + options.id + '" name="' + vfEscapeXml(options.name) + '"/>' +
        '<p:cNvSpPr/>' +
        '<p:nvPr/>' +
      '</p:nvSpPr>' +
      '<p:spPr>' +
        '<a:xfrm>' +
          '<a:off x="' + (options.offsetXEmu || 0) + '" y="' + (options.offsetYEmu || 0) + '"/>' +
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
    '</p:sp>';

  return {
    xml: xml,
    widthEmu: widthEmu,
    heightEmu: heightEmu,
    naturalWidthEmu: naturalWidthEmu,
    naturalHeightEmu: naturalHeightEmu
  };
}

/**
 * Split a command list into one list per contour, so each glyph (or each
 * closed shape) can become an independently selectable Slides shape.
 * Contours are grouped by the glyph index the sidebar tagged them with.
 */
function vfSplitByGlyph(commands, glyphIndexPerCommand) {
  var groups = [];
  var current = null;
  var currentIndex = null;
  for (var i = 0; i < commands.length; i++) {
    var index = glyphIndexPerCommand ? glyphIndexPerCommand[i] : 0;
    if (current === null || index !== currentIndex) {
      current = [];
      groups.push({ glyphIndex: index, commands: current });
      currentIndex = index;
    }
    current.push(commands[i]);
  }
  return groups;
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
// Insert.js
// ==========================================================================

/**
 * Everything that touches the presentation: creating shapes, restyling a
 * selection, and reading a previously inserted shape back into the editor.
 */

/** Alt-text title stamped on shapes we create, so we can recognise our own. */
var VF_SHAPE_TAG = 'Variable Type';

/** Cascade offset (points) so repeated inserts do not land exactly on top of each other. */
var VF_CASCADE_STEP = 14;
var VF_CASCADE_WRAP = 8;

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

function vfAlignmentFor(name) {
  switch (name) {
    case 'center': return SlidesApp.ParagraphAlignment.CENTER;
    case 'right': return SlidesApp.ParagraphAlignment.END;
    case 'justify': return SlidesApp.ParagraphAlignment.JUSTIFIED;
    default: return SlidesApp.ParagraphAlignment.START;
  }
}

/**
 * Count shapes on the slide that we previously inserted, so a run of inserts
 * cascades instead of piling up in one spot.
 */
function vfCascadeOffset(slide) {
  var elements = slide.getPageElements();
  var mine = 0;
  for (var i = 0; i < elements.length; i++) {
    try {
      if (elements[i].getTitle() === VF_SHAPE_TAG) mine++;
    } catch (ignored) {
      // Some element types do not expose a title; they are not ours.
    }
  }
  return (mine % VF_CASCADE_WRAP) * VF_CASCADE_STEP;
}

/**
 * Work out where a new element of the given size should sit: centred, then
 * cascaded, then clamped so it stays on the canvas.
 */
function vfPlacement(slide, widthPt, heightPt) {
  var presentation = SlidesApp.getActivePresentation();
  var pageWidth = presentation.getPageWidth();
  var pageHeight = presentation.getPageHeight();

  var width = Math.min(widthPt, pageWidth);
  var height = Math.min(heightPt, pageHeight);
  var offset = vfCascadeOffset(slide);

  var left = (pageWidth - width) / 2 + offset;
  var top = (pageHeight - height) / 2 + offset;

  left = Math.max(0, Math.min(left, pageWidth - width));
  top = Math.max(0, Math.min(top, pageHeight - height));

  return { left: left, top: top, width: width, height: height };
}

/**
 * Store the design on the shape's alt text so "Load from selection" can
 * restore the exact axis values later. Slides shows alt text to the user, so
 * we keep it short and label it.
 */
function vfStampSpec(element, spec) {
  try {
    element.setTitle(VF_SHAPE_TAG);
    element.setDescription(JSON.stringify({
      vf: 1,
      family: spec.family,
      values: spec.values,
      fontSize: spec.fontSize,
      color: spec.color
    }));
  } catch (ignored) {
    // Alt text is a convenience; never fail an insert over it.
  }
}

function vfReadSpec(element) {
  try {
    if (element.getTitle() !== VF_SHAPE_TAG) return null;
    var parsed = JSON.parse(element.getDescription());
    return parsed && parsed.vf ? parsed : null;
  } catch (ignored) {
    return null;
  }
}

/**
 * Apply a resolved style to a TextRange. Shared by insert and restyle so the
 * two paths can never drift apart.
 */
function vfApplyTextStyle(textRange, spec, resolved) {
  var style = textRange.getTextStyle();
  style.setFontFamilyAndWeight(resolved.fontFamily, resolved.weight);
  style.setItalic(resolved.italic);
  if (spec.fontSize) style.setFontSize(spec.fontSize);
  if (spec.color) style.setForegroundColor(spec.color);
  if (spec.underline !== undefined) style.setUnderline(!!spec.underline);

  var paragraphStyle = textRange.getParagraphStyle();
  paragraphStyle.setParagraphAlignment(vfAlignmentFor(spec.align));
  if (spec.lineSpacing) paragraphStyle.setLineSpacing(spec.lineSpacing);
}

/**
 * Insert the design as a real, editable Slides text box.
 *
 * @param {Object} spec Design from the sidebar: family, axes, values, text,
 *     fontSize, color, align, lineSpacing, widthPt, heightPt.
 * @return {{ok: boolean, message: string, resolved: Object}}
 */
function vfInsertTextShape(spec) {
  if (!spec || !spec.family) throw new Error('No font selected.');
  var text = spec.text === undefined || spec.text === '' ? 'Variable' : spec.text;

  var resolved = vfResolveSlidesStyle({
    family: spec.family,
    axes: spec.axes,
    values: spec.values,
    allowFauxItalic: spec.allowFauxItalic
  });

  var slide = vfActiveSlide();
  // The sidebar measures the rendered preview, so the box matches what the
  // user saw. Fall back to a rough estimate if the measurement is missing.
  var fontSize = spec.fontSize || 48;
  var widthPt = spec.widthPt || Math.max(120, text.length * fontSize * 0.6);
  var heightPt = spec.heightPt || fontSize * 1.6;
  // A little slack: Slides lays text out slightly differently from the browser
  // and we would rather have a roomy box than a clipped one.
  var box = vfPlacement(slide, widthPt * 1.08 + 8, heightPt * 1.15 + 8);

  var shape = slide.insertShape(
    SlidesApp.ShapeType.TEXT_BOX, box.left, box.top, box.width, box.height);
  shape.getFill().setTransparent();
  shape.getBorder().setTransparent();
  shape.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);

  var textRange = shape.getText();
  textRange.setText(text);
  vfApplyTextStyle(textRange, spec, resolved);
  vfStampSpec(shape, spec);

  shape.select();

  return {
    ok: true,
    message: 'Inserted "' + resolved.fontFamily + '" ' + resolved.weight +
      (resolved.italic ? ' italic' : ''),
    resolved: resolved
  };
}

/**
 * Restyle whatever is selected. Handles both a text selection inside a shape
 * and one or more selected shapes.
 */
function vfApplyToSelection(spec) {
  if (!spec || !spec.family) throw new Error('No font selected.');
  var resolved = vfResolveSlidesStyle({
    family: spec.family,
    axes: spec.axes,
    values: spec.values,
    allowFauxItalic: spec.allowFauxItalic
  });

  var selection = SlidesApp.getActivePresentation().getSelection();
  if (!selection) throw new Error('Nothing is selected.');

  var type = selection.getSelectionType();
  var updated = 0;

  if (type === SlidesApp.SelectionType.TEXT) {
    var textRange = selection.getTextRange();
    if (textRange && textRange.asString().length) {
      vfApplyTextStyle(textRange, spec, resolved);
      updated = 1;
    } else {
      // Cursor placed in a shape with no highlighted run: style the whole shape.
      var element = selection.getPageElementRange();
      if (element) {
        var elements = element.getPageElements();
        for (var i = 0; i < elements.length; i++) {
          updated += vfStyleElement(elements[i], spec, resolved);
        }
      }
    }
  } else if (type === SlidesApp.SelectionType.PAGE_ELEMENT) {
    var range = selection.getPageElementRange();
    var selected = range ? range.getPageElements() : [];
    for (var j = 0; j < selected.length; j++) {
      updated += vfStyleElement(selected[j], spec, resolved);
    }
  } else {
    throw new Error('Select a text box or some text first.');
  }

  if (!updated) throw new Error('The selection has no text to restyle.');

  return {
    ok: true,
    message: 'Restyled ' + updated + (updated === 1 ? ' shape' : ' shapes'),
    resolved: resolved
  };
}

/** @return {number} 1 if the element carried text we could style, else 0. */
function vfStyleElement(element, spec, resolved) {
  var type = element.getPageElementType();
  if (type !== SlidesApp.PageElementType.SHAPE) return 0;
  var shape = element.asShape();
  var textRange = shape.getText();
  if (!textRange || !textRange.asString().replace(/\s/g, '').length) return 0;
  vfApplyTextStyle(textRange, spec, resolved);
  vfStampSpec(shape, spec);
  return 1;
}

/**
 * Read a design back out of the selected shape, so a shape inserted earlier
 * can be reopened with its original axis values instead of the snapped ones.
 */
function vfLoadFromSelection() {
  var selection = SlidesApp.getActivePresentation().getSelection();
  if (!selection) return { ok: false, message: 'Nothing is selected.' };

  var range = selection.getPageElementRange();
  var elements = range ? range.getPageElements() : [];
  for (var i = 0; i < elements.length; i++) {
    var spec = vfReadSpec(elements[i]);
    if (spec) {
      if (elements[i].getPageElementType() === SlidesApp.PageElementType.SHAPE) {
        spec.text = elements[i].asShape().getText().asString().replace(/\n$/, '');
      }
      return { ok: true, spec: spec };
    }
  }
  return {
    ok: false,
    message: 'That shape was not created here, so it has no stored axis values.'
  };
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
    throw new Error('Drive could not convert the vector file (HTTP ' + code + '): ' +
      response.getContentText().slice(0, 300));
  }
  return JSON.parse(response.getContentText()).id;
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

  var shape = vfBuildShapeXml({
    commands: payload.commands,
    color: payload.color,
    name: (payload.text || 'Variable type').slice(0, 60) + ' — ' + (payload.family || ''),
    id: 2,
    offsetXEmu: Math.round((slideWidthEmu - extWidthEmu) / 2),
    offsetYEmu: Math.round((slideHeightEmu - extHeightEmu) / 2),
    extWidthEmu: extWidthEmu,
    extHeightEmu: extHeightEmu
  });

  var parts = vfBuildPptxParts({
    shapesXml: shape.xml,
    slideWidthEmu: slideWidthEmu,
    slideHeightEmu: slideHeightEmu
  });

  var fileId = vfUploadAndConvert(vfZipPptx(parts), 'Variable Type import (temporary)');
  try {
    var imported = SlidesApp.openById(fileId);
    var sourceSlides = imported.getSlides();
    if (!sourceSlides.length) throw new Error('The converted file had no slides.');
    var sourceSlide = sourceSlides[0];

    if (payload.newSlide) {
      // Import wholesale as a new slide right after the current one.
      var index = vfCurrentSlideIndex(presentation);
      presentation.insertSlide(index + 1, sourceSlide);
      return {
        ok: true,
        message: 'Added vector outlines on a new slide after this one.',
        scale: fitted.scale
      };
    }

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
    vfStampSpec(result, payload.spec || {});
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

function vfCurrentSlideIndex(presentation) {
  var selection = presentation.getSelection();
  var current = selection ? selection.getCurrentPage() : null;
  var slides = presentation.getSlides();
  if (current) {
    var currentId = current.getObjectId();
    for (var i = 0; i < slides.length; i++) {
      if (slides[i].getObjectId() === currentId) return i;
    }
  }
  return slides.length - 1;
}


// ==========================================================================
// Settings.js
// ==========================================================================

/**
 * Per-user persistence: saved presets and sidebar preferences.
 * Properties are per-user, so presets follow the person, not the deck.
 */

var VF_PRESETS_KEY = 'vf-presets-v1';
var VF_MAX_PRESETS = 40;

function vfUserProperties() {
  return PropertiesService.getUserProperties();
}

function vfReadJson(key, fallback) {
  try {
    var raw = vfUserProperties().getProperty(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (parseError) {
    return fallback;
  }
}

function vfListPresets() {
  var presets = vfReadJson(VF_PRESETS_KEY, []);
  return Array.isArray(presets) ? presets : [];
}

/** Saving under an existing name overwrites it, which is what users expect. */
function vfSavePreset(name, spec) {
  var trimmed = String(name || '').trim();
  if (!trimmed) throw new Error('Give the preset a name.');

  var presets = vfListPresets().filter(function (preset) {
    return preset.name !== trimmed;
  });
  presets.unshift({ name: trimmed, spec: spec, savedAt: new Date().toISOString() });
  if (presets.length > VF_MAX_PRESETS) presets = presets.slice(0, VF_MAX_PRESETS);

  vfUserProperties().setProperty(VF_PRESETS_KEY, JSON.stringify(presets));
  return presets;
}

function vfDeletePreset(name) {
  var presets = vfListPresets().filter(function (preset) {
    return preset.name !== name;
  });
  vfUserProperties().setProperty(VF_PRESETS_KEY, JSON.stringify(presets));
  return presets;
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

function apiRefreshFonts() {
  return vfWrap(function () {
    var catalog = vfGetCatalog(true);
    return { fonts: catalog.fonts, source: catalog.source, warning: catalog.warning };
  });
}

/** Preview the Slides mapping without touching the presentation. */
function apiResolveStyle(spec) {
  return vfWrap(function () {
    return {
      resolved: vfResolveSlidesStyle({
        family: spec.family,
        axes: spec.axes,
        values: spec.values,
        allowFauxItalic: spec.allowFauxItalic
      })
    };
  });
}

function apiInsertTextShape(spec) {
  return vfWrap(function () { return vfInsertTextShape(spec); });
}

function apiInsertVector(payload) {
  return vfWrap(function () { return vfInsertVector(payload); });
}

function apiApplyToSelection(spec) {
  return vfWrap(function () { return vfApplyToSelection(spec); });
}

function apiLoadFromSelection() {
  return vfWrap(function () { return vfLoadFromSelection(); });
}

function apiSavePreset(name, spec) {
  return vfWrap(function () { return { presets: vfSavePreset(name, spec) }; });
}

function apiDeletePreset(name) {
  return vfWrap(function () { return { presets: vfDeletePreset(name) }; });
}
