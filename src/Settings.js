/**
 * Per-user persistence: saved presets and sidebar preferences.
 * Properties are per-user, so presets follow the person, not the deck.
 */

var VF_PRESETS_KEY = 'vf-presets-v1';
var VF_PREFS_KEY = 'vf-prefs-v1';
var VF_MAX_PRESETS = 40;

function vfUserProperties() {
  return PropertiesService.getUserProperties();
}

function vfReadJson(key, fallback) {
  try {
    var raw = vfUserProperties().getProperty(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (parseError) {
    return fallback;
  }
}

function vfListPresets() {
  var presets = vfReadJson(VF_PRESETS_KEY, []);
  return Array.isArray(presets) ? presets : [];
}

/** Saving under an existing name overwrites it, which is what users expect. */
function vfSavePreset(name, spec) {
  var trimmed = String(name || '').trim();
  if (!trimmed) throw new Error('Give the preset a name.');

  var presets = vfListPresets().filter(function (preset) {
    return preset.name !== trimmed;
  });
  presets.unshift({ name: trimmed, spec: spec, savedAt: new Date().toISOString() });
  if (presets.length > VF_MAX_PRESETS) presets = presets.slice(0, VF_MAX_PRESETS);

  vfUserProperties().setProperty(VF_PRESETS_KEY, JSON.stringify(presets));
  return presets;
}

function vfDeletePreset(name) {
  var presets = vfListPresets().filter(function (preset) {
    return preset.name !== name;
  });
  vfUserProperties().setProperty(VF_PRESETS_KEY, JSON.stringify(presets));
  return presets;
}

function vfGetPrefs() {
  return vfReadJson(VF_PREFS_KEY, {});
}

function vfSavePrefs(prefs) {
  vfUserProperties().setProperty(VF_PREFS_KEY, JSON.stringify(prefs || {}));
  return prefs;
}
