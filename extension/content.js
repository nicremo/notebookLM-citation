// NotebookLM Citation Source Mapper Content Script (v3)

(function () {
  let isMapping = false;
  let currentMappings = [];


  async function expandAllCitationEllipses() {
    const ellipses = Array.from(document.querySelectorAll('span[aria-label]')).filter(
      span => span.textContent.trim() === '...'
    );
    ellipses.forEach(span => span.click());
    if (ellipses.length) {
      await new Promise(res => setTimeout(res, 200));
    }
  }

  async function mapCitations() {
    if (isMapping) return;
    isMapping = true;
    try {
      await expandAllCitationEllipses();
      const spans = Array.from(document.querySelectorAll('span[aria-label]'));
      const uniqueCitations = {};
      spans.forEach(span => {
        const label = span.getAttribute('aria-label');
        const match = label && label.match(/^(\d+):\s*(.+)$/);
        if (match) {
          uniqueCitations[match[1]] = match[2];
        }
      });
      const sortedCitationNumbers = Object.keys(uniqueCitations)
        .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
      currentMappings = sortedCitationNumbers.map(n => ({
        citation: n,
        filename: uniqueCitations[n],
      }));
    } finally {
      isMapping = false;
    }
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
        if (!isMapping) {
          mapCitations();
        }
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
      const span = button.querySelector('span');
      if (span) {
        const citationNum = span.textContent.trim();
        if (/^\d+$/.test(citationNum)) {
          // Replace the button with [N] text
          const textNode = document.createTextNode(`[${citationNum}]`);
          button.replaceWith(textNode);
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
      const chatText = extractChatText();
      sendResponse({ chatText: chatText });
      return true;
    }
  });

  setTimeout(() => {
    mapCitations();
  }, 2000);
  observeCitations();
})();
