// NotebookLM Citation Source Mapper Content Script (v3)

(function () {
  let isMapping = false;
  let currentMappings = [];

  function copyText(text) {
    return navigator.clipboard.writeText(text).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    });
  }

  function showLegendOverlay(legendText) {
    let overlay = document.getElementById('notebooklm-citation-legend');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'notebooklm-citation-legend';
      overlay.setAttribute('data-no-observe', 'true');
      overlay.style.position = 'fixed';
      overlay.style.top = '20px';
      overlay.style.right = '20px';
      overlay.style.zIndex = 99999;
      overlay.style.background = '#fff';
      overlay.style.border = '1px solid #888';
      overlay.style.borderRadius = '8px';
      overlay.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
      overlay.style.fontFamily = 'Arial, sans-serif';
      overlay.style.fontSize = '16px';
      overlay.style.color = '#222';
      overlay.style.width = '350px';
      overlay.style.height = '300px';
      overlay.style.minWidth = '200px';
      overlay.style.minHeight = '100px';
      overlay.style.display = 'flex';
      overlay.style.flexDirection = 'column';
      overlay.style.resize = 'both';
      overlay.style.overflow = 'hidden';

      const header = document.createElement('div');
      header.style.cursor = 'move';
      header.style.background = '#f1f1f1';
      header.style.padding = '8px';
      header.style.display = 'flex';
      header.style.alignItems = 'center';
      header.style.justifyContent = 'space-between';
      header.style.borderBottom = '1px solid #ddd';

      const title = document.createElement('span');
      title.textContent = 'Citation Legend';
      header.appendChild(title);

      const minBtn = document.createElement('button');
      minBtn.textContent = '–';
      minBtn.style.border = 'none';
      minBtn.style.background = 'transparent';
      minBtn.style.cursor = 'pointer';
      minBtn.style.fontSize = '16px';
      minBtn.style.lineHeight = '16px';
      header.appendChild(minBtn);
      overlay.appendChild(header);

      const content = document.createElement('div');
      content.style.padding = '8px 16px 16px 16px';
      content.style.flex = '1 1 auto';
      content.style.overflowY = 'auto';

      const copyBtn = document.createElement('button');
      copyBtn.id = 'notebooklm-copy-btn';
      copyBtn.textContent = 'Copy';
      copyBtn.style.marginBottom = '10px';
      copyBtn.style.padding = '6px 12px';
      copyBtn.style.border = '1px solid #888';
      copyBtn.style.borderRadius = '4px';
      copyBtn.style.background = '#f5f5f5';
      copyBtn.style.cursor = 'pointer';
      copyBtn.onclick = () => copyText(legendText);
      content.appendChild(copyBtn);

      const legendPre = document.createElement('pre');
      legendPre.id = 'notebooklm-citation-legend-text';
      legendPre.style.whiteSpace = 'pre-wrap';
      legendPre.textContent = legendText;
      content.appendChild(legendPre);

      overlay.appendChild(content);
      document.body.appendChild(overlay);

      minBtn.onclick = () => {
        const isCollapsed = content.style.display === 'none';
        if (isCollapsed) {
          content.style.display = 'block';
          overlay.style.height = overlay.dataset.prevHeight || '300px';
          overlay.style.minHeight = '100px';
          overlay.style.resize = overlay.dataset.prevResize || 'both';
          minBtn.textContent = '–';
        } else {
          overlay.dataset.prevHeight = overlay.style.height;
          overlay.dataset.prevResize = overlay.style.resize;
          content.style.display = 'none';
          const headerHeight = header.offsetHeight;
          overlay.style.height = headerHeight + 'px';
          overlay.style.minHeight = headerHeight + 'px';
          overlay.style.resize = 'none';
          minBtn.textContent = '+';
        }
      };

      let dragOffsetX = 0;
      let dragOffsetY = 0;
      header.onmousedown = (e) => {
        e.preventDefault();
        dragOffsetX = e.clientX - overlay.offsetLeft;
        dragOffsetY = e.clientY - overlay.offsetTop;
        document.onmousemove = (ev) => {
          ev.preventDefault();
          overlay.style.left = ev.clientX - dragOffsetX + 'px';
          overlay.style.top = ev.clientY - dragOffsetY + 'px';
          overlay.style.right = 'auto';
        };
        document.onmouseup = () => {
          document.onmousemove = null;
          document.onmouseup = null;
        };
      };
    } else {
      const legendPre = overlay.querySelector('#notebooklm-citation-legend-text');
      if (legendPre) legendPre.textContent = legendText;
      const copyBtn = overlay.querySelector('#notebooklm-copy-btn');
      if (copyBtn) copyBtn.onclick = () => copyText(legendText);
    }
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
      const legendLines = currentMappings.map(
        m => `Citation ${m.citation} → ${m.filename}`
      );
      const legendText = legendLines.length
        ? 'Citation Mapping Legend\n=====================\n' + legendLines.join('\n')
        : 'Citation Mapping Legend\n=====================\nNo citations found';
      showLegendOverlay(legendText);
    } finally {
      isMapping = false;
    }
  }

  function observeCitations() {
    const observer = new MutationObserver((mutations) => {
      const shouldRun = mutations.some(m => {
        if (m.target.closest('#notebooklm-citation-legend')) return false;
        return Array.from(m.addedNodes).some(n => n.nodeType === 1 && !n.closest('#notebooklm-citation-legend'));
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
    // Try to find the chat container
    // NotebookLM uses various selectors, we try multiple approaches
    const possibleSelectors = [
      '[role="main"]',
      'main',
      '.chat-container',
      '[class*="chat"]',
      '[class*="response"]'
    ];

    let chatContainer = null;
    for (const selector of possibleSelectors) {
      chatContainer = document.querySelector(selector);
      if (chatContainer && chatContainer.textContent.trim().length > 100) {
        break;
      }
    }

    if (!chatContainer) {
      // Fallback: get the largest text container
      const allDivs = Array.from(document.querySelectorAll('div'));
      chatContainer = allDivs.reduce((largest, div) => {
        const textLength = div.textContent.trim().length;
        const largestLength = largest ? largest.textContent.trim().length : 0;
        return textLength > largestLength ? div : largest;
      }, null);
    }

    if (!chatContainer) {
      return null;
    }

    // Extract text and preserve citation numbers
    let text = '';

    // Clone the container to avoid modifying the page
    const clone = chatContainer.cloneNode(true);

    // Remove script and style elements
    clone.querySelectorAll('script, style, #notebooklm-citation-legend').forEach(el => el.remove());

    // Find all text nodes and citation markers
    function extractTextFromNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        // Check if this is a citation number (small superscript numbers)
        if (node.tagName === 'SUP' ||
            (node.textContent && /^\d+$/.test(node.textContent.trim()) &&
             node.textContent.trim().length <= 2)) {
          const num = node.textContent.trim();
          if (num && /^\d+$/.test(num)) {
            return ` [${num}] `;
          }
        }

        // Recursively process children
        let result = '';
        for (const child of node.childNodes) {
          result += extractTextFromNode(child);
        }

        // Add line breaks for block elements
        if (['DIV', 'P', 'BR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(node.tagName)) {
          result += '\n';
        }

        return result;
      }

      return '';
    }

    text = extractTextFromNode(clone);

    // Clean up the text
    text = text
      .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
      .replace(/[ \t]+/g, ' ') // Multiple spaces to single space
      .trim();

    return text;
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
