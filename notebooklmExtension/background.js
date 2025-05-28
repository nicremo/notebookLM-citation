// background.js
// Service Worker für die Chrome Extension

chrome.runtime.onInstalled.addListener(() => {
  console.log('NotebookLM Extension installiert.');
});
