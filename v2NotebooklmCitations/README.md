# v2NotebooklmCitations

## What was attempted

This Chrome extension was created to map citation numbers in Google NotebookLM to the full filenames of the source documents. The idea was to display a simple legend directly on the page, making it easier to see which citation refers to which document.

## How it works

- Injects a mapping legend into the NotebookLM interface, showing which citation number corresponds to which source file.
- Uses only a content script (no popup UI, no background worker).
- Tries to update the legend dynamically as the page content changes.

## Weaknesses / Why it doesn't fully work

- The mapping logic is very basic and often fails to correctly associate citation numbers with the right source files, especially if the page structure changes.
- The legend may not update correctly if NotebookLM loads new content dynamically or changes its DOM.
- No user interface for configuration or troubleshooting.
- No error handling for unexpected page layouts or missing data.
- The extension is highly sensitive to changes in NotebookLM's HTML structure and class names.

**Status:** Minimal and experimental. The mapping is unreliable and the extension does not consistently provide correct or complete citation information.
