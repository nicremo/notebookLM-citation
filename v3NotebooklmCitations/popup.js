// popup.js - Popup script for NotebookLM Citation Mapper

document.addEventListener('DOMContentLoaded', function() {
  const statusText = document.getElementById('status-text');
  const mappingsContainer = document.getElementById('mappings-container');
  const copyBtn = document.getElementById('copy-btn');
  const rescanBtn = document.getElementById('rescan-btn');
  const errorMessage = document.getElementById('error-message');

  let currentMappings = [];

  // Check if we're on NotebookLM
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];

    if (!currentTab.url.includes('notebooklm.google.com')) {
      statusText.textContent = 'Please open Google NotebookLM';
      statusText.style.color = '#d93025';
      mappingsContainer.innerHTML = '<div class="loading">This extension only works on notebooklm.google.com</div>';
      copyBtn.disabled = true;
      rescanBtn.disabled = true;
      return;
    }

    // Request mappings from content script
    loadMappings();
  });

  // Load mappings from content script
  function loadMappings() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'getMappings'}, function(response) {
        if (chrome.runtime.lastError) {
          statusText.textContent = 'Error connecting to page';
          statusText.style.color = '#d93025';
          mappingsContainer.innerHTML = '<div class="loading">Could not connect to NotebookLM. Please refresh the page.</div>';
          return;
        }

        if (response && response.mappings) {
          currentMappings = response.mappings;
          displayMappings(response.mappings);
        }
      });
    });
  }

  // Display mappings in the popup
  function displayMappings(mappings) {
    if (mappings.length === 0) {
      statusText.textContent = 'No citations found';
      statusText.style.color = '#ea8600';
      mappingsContainer.innerHTML = '<div class="loading">No citations detected on the page yet.</div>';
      copyBtn.disabled = true;
      return;
    }

    statusText.textContent = `Found ${mappings.length} citation${mappings.length > 1 ? 's' : ''}`;
    statusText.style.color = '#188038';

    // Sort mappings by citation number
    mappings.sort((a, b) => parseInt(a.citation) - parseInt(b.citation));

    // Build HTML
    let html = '';
    mappings.forEach(mapping => {
      html += `
        <div class="mapping-item">
          <span class="citation-num">Citation ${mapping.citation}</span> → 
          ${mapping.filename}
        </div>
      `;
    });

    mappingsContainer.innerHTML = html;
    copyBtn.disabled = false;
  }

  // Copy mappings to clipboard
  copyBtn.addEventListener('click', function() {
    if (currentMappings.length === 0) return;

    let text = 'NotebookLM Citation Mappings\n';
    text += '===========================\n\n';

    currentMappings.forEach(mapping => {
      text += `Citation ${mapping.citation} → ${mapping.filename}\n`;
    });

    // Use Chrome API to copy to clipboard
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);

    // Show feedback
    const originalText = copyBtn.textContent;
    copyBtn.textContent = 'Copied!';
    copyBtn.style.background = '#188038';

    setTimeout(() => {
      copyBtn.textContent = originalText;
      copyBtn.style.background = '#4285f4';
    }, 2000);
  });

  // Rescan the page
  rescanBtn.addEventListener('click', function() {
    rescanBtn.disabled = true;
    rescanBtn.textContent = 'Rescanning...';

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'rescan'}, function(response) {
        if (chrome.runtime.lastError) {
          showError('Failed to rescan. Please refresh the page.');
          rescanBtn.disabled = false;
          rescanBtn.textContent = 'Rescan Page';
          return;
        }

        // Reload mappings after rescan
        setTimeout(() => {
          loadMappings();
          rescanBtn.disabled = false;
          rescanBtn.textContent = 'Rescan Page';
        }, 500);
      });
    });
  });

  // Show error message
  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';

    setTimeout(() => {
      errorMessage.style.display = 'none';
    }, 5000);
  }
});
