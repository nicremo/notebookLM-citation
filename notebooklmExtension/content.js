// NotebookLM Citation Legend Content Script
(function() {
    'use strict';
    
    let citationMap = {};
    let legendContainer = null;
    let shadowRoot = null;
    let isEnabled = true;
    let observer = null;
    
    // Load settings from storage
    chrome.storage.local.get(['enabled', 'customNames'], (result) => {
        isEnabled = result.enabled !== false; // Default to true
        if (result.customNames) {
            // Apply custom source names if saved
            Object.assign(citationMap, result.customNames);
        }
        if (isEnabled) {
            initialize();
        }
    });
    
    function initialize() {
        console.log('NotebookLM Citation Legend: Initializing...');
        createLegendContainer();
        
        // Try to scan multiple times as NotebookLM loads content dynamically
        setTimeout(() => scanForCitations(), 1000);
        setTimeout(() => scanForCitations(), 3000);
        setTimeout(() => scanForCitations(), 5000);
        
        setupCopyListener();
        setupMutationObserver();
        
        // Listen for messages from popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'toggle') {
                isEnabled = request.enabled;
                if (isEnabled) {
                    if (!legendContainer) createLegendContainer();
                    scanForCitations();
                } else {
                    if (legendContainer) legendContainer.style.display = 'none';
                }
            } else if (request.action === 'updateCustomName') {
                citationMap[request.citation] = { 
                    ...citationMap[request.citation], 
                    customName: request.name 
                };
                updateLegend();
                saveCitationMap();
            } else if (request.action === 'getCitations') {
                sendResponse({ citations: citationMap });
            }
        });
    }
    
    function createLegendContainer() {
        // Create shadow DOM container to avoid style conflicts
        legendContainer = document.createElement('div');
        legendContainer.id = 'notebooklm-citation-legend';
        legendContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 300px;
            max-height: 400px;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        shadowRoot = legendContainer.attachShadow({ mode: 'open' });
        shadowRoot.innerHTML = `
            <style>
                .legend-panel {
                    background: white;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    padding: 16px;
                    font-size: 13px;
                    line-height: 1.4;
                    max-height: 400px;
                    overflow-y: auto;
                }
                .legend-header {
                    font-weight: 600;
                    margin-bottom: 12px;
                    color: #1a73e8;
                    border-bottom: 1px solid #e8f0fe;
                    padding-bottom: 8px;
                }
                .citation-item {
                    margin-bottom: 8px;
                    padding: 6px;
                    background: #f8f9fa;
                    border-radius: 4px;
                    border-left: 3px solid #1a73e8;
                }
                .citation-number {
                    font-weight: 600;
                    color: #1a73e8;
                }
                .citation-source {
                    color: #5f6368;
                    margin-left: 8px;
                }
                .toggle-button {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 16px;
                    color: #5f6368;
                }
                .toggle-button:hover {
                    color: #1a73e8;
                }
                .collapsed .legend-content {
                    display: none;
                }
                .empty-state {
                    color: #5f6368;
                    font-style: italic;
                    text-align: center;
                    padding: 20px;
                }
            </style>
            <div class="legend-panel">
                <button class="toggle-button" title="Minimieren/Maximieren">−</button>
                <div class="legend-header">Citation Legend</div>
                <div class="legend-content" id="legend-content">
                    <div class="empty-state">Scanne nach Zitaten...</div>
                </div>
            </div>
        `;
        
        // Add toggle functionality
        const toggleButton = shadowRoot.querySelector('.toggle-button');
        const panel = shadowRoot.querySelector('.legend-panel');
        toggleButton.addEventListener('click', () => {
            panel.classList.toggle('collapsed');
            toggleButton.textContent = panel.classList.contains('collapsed') ? '+' : '−';
        });
        
        document.body.appendChild(legendContainer);
    }
    
    function scanForCitations() {
        if (!isEnabled) return;
        
        const newCitationMap = {};
        
        console.log('NotebookLM Citation Legend: Scanning for citations (all formats)...');
        
        // METHOD 1: NEW FORMAT - Look for [[source name]] patterns
        const citationPattern = /\[\[([^\]]+)\]\]/g;
        const pageText = document.body.textContent;
        const newFormatMatches = [...pageText.matchAll(citationPattern)];
        
        console.log(`Found ${newFormatMatches.length} new-format citations`);
        
        newFormatMatches.forEach((match, index) => {
            const fullCitation = match[1];
            const citationNumber = index + 1;
            
            let cleanName = fullCitation
                .replace(/^drive_pdf\s+/, '')
                .replace(/\.pdf$/, '')
                .replace(/\s+/g, ' ')
                .trim();
            
            let shortName = cleanName;
            if (cleanName.includes(' - ')) {
                const parts = cleanName.split(' - ');
                if (parts.length >= 2) {
                    shortName = `${parts[0]} (${parts[1]})`;
                }
            } else if (cleanName.length > 50) {
                shortName = cleanName.substring(0, 47) + '...';
            }
            
            newCitationMap[citationNumber] = {
                number: citationNumber,
                fullCitation: fullCitation,
                cleanName: cleanName,
                shortName: shortName,
                originalPattern: `[[${fullCitation}]]`,
                format: 'new'
            };
            
            console.log(`Citation ${citationNumber} (NEW): "${fullCitation}" -> "${shortName}"`);
        });
        
        // METHOD 2: BUTTON FORMAT - Look for citation-marker buttons
        const citationButtons = document.querySelectorAll('button.citation-marker, button[class*="citation"]');
        console.log(`Found ${citationButtons.length} citation buttons`);
        
        citationButtons.forEach(button => {
            const citationText = button.textContent?.trim();
            const citationNumber = parseInt(citationText);
            
            if (!isNaN(citationNumber) && citationNumber > 0) {
                // Try to extract source info from Angular context
                let sourceInfo = extractAngularContext(button);
                
                if (!newCitationMap[citationNumber]) {
                    newCitationMap[citationNumber] = {
                        number: citationNumber,
                        element: button,
                        sourceInfo: sourceInfo,
                        format: 'button',
                        angularContext: button.__ngContext__ || null
                    };
                    
                    console.log(`Citation ${citationNumber} (BUTTON):`, sourceInfo);
                }
            }
        });
        
        // METHOD 3: BRACKETED FORMAT - Look for [1], [2] patterns in text
        const bracketPattern = /\[(\d{1,3})\]/g;
        const bracketMatches = [...pageText.matchAll(bracketPattern)];
        
        console.log(`Found ${bracketMatches.length} bracketed citations`);
        
        bracketMatches.forEach(match => {
            const citationNumber = parseInt(match[1]);
            
            if (!newCitationMap[citationNumber]) {
                newCitationMap[citationNumber] = {
                    number: citationNumber,
                    format: 'bracket',
                    sourceInfo: { title: `Quelle ${citationNumber}` }
                };
                
                console.log(`Citation ${citationNumber} (BRACKET): Found in text`);
            }
        });
        
        // METHOD 4: LEGACY - Old selectors for backward compatibility
        const legacySelectors = [
            'sup', 'span[style*="background"]', 'span[role="button"]',
            'button[role="button"]', 'span[tabindex]'
        ];
        
        legacySelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                const citationText = element.textContent?.trim();
                const citationNumber = parseInt(citationText);
                
                if (!isNaN(citationNumber) && citationNumber > 0 && citationNumber < 1000) {
                    if (!newCitationMap[citationNumber]) {
                        newCitationMap[citationNumber] = {
                            number: citationNumber,
                            element: element,
                            format: 'legacy',
                            sourceInfo: extractSourceInfo(element)
                        };
                        
                        console.log(`Citation ${citationNumber} (LEGACY): Found with selector ${selector}`);
                    }
                }
            });
        });
        
        // Update citation map
        citationMap = newCitationMap;
        console.log('Final citation map:', citationMap);
        
        // Extract source names from sidebar
        extractSourceNamesFromSidebar();
        
        updateLegend();
        saveCitationMap();
    }
    
    function extractAngularContext(element) {
        const sourceInfo = { title: null, docId: null, page: null };
        
        try {
            // Try to extract from Angular context
            const ngContext = element.__ngContext__;
            if (ngContext && Array.isArray(ngContext)) {
                // Angular context is usually an array with component data
                ngContext.forEach(item => {
                    if (item && typeof item === 'object') {
                        // Look for source-related properties
                        if (item.source) sourceInfo.title = item.source;
                        if (item.sourceId) sourceInfo.docId = item.sourceId;
                        if (item.page) sourceInfo.page = item.page;
                        if (item.title) sourceInfo.title = item.title;
                    }
                });
            }
            
            // Try to extract from data attributes
            sourceInfo.docId = element.dataset.sourceId || 
                              element.getAttribute('data-source-id') ||
                              element.getAttribute('data-doc-id');
            
            sourceInfo.page = element.dataset.page || 
                             element.getAttribute('data-page');
            
            // Try to get title from parent elements or aria-label
            if (!sourceInfo.title) {
                sourceInfo.title = element.getAttribute('aria-label') ||
                                  element.getAttribute('title') ||
                                  element.parentElement?.getAttribute('title');
            }
            
        } catch (error) {
            console.log('Error extracting Angular context:', error);
        }
        
        return sourceInfo;
    }
    
    function getTextNodesContaining(regex) {
        // This function is kept for backward compatibility with old-style citations
        const textNodes = [];
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    return regex.test(node.textContent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
            }
        );
        
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        return textNodes;
    }
    
    function extractSourceInfo(supElement) {
        // Try to find source information from various attributes and surrounding elements
        let sourceInfo = {
            docId: null,
            title: null,
            page: null,
            url: null
        };
        
        // Check data attributes
        sourceInfo.docId = supElement.dataset.sourceId || 
                          supElement.getAttribute('data-source-id') ||
                          supElement.getAttribute('data-doc-id');
        
        sourceInfo.page = supElement.dataset.page || 
                         supElement.getAttribute('data-page');
        
        // Try to find title from parent elements or tooltips
        let parent = supElement.parentElement;
        while (parent && !sourceInfo.title) {
            if (parent.title) sourceInfo.title = parent.title;
            if (parent.dataset.sourceTitle) sourceInfo.title = parent.dataset.sourceTitle;
            parent = parent.parentElement;
        }
        
        return sourceInfo;
    }
    
    function extractSourceNamesFromSidebar() {
        console.log('NotebookLM Citation Legend: Extracting source names from sidebar...');
        
        // Look specifically in the sources sidebar
        const sourcesList = [];
        
        // Try to find the sources list in the left sidebar
        const sidebarSelectors = [
            // Look for the actual source list items
            '.sources-list li',
            '[role="listbox"] li',
            '[role="list"] li',
            '.sidebar li',
            // Look for individual source items
            '[data-testid*="source"]',
            '.source-item', 
            '.document-item',
            // Look for elements with PDF names
            '*[title*=".pdf"]',
            '*[aria-label*=".pdf"]',
            // Generic list items that might contain sources
            'li',
            // Look for anything with document-like names
            '*[title*="2023"]',
            '*[title*="2024"]',
            '*[title*="2020"]',
            '*[title*="2021"]',
            '*[title*="2022"]'
        ];
        
        // Find elements in the left sidebar specifically (usually the first 1/3 of the page)
        const leftSidebar = document.querySelector('.sidebar, [role="navigation"], nav') || 
                           Array.from(document.querySelectorAll('*')).find(el => 
                               el.getBoundingClientRect().left < window.innerWidth / 3 &&
                               el.getBoundingClientRect().width < window.innerWidth / 2
                           );
        
        if (leftSidebar) {
            console.log('Found left sidebar, scanning for sources...');
            sidebarSelectors.forEach(selector => {
                const elements = leftSidebar.querySelectorAll(selector);
                elements.forEach(element => {
                    const text = element.textContent?.trim();
                    if (text && text.length > 10 && text.length < 150) {
                        // Check if this looks like a document name
                        if (text.includes('.pdf') || 
                            text.match(/\d{4}/) || 
                            text.includes(' - ') ||
                            text.includes('et al')) {
                            sourcesList.push(text);
                            console.log('Found source in sidebar:', text);
                        }
                    }
                });
            });
        }
        
        // Also scan the entire page for source-like elements
        const allElements = document.querySelectorAll('*');
        allElements.forEach(element => {
            const text = element.textContent?.trim();
            const title = element.getAttribute('title');
            const ariaLabel = element.getAttribute('aria-label');
            
            [text, title, ariaLabel].forEach(str => {
                if (str && str.includes('.pdf') && str.length < 200 && str.length > 10) {
                    if (!sourcesList.includes(str)) {
                        sourcesList.push(str);
                        console.log('Found PDF source:', str);
                    }
                }
            });
        });
        
        console.log(`Total unique sources found: ${sourcesList.length}`);
        console.log('Sources:', sourcesList);
        
        // Now assign sources to citations
        const citationNumbers = Object.keys(citationMap).sort((a, b) => parseInt(a) - parseInt(b));
        
        // Method 1: Try to assign sources in order
        sourcesList.forEach((source, index) => {
            if (citationNumbers[index]) {
                const citationNum = citationNumbers[index];
                citationMap[citationNum].sourceInfo.title = source;
                console.log(`Assigned "${source}" to citation ${citationNum}`);
            }
        });
        
        // Method 2: If we have many citations but few sources, assign the first source to all
        if (sourcesList.length > 0 && citationNumbers.length > sourcesList.length) {
            const primarySource = sourcesList[0];
            citationNumbers.forEach(num => {
                if (!citationMap[num].sourceInfo.title) {
                    citationMap[num].sourceInfo.title = primarySource;
                }
            });
        }
        
        // Method 3: Fallback to generic names
        citationNumbers.forEach(num => {
            const citation = citationMap[num];
            if (!citation.sourceInfo.title) {
                citation.sourceInfo.title = `Dokument ${num}`;
            }
        });
    }
    
    function updateLegend() {
        if (!shadowRoot || !isEnabled) return;
        
        const legendContent = shadowRoot.getElementById('legend-content');
        const citationEntries = Object.values(citationMap).sort((a, b) => a.number - b.number);
        
        if (citationEntries.length === 0) {
            legendContent.innerHTML = '<div class="empty-state">Keine Zitate gefunden</div>';
            return;
        }
        
        legendContent.innerHTML = citationEntries.map(citation => {
            let displayName;
            let citationType;
            
            if (citation.shortName) {
                // NEW FORMAT: Show clean short name
                displayName = citation.shortName;
                citationType = 'Neu';
            } else {
                // OLD FORMAT: Show custom or generated name
                displayName = citation.customName || 
                            citation.sourceInfo?.title || 
                            `Quelle ${citation.number}`;
                citationType = 'Alt';
            }
            
            return `
                <div class="citation-item">
                    <span class="citation-number">[${citation.number}]</span>
                    <span class="citation-source">${displayName}</span>
                    <span class="citation-type" style="font-size: 10px; color: #999; margin-left: 4px;">${citationType}</span>
                </div>
            `;
        }).join('');
    }
    
    function setupCopyListener() {
        // Use capture phase to run before NotebookLM's handlers
        document.addEventListener('copy', handleCopyEvent, true);
        
        // Also add a regular listener as backup
        document.addEventListener('copy', handleCopyEvent, false);
        
        // Intercept clipboard API directly
        const originalWriteText = navigator.clipboard.writeText;
        navigator.clipboard.writeText = function(text) {
            const enhancedText = enhanceTextWithCitations(text);
            console.log('Intercepted clipboard.writeText:', { original: text, enhanced: enhancedText });
            return originalWriteText.call(this, enhancedText);
        };
    }
    
    function handleCopyEvent(event) {
        if (!isEnabled) return;
        
        const selection = window.getSelection();
        const originalText = selection.toString();
        
        if (!originalText.trim()) return;
        
        console.log('Copy event triggered. Original text:', originalText);
        console.log('Available citations:', Object.keys(citationMap));
        
        const enhancedText = enhanceTextWithCitations(originalText);
        const foundCitations = extractCitationsFromText(originalText);
        
        // Try multiple methods to set clipboard
        try {
            // Method 1: event.clipboardData
            if (event.clipboardData) {
                event.clipboardData.setData('text/plain', enhancedText);
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
            }
            
            // Method 2: Write to clipboard API directly with delay
            setTimeout(() => {
                navigator.clipboard.writeText(enhancedText).then(() => {
                    console.log('Successfully wrote enhanced text to clipboard via API');
                }).catch(err => {
                    console.log('Clipboard API failed:', err);
                });
            }, 50);
            
            // Method 3: Create hidden textarea and copy from there
            setTimeout(() => {
                const textarea = document.createElement('textarea');
                textarea.value = enhancedText;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                textarea.style.pointerEvents = 'none';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                console.log('Fallback copy method executed');
            }, 100);
            
        } catch (error) {
            console.error('Copy enhancement failed:', error);
        }
        
        // Show notification
        showNotification(`${foundCitations.length} Quellenangaben hinzugefügt`);
    }
    
    function enhanceTextWithCitations(originalText) {
        const foundCitations = extractCitationsFromText(originalText);
        let enhancedText = originalText;
        
        // Replace citation patterns with clean names
        foundCitations.forEach(citation => {
            if (citation.originalPattern) {
                // NEW FORMAT: Replace [[long source name]] with [Short Name]
                const regex = new RegExp(escapeRegExp(citation.originalPattern), 'g');
                enhancedText = enhancedText.replace(regex, `[${citation.name}]`);
                console.log(`Replaced "${citation.originalPattern}" with "[${citation.name}]"`);
            } else {
                // OLD FORMAT: Replace numbers with source names
                const regex = new RegExp(`\\b${citation.num}\\b`, 'g');
                enhancedText = enhancedText.replace(regex, `[${citation.name}]`);
                console.log(`Replaced number ${citation.num} with "[${citation.name}]"`);
            }
        });
        
        // Add source list at the end if citations were found
        if (foundCitations.length > 0) {
            enhancedText += '\n\nQuellen:\n' + 
                foundCitations.map(c => {
                    const fullName = c.fullName || c.name;
                    return `[${c.num || 'Ref'}] ${fullName}`;
                }).join('\n');
            
            console.log(`Enhanced text with ${foundCitations.length} citations`);
        }
        
        return enhancedText;
    }
    
    // Helper function to escape special regex characters
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\    function enhanceTextWithCitations(originalText) {
        const foundCitations = extractCitationsFromText(originalText);
        let enhancedText = originalText;
        
        // Replace citation numbers with source names
        foundCitations.forEach(citation => {
            const regex = new RegExp(`\\b${citation.num}\\b`, 'g');
            enhancedText = enhancedText.replace(regex, `[${citation.name}]`);
        });
        
        // Add source list at the end if citations were found
        if (foundCitations.length > 0) {
            enhancedText += '\n\nQuellen:\n' + 
                foundCitations.map(c => `[${c.num}] ${c.name}`).join('\n');
            
            console.log(`Enhanced text with ${foundCitations.length} citations`);
        }
        
        return enhancedText;
    }');
    }
    
    function extractCitationsFromText(originalText) {
        let foundCitations = [];
        
        console.log('Checking for citations in text:', originalText.substring(0, 100) + '...');
        
        // NEW: Look for NotebookLM's new citation format [[source name]]
        const citationPattern = /\[\[([^\]]+)\]\]/g;
        const newFormatMatches = [...originalText.matchAll(citationPattern)];
        
        console.log(`Found ${newFormatMatches.length} new-format citations in copied text`);
        
        newFormatMatches.forEach((match, index) => {
            const fullCitation = match[1];
            
            // Clean up the citation name
            let cleanName = fullCitation
                .replace(/^drive_pdf\s+/, '') // Remove "drive_pdf" prefix
                .replace(/\.pdf$/, '') // Remove .pdf extension
                .replace(/\s+/g, ' ') // Normalize spaces
                .trim();
            
            // Create short name for replacement
            let shortName = cleanName;
            if (cleanName.includes(' - ')) {
                // If it has author - year - title format, use author + year
                const parts = cleanName.split(' - ');
                if (parts.length >= 2) {
                    shortName = `${parts[0]} (${parts[1]})`;
                }
            } else if (cleanName.length > 50) {
                // If too long, truncate
                shortName = cleanName.substring(0, 47) + '...';
            }
            
            foundCitations.push({
                num: index + 1,
                name: shortName,
                fullName: cleanName,
                originalPattern: match[0] // The full [[...]] pattern
            });
            
            console.log(`✓ Found new-format citation: "${fullCitation}" -> "${shortName}"`);
        });
        
        // LEGACY: Also check for old-style numeric citations
        const citationNumbers = Object.keys(citationMap).sort((a, b) => parseInt(b) - parseInt(a));
        console.log('Checking for old-style citations:', citationNumbers);
        
        citationNumbers.forEach(num => {
            const citation = citationMap[num];
            if (citation.isOldFormat) {
                const displayName = citation.customName || 
                                  citation.sourceInfo?.title || 
                                  `Quelle ${num}`;
                
                // Try different patterns to find the citation in text:
                const patterns = [
                    new RegExp(`\\b${num}\\b`, 'g'),           // Standalone number
                    new RegExp(`\\[${num}\\]`, 'g'),           // [number]
                    new RegExp(`\\(${num}\\)`, 'g'),           // (number)
                    new RegExp(`${num}(?=\\s|$|\\.|,)`, 'g'),  // Number followed by space/end/punctuation
                ];
                
                let found = false;
                patterns.forEach((pattern, patternIndex) => {
                    const matches = originalText.match(pattern);
                    if (matches) {
                        found = true;
                        console.log(`✓ Found old-style citation ${num} using pattern ${patternIndex}:`, matches);
                    }
                });
                
                if (found && !foundCitations.find(c => c.num === num)) {
                    foundCitations.push({ num, name: displayName });
                    console.log(`✓ Added old-style citation ${num} to results`);
                }
            }
        });
        
        console.log(`Final result: ${foundCitations.length} citations found:`, foundCitations.map(c => `${c.num}: ${c.name}`));
        return foundCitations;
    }
    
    function setupMutationObserver() {
        // Watch for changes in the page content
        observer = new MutationObserver((mutations) => {
            let shouldRescan = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Check if new sup elements were added
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.tagName === 'SUP' || node.querySelector('sup')) {
                                shouldRescan = true;
                            }
                        }
                    });
                }
            });
            
            if (shouldRescan) {
                // Debounce rescanning
                clearTimeout(window.citationRescanTimeout);
                window.citationRescanTimeout = setTimeout(() => {
                    scanForCitations();
                }, 1000);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    function saveCitationMap() {
        // Save custom names to storage
        const customNames = {};
        Object.keys(citationMap).forEach(num => {
            if (citationMap[num].customName) {
                customNames[num] = citationMap[num];
            }
        });
        
        chrome.storage.local.set({ customNames });
    }
    
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50px;
            right: 20px;
            background: #1a73e8;
            color: white;
            padding: 12px 16px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 10001;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }
    
    // Debug function that can be called from browser console
    window.debugNotebookLMCitations = function() {
        console.log('=== NotebookLM Citation Debug (NEW FORMAT) ===');
        console.log('Extension enabled:', isEnabled);
        console.log('Current citation map:', citationMap);
        console.log('Number of citations found:', Object.keys(citationMap).length);
        
        // NEW: Check for new citation format [[...]]
        console.log('\n--- NEW Citation Format Analysis ---');
        const pageText = document.body.textContent;
        const citationPattern = /\[\[([^\]]+)\]\]/g;
        const newFormatMatches = [...pageText.matchAll(citationPattern)];
        
        console.log(`Found ${newFormatMatches.length} new-format citations:`);
        newFormatMatches.slice(0, 10).forEach((match, i) => {
            console.log(`  [${i+1}] "${match[1]}"`);
        });
        
        // Show exactly WHERE each citation was found
        console.log('\n--- Where Citations Were Found ---');
        Object.keys(citationMap).forEach(num => {
            const citation = citationMap[num];
            if (citation.shortName) {
                console.log(`Citation ${num} (NEW):`, {
                    fullCitation: citation.fullCitation,
                    cleanName: citation.cleanName,
                    shortName: citation.shortName,
                    originalPattern: citation.originalPattern
                });
            } else {
                console.log(`Citation ${num} (OLD):`, {
                    element: citation.element,
                    elementText: citation.element?.textContent?.trim(),
                    sourceInfo: citation.sourceInfo
                });
            }
        });
        
        // Test the text extraction on sample with new format
        console.log('\n--- Test New Format Text Extraction ---');
        const sampleNewText = "Text with [[drive_pdf Brynjolfsson et al. - 2023 - Generative AI at Work.pdf]] and [[Rogers - 1983 - Diffusion of innovations.pdf]] citations.";
        console.log('Sample text:', sampleNewText);
        const testCitations = extractCitationsFromText(sampleNewText);
        console.log('Citations found in sample:', testCitations);
        
        // Test enhancement
        const enhanced = enhanceTextWithCitations(sampleNewText);
        console.log('Enhanced sample:', enhanced);
        
        // Look for old-style selectors too
        console.log('\n--- Old-Style Citation Analysis ---');
        const selectors = [
            'sup', 'span[style*="border-radius"]', 'span[style*="background"]', 
            'button[aria-label*="citation"]', 'button[role="button"]'
        ];
        
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                console.log(`${selector}: ${elements.length} elements`);
                elements.forEach((el, i) => {
                    if (i < 3) {
                        const text = el.textContent?.trim();
                        const isNumber = /^\d{1,3}$/.test(text);
                        console.log(`  [${i}] Text: "${text}" | IsNumber: ${isNumber}`);
                    }
                });
            }
        });
        
        // Source detection
        console.log('\n--- Source Detection from Sidebar ---');
        const sources = [];
        document.querySelectorAll('*').forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.includes('.pdf') && text.length < 100 && text.length > 10) {
                sources.push(text);
            }
        });
        console.log('PDF sources found:', [...new Set(sources)].slice(0, 10));
        
        // Manually trigger scan
        console.log('\n--- Triggering Rescan ---');
        scanForCitations();
        updateLegend();
        
        console.log('\n--- Final Results ---');
        console.log('Citations after rescan:', citationMap);
        
        return {
            enabled: isEnabled,
            citations: citationMap,
            newFormatCount: newFormatMatches.length,
            sources: [...new Set(sources)]
        };
    };
    
    // Also make the scan function available for debugging
    window.scanCitations = () => scanForCitations();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (observer) observer.disconnect();
    });
    
})();