// D07 installs a separate record store without changing legacy producers/readers.
var PrivacyMonitorAnalysisStore = PrivacyMonitorAnalysis.createStore();
(() => {
  const api = typeof browser !== 'undefined' ? browser : chrome;
  api.runtime.onMessage.addListener(PrivacyMonitorAnalysis.createMessageHandler({
    store: PrivacyMonitorAnalysisStore,
    extensionId: api.runtime.id,
    popupUrl: api.runtime.getURL('popup.html'),
  }));
  // D08 wires navigation and tab-close events. D09 migrates scans and the popup reader.
})();
