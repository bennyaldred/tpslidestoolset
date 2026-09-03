import { test } from 'node:test';
import assert from 'node:assert/strict';
import { XMLParser } from 'fast-xml-parser';
import { loadAppsScript } from './helpers.mjs';

const vf = loadAppsScript(['Outline.js', 'Pptx.js']);

const REQUIRED_PARTS = [
  '[Content_Types].xml', '_rels/.rels', 'ppt/presentation.xml',
  'ppt/_rels/presentation.xml.rels', 'ppt/theme/theme1.xml',
  'ppt/slideMasters/slideMaster1.xml', 'ppt/slideMasters/_rels/slideMaster1.xml.rels',
  'ppt/slideLayouts/slideLayout1.xml', 'ppt/slideLayouts/_rels/slideLayout1.xml.rels',
  'ppt/slides/slide1.xml', 'ppt/slides/_rels/slide1.xml.rels'
];

// vfBuildPptxParts runs inside the sandboxed Apps Script realm, so copy its
// results into this realm before comparing — cross-realm arrays are never
// deep-strict-equal to local ones, however identical their contents.
const parts = Array.from(vf.vfBuildPptxParts({ shapesXml: '<p:sp/>' }),
  part => ({ path: part.path, xml: part.xml }));
const byPath = Object.fromEntries(parts.map(p => [p.path, p.xml]));

test('the package contains every part the format requires', () => {
  assert.deepEqual(parts.map(p => p.path).sort(), REQUIRED_PARTS.slice().sort());
});

test('[Content_Types].xml is first, as readers expect', () => {
  assert.equal(parts[0].path, '[Content_Types].xml');
});

test('every part is well-formed XML', () => {
  const parser = new XMLParser({ ignoreAttributes: false });
  for (const part of parts) {
    assert.doesNotThrow(() => parser.parse(part.xml, true), `${part.path} is malformed`);
  }
});

test('every part except the rels files is declared in [Content_Types].xml', () => {
  const types = byPath['[Content_Types].xml'];
  for (const path of REQUIRED_PARTS) {
    if (path.endsWith('.rels') || path === '[Content_Types].xml') continue;
    assert.ok(types.includes(`PartName="/${path}"`), `${path} is not declared`);
  }
});

test('relationship targets all resolve to parts that exist', () => {
  const resolve = (from, target) => {
    const base = from.split('/').slice(0, -2).join('/'); // strip "_rels/name.rels"
    const stack = base ? base.split('/') : [];
    for (const segment of target.split('/')) {
      if (segment === '..') stack.pop();
      else if (segment !== '.') stack.push(segment);
    }
    return stack.join('/');
  };
  for (const part of parts) {
    if (!part.path.endsWith('.rels')) continue;
    for (const match of part.xml.matchAll(/Target="([^"]+)"/g)) {
      const resolved = resolve(part.path, match[1]);
      assert.ok(byPath[resolved], `${part.path} points at missing part ${resolved}`);
    }
  }
});

test('the slide size is carried into presentation.xml', () => {
  const custom = Array.from(vf.vfBuildPptxParts({
    shapesXml: '', slideWidthEmu: 12192000, slideHeightEmu: 6858000
  }));
  const presentation = custom.find(p => p.path === 'ppt/presentation.xml').xml;
  assert.match(presentation, /<p:sldSz cx="12192000" cy="6858000"\/>/);
});

test('shapes land inside the slide’s shape tree', () => {
  const slide = vf.vfSlideXml('<p:sp id="marker"/>');
  const treeStart = slide.indexOf('<p:spTree>');
  const treeEnd = slide.indexOf('</p:spTree>');
  const shapeAt = slide.indexOf('<p:sp id="marker"/>');
  assert.ok(shapeAt > treeStart && shapeAt < treeEnd);
});

test('a generated glyph shape round-trips as freeform custom geometry', () => {
  // A square with a square hole: the shape of a real counter.
  const commands = [
    ['M', 0, 0], ['L', 100, 0], ['L', 100, 100], ['L', 0, 100], ['Z'],
    ['M', 30, 30], ['L', 30, 70], ['L', 70, 70], ['L', 70, 30], ['Z']
  ];
  const shape = vf.vfBuildShapeXml({ commands, id: 2, name: 'O', color: '#000000' });
  const slide = Array.from(vf.vfBuildPptxParts({ shapesXml: shape.xml }))
    .find(p => p.path === 'ppt/slides/slide1.xml').xml;

  assert.match(slide, /<a:custGeom>/);
  // Both contours must live in one <a:path> or the counter will not knock out.
  assert.equal((slide.match(/<a:path /g) || []).length, 1);
  assert.equal((slide.match(/<a:moveTo>/g) || []).length, 2);
  assert.equal((slide.match(/<a:close\/>/g) || []).length, 2);
});
