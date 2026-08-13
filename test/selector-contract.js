// Selector contract test for the Gemini Notebook DOM.
//
// This extension reads a third-party DOM that Google changes without notice.
// Paste this whole file into the DevTools console while a Gemini Notebook
// chat answer is open, then read the PASS/FAIL table.
//
// A failing check tells you exactly which assumption Google broke, so the fix
// does not require re-deriving the whole extraction pipeline from scratch.
//
// NOTE: this clicks every collapsed-citation button on the page to verify the
// expansion path. That only changes what is visible on screen, nothing is sent
// or saved.

(async () => {
  const results = [];
  const check = (name, condition, detail) => {
    results.push({ check: name, status: condition ? 'PASS' : 'FAIL', detail });
  };

  // --- C1: the extension is allowed to run on this host at all -------------
  const SUPPORTED_HOSTS = ['notebook.google.com', 'notebooklm.google.com'];
  check(
    'C1 host is supported',
    SUPPORTED_HOSTS.includes(location.hostname),
    `location.hostname = ${location.hostname}`
  );

  // --- C2: citation number to source filename mapping ----------------------
  const readCitations = () => {
    const unique = {};
    document.querySelectorAll('span[aria-label]').forEach(span => {
      const match = (span.getAttribute('aria-label') || '').match(/^(\d+):\s*(.+)$/);
      if (match) unique[match[1]] = match[2];
    });
    return unique;
  };

  const before = readCitations();
  const beforeCount = Object.keys(before).length;
  check(
    'C2 aria-label citation pattern matches',
    beforeCount > 0,
    `${beforeCount} citations found before expanding`
  );

  // --- C3: the collapsed-citation affordance is findable -------------------
  // Google renders this as a Material Symbols ligature button, NOT as a
  // span[aria-label] whose text is "...". Keep the older shapes as fallbacks
  // in case Google reverts or localises the label.
  const isEllipsisButton = el => {
    const text = el.textContent.trim();
    return text === 'more_horiz' || text === '...' || text === '…';
  };
  const ellipsisButtons = Array.from(
    document.querySelectorAll('button.citation-marker')
  ).filter(isEllipsisButton);

  check(
    'C3 collapsed-citation buttons are findable',
    ellipsisButtons.length > 0,
    `${ellipsisButtons.length} collapsed-citation buttons found ` +
      '(0 is only OK if this answer has no collapsed citations)'
  );

  // --- C4: expanding them actually reveals hidden citations ----------------
  ellipsisButtons.forEach(button => button.click());
  await new Promise(resolve => setTimeout(resolve, 600));

  const after = readCitations();
  const numbers = Object.keys(after).map(Number).sort((a, b) => a - b);
  const hasGaps = numbers.some((n, i) => i > 0 && n !== numbers[i - 1] + 1);

  check(
    'C4 citation numbering is gapless after expanding',
    numbers.length > 0 && !hasGaps,
    `${beforeCount} before -> ${numbers.length} after, ` +
      `range ${numbers[0]}..${numbers[numbers.length - 1]}, gaps: ${hasGaps}`
  );

  // --- C5: chat text container is findable ---------------------------------
  const containers = document.querySelectorAll(
    '[class*="response"], [class*="message"], [class*="chat"]'
  );
  const main = Array.from(containers).reduce(
    (largest, c) =>
      c.textContent.trim().length > (largest ? largest.textContent.trim().length : 0)
        ? c
        : largest,
    null
  );
  check(
    'C5 chat container is findable',
    !!main && main.textContent.trim().length > 0,
    main ? `container class = ${String(main.className).slice(0, 60)}` : 'no container'
  );

  // --- C6: extraction must not emit any paragraph twice --------------------
  // The paragraph selectors overlap hierarchically: div.message-text-content
  // matches div[class*="text"] AND contains every .paragraph inside it, so a
  // naive collection emits the container's full text plus each child's slice.
  // Keeping only the innermost matches is what prevents that. This check
  // verifies the strategy still works, not that the DOM happens to be flat.
  const candidates = main
    ? Array.from(main.querySelectorAll('.paragraph, div[class*="text"], p'))
    : [];
  const innermost = candidates.filter(
    node => !candidates.some(other => other !== node && node.contains(other))
  );
  const paragraphTexts = innermost
    .map(node => node.textContent.trim())
    .filter(text => text.length > 40);
  const duplicateCount = paragraphTexts.length - new Set(paragraphTexts).size;

  check(
    'C6 innermost-match filter removes duplicate paragraphs',
    candidates.length > 0 && duplicateCount === 0,
    `${candidates.length} candidates -> ${innermost.length} innermost, ` +
      `${duplicateCount} duplicate paragraphs`
  );

  // --- C7: no ligature text leaks into extracted output --------------------
  // Citation markers without a numeric <span> are the "more_horiz" ligature
  // buttons. Extraction has to remove them; replacing only the numeric ones
  // leaves the raw ligature text in the copied output. Replaying that step on
  // a throwaway clone proves the strategy still holds.
  const nonNumericMarkers = Array.from(
    document.querySelectorAll('button.citation-marker')
  ).filter(button => {
    const span = button.querySelector('span');
    return !span || !/^\d+$/.test(span.textContent.trim());
  });

  let ligatureLeaks = -1;
  if (main) {
    const probe = main.cloneNode(true);
    probe.querySelectorAll('button.citation-marker, .citation-marker').forEach(button => {
      const span = button.querySelector('span');
      const citationNum = span ? span.textContent.trim() : '';
      if (/^\d+$/.test(citationNum)) {
        button.replaceWith(document.createTextNode(`[${citationNum}]`));
      } else {
        button.remove();
      }
    });
    ligatureLeaks = (probe.textContent.match(/more_horiz/g) || []).length;
  }

  check(
    'C7 extraction leaves no ligature text behind',
    ligatureLeaks === 0,
    `${nonNumericMarkers.length} markers without a numeric span, ` +
      `${ligatureLeaks} "more_horiz" occurrences survived marker replacement`
  );

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.table(results);
  console.log(`${passed} passed, ${failed} failed`);
  return { passed, failed, results };
})();
