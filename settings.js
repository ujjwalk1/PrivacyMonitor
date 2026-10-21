// Partial D13: only on-page display preferences. No sites, URLs, or field values.
var PrivacyMonitorSettings = (() => {
  const KEY = 'privacy_monitor_display_settings_v1';
  const defaults = Object.freeze({ version: 1, passwordFeedback: true, formWarnings: true });
  function normalize(value) {
    if (value === undefined) return defaults; // A fresh install keeps existing UI enabled.
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1 ||
        Object.keys(value).length !== 3 || !['version', 'passwordFeedback', 'formWarnings'].every(key => Object.hasOwn(value, key)) ||
        typeof value.passwordFeedback !== 'boolean' ||
        typeof value.formWarnings !== 'boolean') return null;
    return Object.freeze({ version: 1, passwordFeedback: value.passwordFeedback, formWarnings: value.formWarnings });
  }
  async function read(api) {
    try {
      const stored = await api.storage.local.get(KEY);
      if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return null;
      return normalize(Object.hasOwn(stored, KEY) ? stored[KEY] : undefined);
    } catch { return null; } // Unverified preferences never enable injected UI.
  }
  return Object.freeze({ KEY, defaults, normalize, read });
})();
