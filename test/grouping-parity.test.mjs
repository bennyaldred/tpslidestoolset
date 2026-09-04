import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { SRC, loadAppsScript } from './helpers.mjs';

/**
 * Contour grouping exists twice: on the server in Outline.js, where it decides
 * how many shapes to emit, and in the sidebar, where flattening needs the same
 * grouping before it can union. They must agree, or a design would flatten
 * differently from how it would otherwise be split.
 */

const server = loadAppsScript(['Outline.js']);

/** Pull the sidebar's copy out of the HTML and run it here. */
function loadSidebarGrouping() {
  const html = readFileSync(join(SRC, 'SidebarJs.html'), 'utf8');
  const grab = name => {
    const start = html.indexOf('function ' + name + '(');
    if (start < 0) throw new Error('missing ' + name + ' in SidebarJs.html');
    let depth = 0;
    for (let i = html.indexOf('{', start); i < html.length; i++) {
      if (html[i] === '{') depth++;
      else if (html[i] === '}' && --depth === 0) return html.slice(start, i + 1);
    }
    throw new Error('unbalanced braces reading ' + name);
  };
  const source = 'var VF_FLATTEN_SAMPLES = 10, VF_EPS = 1e-7;\n' +
    ['splitContours', 'flattenContour', 'contourInside', 'groupContours'].map(grab).join('\n');
  const context = { console, Math, Number, String, Array, Object, Infinity, isNaN };
  runInNewContext(source, context, { filename: 'SidebarJs.html' });
  return context;
}

const sidebar = loadSidebarGrouping();

/** Compare by shape: contour counts per group, and the commands in each. */
const shapeOf = groups => JSON.stringify(
  Array.from(groups, g => Array.from(g, c => c.join(','))));

const square = (x, y, size, reverse) => {
  const corners = reverse
    ? [[x, y + size], [x + size, y + size], [x + size, y]]
    : [[x + size, y], [x + size, y + size], [x, y + size]];
  return [['M', x, y], ...corners.map(c => ['L', c[0], c[1]]), ['Z']];
};

const CASES = {
  'outer with a counter': [...square(0, 0, 100, false), ...square(30, 30, 40, true)],
  'two overlapping outers': [...square(0, 0, 100, false), ...square(50, 50, 100, false)],
  'partial overlap, opposite winding': [...square(0, 0, 100, false), ...square(60, 40, 80, true)],
  'island inside a counter': [
    ...square(0, 0, 100, false), ...square(20, 20, 60, true), ...square(40, 40, 20, false)],
  'single contour': square(0, 0, 10, false),
  'two separate letters': [...square(0, 0, 50, false), ...square(80, 0, 50, false)],
  'curves': [
    ['M', 0, 0], ['C', 0, -55, 45, -100, 100, -100], ['C', 155, -100, 200, -55, 200, 0], ['Z'],
    ['M', 50, -20], ['C', 50, -55, 75, -75, 100, -75], ['C', 125, -75, 150, -55, 150, -20], ['Z']
  ]
};

for (const [label, commands] of Object.entries(CASES)) {
  test(`server and sidebar group "${label}" identically`, () => {
    const a = server.vfGroupContours(commands);
    const b = sidebar.groupContours(commands);
    assert.equal(a.length, b.length, `group count differs: ${a.length} vs ${b.length}`);
    assert.equal(shapeOf(a), shapeOf(b));
  });
}

test('both implementations preserve every command exactly', () => {
  for (const commands of Object.values(CASES)) {
    for (const groups of [server.vfGroupContours(commands), sidebar.groupContours(commands)]) {
      const flat = [].concat(...Array.from(groups, g => Array.from(g)));
      assert.equal(flat.length, commands.length);
    }
  }
});
