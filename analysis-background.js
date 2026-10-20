// Shared record store and read-only popup transport.
var PrivacyMonitorAnalysisStore = PrivacyMonitorAnalysis.createStore();
(() => {
  const api = typeof browser !== 'undefined' ? browser : chrome;
  api.runtime.onMessage.addListener(PrivacyMonitorAnalysis.createMessageHandler({
    store: PrivacyMonitorAnalysisStore,
    extensionId: api.runtime.id,
    popupUrl: api.runtime.getURL('popup.html'),
  }));
  // background.js owns D08 navigation/header events. D09 migrates remaining scans/readers.
})();
