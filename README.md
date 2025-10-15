# NotebookLM Citation Extensions

This repository contains three different Chrome extensions for Google NotebookLM, each aiming to improve or automate citation mapping and management.

## Overview

### notebooklmExtension
- Adds a live citation legend to NotebookLM.
- Exports mapped citations when copying text.
- Includes a popup UI for user interaction.
- Uses a background worker for additional logic.

### v2NotebooklmCitations
- Maps citation numbers to full source filenames.
- Displays a simple mapping legend directly on the page.
- Minimalist: only uses a content script, no popup or background worker.

### v3NotebooklmCitations
- Maps citation numbers to source filenames in NotebookLM.
- Provides a popup UI for user interaction.
- Uses a background worker for logic.
- Automatically expands hidden citation lists and shows a movable, minimisable, resizable legend overlay for copying mappings.
- Popup can copy or rescan citation mappings directly from the active NotebookLM tab.

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/nicremo/notebookLM-citation.git
   ```
2. Open Chrome and go to `chrome://extensions/`.
3. Enable "Developer mode" (top right).
4. Click "Load unpacked" and select one of the extension folders (`notebooklmExtension`, `v2NotebooklmCitations`, or `v3NotebooklmCitations`).

## Usage

- Each extension targets [notebooklm.google.com](https://notebooklm.google.com).
- See the folder README or code comments for details on how each extension works.
- For more information, see `citation_systems_summary.txt` and `reddit_post_draft.txt`.

## Contributing

If you have expertise in Chrome extension development or citation mapping, feel free to open issues or submit pull requests. Any help to make these extensions more robust and user-friendly is highly appreciated!
