// Own storage key only; consent and analysis records are intentionally untouched.
(() => {
  const api = typeof browser !== 'undefined' ? browser : chrome;
  const settings = PrivacyMonitorSettings;
  let busy = false;
  let loaded = false;
  const node = id => document.getElementById(id);
  function controls() {
    node('display-controls').disabled = busy || !loaded;
    node('save-settings').disabled = busy || !loaded;
    node('restore-defaults').disabled = busy;
  }
  function show(value) {
    node('password-feedback').checked = value.passwordFeedback;
    node('form-warnings').checked = value.formWarnings;
  }
  async function save(value) {
    if (busy) return;
    busy = true; controls(); node('settings-status').textContent = 'Saving settings…';
    try {
      await api.storage.local.set({ [settings.KEY]: value });
      loaded = true; show(value);
      node('settings-status').textContent = 'Settings saved. Open pages will use your choices.';
    } catch {
      node('settings-status').textContent = 'Could not save settings. Your saved choices have not been confirmed. Try again.';
    } finally { busy = false; controls(); }
  }
  document.addEventListener('DOMContentLoaded', async () => {
    node('settings-form').addEventListener('submit', event => {
      event.preventDefault();
      if (!loaded) return;
      void save({ version: 1, passwordFeedback: node('password-feedback').checked,
        formWarnings: node('form-warnings').checked });
    });
    node('restore-defaults').addEventListener('click', () => { void save(settings.defaults); });
    busy = true; controls();
    const value = await settings.read(api);
    loaded = value !== null;
    if (loaded) show(value);
    node('settings-status').textContent = loaded ? 'Settings loaded.'
      : 'Settings could not be loaded. Reopen this page to retry, or restore defaults to replace the saved display settings.';
    busy = false; controls();
  });
})();
