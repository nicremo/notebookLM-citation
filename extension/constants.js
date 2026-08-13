// Single source of truth for the hosts this extension runs on.
//
// Google renamed NotebookLM to Gemini Notebook in July 2026 and moved the app
// from notebooklm.google.com to notebook.google.com. The old host still
// redirects, and Chrome matches content scripts against the FINAL url after a
// redirect, so the new host is the one that actually matters. The old host is
// kept so bookmarks and shared links keep working if Google ever stops
// redirecting.
//
// Loaded by background.js via importScripts() and by popup.html via a script
// tag. Keep it dependency-free so both contexts can use it.
//
// manifest.json cannot execute JavaScript, so host_permissions and
// content_scripts.matches repeat these patterns literally. A domain change
// means editing both files.

const NOTEBOOK_HOSTS = ['notebook.google.com', 'notebooklm.google.com'];

const NOTEBOOK_URL_PATTERNS = NOTEBOOK_HOSTS.map(host => `https://${host}/*`);

/**
 * Returns true when the given url string points at a supported notebook host.
 * Never throws: callers pass tab urls, which can be undefined or non-http.
 */
function isNotebookUrl(urlString) {
  try {
    return NOTEBOOK_HOSTS.includes(new URL(urlString).hostname);
  } catch (e) {
    return false;
  }
}
