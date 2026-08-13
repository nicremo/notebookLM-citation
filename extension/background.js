// background.js - Background service worker for NotebookLM Citation Mapper
importScripts('constants.js');

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('NotebookLM Citation Mapper installed');

  // Set up context menu (optional).
  // removeAll() first: onInstalled also fires on every update, and creating an
  // id that already exists sets runtime.lastError instead of replacing it.
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'notebooklm-citation-mapper',
      title: 'Show Citation Mappings',
      contexts: ['page'],
      documentUrlPatterns: NOTEBOOK_URL_PATTERNS
    });
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'notebooklm-citation-mapper') {
    // Send message to content script to show mappings
    chrome.tabs.sendMessage(tab.id, { action: 'showMappings' });
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTabInfo') {
    sendResponse({ tabId: sender.tab.id, url: sender.tab.url });
  }
  return true;
});
