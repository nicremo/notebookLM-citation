// background.js - Background service worker for NotebookLM Citation Mapper

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('NotebookLM Citation Mapper installed');

  // Set up context menu (optional)
  chrome.contextMenus.create({
    id: 'notebooklm-citation-mapper',
    title: 'Show Citation Mappings',
    contexts: ['page'],
    documentUrlPatterns: ['https://notebooklm.google.com/*']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'notebooklm-citation-mapper') {
    // Send message to content script to show mappings
    chrome.tabs.sendMessage(tab.id, { action: 'showMappings' });
  }
});

// Listen for tab updates to inject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('notebooklm.google.com')) {
    // Content script should be automatically injected via manifest
    // This is just a fallback if needed
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }).catch(err => {
      // Script might already be injected
      console.log('Script injection skipped:', err.message);
    });
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTabInfo') {
    sendResponse({ tabId: sender.tab.id, url: sender.tab.url });
  }
  return true;
});
