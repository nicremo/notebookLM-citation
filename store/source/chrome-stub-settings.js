// Stub for rendering the real settings page outside the extension context.
const SETTINGS = {
  theme: 'light',
  citationStyle: 'brackets',
  sourceHeader: 'Sources:',
  sourceFormat: 'arrow',
  separator: '─────────────────────',
};
window.chrome = {
  runtime: { lastError: null, getManifest: () => ({ version: '1.3.0' }) },
  storage: {
    sync: { get: (k, cb) => cb({ settings: SETTINGS }), set: (o, cb) => cb && cb(), clear: cb => cb && cb() },
    local: {
      get: (k, cb) => cb({ citationHistory: [], statistics: { totalCitations: 0, totalCopies: 0, uniqueDocs: 0, sessions: 0, topSources: [] } }),
      set: (o, cb) => cb && cb(), clear: cb => cb && cb(),
    },
    onChanged: { addListener: () => {} },
  },
  tabs: { query: (q, cb) => cb([{ id: 1, url: 'https://notebook.google.com/' }]), sendMessage: () => {} },
};
