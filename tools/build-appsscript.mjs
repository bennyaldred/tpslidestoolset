/**
 * Collapses src/ into paste-ready Apps Script files.
 *
 * The source is split for testability, but the Apps Script editor is a nicer
 * place to paste three files than nine. Apps Script hoists all top-level
 * declarations into one shared scope, so concatenation is semantically
 * identical to keeping the files apart.
 *
 *   node tools/build-appsscript.mjs   ->   build/
 *
 * The build is one-directional. Edit src/, rebuild; do not edit build/.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const out = join(root, 'build');
const read = name => readFileSync(join(src, name), 'utf8');

/** Logical reading order; Apps Script does not care, but people do. */
const SERVER_FILES = [
  'AxisRegistry.js',
  'FontMapping.js',
  'FontCatalog.js',
  'Outline.js',
  'Pptx.js',
  'Insert.js',
  'VectorInsert.js',
  'Settings.js',
  'Code.js'
];

/**
 * Drop the CommonJS export blocks. They are inert in Apps Script (`module` is
 * undefined there) and exist only so the test runner can reach these
 * functions, but leaving them in the pasted file invites the question.
 */
function stripModuleExports(source) {
  return source.replace(
    /\nif \(typeof module !== 'undefined' && module\.exports\) \{[\s\S]*?\n\}\n/g,
    '\n'
  ).trimEnd();
}

const banner = `/**
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
`;

const server = banner + SERVER_FILES.map(name =>
  `\n// ${'='.repeat(74)}\n// ${name}\n// ${'='.repeat(74)}\n\n` +
  stripModuleExports(read(name)) + '\n'
).join('\n');

// Inline the partials so the sidebar is a single self-contained file. The
// server still loads it with createTemplateFromFile, which is fine — there are
// simply no scriptlets left to evaluate.
let sidebar = read('Sidebar.html')
  .replace(/<\?!=\s*include\('([^']+)'\);?\s*\?>/g, (_, name) => read(name + '.html'));

if (/<\?/.test(sidebar)) {
  throw new Error('Sidebar.html still contains unresolved Apps Script scriptlets.');
}

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'Code.gs'), server);
writeFileSync(join(out, 'Sidebar.html'), sidebar);
writeFileSync(join(out, 'appsscript.json'), read('appsscript.json'));

console.log('build/Code.gs         ' + server.length.toLocaleString() + ' bytes');
console.log('build/Sidebar.html    ' + sidebar.length.toLocaleString() + ' bytes');
console.log('build/appsscript.json ' + read('appsscript.json').length.toLocaleString() + ' bytes');
