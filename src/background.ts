chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason !== "update") return;
  void chrome.storage.local.set({
    "lux:changelog-pending": chrome.runtime.getManifest().version,
  });
});
