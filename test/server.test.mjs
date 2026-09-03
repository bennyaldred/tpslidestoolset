import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { SRC } from './helpers.mjs';

/**
 * The server files are globals in one shared Apps Script scope, so a stale
 * reference to a deleted function is only found when the line runs — and
 * vfWrap turns that into a polite message rather than a crash, which is easy
 * to miss. These tests load the whole server the way Apps Script does, against
 * stubbed services, and actually call the API.
 */

const SERVER_FILES = readdirSync(SRC).filter(f => f.endsWith('.js')).sort();

/** Minimal stand-ins for the Apps Script services the server touches. */
function makeContext({ fetch } = {}) {
  const cache = new Map();
  const context = {
    console,
    CacheService: {
      getScriptCache: () => ({
        get: key => (cache.has(key) ? cache.get(key) : null),
        getAll: keys => Object.fromEntries(
          keys.filter(k => cache.has(k)).map(k => [k, cache.get(k)])),
        putAll: values => { for (const [k, v] of Object.entries(values)) cache.set(k, v); }
      })
    },
    UrlFetchApp: {
      fetch: fetch || (() => { throw new Error('network disabled in tests'); })
    },
    Utilities: {
      getUuid: () => 'test-uuid',
      newBlob: (content, type, name) => ({ content, type, name, getBytes: () => [] }),
      zip: () => ({ setContentType: () => ({}) })
    },
    ScriptApp: { getOAuthToken: () => 'token' },
    SlidesApp: {},
    HtmlService: {}
  };
  for (const file of SERVER_FILES) {
    runInNewContext(readFileSync(join(SRC, file), 'utf8'), context, { filename: file });
  }
  return context;
}

test('every vf*/api*/VF_* name the server references is actually defined', () => {
  // Catches a call left behind when the function it targets is deleted.
  const source = SERVER_FILES
    .map(f => readFileSync(join(SRC, f), 'utf8'))
    .join('\n');
  const defined = new Set();
  for (const m of source.matchAll(/\bfunction\s+(vf\w+|api\w+)\s*\(/g)) defined.add(m[1]);
  for (const m of source.matchAll(/\bvar\s+(VF_\w+|vf\w+)\s*=/g)) defined.add(m[1]);

  const referenced = new Set();
  for (const m of source.matchAll(/\b(vf[A-Z]\w*|api[A-Z]\w*|VF_[A-Z0-9_]+)\b/g)) referenced.add(m[1]);

  const missing = [...referenced].filter(name => !defined.has(name)).sort();
  assert.deepEqual(missing, [], 'referenced but never defined: ' + missing.join(', '));
});

test('apiBootstrap succeeds and falls back to the bundled catalogue offline', () => {
  const vf = makeContext();
  const result = vf.apiBootstrap();
  assert.equal(result.ok, true, 'apiBootstrap returned: ' + JSON.stringify(result));
  assert.ok(result.fonts.length > 0);
  assert.equal(result.source, 'bundled');
  assert.ok(result.warning, 'a fallback should say why');
  assert.ok(result.axisRegistry.wght, 'the sidebar needs the axis registry');
});

test('the bundled catalogue leads with the default typeface', () => {
  const vf = makeContext();
  const fonts = vf.apiBootstrap().fonts;
  const gsf = fonts.find(f => f.family === 'Google Sans Flex');
  assert.ok(gsf, 'Google Sans Flex must be present — it is the default');
  // Array.from copies into this realm; a cross-realm array is never
  // deep-strict-equal to a local one, however identical its contents.
  assert.deepEqual(
    Array.from(gsf.axes, a => a.tag).sort(),
    ['GRAD', 'ROND', 'opsz', 'slnt', 'wdth', 'wght']);
  assert.equal(gsf.axes.find(a => a.tag === 'ROND').max, 100);
});

test('apiBootstrap uses live Google Fonts metadata when it is reachable', () => {
  const payload = ")]}'\n" + JSON.stringify({
    familyMetadataList: [
      { family: 'Test Flex', category: 'Sans Serif',
        axes: [{ tag: 'wght', min: 100, max: 900, defaultValue: 400 }] },
      { family: 'Static Face', category: 'Serif', axes: [] }
    ]
  });
  const vf = makeContext({
    fetch: () => ({ getResponseCode: () => 200, getContentText: () => payload })
  });
  const result = vf.apiBootstrap();
  assert.equal(result.source, 'google-fonts');
  // Static families have nothing to vary, so they are filtered out.
  assert.deepEqual(Array.from(result.fonts, f => f.family), ['Test Flex']);
  assert.equal(result.warning, undefined);
});

test('a second call is served from cache', () => {
  let calls = 0;
  const payload = ")]}'\n" + JSON.stringify({
    familyMetadataList: [{ family: 'Test Flex', category: '', axes: [
      { tag: 'wght', min: 100, max: 900, defaultValue: 400 }] }]
  });
  const vf = makeContext({
    fetch: () => { calls++; return { getResponseCode: () => 200, getContentText: () => payload }; }
  });
  vf.apiBootstrap();
  const second = vf.apiBootstrap();
  assert.equal(calls, 1);
  assert.equal(second.source, 'cache');
});

test('apiInsertVector reports errors instead of throwing', () => {
  const vf = makeContext();
  const result = vf.apiInsertVector({ commands: [] });
  assert.equal(result.ok, false);
  assert.match(result.error, /No outlines/);
});

test('the API surface is exactly what the sidebar calls', () => {
  const vf = makeContext();
  const exposed = Array.from(Object.keys(vf)).filter(k => k.startsWith('api')).sort();
  assert.deepEqual(exposed, ['apiBootstrap', 'apiInsertVector']);
});
