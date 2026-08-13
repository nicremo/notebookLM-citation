// popup.js - Popup script for NotebookLM Citation Mapper

document.addEventListener('DOMContentLoaded', function() {
  const statusText = document.getElementById('status-text');
  const mappingsContainer = document.getElementById('mappings-container');
  const copyBtn = document.getElementById('copy-btn');
  const copyChatBtn = document.getElementById('copy-chat-btn');
  const copyRichBtn = document.getElementById('copy-rich-btn');
  const exportPdfBtn = document.getElementById('export-pdf-btn');
  const rescanBtn = document.getElementById('rescan-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const errorMessage = document.getElementById('error-message');

  let currentMappings = [];

  // Storage helper functions
  function saveToHistory(text, mappings, type) {
    chrome.storage.local.get(['citationHistory'], (result) => {
      const history = result.citationHistory || [];

      // Create preview (first 100 characters)
      const preview = text.substring(0, 100).replace(/\n/g, ' ');

      const historyItem = {
        timestamp: new Date().toISOString(),
        preview: preview,
        count: mappings.length,
        type: type, // 'chat' or 'mappings'
        fullText: text,
        mappings: mappings
      };

      // Add to beginning of array
      history.unshift(historyItem);

      // Keep only last 100 entries
      const trimmedHistory = history.slice(0, 100);

      chrome.storage.local.set({ citationHistory: trimmedHistory });
    });
  }

  function updateStatistics(mappings) {
    chrome.storage.local.get(['statistics'], (result) => {
      const stats = result.statistics || {
        totalCitations: 0,
        totalCopies: 0,
        uniqueDocs: 0,
        sessions: 0,
        topSources: []
      };

      // Update counts
      stats.totalCitations += mappings.length;
      stats.totalCopies += 1;

      // Track unique documents
      const docSet = new Set();
      mappings.forEach(m => docSet.add(m.filename));

      // Update top sources
      const sourceCount = {};
      mappings.forEach(m => {
        sourceCount[m.filename] = (sourceCount[m.filename] || 0) + 1;
      });

      // Merge with existing top sources
      const existingTopSources = stats.topSources || [];
      existingTopSources.forEach(source => {
        sourceCount[source.filename] = (sourceCount[source.filename] || 0) + source.count;
      });

      // Convert to array and sort
      stats.topSources = Object.entries(sourceCount).map(([filename, count]) => ({
        filename,
        count
      })).sort((a, b) => b.count - a.count);

      // Update unique docs (all time)
      const allDocs = new Set(stats.topSources.map(s => s.filename));
      stats.uniqueDocs = allDocs.size;

      chrome.storage.local.set({ statistics: stats });
    });
  }

  function incrementSessionCount() {
    chrome.storage.local.get(['statistics'], (result) => {
      const stats = result.statistics || {
        totalCitations: 0,
        totalCopies: 0,
        uniqueDocs: 0,
        sessions: 0,
        topSources: []
      };

      stats.sessions += 1;
      chrome.storage.local.set({ statistics: stats });
    });
  }

  // Increment session count on popup open
  incrementSessionCount();

  // Load and apply theme
  function applyTheme(theme) {
    if (theme === 'auto') {
      // Use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.body.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else if (theme === 'dark') {
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.body.removeAttribute('data-theme');
    }
  }

  // Load theme from storage
  chrome.storage.sync.get(['settings'], (result) => {
    const settings = result.settings || { theme: 'light' };
    applyTheme(settings.theme);
  });

  // Listen for theme changes from settings page
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.settings) {
      const newSettings = changes.settings.newValue;
      if (newSettings && newSettings.theme) {
        applyTheme(newSettings.theme);
      }
    }
  });

  // Listen for system theme changes (for auto mode)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    chrome.storage.sync.get(['settings'], (result) => {
      const settings = result.settings || { theme: 'light' };
      if (settings.theme === 'auto') {
        document.body.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      }
    });
  });

  // Check if we're on NotebookLM
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (!tabs || tabs.length === 0) {
      statusText.textContent = 'No active tab found';
      statusText.style.color = '#d93025';
      return;
    }

    const currentTab = tabs[0];

    // Secure URL validation, shared with background.js via constants.js
    const isNotebookLM = isNotebookUrl(currentTab.url);

    if (!isNotebookLM) {
      statusText.textContent = 'Please open Gemini Notebook';
      statusText.style.color = '#d93025';
      mappingsContainer.innerHTML = '<div class="loading">This extension only works on notebook.google.com</div>';
      copyBtn.disabled = true;
      copyChatBtn.disabled = true;
      copyRichBtn.disabled = true;
      exportPdfBtn.disabled = true;
      rescanBtn.disabled = true;
      return;
    }

    // Request mappings from content script
    loadMappings();
  });

  // Load mappings from content script
  function loadMappings() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs || tabs.length === 0) return;
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
      copyRichBtn.disabled = true;
      exportPdfBtn.disabled = true;
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
    copyChatBtn.disabled = false;
    copyRichBtn.disabled = false;
    exportPdfBtn.disabled = false;
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

    // Save to history and update statistics
    saveToHistory(text, currentMappings, 'mappings');
    updateStatistics(currentMappings);

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
      if (!tabs || tabs.length === 0) {
        showError('No active tab found.');
        rescanBtn.disabled = false;
        rescanBtn.textContent = 'Rescan Page';
        return;
      }
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

  // Copy chat text with citations
  copyChatBtn.addEventListener('click', function() {
    if (currentMappings.length === 0) {
      showError('No citations found. Please rescan.');
      return;
    }

    copyChatBtn.disabled = true;
    copyChatBtn.textContent = 'Extracting text...';

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs || tabs.length === 0) {
        showError('No active tab found.');
        copyChatBtn.disabled = false;
        copyChatBtn.textContent = '📄 Copy Text with Sources';
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, {action: 'getChatText'}, function(response) {
        if (chrome.runtime.lastError || !response) {
          showError('Error extracting chat text.');
          copyChatBtn.disabled = false;
          copyChatBtn.textContent = '📄 Copy Text with Sources';
          return;
        }

        if (!response.chatText) {
          showError('No chat text found.');
          copyChatBtn.disabled = false;
          copyChatBtn.textContent = '📄 Copy Text with Sources';
          return;
        }

        // Build the full text with citations at the end
        let fullText = response.chatText;
        fullText += '\n\n─────────────────────\n';
        fullText += 'Sources:\n';

        // Add citation mappings
        currentMappings.forEach(mapping => {
          fullText += `[${mapping.citation}] → ${mapping.filename}\n`;
        });

        // Copy to clipboard
        const textArea = document.createElement('textarea');
        textArea.value = fullText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);

        // Save to history and update statistics
        saveToHistory(fullText, currentMappings, 'chat');
        updateStatistics(currentMappings);

        // Show feedback
        copyChatBtn.textContent = '✓ Copied!';
        copyChatBtn.style.background = '#188038';

        setTimeout(() => {
          copyChatBtn.textContent = '📄 Copy Text with Sources';
          copyChatBtn.style.background = '#34a853';
          copyChatBtn.disabled = false;
        }, 2000);
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

  // Open settings page
  settingsBtn.addEventListener('click', function() {
    chrome.tabs.create({ url: 'settings.html' });
  });

  // Generate Rich HTML from text and mappings
  function generateRichHTML(text, mappings) {
    // Escape HTML entities
    let htmlText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Replace citation markers [N] with bold styled versions
    htmlText = htmlText.replace(/\[(\d+)\]/g, '<strong style="color: #4285f4;">[$1]</strong>');

    // Replace newlines with <br> for proper line breaks
    htmlText = htmlText.replace(/\n/g, '<br>');

    // Build sources HTML
    let sourcesHTML = '<hr style="border: none; border-top: 1px solid #ccc; margin: 16px 0;">';
    sourcesHTML += '<p style="font-weight: bold; margin-bottom: 8px;">Sources:</p>';
    sourcesHTML += '<ul style="margin: 0; padding-left: 20px;">';

    mappings.forEach(mapping => {
      sourcesHTML += `<li><strong style="color: #4285f4;">[${mapping.citation}]</strong> ${mapping.filename}</li>`;
    });

    sourcesHTML += '</ul>';

    return `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6;">${htmlText}${sourcesHTML}</div>`;
  }

  // Copy Rich Text (HTML) to clipboard
  copyRichBtn.addEventListener('click', function() {
    if (currentMappings.length === 0) {
      showError('No citations found. Please rescan.');
      return;
    }

    copyRichBtn.disabled = true;
    copyRichBtn.textContent = 'Extracting text...';

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs || tabs.length === 0) {
        showError('No active tab found.');
        copyRichBtn.disabled = false;
        copyRichBtn.textContent = '📝 Copy Rich Text';
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, {action: 'getChatText'}, async function(response) {
        if (chrome.runtime.lastError || !response) {
          showError('Error extracting chat text.');
          copyRichBtn.disabled = false;
          copyRichBtn.textContent = '📝 Copy Rich Text';
          return;
        }

        if (!response.chatText) {
          showError('No chat text found.');
          copyRichBtn.disabled = false;
          copyRichBtn.textContent = '📝 Copy Rich Text';
          return;
        }

        // Build plain text version
        let plainText = response.chatText;
        plainText += '\n\n─────────────────────\n';
        plainText += 'Sources:\n';
        currentMappings.forEach(mapping => {
          plainText += `[${mapping.citation}] → ${mapping.filename}\n`;
        });

        // Generate rich HTML
        const richHTML = generateRichHTML(response.chatText, currentMappings);

        try {
          // Use Clipboard API to copy both HTML and plain text
          await navigator.clipboard.write([
            new ClipboardItem({
              'text/html': new Blob([richHTML], {type: 'text/html'}),
              'text/plain': new Blob([plainText], {type: 'text/plain'})
            })
          ]);

          // Save to history and update statistics
          saveToHistory(plainText, currentMappings, 'rich');
          updateStatistics(currentMappings);

          // Show feedback
          copyRichBtn.textContent = '✓ Copied!';
          copyRichBtn.style.background = '#188038';

          setTimeout(() => {
            copyRichBtn.textContent = '📝 Copy Rich Text';
            copyRichBtn.style.background = '#4285f4';
            copyRichBtn.disabled = false;
          }, 2000);

        } catch (err) {
          showError('Failed to copy rich text. Try plain copy instead.');
          copyRichBtn.disabled = false;
          copyRichBtn.textContent = '📝 Copy Rich Text';
        }
      });
    });
  });

  // Export PDF
  exportPdfBtn.addEventListener('click', function() {
    if (currentMappings.length === 0) {
      showError('No citations found. Please rescan.');
      return;
    }

    exportPdfBtn.disabled = true;
    exportPdfBtn.textContent = 'Generating PDF...';

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs || tabs.length === 0) {
        showError('No active tab found.');
        exportPdfBtn.disabled = false;
        exportPdfBtn.textContent = '📑 Export PDF';
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, {action: 'getChatText'}, function(response) {
        if (chrome.runtime.lastError || !response) {
          showError('Error extracting chat text.');
          exportPdfBtn.disabled = false;
          exportPdfBtn.textContent = '📑 Export PDF';
          return;
        }

        if (!response.chatText) {
          showError('No chat text found.');
          exportPdfBtn.disabled = false;
          exportPdfBtn.textContent = '📑 Export PDF';
          return;
        }

        try {
          // Check if jsPDF is loaded
          if (!window.jspdf || !window.jspdf.jsPDF) {
            showError('PDF library failed to load. Please try again.');
            exportPdfBtn.disabled = false;
            exportPdfBtn.textContent = '📑 Export PDF';
            return;
          }

          // Create PDF using jsPDF
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF();

          // Title
          doc.setFontSize(18);
          doc.setFont(undefined, 'bold');
          doc.text('NotebookLM Export', 20, 20);

          // Date
          doc.setFontSize(10);
          doc.setFont(undefined, 'normal');
          doc.setTextColor(100);
          doc.text(new Date().toLocaleString(), 20, 28);

          // Reset text color
          doc.setTextColor(0);

          // Main content
          doc.setFontSize(11);
          const pageWidth = doc.internal.pageSize.getWidth();
          const margin = 20;
          const maxWidth = pageWidth - (margin * 2);

          // Split text to fit page width
          const lines = doc.splitTextToSize(response.chatText, maxWidth);

          let yPosition = 40;
          const lineHeight = 6;
          const pageHeight = doc.internal.pageSize.getHeight();

          lines.forEach(line => {
            if (yPosition > pageHeight - 30) {
              doc.addPage();
              yPosition = 20;
            }
            doc.text(line, margin, yPosition);
            yPosition += lineHeight;
          });

          // Add separator
          yPosition += 10;
          if (yPosition > pageHeight - 50) {
            doc.addPage();
            yPosition = 20;
          }

          doc.setDrawColor(200);
          doc.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 10;

          // Sources header
          doc.setFontSize(14);
          doc.setFont(undefined, 'bold');
          doc.text('Sources', margin, yPosition);
          yPosition += 10;

          // Sources list
          doc.setFontSize(10);
          doc.setFont(undefined, 'normal');

          currentMappings.forEach(mapping => {
            if (yPosition > pageHeight - 20) {
              doc.addPage();
              yPosition = 20;
            }
            doc.text(`[${mapping.citation}]  ${mapping.filename}`, margin, yPosition);
            yPosition += 7;
          });

          // Save the PDF
          const timestamp = new Date().toISOString().slice(0, 10);
          doc.save(`notebooklm-export-${timestamp}.pdf`);

          // Save to history and update statistics
          saveToHistory(response.chatText, currentMappings, 'pdf');
          updateStatistics(currentMappings);

          // Show feedback
          exportPdfBtn.textContent = '✓ Downloaded!';
          exportPdfBtn.style.background = '#188038';

          setTimeout(() => {
            exportPdfBtn.textContent = '📑 Export PDF';
            exportPdfBtn.style.background = '#4285f4';
            exportPdfBtn.disabled = false;
          }, 2000);

        } catch (err) {
          console.error('PDF export error:', err);
          showError('Failed to generate PDF. Please try again.');
          exportPdfBtn.disabled = false;
          exportPdfBtn.textContent = '📑 Export PDF';
        }
      });
    });
  });
});
