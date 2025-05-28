// NotebookLM Citation Legend Popup Script
document.addEventListener('DOMContentLoaded', function() {
    const toggleSwitch = document.getElementById('toggleSwitch');
    const status = document.getElementById('status');
    const statusText = document.getElementById('statusText');
    const citationList = document.getElementById('citationList');
    const exportBtn = document.getElementById('exportBtn');
    
    let isEnabled = true;
    let currentCitations = {};
    
    // Load initial state
    loadState();
    
    // Toggle switch event listener
    toggleSwitch.addEventListener('click', function() {
        isEnabled = !isEnabled;
        updateToggleSwitch();
        saveState();
        sendToggleMessage();
        updateStatus();
    });
    
    // Export button event listener
    exportBtn.addEventListener('click', function() {
        exportCitationLegend();
    });
    
    function loadState() {
        chrome.storage.local.get(['enabled'], function(result) {
            isEnabled = result.enabled !== false; // Default to true
            updateToggleSwitch();
            updateStatus();
            loadCitations();
        });
    }
    
    function updateToggleSwitch() {
        if (isEnabled) {
            toggleSwitch.classList.add('active');
        } else {
            toggleSwitch.classList.remove('active');
        }
    }
    
    function updateStatus() {
        if (isEnabled) {
            status.className = 'status active';
            statusText.textContent = 'Aktiv - Zitate werden erfasst';
        } else {
            status.className = 'status inactive';
            statusText.textContent = 'Inaktiv - Extension ist deaktiviert';
        }
    }
    
    function saveState() {
        chrome.storage.local.set({ enabled: isEnabled });
    }
    
    function sendToggleMessage() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0] && tabs[0].url.includes('notebooklm.google.com')) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'toggle',
                    enabled: isEnabled
                });
            }
        });
    }
    
    function loadCitations() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0] && tabs[0].url.includes('notebooklm.google.com')) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'getCitations'
                }, function(response) {
                    if (response && response.citations) {
                        currentCitations = response.citations;
                        updateCitationList();
                    } else {
                        showNoCitationsMessage();
                    }
                });
            } else {
                showNotOnNotebookLM();
            }
        });
    }
    
    function updateCitationList() {
        const citationNumbers = Object.keys(currentCitations).sort((a, b) => parseInt(a) - parseInt(b));
        
        if (citationNumbers.length === 0) {
            showNoCitationsMessage();
            return;
        }
        
        citationList.innerHTML = citationNumbers.map(num => {
            const citation = currentCitations[num];
            const displayName = citation.customName || 
                              citation.sourceInfo?.title || 
                              `Quelle ${num}`;
            
            return `
                <div class="citation-item">
                    <div class="citation-number">${num}</div>
                    <div class="citation-name">${displayName}</div>
                </div>
            `;
        }).join('');
        
        exportBtn.disabled = false;
    }
    
    function showNoCitationsMessage() {
        citationList.innerHTML = '<div class="empty-citations">Keine Zitate auf dieser Seite gefunden</div>';
        exportBtn.disabled = true;
    }
    
    function showNotOnNotebookLM() {
        citationList.innerHTML = '<div class="empty-citations">Bitte öffne eine NotebookLM-Seite</div>';
        exportBtn.disabled = true;
        status.className = 'status inactive';
        statusText.textContent = 'Nicht auf NotebookLM';
    }
    
    function exportCitationLegend() {
        const citationNumbers = Object.keys(currentCitations).sort((a, b) => parseInt(a) - parseInt(b));
        
        if (citationNumbers.length === 0) {
            return;
        }
        
        let legendText = 'NotebookLM Citation Legend\\n';
        legendText += '============================\\n\\n';
        
        citationNumbers.forEach(num => {
            const citation = currentCitations[num];
            const displayName = citation.customName || 
                              citation.sourceInfo?.title || 
                              `Quelle ${num}`;
            
            legendText += `[${num}] ${displayName}\\n`;
        });
        
        legendText += '\\n\\nGeneriert von NotebookLM Citation Legend Extension';
        
        // Copy to clipboard
        navigator.clipboard.writeText(legendText).then(function() {
            // Show success feedback
            const originalText = exportBtn.textContent;
            exportBtn.textContent = '✓ Kopiert!';
            exportBtn.style.background = '#34a853';
            
            setTimeout(function() {
                exportBtn.textContent = originalText;
                exportBtn.style.background = '#1a73e8';
            }, 2000);
        }).catch(function(err) {
            console.error('Fehler beim Kopieren: ', err);
            exportBtn.textContent = 'Fehler beim Kopieren';
            exportBtn.style.background = '#ea4335';
            
            setTimeout(function() {
                exportBtn.textContent = 'Zitatlegende als Text kopieren';
                exportBtn.style.background = '#1a73e8';
            }, 2000);
        });
    }
    
    // Auto-refresh citations every 5 seconds when popup is open
    setInterval(function() {
        if (isEnabled) {
            loadCitations();
        }
    }, 5000);
});