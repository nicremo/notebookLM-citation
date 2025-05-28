# notebooklmExtension

## What was attempted

This Chrome extension was designed to enhance Google NotebookLM by adding a live citation legend and exporting mapped citations when copying text. The goal was to make it easier to track which citation numbers correspond to which source documents, and to provide a user-friendly popup interface for managing citations.

## How it works

- Injects a live citation legend into the NotebookLM interface.
- When you copy text, it attempts to export the citation mapping alongside the copied content.
- Includes a popup UI for user interaction and settings.
- Uses a background worker for additional logic and state management.

## Weaknesses / Why it doesn't fully work

- The extension struggles to reliably extract and map citation numbers to their correct source files, especially when NotebookLM's DOM structure changes.
- The export functionality is inconsistent and may not always include the correct citation mapping.
- The UI sometimes fails to update in real time, depending on how NotebookLM loads or updates its content.
- The logic for detecting and mapping citations is fragile and breaks if Google changes the page layout or class names.
- No robust error handling for edge cases or unexpected page states.

**Status:** Experimental and not fully functional. Needs significant improvements to reliably map and export citations.
