import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadAppsScript, AXIS } from './helpers.mjs';

const vf = loadAppsScript(['AxisRegistry.js', 'FontMapping.js']);

const noteFor = (resolved, tag) => resolved.notes.find(n => n.tag === tag);

test('weight snaps to the Slides grid of hundreds', () => {
  assert.equal(vf.vfSnapWeight(437, AXIS.wght()), 400);
  assert.equal(vf.vfSnapWeight(451, AXIS.wght()), 500);
  assert.equal(vf.vfSnapWeight(400, AXIS.wght()), 400);
});

test('weight stays inside the font’s own axis range', () => {
  // Oswald spans 200..700: asking for 900 must not request a cut that is absent.
  const axis = AXIS.wght(200, 700, 400);
  assert.equal(vf.vfSnapWeight(900, axis), 700);
  assert.equal(vf.vfSnapWeight(100, axis), 200);
});

test('a weight range narrower than one grid step still resolves', () => {
  // Lora is 400..700; a 1000-weight request clamps rather than returning null.
  assert.equal(vf.vfSnapWeight(1000, AXIS.wght(400, 700, 400)), 700);
  // A pathological font whose whole range sits between two stops.
  assert.equal(vf.vfSnapWeight(455, { tag: 'wght', min: 450, max: 460, defaultValue: 455 }), 500);
});

test('exact weights are reported as exact, snapped ones as approximate', () => {
  const exact = vf.vfResolveSlidesStyle({ family: 'Inter', axes: [AXIS.wght()], values: { wght: 700 } });
  assert.equal(exact.weight, 700);
  assert.equal(noteFor(exact, 'wght').status, 'exact');
  assert.equal(exact.exact, true);

  const snapped = vf.vfResolveSlidesStyle({ family: 'Inter', axes: [AXIS.wght()], values: { wght: 543 } });
  assert.equal(snapped.weight, 500);
  assert.equal(noteFor(snapped, 'wght').status, 'approximate');
  assert.equal(snapped.exact, false);
});

test('width redirects to a sibling family that ships at that width', () => {
  const condensed = vf.vfResolveSlidesStyle({
    family: 'Roboto', axes: [AXIS.wght(), AXIS.wdth(75, 100)], values: { wght: 400, wdth: 75 }
  });
  assert.equal(condensed.fontFamily, 'Roboto Condensed');
  assert.equal(noteFor(condensed, 'wdth').status, 'exact');

  const normal = vf.vfResolveSlidesStyle({
    family: 'Roboto', axes: [AXIS.wght(), AXIS.wdth(75, 100)], values: { wght: 400, wdth: 100 }
  });
  assert.equal(normal.fontFamily, 'Roboto');
});

test('an in-between width picks the nearest cut and says it is approximate', () => {
  const resolved = vf.vfResolveSlidesStyle({
    family: 'Roboto', axes: [AXIS.wdth(75, 100)], values: { wdth: 84 }
  });
  assert.equal(resolved.fontFamily, 'Roboto Condensed');
  assert.equal(noteFor(resolved, 'wdth').status, 'approximate');
});

test('width is dropped when the family has no other cut', () => {
  const resolved = vf.vfResolveSlidesStyle({
    family: 'Bricolage Grotesque', axes: [AXIS.wdth(75, 100)], values: { wdth: 80 }
  });
  assert.equal(resolved.fontFamily, 'Bricolage Grotesque');
  assert.equal(noteFor(resolved, 'wdth').status, 'dropped');
});

test('italic axis maps onto the italic flag', () => {
  const upright = vf.vfResolveSlidesStyle({ family: 'Inter', axes: [AXIS.ital()], values: { ital: 0 } });
  assert.equal(upright.italic, false);
  const italic = vf.vfResolveSlidesStyle({ family: 'Inter', axes: [AXIS.ital()], values: { ital: 1 } });
  assert.equal(italic.italic, true);
});

test('a meaningful slant substitutes italic; a shallow one does not', () => {
  const steep = vf.vfResolveSlidesStyle({ family: 'Roboto Flex', axes: [AXIS.slnt()], values: { slnt: -10 } });
  assert.equal(steep.italic, true);
  assert.equal(noteFor(steep, 'slnt').status, 'approximate');

  const shallow = vf.vfResolveSlidesStyle({ family: 'Roboto Flex', axes: [AXIS.slnt()], values: { slnt: -1 } });
  assert.equal(shallow.italic, false);
  assert.equal(noteFor(shallow, 'slnt').status, 'dropped');
});

test('faux italic can be refused', () => {
  const resolved = vf.vfResolveSlidesStyle({
    family: 'Roboto Flex', axes: [AXIS.slnt()], values: { slnt: -10 }, allowFauxItalic: false
  });
  assert.equal(resolved.italic, false);
  assert.equal(noteFor(resolved, 'slnt').status, 'dropped');
});

test('unmappable axes are dropped, unless left at their default', () => {
  const moved = vf.vfResolveSlidesStyle({
    family: 'Roboto Flex', axes: [AXIS.opsz()], values: { opsz: 100 }
  });
  assert.equal(noteFor(moved, 'opsz').status, 'dropped');

  const untouched = vf.vfResolveSlidesStyle({
    family: 'Roboto Flex', axes: [AXIS.opsz()], values: { opsz: 14 }
  });
  assert.equal(noteFor(untouched, 'opsz').status, 'exact');
  assert.equal(untouched.exact, true);
});

test('missing values fall back to each axis default', () => {
  const resolved = vf.vfResolveSlidesStyle({
    family: 'Inter', axes: [AXIS.wght(), AXIS.opsz()], values: {}
  });
  assert.equal(resolved.weight, 400);
  assert.equal(resolved.exact, true);
});

test('a font with no axes at all still resolves', () => {
  const resolved = vf.vfResolveSlidesStyle({ family: 'Georgia', axes: [], values: {} });
  assert.deepEqual(
    { family: resolved.fontFamily, weight: resolved.weight, italic: resolved.italic, notes: resolved.notes.length },
    { family: 'Georgia', weight: 400, italic: false, notes: 0 }
  );
});

test('custom axes report their tag when the registry has no name', () => {
  const resolved = vf.vfResolveSlidesStyle({
    family: 'Weird', axes: [AXIS.custom('ZZZZ', 0, 10, 0)], values: { ZZZZ: 5 }
  });
  assert.equal(noteFor(resolved, 'ZZZZ').name, 'ZZZZ');
  assert.equal(noteFor(resolved, 'ZZZZ').status, 'dropped');
});
