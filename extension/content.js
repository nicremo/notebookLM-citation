// NotebookLM Citation Source Mapper Content Script (v3)

(function () {
  let mappingPromise = null;
  let currentMappings = [];

  function collectCitationLabels(scope) {
    const map = {};
    scope.querySelectorAll('span[aria-label]').forEach(span => {
      const label = span.getAttribute('aria-label');
      const match = label && label.match(/^(\d+):\s*(.+)$/);
      if (match) map[match[1]] = match[2];
    });
    return map;
  }

  async function expandAllCitationEllipses() {
    const ellipses = Array.from(document.querySelectorAll('span[aria-label]')).filter(
      span => span.textContent.trim() === '...'
    );
    ellipses.forEach(span => span.click());
    if (ellipses.length) {
      await new Promise(res => setTimeout(res, 200));
    }
  }

  function mapCitations() {
    // Share a single in-flight promise so concurrent callers (observer + getChatText)
    // all await the same run and see stamped buttons + current mappings together.
    if (mappingPromise) return mappingPromise;
    mappingPromise = (async () => {
      try {
        await expandAllCitationEllipses();

        // Each AI response (.to-user-container) numbers its citations locally starting from 1,
        // so the same local N means different documents across messages. Additionally, within a
        // single response the same document may appear under several local numbers. Collapse both:
        // assign one final global number per unique filename (by first appearance).
        const responseContainers = Array.from(document.querySelectorAll('.to-user-container'));
        const perContainerLocal = [];
        const filenameToFinal = new Map();
        let nextFinal = 1;

        responseContainers.forEach(container => {
          const localMap = collectCitationLabels(container);
          perContainerLocal.push({ container, localMap });
          Object.keys(localMap)
            .sort((a, b) => a - b)
            .forEach(n => {
              const filename = localMap[n];
              if (!filenameToFinal.has(filename)) {
                filenameToFinal.set(filename, nextFinal++);
              }
            });
        });

        // Fallback: no per-response citations surfaced (aria-label legend may be rendered
        // outside .to-user-container, or containers not yet in the DOM). Preserve the pre-refactor
        // local-N semantics so that unstamped buttons in extractChatText render consistent numbers.
        if (filenameToFinal.size === 0) {
          const globalMap = collectCitationLabels(document);
          currentMappings = Object.keys(globalMap)
            .sort((a, b) => a - b)
            .map(n => ({ citation: n, filename: globalMap[n] }));
          return;
        }

        // Stamp every inline citation-marker button with its final global number so
        // extractChatText can read it off the cloned DOM without re-resolving.
        perContainerLocal.forEach(({ container, localMap }) => {
          container.querySelectorAll('button.citation-marker, .citation-marker').forEach(button => {
            const span = button.querySelector('span');
            if (!span) return;
            const localNum = span.textContent.trim();
            if (!/^\d+$/.test(localNum)) return;
            const filename = localMap[localNum];
            if (!filename) return;
            const finalN = filenameToFinal.get(filename);
            if (finalN) button.dataset.globalCitation = String(finalN);
          });
        });

        // Map preserves insertion order of nextFinal++, so entries are already in final-number order.
        currentMappings = Array.from(filenameToFinal.entries())
          .map(([filename, finalN]) => ({ citation: String(finalN), filename }));
      } finally {
        mappingPromise = null;
      }
    })();
    return mappingPromise;
  }

  function observeCitations() {
    const observer = new MutationObserver((mutations) => {
      const shouldRun = mutations.some(m => {
        return Array.from(m.addedNodes).some(n => n.nodeType === 1);
      });
      if (!shouldRun) return;
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

  function extractChatText() {
    // NotebookLM chat structure:
    // - Citations are in: <button class="citation-marker"><span>N</span></button>
    // - Text is in: <div class="paragraph normal ng-star-inserted">
    // - Multiple chat containers exist with [class*="response"] or [class*="message"]

    // Find all potential chat/response containers
    const containers = document.querySelectorAll('[class*="response"], [class*="message"], [class*="chat"]');

    if (!containers.length) {
      console.error('No chat containers found');
      return null;
    }

    // Get the container with the most text content
    let mainContainer = Array.from(containers).reduce((largest, container) => {
      const textLength = container.textContent.trim().length;
      const largestLength = largest ? largest.textContent.trim().length : 0;
      return textLength > largestLength ? container : largest;
    }, null);

    if (!mainContainer) {
      return null;
    }

    // Clone to avoid modifying the actual DOM
    const clone = mainContainer.cloneNode(true);

    // Remove unwanted elements
    clone.querySelectorAll('script, style, button:not(.citation-marker), [class*="input"], [class*="footer"], [class*="toolbar"]').forEach(el => el.remove());

    // Replace citation buttons with [N] format
    // Based on debug: <button class="xap-inline-dialog citation-marker"><span>1</span></button>
    const citationButtons = clone.querySelectorAll('button.citation-marker, .citation-marker');
    citationButtons.forEach(button => {
      const stamped = button.dataset ? button.dataset.globalCitation : null;
      if (stamped) {
        button.replaceWith(document.createTextNode(`[${stamped}]`));
        return;
      }
      const span = button.querySelector('span');
      if (span) {
        const citationNum = span.textContent.trim();
        if (/^\d+$/.test(citationNum)) {
          button.replaceWith(document.createTextNode(`[${citationNum}]`));
        }
      }
    });

    // Extract text from paragraphs
    // Based on debug: <div class="paragraph normal ng-star-inserted">
    const paragraphs = clone.querySelectorAll('.paragraph.normal, .paragraph, div[class*="text"], p');

    let text = '';

    if (paragraphs.length > 0) {
      // Extract text from each paragraph
      paragraphs.forEach(para => {
        const paraText = para.textContent.trim();
        if (paraText && paraText.length > 0) {
          text += paraText + '\n\n';
        }
      });
    } else {
      // Fallback: get all text content
      text = clone.textContent;
    }

    // Clean up the text
    text = text
      .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
      .replace(/[ \t]+/g, ' ') // Multiple spaces to single space
      .replace(/\s+\[/g, ' [') // Clean space before citations
      .replace(/\]\s+/g, '] ') // Clean space after citations
      .trim();

    return text.length > 0 ? text : null;
  }

  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'getMappings') {
      sendResponse({ mappings: currentMappings });
    } else if (request.action === 'rescan' || request.action === 'showMappings') {
      mapCitations().then(() => {
        sendResponse({ mappings: currentMappings });
      });
      return true;
    } else if (request.action === 'getChatText') {
      // Await mapping so citation-marker buttons are stamped with globalCitation before extraction.
      // Otherwise extractChatText falls back to local per-message numbers that would mismatch
      // the Sources section (which uses currentMappings' global numbering).
      mapCitations().then(() => {
        sendResponse({ chatText: extractChatText() });
      });
      return true;
    }
  });

  setTimeout(() => {
    mapCitations();
  }, 2000);
  observeCitations();
})();
