// NotebookLM Citation Legend Service Worker
chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === 'install') {
        // Set default settings on first install
        chrome.storage.local.set({
            enabled: true,
            customNames: {},
            version: '1.0'
        });
        
        // Open welcome tab
        chrome.tabs.create({
            url: 'https://notebooklm.google.com',
            active: true
        });
    } else if (details.reason === 'update') {
        // Handle updates if needed
        console.log('NotebookLM Citation Legend updated to version', chrome.runtime.getManifest().version);
    }
});

// Handle extension icon click
chrome.action.onClicked.addListener(function(tab) {
    // This will open the popup - no additional action needed
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'saveSettings') {
        chrome.storage.local.set(request.settings, function() {
            sendResponse({ success: true });
        });
        return true; // Keep message channel open for async response
    }
    
    if (request.action === 'getSettings') {
        chrome.storage.local.get(null, function(result) {
            sendResponse(result);
        });
        return true; // Keep message channel open for async response
    }
});

// Monitor tab updates to inject content script into new NotebookLM pages
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && 
        tab.url && 
        tab.url.includes('notebooklm.google.com')) {
        
        // Ensure content script is injected
        try {
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            });
        } catch (error) {
            console.log('Content script already injected or error:', error);
        }
    }
});

// Handle storage changes
chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'local') {
        // Broadcast changes to all NotebookLM tabs
        chrome.tabs.query({ url: 'https://notebooklm.google.com/*' }, function(tabs) {
            tabs.forEach(function(tab) {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'storageChanged',
                    changes: changes
                }).catch(error => {
                    // Ignore errors from tabs that don't have the content script
                });
            });
        });
    }
});

// Context menu for quick actions (optional)
chrome.contextMenus.create({
    id: 'export-citations',
    title: 'Zitatlegende exportieren',
    contexts: ['selection', 'page'],
    documentUrlPatterns: ['https://notebooklm.google.com/*']
});

chrome.contextMenus.onClicked.addListener(function(info, tab) {
    if (info.menuItemId === 'export-citations') {
        chrome.tabs.sendMessage(tab.id, {
            action: 'exportCitations'
        });
    }
});

// Cleanup old data periodically
setInterval(function() {
    chrome.storage.local.get(null, function(data) {
        // Clean up old citation data that's more than 7 days old
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        Object.keys(data).forEach(key => {
            if (key.startsWith('citations_') && data[key].timestamp < weekAgo) {
                chrome.storage.local.remove(key);
            }
        });
    });
}, 24 * 60 * 60 * 1000); // Run once per day