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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VF_AXIS_REGISTRY: VF_AXIS_REGISTRY, VF_MAPPABLE_AXES: VF_MAPPABLE_AXES, vfAxisInfo: vfAxisInfo };
}
