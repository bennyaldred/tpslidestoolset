/**
 * The Material Symbols icon list: every icon's name and the glyph it maps to.
 *
 * Google publishes this as a plain "name codepoint" file alongside the
 * variable fonts. All three styles (Outlined, Rounded, Sharp) share one icon
 * set, so a single fetch serves the lot. It is cached like the font catalogue
 * because it is a ~78KB response the sidebar wants on every open.
 */

var VF_ICON_CODEPOINTS_URL = 'https://raw.githubusercontent.com/google/material-design-icons/' +
  'master/variablefont/MaterialSymbolsOutlined%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints';

var VF_ICON_CACHE_KEY = 'vf-icons-v1';
var VF_ICON_CACHE_TTL_SECONDS = 604800; // A week; the icon set moves slowly.

/** The three published styles. Names and codepoints are identical across them. */
var VF_ICON_STYLES = [
  { family: 'Material Symbols Outlined', label: 'Outlined' },
  { family: 'Material Symbols Rounded', label: 'Rounded' },
  { family: 'Material Symbols Sharp', label: 'Sharp' }
];

/** The axes every Material Symbols family carries. */
var VF_ICON_AXES = [
  { tag: 'FILL', min: 0, max: 1, defaultValue: 0 },
  { tag: 'GRAD', min: -50, max: 200, defaultValue: 0 },
  { tag: 'opsz', min: 20, max: 48, defaultValue: 24 },
  { tag: 'wght', min: 100, max: 700, defaultValue: 400 }
];

/**
 * A common subset, so the tab still works when GitHub is unreachable.
 * Flat name/codepoint pairs purely to keep the pasted file compact.
 */
var VF_ICON_FALLBACK = [
  'search', 'ef7a', 'home', 'e9b2', 'settings', 'e8b8', 'menu', 'e5d2',
  'close', 'e5cd', 'check', 'e668', 'check_circle', 'f0be', 'cancel', 'e888',
  'add', 'e145', 'remove', 'e15b', 'delete', 'e92e', 'edit', 'f097',
  'arrow_back', 'e5c4', 'arrow_forward', 'e5c8', 'arrow_upward', 'e5d8', 'arrow_downward', 'e5db',
  'chevron_left', 'e5cb', 'chevron_right', 'e5cc', 'expand_more', 'e5cf', 'expand_less', 'e5ce',
  'more_vert', 'e5d4', 'more_horiz', 'e5d3', 'refresh', 'e5d5', 'done', 'e876',
  'info', 'e88e', 'warning', 'f083', 'error', 'f8b6', 'help', 'e8fd',
  'star', 'f09a', 'favorite', 'e87e', 'bookmark', 'e8e7', 'share', 'e80d',
  'download', 'f090', 'upload', 'f09b', 'folder', 'e2c7', 'description', 'e873',
  'image', 'e3f4', 'photo_camera', 'e412', 'play_arrow', 'e037', 'pause', 'e034',
  'stop', 'e047', 'skip_next', 'e044', 'skip_previous', 'e045', 'volume_up', 'e050',
  'volume_off', 'e04f', 'mic', 'e31d', 'person', 'f0d3', 'group', 'ea21',
  'account_circle', 'f20b', 'lock', 'e899', 'lock_open', 'e898', 'visibility', 'e8f4',
  'visibility_off', 'e8f5', 'key', 'e73c', 'mail', 'e159', 'send', 'e163',
  'chat', 'e0c9', 'notifications', 'e7f5', 'calendar_month', 'ebcc', 'schedule', 'efd6',
  'timer', 'e425', 'language', 'ea07', 'public', 'e80b', 'shopping_cart', 'e8cc',
  'payments', 'ef63', 'credit_card', 'e8a1', 'attach_money', 'e227', 'trending_up', 'e8e5',
  'bar_chart', 'e26b', 'pie_chart', 'f0da', 'build', 'f8cd', 'code', 'e86f',
  'terminal', 'eb8e', 'bug_report', 'e868', 'cloud', 'f15c', 'cloud_upload', 'e2c3',
  'sync', 'e627', 'save', 'e161', 'print', 'e8ad', 'filter_list', 'e152',
  'sort', 'e164', 'grid_view', 'e9b0', 'list', 'e896', 'dashboard', 'e871',
  'map', 'e55b', 'place', 'f1db', 'directions', 'e52e', 'flight', 'e539',
  'local_shipping', 'e558', 'lightbulb', 'e90f', 'bolt', 'ea0b', 'rocket_launch', 'eb9b',
  'auto_awesome', 'e65f', 'psychology', 'ea4a', 'school', 'e80c', 'work', 'e943'
];

function vfParseCodepoints(text) {
  var icons = [];
  var lines = String(text).split('\n');
  for (var i = 0; i < lines.length; i++) {
    var parts = lines[i].trim().split(/\s+/);
    if (parts.length !== 2 || !parts[0] || !/^[0-9a-fA-F]+$/.test(parts[1])) continue;
    icons.push({ name: parts[0], cp: parts[1].toLowerCase() });
  }
  return icons;
}

function vfIconFallback() {
  var icons = [];
  for (var i = 0; i + 1 < VF_ICON_FALLBACK.length; i += 2) {
    icons.push({ name: VF_ICON_FALLBACK[i], cp: VF_ICON_FALLBACK[i + 1] });
  }
  return icons;
}

/**
 * @return {{icons: Array<{name: string, cp: string}>, styles: Array,
 *           axes: Array, source: string, warning: (string|undefined)}}
 */
function vfGetIconCatalog() {
  var cache = CacheService.getScriptCache();
  var base = { styles: VF_ICON_STYLES, axes: VF_ICON_AXES };

  try {
    var cached = vfCacheGet(cache, VF_ICON_CACHE_KEY);
    if (cached) {
      base.icons = JSON.parse(cached);
      base.source = 'cache';
      return base;
    }
  } catch (cacheError) {
    // A corrupt entry should never break the tab; just refetch.
  }

  try {
    var response = UrlFetchApp.fetch(VF_ICON_CODEPOINTS_URL, {
      muteHttpExceptions: true,
      followRedirects: true
    });
    if (response.getResponseCode() !== 200) {
      throw new Error('HTTP ' + response.getResponseCode());
    }
    var icons = vfParseCodepoints(response.getContentText());
    if (!icons.length) throw new Error('the icon list was empty');
    try {
      vfCachePut(cache, VF_ICON_CACHE_KEY, JSON.stringify(icons), VF_ICON_CACHE_TTL_SECONDS);
    } catch (putError) {
      // Caching is an optimisation, not a requirement.
    }
    base.icons = icons;
    base.source = 'material-design-icons';
    return base;
  } catch (fetchError) {
    base.icons = vfIconFallback();
    base.source = 'bundled';
    base.warning = 'Could not reach the full icon list (' + fetchError.message +
      '). Showing ' + base.icons.length + ' common icons.';
    return base;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    VF_ICON_STYLES: VF_ICON_STYLES,
    VF_ICON_AXES: VF_ICON_AXES,
    vfParseCodepoints: vfParseCodepoints,
    vfIconFallback: vfIconFallback
  };
}
