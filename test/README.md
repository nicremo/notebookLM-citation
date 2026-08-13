# Selector Contract Test

This extension depends on Google's DOM, which changes without warning. When a user
reports "it stopped working", run this first. It tells you which assumption broke.

## How to run

1. Open a notebook on https://notebook.google.com with a chat answer that has citations.
   Pick an answer where some citations are collapsed behind a `...` symbol.
2. Open DevTools (Cmd+Option+I on macOS) and switch to the Console tab.
3. Paste the entire contents of `selector-contract.js` and press Enter.
4. Read the PASS/FAIL table.

## What the checks mean

| Check | Meaning if it fails |
|---|---|
| C1 | Google moved the product to another domain. Update `extension/constants.js`. |
| C2 | The citation number to filename mapping broke. This is the core feature. |
| C3 | The collapsed-citation button changed shape. Citations will silently go missing. |
| C4 | Expanding does not reveal hidden citations. Users get an incomplete list. |
| C5 | The chat container moved. Copy-with-citations returns nothing. |
| C6 | The innermost-match filter no longer deduplicates. Copied text contains paragraphs twice. |
| C7 | Informational. Reports markers without a numeric span, which must be removed during extraction. |

These checks describe what the DOM offers, not what `extension/content.js` currently does
with it. All of them passing means the extraction strategy is still viable. It does not by
itself mean the shipped code implements that strategy, so pair a green run with the popup
checks below.

## Acceptance checks in the popup

1. The citation list runs from 1 to the highest number with no gaps.
2. "Copy Chat with Citations" output contains no occurrence of `more_horiz`.
3. Any given sentence from the answer appears exactly once in that output.

## Where the hostname lives

`extension/constants.js` is the single source of truth for the supported hosts, but
`extension/manifest.json` cannot execute JavaScript, so `host_permissions` and
`content_scripts.matches` repeat the same patterns literally. A domain change means
editing both files.

## Known state

Last verified on 2026-08-13 against notebook.google.com: all checks pass. Reference numbers
from that run, useful for spotting drift: 9 collapsed-citation buttons, 24 citations visible
before expanding and 35 after, 29 paragraph candidates reduced to 26 innermost matches.
