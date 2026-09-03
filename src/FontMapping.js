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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    VF_SLIDES_WEIGHTS: VF_SLIDES_WEIGHTS,
    VF_WIDTH_SIBLINGS: VF_WIDTH_SIBLINGS,
    vfSnapWeight: vfSnapWeight,
    vfResolveWidthFamily: vfResolveWidthFamily,
    vfResolveSlidesStyle: vfResolveSlidesStyle,
    vfBuildFontCssUrl: vfBuildFontCssUrl,
    vfBuildVariationSettings: vfBuildVariationSettings,
    vfClamp: vfClamp,
    vfRound: vfRound
  };
}
