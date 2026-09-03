/**
 * Add-on entry points and the API the sidebar calls through google.script.run.
 *
 * Every api* function returns a plain object rather than throwing where it can
 * help it, so the sidebar can show a useful message instead of a stack trace.
 */

var VF_SIDEBAR_TITLE = 'Variable Type';

function onOpen(e) {
  SlidesApp.getUi()
    .createAddonMenu()
    .addItem('Open Variable Type', 'showSidebar')
    .addToUi();
}

function onInstall(e) {
  onOpen(e);
}

function showSidebar() {
  var html = HtmlService.createTemplateFromFile('Sidebar')
    .evaluate()
    .setTitle(VF_SIDEBAR_TITLE);
  SlidesApp.getUi().showSidebar(html);
}

/** Lets the sidebar template pull in the CSS and JS partials. */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function vfWrap(action) {
  try {
    var result = action();
    if (result && result.ok === undefined) result.ok = true;
    return result;
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
}

/** Everything the sidebar needs on open, in one round trip. */
function apiBootstrap() {
  return vfWrap(function () {
    var catalog = vfGetCatalog(false);
    return {
      fonts: catalog.fonts,
      source: catalog.source,
      warning: catalog.warning,
      axisRegistry: VF_AXIS_REGISTRY,
      presets: vfListPresets()
    };
  });
}

function apiInsertVector(payload) {
  return vfWrap(function () { return vfInsertVector(payload); });
}
