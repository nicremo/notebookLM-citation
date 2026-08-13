# NotebookLM Citation Mapper

A Chrome extension that preserves citation references when copying chat text from Google NotebookLM.

## Overview

When you copy text from NotebookLM's chat interface, the citation numbers (like [1], [2], etc.) are included, but without context about which sources they refer to. This extension automatically maps those citation numbers to their corresponding source filenames, making your copied text complete and useful.

## Features

- **Automatic Citation Mapping**: Automatically detects and maps citation numbers to source document names
- **Copy with Sources**: Copy chat text with citation sources appended at the bottom
- **Draggable Legend Window**: Shows a real-time citation map directly on the NotebookLM page
- **Smart Citation Expansion**: Automatically expands hidden citation lists to capture all sources
- **Popup Interface**: Quick access to citation mappings and controls
- **Auto-Rescan**: Monitors page changes and updates mappings automatically
- **Customizable Formatting**: Configure how citations and sources appear in copied text
- **Export/Import**: Save and restore citation mappings
- **Statistics & History**: Track your citation usage and copy history
- **Theme Support**: Light, dark, and auto themes available

## How It Works

1. The extension injects a content script into NotebookLM pages
2. It scans the page for citation references and source documents
3. A mapping is created between citation numbers and source filenames
4. When you copy text, the extension adds the source list at the bottom
5. The mapping updates automatically as you interact with NotebookLM

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the `extension` folder
5. The extension is now installed and ready to use

## Usage

### Basic Usage

1. Navigate to Gemini Notebook (https://notebook.google.com)
2. Open a notebook and start a chat
3. Click the extension icon to see current citation mappings
4. Copy text from the chat - citations will be automatically included

### Legend Window

- A draggable window appears on the page showing the citation map
- Click and drag to reposition it
- Minimize/maximize using the controls
- Resize by dragging the corners
- Copy the entire mapping with one click

### Settings Page

Access advanced features through the settings icon:

- **Theme Settings**: Choose light, dark, or auto theme
- **Auto-Features**: Configure auto-rescan and notifications
- **Format Options**: Customize citation and source formatting
- **Export/Import**: Save and restore your citation mappings
- **History**: View your copy history
- **Statistics**: See usage statistics and most referenced sources

## Privacy

All citation processing happens locally in your browser. No data is sent to external servers. Your citation mappings and settings are stored locally using Chrome's storage API.

## Technical Details

- **Manifest Version**: 3
- **Permissions**: activeTab, clipboardWrite, storage
- **Host Permissions**: https://notebook.google.com/*, https://notebooklm.google.com/*
- **Background**: Service worker for state management
- **Content Scripts**: Injected at document_idle

## Support

For issues, feature requests, or questions, please visit the GitHub repository.

## License

This project is provided as-is for personal and educational use.
