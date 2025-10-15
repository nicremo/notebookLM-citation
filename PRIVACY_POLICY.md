# Privacy Policy for NotebookLM Citation Mapper

**Last Updated:** October 15, 2025

## Overview

NotebookLM Citation Mapper is a Chrome extension that enhances your experience with Google NotebookLM by helping you preserve citation references when copying text.

## Data Collection

**We do not collect, store, or transmit any user data.**

### What the Extension Does:
- Scans the current NotebookLM page you're viewing for citation markers
- Extracts text content from the page when you click the copy button
- Processes all data locally in your browser
- Does not send any data to external servers

### Permissions Explained:

#### `activeTab`
- **Why we need it:** To read citation information and text content from the NotebookLM page you're currently viewing
- **What we access:** Only the NotebookLM page content when you explicitly interact with the extension
- **What we don't do:** We never access other tabs or websites

#### `clipboardWrite`
- **Why we need it:** To copy formatted text with citations to your clipboard when you click the copy button
- **What we access:** Permission to write text to your system clipboard
- **What we don't do:** We never read from your clipboard or access clipboard history

#### `host_permissions` for `https://notebooklm.google.com/*`
- **Why we need it:** To function specifically on Google NotebookLM pages
- **What we access:** Only pages on notebooklm.google.com domain
- **What we don't do:** We never access any other websites or Google services

## Local Processing

All text extraction and citation mapping happens entirely within your browser. No data leaves your device.

## Third-Party Services

This extension does not use any third-party services, analytics, or tracking tools.

## Data Storage

The extension does not use `chrome.storage` or any other persistent storage mechanism. Citation mappings are stored temporarily in memory only while you're on a NotebookLM page and are discarded when you close the tab.

## Updates

This privacy policy may be updated to reflect changes in the extension's functionality. The "Last Updated" date at the top of this document will be changed accordingly.

## Contact

If you have questions about this privacy policy or the extension's behavior:
- Open an issue on GitHub: https://github.com/nicremo/notebookLM-citation/issues
- Repository: https://github.com/nicremo/notebookLM-citation

## Your Rights

You have full control over this extension:
- You can disable or uninstall it at any time via Chrome's extension settings
- You can review the complete source code on our GitHub repository
- The extension is open source under an open license

## Compliance

This extension complies with:
- Chrome Web Store Developer Program Policies
- General Data Protection Regulation (GDPR)
- California Consumer Privacy Act (CCPA)

**We respect your privacy. This extension was built to help you work more efficiently, not to collect your data.**
