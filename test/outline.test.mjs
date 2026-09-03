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
  const natural = vf.vfBuildShapeXml({ commands, id: 2, name: 'x' });
  assert.equal(natural.widthEmu, vf.vfPointsToEmu(100));

  const fitted = vf.vfBuildShapeXml({
    commands, id: 2, name: 'x',
    extWidthEmu: vf.vfPointsToEmu(50), extHeightEmu: vf.vfPointsToEmu(25)
  });
  assert.equal(fitted.widthEmu, vf.vfPointsToEmu(50));
  // Scaling must not touch the path's own coordinate space.
  assert.equal(fitted.naturalWidthEmu, natural.widthEmu);
  assert.match(fitted.xml, new RegExp(`<a:path w="${natural.widthEmu}"`));
});

test('shape names are XML-escaped', () => {
  const shape = vf.vfBuildShapeXml({
    commands: [['M', 0, 0], ['L', 1, 1]], id: 2, name: 'Fish & <Chips>'
  });
  assert.match(shape.xml, /name="Fish &amp; &lt;Chips&gt;"/);
  assert.doesNotMatch(shape.xml, /name="Fish & </);
});

test('colour is emitted as an uppercase hex value without the hash', () => {
  const shape = vf.vfBuildShapeXml({
    commands: [['M', 0, 0], ['L', 1, 1]], id: 2, name: 'x', color: '#1a73e8'
  });
  assert.match(shape.xml, /<a:srgbClr val="1A73E8"\/>/);
});

test('a zero-area design still yields a valid, non-zero extent', () => {
  const shape = vf.vfBuildShapeXml({ commands: [['M', 5, 5], ['L', 5, 5]], id: 2, name: 'x' });
  assert.ok(shape.widthEmu >= 1 && shape.heightEmu >= 1);
});
