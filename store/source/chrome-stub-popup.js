// Minimal chrome API stub so the real popup markup and script can render
// outside the extension context, with neutral demo data for store screenshots.
const DEMO = [
  { citation: '1', filename: 'Research_Paper_2024.pdf' },
  { citation: '2', filename: 'Study_Results.docx' },
  { citation: '3', filename: 'Analysis_Report.pdf' },
];
window.chrome = {
  runtime: { lastError: null },
  storage: {
    sync: { get: (k, cb) => cb({ settings: { theme: 'light' } }), set: (o, cb) => cb && cb() },
    local: { get: (k, cb) => cb({}), set: (o, cb) => cb && cb() },
    onChanged: { addListener: () => {} },
  },
  tabs: {
    query: (q, cb) => cb([{ id: 1, url: 'https://notebook.google.com/notebook/demo' }]),
    sendMessage: (id, msg, cb) => {
      if (!cb) return;
      if (msg.action === 'getMappings' || msg.action === 'rescan') cb({ mappings: DEMO });
      else cb({ chatText: 'demo' });
    },
  },
};
