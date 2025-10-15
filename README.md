# NotebookLM Citation Mapper

A Chrome extension that automatically maps citation numbers to source filenames in Google NotebookLM and allows you to copy chat text with preserved citations.

## Features

- **Automatic Citation Mapping**: Scans NotebookLM pages and creates a mapping between citation numbers and source documents
- **Copy Chat with Citations**: Extract the full chat text with citation numbers preserved as `[1]`, `[2]`, etc., with a complete source legend appended
- **Citation Mapping Export**: Copy just the citation mappings to clipboard
- **Smart Page Scanning**: Automatically detects new citations as they appear
- **Manual Rescan**: Refresh the citation mappings on demand

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/nicremo/notebookLM-citation.git
   cd notebookLM-citation
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" (toggle in top right corner)

4. Click "Load unpacked" and select the `extension` folder from this repository

## Usage

1. Navigate to [notebooklm.google.com](https://notebooklm.google.com)

2. The extension will automatically:
   - Scan for citations in the current notebook
   - Update citations as new content loads

3. Click the extension icon in Chrome to see:
   - **Citation Mappings**: List of all detected citations
   - **📄 Text mit Quellen kopieren**: Copies the entire chat text with citations preserved
   - **📋 Citation Mappings kopieren**: Copies just the citation legend
   - **🔄 Rescan Page**: Manually refresh the citation mappings

### Copy Format

When you click "Text mit Quellen kopieren", the extension copies:

```
[Your chat text with citations preserved as [1], [2], etc.]

─────────────────────
Quellen:
[1] → Document1.pdf
[2] → Research_Paper.docx
[3] → Notes.txt
...
```

## How It Works

The extension uses three main components:

- **content.js**: Scans the page for citation markers (using `aria-label` attributes) and extracts chat text
- **popup.js**: Provides the popup interface when clicking the extension icon
- **background.js**: Handles context menu integration and background tasks

### Technical Details

- Built for **Manifest V3** (latest Chrome Extension API)
- Uses **MutationObserver** to detect dynamic content changes
- Automatically expands hidden citation lists (`...` buttons)
- Smart fallback mechanisms for text extraction

## Known Limitations

- The citation mapping relies on NotebookLM's DOM structure and `aria-label` attributes
- May break if Google significantly changes NotebookLM's interface
- Chat text extraction uses heuristics and may occasionally miss content

## Contributing

Contributions are welcome! If you encounter issues or have ideas for improvements:

1. Open an issue describing the problem or feature request
2. Submit a pull request with your changes

## Credits

- Original concept and implementation: [@nicremo](https://github.com/nicremo)
- Major refactoring and improvements: [@DerSchiman](https://github.com/DerSchiman) (Ron Schimanski) - Huge thanks for making this project possible by completely rewriting the citation extraction logic and making it actually work!

## License

This project is open source and available for anyone to use and modify.
