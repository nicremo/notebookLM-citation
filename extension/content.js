// NotebookLM Citation Source Mapper Content Script (v3)

(function () {
  let isMapping = false;
  let currentMappings = [];


  // Google renders the "show remaining citations" affordance as a Material
  // Symbols ligature button (<button class="citation-marker">more_horiz</button>),
  // not as a span[aria-label] whose text is "...". The older shapes are kept as
  // fallbacks in case Google reverts or localises this.
  function isEllipsisButton(el) {
    const text = el.textContent.trim();
    return text === 'more_horiz' || text === '...' || text === '…';
  }

  // Clicking a button mutates the DOM, which wakes the MutationObserver below,
  // which calls mapCitations() again. That settles on its own as long as an
  // expanded group stays expanded. If Angular ever re-collapses a group, the
  // two would keep triggering each other, so never click the same node twice.
  // A WeakSet lets discarded nodes be collected, and a genuinely new group
  // arrives as a new node, so it still gets expanded.
  const clickedEllipses = new WeakSet();

  async function expandAllCitationEllipses() {
    let clicked = 0;

    // Expanding one group can reveal another collapsed group, so repeat until
    // nothing is left. The cap keeps a Google-side change from spinning forever.
    for (let round = 0; round < 3; round++) {
      const buttons = Array.from(
        document.querySelectorAll('button.citation-marker')
      ).filter(button => isEllipsisButton(button) && !clickedEllipses.has(button));

      if (!buttons.length) break;

      buttons.forEach(button => {
        clickedEllipses.add(button);
        button.click();
      });
      clicked += buttons.length;
      await new Promise(res => setTimeout(res, 400));
    }

    return clicked;
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

    // Replace numeric citation buttons with [N], and delete the rest.
    // Based on debug: <button class="xap-inline-dialog citation-marker"><span>1</span></button>
    //
    // The "more_horiz" ligature buttons have no numeric <span>, so without the
    // else branch their raw ligature text leaks into the copied output. The
    // generic button filter above does not catch them because they carry the
    // .citation-marker class themselves.
    const citationButtons = clone.querySelectorAll('button.citation-marker, .citation-marker');
    citationButtons.forEach(button => {
      const span = button.querySelector('span');
      const citationNum = span ? span.textContent.trim() : '';

      if (/^\d+$/.test(citationNum)) {
        button.replaceWith(document.createTextNode(`[${citationNum}]`));
      } else {
        button.remove();
      }
    });

    // Extract text from paragraphs, keeping only the innermost matches.
    // Based on debug: <div class="paragraph normal ng-star-inserted">
    //
    // The selectors overlap hierarchically: div.message-text-content matches
    // div[class*="text"] AND contains every .paragraph inside it. Without this
    // filter the container emits the full answer once and each child emits its
    // own slice again, so every paragraph lands in the output twice.
    const candidates = Array.from(
      clone.querySelectorAll('.paragraph, div[class*="text"], p')
    );
    const paragraphs = candidates.filter(
      node => !candidates.some(other => other !== node && node.contains(other))
    );

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
