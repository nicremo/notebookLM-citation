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

  // Google renders the "show remaining citations" affordance as a Material
  // Symbols ligature button (<button class="citation-marker">more_horiz</button>),
  // not as a span[aria-label] whose text is "...". The older shapes are kept as
  // fallbacks in case Google reverts or localises this.
  function isEllipsisButton(el) {
    const text = el.textContent.trim();
    return text === 'more_horiz' || text === '...' || text === '…';
  }

  // Clicking a button mutates the DOM, which wakes the MutationObserver below,
  // which calls mapCitations() again.
  //
  // In practice this settles by itself: Angular rewrites the button's content
  // in the same tick as the click, so isEllipsisButton() stops matching it
  // immediately and the next round finds nothing. The WeakSet is a backstop
  // for the case where that stops being true and a clicked node stays
  // clickable, which would otherwise let the observer and the click loop feed
  // each other indefinitely.
  //
  // The trade-off is deliberate: if Google ever genuinely re-collapses a group
  // the same node will not be expanded a second time, costing those citations.
  // A runaway click loop is immediate and visible to the user, silently losing
  // a few citations is not, so the backstop guards the louder failure.
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

    // Find all potential chat/response containers.
    //
    // Skip anything inside an off-screen accessibility container. Angular
    // Material parks a cdk-describedby-message-container full of tooltip
    // strings in the DOM, and its class contains "message", so it matches the
    // selector below. On a notebook with no chat yet it is the LARGEST match,
    // and the extension would happily copy a wall of tooltip text.
    const containers = Array.from(
      document.querySelectorAll('[class*="response"], [class*="message"], [class*="chat"]')
    ).filter(el =>
      !el.closest('.cdk-visually-hidden') && el.getAttribute('aria-hidden') !== 'true'
    );

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

    // Remove unwanted elements. "banner" covers the product announcement strip
    // Google shows inside the chat panel, which is not part of the answer.
    clone.querySelectorAll('script, style, button:not(.citation-marker), [class*="input"], [class*="footer"], [class*="toolbar"], [class*="banner"]').forEach(el => el.remove());

    // Replace numeric citation buttons with [N], and delete the rest.
    // Based on debug: <button class="xap-inline-dialog citation-marker"><span>1</span></button>
    //
    // The "more_horiz" ligature buttons have no numeric <span>, so without the
    // else branch their raw ligature text leaks into the copied output. The
    // generic button filter above does not catch them because they carry the
    // .citation-marker class themselves.
    const citationButtons = clone.querySelectorAll('button.citation-marker, .citation-marker');
    citationButtons.forEach(button => {
      const stamped = button.dataset ? button.dataset.globalCitation : null;
      if (stamped) {
        button.replaceWith(document.createTextNode(`[${stamped}]`));
        return;
      }
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
    //
    // The list stays deliberately broad. Narrowing it to .paragraph alone
    // looks tempting (it would exclude UI like div.banner-text on its own),
    // but it was measured to drop real content: the notebook summary and the
    // user's own question do not carry that class. Unwanted UI is removed by
    // class above instead, which costs nothing when a match is absent.
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
