# v3NotebooklmCitations

## What was attempted

This Chrome extension was developed to map citation numbers to source filenames in Google NotebookLM, with a focus on providing a popup UI for user interaction. The goal was to make citation mapping more accessible and manageable through a user-friendly interface.

## How it works

- Injects logic to map citation numbers to source filenames within NotebookLM.
- Provides a popup UI for users to view or interact with the citation mapping.
- Uses a background worker to handle logic and state.
- Tries to update the mapping as the page content changes.
- Automatically expands hidden citation lists to capture every source.
- Displays a draggable, minimisable, resizable legend window on the page for quick copy.
- Popup can copy current mappings or trigger a rescan of the page.

## Weaknesses / Why it doesn't fully work

- The mapping between citation numbers and source files is unreliable and often breaks if NotebookLM's DOM or class names change.
- The extension lacks robust error handling and does not notify the user when mapping fails.
- The logic is fragile and not resilient to changes in NotebookLM's interface or structure.
- No advanced features for troubleshooting or manual correction.

**Status:** Experimental. The extension is more usable now but still may not consistently provide accurate citation mapping if NotebookLM changes its structure.
