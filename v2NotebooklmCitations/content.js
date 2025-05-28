// NotebookLM Citation Source Mapper Content Script

(function () {
  // Utility: Create or update the legend overlay
  function showLegendOverlay(legendText) {
    let overlay = document.getElementById('notebooklm-citation-legend');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'notebooklm-citation-legend';
      overlay.style.position = 'fixed';
      overlay.style.bottom = '20px';
      overlay.style.right = '20px';
      overlay.style.zIndex = 99999;
      overlay.style.background = 'rgba(255,255,255,0.97)';
      overlay.style.border = '1px solid #888';
      overlay.style.borderRadius = '8px';
      overlay.style.padding = '16px';
      overlay.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
      overlay.style.fontFamily = 'monospace';
      overlay.style.fontSize = '14px';
      overlay.style.maxWidth = '350px';
      overlay.style.maxHeight = '300px';
      overlay.style.overflowY = 'auto';

      // Copy button
      const copyBtn = document.createElement('button');
      copyBtn.textContent = 'Kopieren';
      copyBtn.style.marginTop = '10px';
      copyBtn.onclick = function () {
        navigator.clipboard.writeText(legendText);
      };
      overlay.appendChild(copyBtn);

      // Legend text
      const legendPre = document.createElement('pre');
      legendPre.id = 'notebooklm-citation-legend-text';
      legendPre.style.marginTop = '10px';
      legendPre.textContent = legendText;
      overlay.appendChild(legendPre);

      document.body.appendChild(overlay);
    } else {
      // Update legend text
      const legendPre = overlay.querySelector('#notebooklm-citation-legend-text');
      if (legendPre) legendPre.textContent = legendText;
    }
  }

  // Utility: Try to extract Angular context from a DOM element
  function getAngularContext(el) {
    // Try common Angular context property names
    for (const key of Object.keys(el)) {
      if (key.startsWith('__ngContext__')) {
        return el[key];
      }
    }
    return null;
  }


  // Main: Map citations to sources
  async function mapCitations() {
    // 1. Find all citation buttons
    const buttons = document.querySelectorAll('button.citation-marker');
    const citationMap = [];
    const citationToSource = {};

    // Helper: Wait for element matching selector to appear
    function waitForElement(selector, timeout = 2000) {
      return new Promise((resolve) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        const observer = new MutationObserver(() => {
          const el = document.querySelector(selector);
          if (el) {
            observer.disconnect();
            resolve(el);
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => {
          observer.disconnect();
          resolve(null);
        }, timeout);
      });
    }

    // Helper: Close the source panel if possible
    function closeSourcePanel() {
      // Try to find a close button in the panel
      const closeBtn = document.querySelector('button[aria-label="Schließen"], button[aria-label="Close"]');
      if (closeBtn) closeBtn.click();
    }

    // Schritt für Schritt: Für jede eindeutige Zitatnummer nur den ersten Button klicken und Überschrift extrahieren
    const seenCitations = new Set();
    for (let idx = 0; idx < buttons.length; idx++) {
      const btn = buttons[idx];
      const span = btn.querySelector('span');
      const citationNumber = span ? span.textContent.trim() : '??';

      if (seenCitations.has(citationNumber)) continue;
      seenCitations.add(citationNumber);

      // Panel öffnen und Überschrift extrahieren
      btn.click();
      let filename = '[Quelle unbekannt]';
      let panelSelector = 'div[role="dialog"], div[role="presentation"], div[aria-label*="Quelle"], div[aria-label*="Source"]';
      const panel = await waitForElement(panelSelector, 1500);
      if (panel) {
        const sourceDiv = panel.querySelector('div.source-title');
        if (sourceDiv && sourceDiv.textContent.trim().length > 0) {
          filename = sourceDiv.textContent.trim();
        } else {
          // Fallback: previous heuristics
          let sourceTitle = null;
          const firstBtn = panel.querySelector('button');
          if (firstBtn && firstBtn.textContent.trim().length > 0) {
            sourceTitle = firstBtn.textContent.trim();
          }
          if (!sourceTitle) {
            const firstDiv = Array.from(panel.querySelectorAll('div,span')).find(
              el => el.textContent && el.textContent.trim().length > 0
            );
            if (firstDiv) sourceTitle = firstDiv.textContent.trim();
          }
          if (!sourceTitle && panel.firstChild && panel.firstChild.textContent) {
            sourceTitle = panel.firstChild.textContent.trim();
          }
          if (sourceTitle) {
            filename = sourceTitle;
          }
        }
      }
      closeSourcePanel();
      await new Promise(res => setTimeout(res, 300));

      citationMap.push({
        citationNumber,
        sourceInfo: filename,
      });
    }

    // Build legend text: Nur eindeutige Zitatnummern, sortiert
    const uniqueCitations = {};
    for (const entry of citationMap) {
      uniqueCitations[entry.citationNumber] = entry.sourceInfo;
    }
    const sortedCitationNumbers = Object.keys(uniqueCitations)
      .filter(n => n !== '...')
      .sort((a, b) => {
        // Versuche numerisch zu sortieren, sonst lexikografisch
        const na = parseInt(a, 10), nb = parseInt(b, 10);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return a.localeCompare(b);
      });
    // "..."-Zitate ans Ende
    if (Object.keys(uniqueCitations).includes('...')) {
      sortedCitationNumbers.push('...');
    }
    const legendLines = sortedCitationNumbers.map(
      n => `Zitat ${n} → ${uniqueCitations[n]}`
    );
    const legendText = legendLines.join('\n');

    // Show legend overlay
    showLegendOverlay(legendText);
  }

  // Observe DOM for dynamic content
  function observeCitations() {
    const observer = new MutationObserver((mutations) => {
      // Debounce to avoid excessive updates
      if (window.__notebooklmCitationLegendTimeout) {
        clearTimeout(window.__notebooklmCitationLegendTimeout);
      }
      window.__notebooklmCitationLegendTimeout = setTimeout(() => {
        mapCitations();
      }, 500);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // Initial run
  setTimeout(() => {
    mapCitations();
  }, 2000); // Wait for initial content
  observeCitations();
})();
