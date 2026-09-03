import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadAppsScript } from './helpers.mjs';

const vf = loadAppsScript(['Outline.js']);

test('points convert to EMU at 12700 per point', () => {
  assert.equal(vf.vfPointsToEmu(1), 12700);
  assert.equal(vf.vfPointsToEmu(72), 914400); // one inch
});

test('bounds cover every coordinate, control points included', () => {
  const bounds = vf.vfCommandsBounds([
    ['M', 0, 0], ['C', 10, -20, 30, 40, 20, 0], ['Z']
  ]);
  assert.deepEqual(
    [bounds.x1, bounds.y1, bounds.x2, bounds.y2],
    [0, -20, 30, 40]
  );
});

test('empty command lists produce a zero box rather than Infinity', () => {
  const bounds = vf.vfCommandsBounds([]);
  assert.deepEqual([bounds.width, bounds.height], [0, 0]);
});

test('quadratic segments are promoted to cubics', () => {
  const xml = vf.vfCommandsToPathXml(
    [['M', 0, 0], ['Q', 30, 0, 30, 30]], { x1: 0, y1: 0 }, 1000, 1000);
  assert.match(xml, /<a:cubicBezTo>/);
  assert.doesNotMatch(xml, /quadBezTo/);
  // A quadratic promoted correctly puts both controls two-thirds of the way
  // from each endpoint toward the original control point.
  const points = [...xml.matchAll(/<a:pt x="(-?\d+)" y="(-?\d+)"\/>/g)].map(m => [+m[1], +m[2]]);
  assert.deepEqual(points[1], [vf.vfPointsToEmu(20), 0]);
  assert.deepEqual(points[2], [vf.vfPointsToEmu(30), vf.vfPointsToEmu(10)]);
});

test('an unclosed contour is closed so the fill is well defined', () => {
  const xml = vf.vfCommandsToPathXml(
    [['M', 0, 0], ['L', 10, 0], ['L', 10, 10]], { x1: 0, y1: 0 }, 100, 100);
  assert.equal((xml.match(/<a:close\/>/g) || []).length, 1);
});

test('a new contour closes the previous one', () => {
  const xml = vf.vfCommandsToPathXml(
    [['M', 0, 0], ['L', 1, 0], ['M', 5, 5], ['L', 6, 5]], { x1: 0, y1: 0 }, 100, 100);
  assert.equal((xml.match(/<a:close\/>/g) || []).length, 2);
});

test('geometry is translated so the path starts at the origin', () => {
  const xml = vf.vfCommandsToPathXml(
    [['M', 100, 50], ['L', 110, 50]], { x1: 100, y1: 50 }, 1000, 1000);
  assert.match(xml, /<a:pt x="0" y="0"\/>/);
});

test('shape extent defaults to the natural size and can be scaled down', () => {
  const commands = [['M', 0, 0], ['L', 100, 0], ['L', 100, 50], ['Z']];
  const natural = vf.vfBuildShapesXml({ commands, firstId: 2, name: 'x' });
  assert.equal(natural.widthEmu, vf.vfPointsToEmu(100));

  const fitted = vf.vfBuildShapesXml({
    commands, firstId: 2, name: 'x',
    extWidthEmu: vf.vfPointsToEmu(50), extHeightEmu: vf.vfPointsToEmu(25)
  });
  assert.equal(fitted.widthEmu, vf.vfPointsToEmu(50));
  // Scaling must not touch the path's own coordinate space.
  assert.equal(fitted.naturalWidthEmu, natural.widthEmu);
  assert.match(fitted.xml, new RegExp(`<a:path w="${natural.widthEmu}"`));
});

test('shape names are XML-escaped', () => {
  const shape = vf.vfBuildShapesXml({
    commands: [['M', 0, 0], ['L', 1, 1]], firstId: 2, name: 'Fish & <Chips>'
  });
  assert.match(shape.xml, /name="Fish &amp; &lt;Chips&gt; 1"/);
  assert.doesNotMatch(shape.xml, /name="Fish & </);
});

test('colour is emitted as an uppercase hex value without the hash', () => {
  const shape = vf.vfBuildShapesXml({
    commands: [['M', 0, 0], ['L', 1, 1]], firstId: 2, name: 'x', color: '#1a73e8'
  });
  assert.match(shape.xml, /<a:srgbClr val="1A73E8"\/>/);
});

test('a zero-area design still yields a valid, non-zero extent', () => {
  const shape = vf.vfBuildShapesXml({ commands: [['M', 5, 5], ['L', 5, 5]], firstId: 2, name: 'x' });
  assert.ok(shape.widthEmu >= 1 && shape.heightEmu >= 1);
});

// --- Contour grouping -------------------------------------------------
// Slides fills imported geometry even-odd, so overlapping contours must not
// share a path. These cover the classification that keeps them apart.

/** Axis-aligned square. `reverse` flips the winding. */
const square = (x, y, size, reverse) => {
  const corners = reverse
    ? [[x, y + size], [x + size, y + size], [x + size, y]]
    : [[x + size, y], [x + size, y + size], [x, y + size]];
  return [['M', x, y], ...corners.map(c => ['L', c[0], c[1]]), ['Z']];
};

test('a counter is nested into its outer contour, giving one shape', () => {
  const groups = vf.vfGroupContours([...square(0, 0, 100, false), ...square(30, 30, 40, true)]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].filter(c => c[0] === 'M').length, 2);
});

test('two overlapping outer contours become separate shapes', () => {
  // Same winding, so neither can be read as a hole in the other.
  const groups = vf.vfGroupContours([...square(0, 0, 100, false), ...square(50, 50, 100, false)]);
  assert.equal(groups.length, 2);
  groups.forEach(g => assert.equal(g.filter(c => c[0] === 'M').length, 1));
});

test('a contour that merely overlaps another is never treated as a hole', () => {
  // A reverse-wound contour sticking out of the outer one: it is not nested,
  // so it must not be subtracted. This is the case that punched a bite out of
  // heavy `e` glyphs when containment was decided by majority vote.
  const groups = vf.vfGroupContours([...square(0, 0, 100, false), ...square(60, 40, 80, true)]);
  assert.equal(groups.length, 2);
});

test('an island inside a counter becomes its own shape', () => {
  const groups = vf.vfGroupContours([
    ...square(0, 0, 100, false), ...square(20, 20, 60, true), ...square(40, 40, 20, false)
  ]);
  // Outer+counter in one shape, the island drawn on top in another.
  assert.equal(groups.length, 2);
});

test('grouping preserves every command exactly — no coordinate is altered', () => {
  // The whole point of grouping rather than boolean-uniting: the geometry that
  // reaches the slide is the geometry the font produced.
  const commands = [
    ...square(0, 0, 100, false), ...square(30, 30, 40, true), ...square(50, 50, 100, false),
    ['M', 5, 5], ['C', 6.25, 7.5, 8.5, 9.75, 10, 10], ['Q', 12, 12, 14, 9], ['Z']
  ];
  const groups = vf.vfGroupContours(commands);
  const flat = [].concat(...groups);
  const key = list => list.map(c => c.join(',')).sort().join('|');
  assert.equal(flat.length, commands.length);
  assert.equal(key(flat), key(commands));
});

test('a single contour is passed straight through', () => {
  const commands = square(0, 0, 10, false);
  assert.deepEqual(vf.vfGroupContours(commands).length, 1);
});

test('signed area sign follows winding direction', () => {
  const cw = vf.vfPolygonArea(vf.vfFlattenContour(square(0, 0, 10, false)));
  const ccw = vf.vfPolygonArea(vf.vfFlattenContour(square(0, 0, 10, true)));
  assert.ok(cw * ccw < 0, 'opposite windings must have opposite area signs');
});

test('point-in-polygon handles points inside, outside and beyond', () => {
  const poly = vf.vfFlattenContour(square(0, 0, 10, false));
  assert.equal(vf.vfPointInPolygon([5, 5], poly), true);
  assert.equal(vf.vfPointInPolygon([15, 5], poly), false);
  assert.equal(vf.vfPointInPolygon([-1, 5], poly), false);
});

test('contours are split on each moveTo', () => {
  const contours = vf.vfSplitContours([...square(0, 0, 10, false), ...square(20, 20, 10, false)]);
  assert.equal(contours.length, 2);
});
