import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runInNewContext } from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
export const SRC = join(here, '..', 'src');

/**
 * Apps Script evaluates every .gs file into one shared global scope, so the
 * tests load them the same way. This also catches accidental reliance on
 * CommonJS module semantics, which would break once deployed.
 */
export function loadAppsScript(files) {
  const context = { console, JSON, Math, Date, String, Number, Array, Object, isNaN, Infinity };
  for (const file of files) {
    runInNewContext(readFileSync(join(SRC, file), 'utf8'), context, { filename: file });
  }
  return context;
}

export const AXIS = {
  wght: (min = 100, max = 900, def = 400) => ({ tag: 'wght', min, max, defaultValue: def }),
  wdth: (min = 75, max = 125, def = 100) => ({ tag: 'wdth', min, max, defaultValue: def }),
  ital: () => ({ tag: 'ital', min: 0, max: 1, defaultValue: 0 }),
  slnt: (min = -10, max = 0, def = 0) => ({ tag: 'slnt', min, max, defaultValue: def }),
  opsz: (min = 8, max = 144, def = 14) => ({ tag: 'opsz', min, max, defaultValue: def }),
  custom: (tag, min, max, def) => ({ tag, min, max, defaultValue: def })
};
