// content.js - Main content script for NotebookLM Citation Mapper

class NotebookLMCitationMapper {

  constructor() {

    this.citationMap = new Map();

    this.sourceDocuments = new Map();

    this.observer = null;

    this.isProcessing = false;

    

    // Start the extension

    this.init();

  }

  init() {
    console.log('NotebookLM Citation Mapper initialized');
    // Log current URL and time for debugging
    console.log('Current URL:', window.location.href, 'Time:', new Date().toISOString());

    // Initial scan
    this.scanForCitations();
    this.scanForSourceDocuments();

    // Set up mutation observer for dynamic content
    this.setupMutationObserver();

    // Add UI elements
    this.createUI();

    // Listen for messages from popup/background
    this.setupMessageListener();

    // Add manual rescan button for debugging
    window.rescanNotebookLMCitations = () => {
      console.log('Manual rescan triggered');
      this.scanForCitations();
      this.scanForSourceDocuments();
    };
    console.log('You can now call window.rescanNotebookLMCitations() in the console to force a rescan.');

    // Add periodic polling as fallback in case MutationObserver misses dynamic loads
    setInterval(() => {
      this.scanForCitations();
    }, 3000);
  }

  // Scan the page for citation buttons

  scanForCitations() {

    const citationButtons = document.querySelectorAll('button.citation-marker');

    console.log(`Found ${citationButtons.length} citation buttons`);

    

    citationButtons.forEach(button => {

      this.processCitationButton(button);

    });

  }

  // Process individual citation button

  processCitationButton(button) {

    try {

      // Extract visible citation number

      const citationSpan = button.querySelector('span');

      if (!citationSpan) return;

      

      const citationNumber = citationSpan.textContent.trim();

      if (!citationNumber) return;

      

      // Try multiple approaches to get Angular data

      const sourceInfo = this.extractSourceInfoFromButton(button);

      

      if (sourceInfo) {

        this.citationMap.set(citationNumber, sourceInfo);

        console.log(`Mapped citation ${citationNumber} to:`, sourceInfo);

      } else {

        console.warn(`Could not extract source info for citation ${citationNumber}`);

      }

      

      // Add custom data attribute for easier tracking

      button.setAttribute('data-citation-processed', 'true');

      button.setAttribute('data-citation-number', citationNumber);

      

    } catch (error) {

      console.error('Error processing citation button:', error);

    }

  }

  // Extract source information from button using various Angular access methods

  extractSourceInfoFromButton(button) {

    let sourceInfo = null;

    

    // Method 1: Try to access Angular context directly

    if (button.__ngContext__) {

      sourceInfo = this.extractFromAngularContext(button.__ngContext__);

    }

    

    // Method 2: Try to access component instance

    if (!sourceInfo && button.__component__) {

      sourceInfo = this.extractFromComponent(button.__component__);

    }

    

    // Method 3: Try to access Angular debug data

    if (!sourceInfo && window.ng) {

      try {

        const debugElement = window.ng.getComponent(button);

        if (debugElement) {

          sourceInfo = this.extractFromDebugElement(debugElement);

        }

      } catch (e) {

        // ng might not be available in production

      }

    }

    

    // Method 4: Try to intercept click handler

    if (!sourceInfo) {

      sourceInfo = this.tryClickInterception(button);

    }

    

    // Method 5: Search nearby DOM for clues

    if (!sourceInfo) {

      sourceInfo = this.searchNearbyDOM(button);

    }

    

    return sourceInfo;

  }

  // Extract data from Angular context array

  extractFromAngularContext(context) {

    if (!Array.isArray(context)) return null;

    

    // Search through context array for relevant data

    for (let i = 0; i < context.length; i++) {

      const item = context[i];

      

      // Look for objects that might contain source info

      if (item && typeof item === 'object') {

        // Check for common property names

        const possibleProps = ['source', 'sourceName', 'fileName', 'document', 

                             'file', 'ref', 'reference', 'metadata', 'data'];

        

        for (const prop of possibleProps) {

          if (item[prop]) {

            return this.extractSourceDetails(item[prop]);

          }

        }

        

        // Deep search in object

        const deepResult = this.deepSearchObject(item, possibleProps);

        if (deepResult) return deepResult;

      }

    }

    

    return null;

  }

  // Extract from component instance

  extractFromComponent(component) {

    if (!component || typeof component !== 'object') return null;

    

    // Search component properties

    const relevantProps = Object.keys(component).filter(key => 

      key.includes('source') || key.includes('file') || 

      key.includes('doc') || key.includes('ref')

    );

    

    for (const prop of relevantProps) {

      const value = component[prop];

      if (value) {

        return this.extractSourceDetails(value);

      }

    }

    

    return null;

  }

  // Deep search in objects

  deepSearchObject(obj, targetProps, depth = 0, visited = new Set()) {

    if (depth > 5 || !obj || typeof obj !== 'object' || visited.has(obj)) {

      return null;

    }

    

    visited.add(obj);

    

    for (const key in obj) {

      try {

        const value = obj[key];

        

        // Check if key matches target props

        for (const prop of targetProps) {

          if (key.toLowerCase().includes(prop)) {

            const result = this.extractSourceDetails(value);

            if (result) return result;

          }

        }

        

        // Recursive search

        if (value && typeof value === 'object') {

          const deepResult = this.deepSearchObject(value, targetProps, depth + 1, visited);

          if (deepResult) return deepResult;

        }

      } catch (e) {

        // Skip inaccessible properties

      }

    }

    

    return null;

  }

  // Extract source details from various formats

  extractSourceDetails(data) {

    if (typeof data === 'string') {

      // Direct filename

      if (data.includes('.') && data.length > 3) {

        return { filename: data, type: 'direct' };

      }

    } else if (typeof data === 'object' && data) {

      // Object with filename property

      const filenameProps = ['name', 'filename', 'fileName', 'title', 'path'];

      for (const prop of filenameProps) {

        if (data[prop] && typeof data[prop] === 'string') {

          return { filename: data[prop], type: 'object', fullData: data };

        }

      }

    }

    

    return null;

  }

  // Try to intercept click handler

  tryClickInterception(button) {

    // Clone and replace button to remove existing handlers

    const clone = button.cloneNode(true);

    let capturedData = null;

    

    clone.addEventListener('click', function(e) {

      e.preventDefault();

      e.stopPropagation();

      

      // Try to access event data

      if (e.detail && typeof e.detail === 'object') {

        capturedData = e.detail;

      }

      

      // Trigger original click

      button.click();

    }, true);

    

    // Temporarily replace

    button.parentNode.replaceChild(clone, button);

    setTimeout(() => {

      clone.parentNode.replaceChild(button, clone);

    }, 100);

    

    return capturedData;

  }

  // Search nearby DOM for context clues

  searchNearbyDOM(button) {

    // Look for nearby elements that might contain source info

    const parent = button.closest('.citation-container, .reference-container, [class*="citation"]');

    if (!parent) return null;

    

    // Search for hidden inputs or data attributes

    const dataElements = parent.querySelectorAll('[data-source], [data-file], input[type="hidden"]');

    for (const elem of dataElements) {

      const value = elem.dataset.source || elem.dataset.file || elem.value;

      if (value) {

        return { filename: value, type: 'dom-nearby' };

      }

    }

    

    return null;

  }

  // Scan for source documents list

  scanForSourceDocuments() {

    // Method 1: Look for sidebar or source panel

    const possibleContainers = [

      '.source-list', '.sources-panel', '.notebook-sources',

      '[class*="source"]', '[class*="document"]', '.sidebar'

    ];

    

    for (const selector of possibleContainers) {

      const containers = document.querySelectorAll(selector);

      containers.forEach(container => {

        this.extractSourcesFromContainer(container);

      });

    }

    

    // Method 2: Look for global Angular services

    this.searchGlobalAngularServices();

  }

  // Extract sources from a container element

  extractSourcesFromContainer(container) {

    // Look for elements that might represent source documents

    const sourceElements = container.querySelectorAll(

      '[class*="source-item"], [class*="document-item"], ' +

      '[class*="file-name"], .source, .document'

    );

    

    sourceElements.forEach((elem, index) => {

      const filename = elem.textContent.trim();

      if (filename && filename.includes('.')) {

        this.sourceDocuments.set(index + 1, filename);

      }

    });

  }

  // Search global Angular services

  searchGlobalAngularServices() {

    if (!window.ng) return;

    

    try {

      // Try to get injector

      const rootElement = document.querySelector('app-root, [ng-app], [class*="app"]');

      if (rootElement && window.ng.getInjector) {

        const injector = window.ng.getInjector(rootElement);

        

        // Try common service names

        const serviceNames = ['SourceService', 'DocumentService', 'DataService'];

        for (const name of serviceNames) {

          try {

            const service = injector.get(name);

            if (service) {

              this.extractSourcesFromService(service);

            }

          } catch (e) {

            // Service not found

          }

        }

      }

    } catch (e) {

      console.log('Could not access Angular services');

    }

  }

  // Extract sources from a service

  extractSourcesFromService(service) {

    if (!service || typeof service !== 'object') return;

    

    // Look for arrays or maps of sources

    for (const key in service) {

      const value = service[key];

      if (Array.isArray(value)) {

        value.forEach((item, index) => {

          if (item && item.filename) {

            this.sourceDocuments.set(index + 1, item.filename);

          }

        });

      }

    }

  }

  // Set up mutation observer

  setupMutationObserver() {

    this.observer = new MutationObserver((mutations) => {

      if (this.isProcessing) return;

      

      this.isProcessing = true;

      setTimeout(() => {

        mutations.forEach(mutation => {

          mutation.addedNodes.forEach(node => {

            if (node.nodeType === 1) { // Element node

              // Check if it's a citation button

              if (node.matches && node.matches('button.citation-marker')) {

                this.processCitationButton(node);

              }

              

              // Check for citation buttons in children

              const buttons = node.querySelectorAll('button.citation-marker');

              buttons.forEach(button => this.processCitationButton(button));

            }

          });

        });

        

        this.isProcessing = false;

      }, 100);

    });

    

    this.observer.observe(document.body, {

      childList: true,

      subtree: true

    });

  }

  // Create UI elements

  createUI() {

    // Create floating button

    const floatingButton = document.createElement('div');

    floatingButton.id = 'citation-mapper-button';

    floatingButton.innerHTML = '📚';

    floatingButton.style.cssText = `

      position: fixed;

      bottom: 20px;

      right: 20px;

      width: 50px;

      height: 50px;

      background: #4285f4;

      color: white;

      border-radius: 50%;

      display: flex;

      align-items: center;

      justify-content: center;

      cursor: pointer;

      box-shadow: 0 2px 5px rgba(0,0,0,0.3);

      z-index: 10000;

      font-size: 24px;

    `;

    

    floatingButton.addEventListener('click', () => this.showMappingLegend());

    document.body.appendChild(floatingButton);

  }

  // Show mapping legend

  showMappingLegend() {
    // Remove existing legend if any
    const existingLegend = document.getElementById('citation-mapper-legend');
    if (existingLegend) {
      existingLegend.remove();
      return;
    }

    // Create legend container
    const legendContainer = document.createElement('div');
    legendContainer.id = 'citation-mapper-legend';
    legendContainer.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 20px;
      max-width: 600px;
      max-height: 70vh;
      overflow-y: auto;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 10001;
    `;

    // Try to extract possible source file names from the DOM for dropdowns
    const possibleSources = Array.from(document.querySelectorAll('div.source-title, .source-title, [class*="source"], [class*="document"], [class*="file"]'))
      .map(el => el.textContent.trim())
      .filter(txt => txt.length > 0 && txt.length < 200)
      .filter((v, i, arr) => arr.indexOf(v) === i);

    // Load manual mapping from localStorage
    let manualMapping = {};
    try {
      manualMapping = JSON.parse(localStorage.getItem('notebooklmCitationManualMapping') || '{}');
    } catch (e) {}

    // Create content
    let content = '<h3 style="margin-top: 0;">Citation Mapping Legend (manuelle Zuordnung möglich)</h3>';

    if (this.citationMap.size === 0) {
      content += '<p>No citations found yet. Try clicking on some citations first.</p>';
    } else {
      content += '<table style="width: 100%; border-collapse: collapse;">';
      content += '<thead><tr><th style="text-align: left; padding: 8px; border-bottom: 2px solid #ccc;">Citation</th>';
      content += '<th style="text-align: left; padding: 8px; border-bottom: 2px solid #ccc;">Source File (manuell zuordnen)</th></tr></thead>';
      content += '<tbody>';

      // Sort citations numerically
      const sortedCitations = Array.from(this.citationMap.entries())
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

      sortedCitations.forEach(([citation, sourceInfo]) => {
        const manualValue = manualMapping[citation] || '';
        const filename = sourceInfo.filename || 'Unknown';
        content += `<tr>`;
        content += `<td style="padding: 8px; border-bottom: 1px solid #eee;">${citation}</td>`;
        content += `<td style="padding: 8px; border-bottom: 1px solid #eee;">
          <input type="text" class="manual-mapping-input" data-citation="${citation}" value="${manualValue || filename}" list="possible-sources-${citation}" style="width: 90%;" />
          <datalist id="possible-sources-${citation}">
            ${possibleSources.map(src => `<option value="${src}">`).join('')}
          </datalist>
        </td>`;
        content += `</tr>`;
      });

      content += '</tbody></table>';
    }

    // Add buttons
    content += '<div style="margin-top: 20px; text-align: right;">';
    content += '<button id="save-mapping" style="margin-right: 10px; padding: 8px 16px; background: #34a853; color: white; border: none; border-radius: 4px; cursor: pointer;">Speichern</button>';
    content += '<button id="copy-mapping" style="margin-right: 10px; padding: 8px 16px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer;">Copy to Clipboard</button>';
    content += '<button id="close-legend" style="padding: 8px 16px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>';
    content += '</div>';

    legendContainer.innerHTML = content;
    document.body.appendChild(legendContainer);

    // Add event listeners
    document.getElementById('save-mapping').addEventListener('click', () => {
      // Save manual mapping to localStorage
      const inputs = legendContainer.querySelectorAll('.manual-mapping-input');
      let newMapping = {};
      inputs.forEach(input => {
        newMapping[input.dataset.citation] = input.value.trim();
      });
      localStorage.setItem('notebooklmCitationManualMapping', JSON.stringify(newMapping));
      alert('Manuelle Zuordnung gespeichert!');
    });

    document.getElementById('copy-mapping').addEventListener('click', () => this.copyMappingToClipboard(true));
    document.getElementById('close-legend').addEventListener('click', () => legendContainer.remove());
  }

  // Copy mapping to clipboard
  copyMappingToClipboard(useManual = false) {
    let text = 'Citation Mapping Legend\n';
    text += '=====================\n\n';

    // Load manual mapping if requested
    let manualMapping = {};
    if (useManual) {
      try {
        manualMapping = JSON.parse(localStorage.getItem('notebooklmCitationManualMapping') || '{}');
      } catch (e) {}
    }

    const sortedCitations = Array.from(this.citationMap.entries())
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

    sortedCitations.forEach(([citation, sourceInfo]) => {
      let filename = sourceInfo.filename || 'Unknown';
      if (useManual && manualMapping[citation]) {
        filename = manualMapping[citation];
      }
      text += `Citation ${citation} -> ${filename}\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      alert('Mapping copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard. Check console for details.');
    });
  }

  // Copy mapping to clipboard

  copyMappingToClipboard() {

    let text = 'Citation Mapping Legend\n';

    text += '=====================\n\n';

    

    const sortedCitations = Array.from(this.citationMap.entries())

      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

    

    sortedCitations.forEach(([citation, sourceInfo]) => {

      const filename = sourceInfo.filename || 'Unknown';

      text += `Citation ${citation} -> ${filename}\n`;

    });

    

    navigator.clipboard.writeText(text).then(() => {

      alert('Mapping copied to clipboard!');

    }).catch(err => {

      console.error('Failed to copy:', err);

      alert('Failed to copy to clipboard. Check console for details.');

    });

  }

  // Setup message listener for communication with popup/background

  setupMessageListener() {

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

      if (request.action === 'getMappings') {

        const mappings = Array.from(this.citationMap.entries()).map(([citation, sourceInfo]) => ({

          citation,

          filename: sourceInfo.filename || 'Unknown',

          type: sourceInfo.type

        }));

        sendResponse({ mappings });

      } else if (request.action === 'rescan') {

        this.citationMap.clear();

        this.scanForCitations();

        this.scanForSourceDocuments();

        sendResponse({ status: 'Rescan complete' });

      }

      

      return true; // Keep message channel open for async response

    });

  }

}

// Initialize when DOM is ready

if (document.readyState === 'loading') {

  document.addEventListener('DOMContentLoaded', () => new NotebookLMCitationMapper());

} else {

  new NotebookLMCitationMapper();

}
