/**
 * Assembles the sidebar into a standalone page for local development.
 *
 * Apps Script resolves `<?!= include('X') ?>` server-side and provides
 * `google.script.run`; neither exists in a plain browser. This script inlines
 * the partials and installs a mock backend so the UI can be iterated on
 * without a deploy. The mock runs the *real* mapping code, so the fidelity
 * report shown here is the one the add-on will show.
 *
 *   node tools/build-preview.mjs   ->   dist/preview.html
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const read = name => readFileSync(join(src, name), 'utf8');

const FIXTURE_FONTS = [
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
  { family: 'Fraunces', category: 'Serif', axes: [
    { tag: 'ital', min: 0, max: 1, defaultValue: 0 },
    { tag: 'opsz', min: 9, max: 144, defaultValue: 14 },
    { tag: 'wght', min: 100, max: 900, defaultValue: 400 },
    { tag: 'SOFT', min: 0, max: 100, defaultValue: 0 },
    { tag: 'WONK', min: 0, max: 1, defaultValue: 0 }
  ] },
  { family: 'Recursive', category: 'Sans Serif', axes: [
    { tag: 'slnt', min: -15, max: 0, defaultValue: 0 },
    { tag: 'wght', min: 300, max: 1000, defaultValue: 400 },
    { tag: 'CASL', min: 0, max: 1, defaultValue: 0 },
    { tag: 'MONO', min: 0, max: 1, defaultValue: 0 }
  ] }
];

const FIXTURE_ICONS = [
  ['search','ef7a'], ['home','e9b2'], ['settings','e8b8'], ['menu','e5d2'],
  ['close','e5cd'], ['check','e668'], ['check_circle','f0be'], ['add','e145'],
  ['remove','e15b'], ['delete','e92e'], ['edit','f097'], ['star','e838'],
  ['favorite','e87d'], ['share','e80d'], ['download','f090'], ['folder','e2c7'],
  ['person','e7fd'], ['lock','e897'], ['mail','e158'], ['more_vert','e5d4'],
  ['add_home_work','f6b1'], ['fullscreen','e5d0']
];
const FIXTURE_ICON_STYLES = [
  { family: 'Material Symbols Outlined', label: 'Outlined' },
  { family: 'Material Symbols Rounded', label: 'Rounded' },
  { family: 'Material Symbols Sharp', label: 'Sharp' }
];
const FIXTURE_ICON_AXES = [
  { tag: 'FILL', min: 0, max: 1, defaultValue: 0 },
  { tag: 'GRAD', min: -50, max: 200, defaultValue: 0 },
  { tag: 'opsz', min: 20, max: 48, defaultValue: 24 },
  { tag: 'wght', min: 100, max: 700, defaultValue: 400 }
];

const mock = `
<script>
${read('AxisRegistry.js')}
</script>
<script>
/* Stand-in for the Apps Script bridge: anything that would touch a
   presentation is logged instead. */
(function () {
  var FONTS = ${JSON.stringify(FIXTURE_FONTS, null, 2)};
  var ICONS = ${JSON.stringify(FIXTURE_ICONS)};
  var STYLES = ${JSON.stringify(FIXTURE_ICON_STYLES)};
  var ICON_AXES = ${JSON.stringify(FIXTURE_ICON_AXES)};
  var handlers = {
    apiBootstrap: function () {
      return { ok: true, fonts: FONTS, source: 'preview-fixture',
               axisRegistry: VF_AXIS_REGISTRY,
               warning: 'Local preview — using fixture fonts and a mock backend.' };
    },
    apiIconCatalog: function () {
      var icons = ICONS.map(function (pair) { return { name: pair[0], cp: pair[1] }; });
      return { ok: true, icons: icons, styles: STYLES, axes: ICON_AXES,
               source: 'preview-fixture',
               warning: 'Local preview — a small fixture icon set.' };
    },
    apiInsertVector: function (payload) {
      console.log('[preview] insert vector', payload.commands.length, 'commands');
      return { ok: true, message: 'Preview: would import ' + payload.commands.length + ' path segments', scale: 1 };
    }
  };

  function makeRunner(success, failure) {
    var runner = {
      withSuccessHandler: function (fn) { return makeRunner(fn, failure); },
      withFailureHandler: function (fn) { return makeRunner(success, fn); }
    };
    Object.keys(handlers).forEach(function (name) {
      runner[name] = function () {
        var args = arguments;
        setTimeout(function () {
          try { if (success) success(handlers[name].apply(null, args)); }
          catch (error) { if (failure) failure(error); else throw error; }
        }, 30);
      };
    });
    return runner;
  }
  window.google = { script: { run: makeRunner(null, null), host: { close: function () {} } } };
})();
</script>
`;

let html = read('Sidebar.html');
html = html.replace(/<\?!=\s*include\('([^']+)'\);?\s*\?>/g, (_, name) => read(name + '.html'));
html = html.replace('</body>', mock + '</body>');
// The sidebar is ~300px wide in Slides; frame the preview so it looks honest.
html = html.replace('<body>', '<body style="max-width:320px;border-right:1px solid #dadce0;min-height:100vh">');

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'preview.html'), html);
console.log('dist/preview.html written (' + html.length + ' bytes)');
