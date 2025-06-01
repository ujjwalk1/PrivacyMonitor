// Calculate security score based on various factors
function calculateSecurityScore(data) {
  let score = 0;
  let maxScore = 100;
  
  // HTTPS bonus
  if (data.httpsOnly) {
    score += 40;
  }
  
  // Cookie penalty (more cookies = lower score)
  const cookiePenalty = Math.min(data.cookies * 2, 20);
  score += (20 - cookiePenalty);
  
  // Third-party script penalty
  const scriptPenalty = Math.min(data.thirdPartyScripts * 3, 30);
  score += (30 - scriptPenalty);
  
  // Base security score
  score += 10;
  
  return Math.max(0, Math.min(score, maxScore));
}

function getScoreStatus(score) {
  if (score >= 80) return { class: 'status-good', text: 'Excellent' };
  if (score >= 60) return { class: 'status-warning', text: 'Good' };
  if (score >= 40) return { class: 'status-warning', text: 'Fair' };
  return { class: 'status-danger', text: 'Poor' };
}

async function loadSecurityData() {
  try {
    // Get current tab
    const [tab] = await (browser.tabs || chrome.tabs).query({ active: true, currentWindow: true });
    const hostname = new URL(tab.url).hostname;
    
    // Get stored security data (try both APIs)
    let result;
    if (typeof browser !== 'undefined' && browser.storage) {
      result = await browser.storage.local.get(`security_data_${hostname}`);
    } else {
      result = await chrome.storage.local.get(`security_data_${hostname}`);
    }
    
    const data = result[`security_data_${hostname}`];
    
    if (!data) {
      document.getElementById('loading').innerHTML = 'No data available for this page';
      return;
    }
    
    // Hide loading, show content
    document.getElementById('loading').style.display = 'none';
    document.getElementById('content').style.display = 'block';
    
    // Update UI elements
    document.getElementById('protocol').textContent = data.protocol.toUpperCase();
    
    const httpsStatus = document.getElementById('https-status');
    if (data.httpsOnly) {
      httpsStatus.textContent = '✓ Secure';
      httpsStatus.className = 'metric-value status-good';
    } else {
      httpsStatus.textContent = '⚠ Not Secure';
      httpsStatus.className = 'metric-value status-danger';
    }
    
    document.getElementById('cookie-count').textContent = data.cookies;
    document.getElementById('script-count').textContent = data.scripts;
    
    const thirdPartyElement = document.getElementById('third-party-scripts');
    thirdPartyElement.textContent = data.thirdPartyScripts;
    if (data.thirdPartyScripts > 5) {
      thirdPartyElement.className = 'metric-value status-warning';
    } else if (data.thirdPartyScripts > 10) {
      thirdPartyElement.className = 'metric-value status-danger';
    }
    
    // Calculate and display security score
    const score = calculateSecurityScore(data);
    const status = getScoreStatus(score);
    
    const scoreElement = document.getElementById('security-score');
    scoreElement.textContent = `${score}/100`;
    scoreElement.className = `metric-value ${status.class}`;
    
    document.getElementById('security-summary').textContent = status.text;
    
  } catch (error) {
    console.error('Error loading security data:', error);
    document.getElementById('loading').innerHTML = 'Error loading data';
  }
}

// Refresh data by reloading the current tab's content script
async function refreshData() {
  try {
    const [tab] = await (browser.tabs || chrome.tabs).query({ active: true, currentWindow: true });
    
    // Execute content script to refresh data
    const scriptingAPI = browser.scripting || chrome.scripting;
    await scriptingAPI.executeScript({
      target: { tabId: tab.id },
      function: () => {
        // Re-analyze page security
        const data = {
          url: window.location.href,
          protocol: window.location.protocol,
          cookies: document.cookie ? document.cookie.split(';').length : 0,
          scripts: document.querySelectorAll('script').length,
          thirdPartyScripts: 0,
          httpsOnly: window.location.protocol === 'https:',
          timestamp: Date.now()
        };
        
        // Count third-party scripts
        document.querySelectorAll('script[src]').forEach(script => {
          try {
            const scriptUrl = new URL(script.src, window.location.href);
            if (scriptUrl.hostname !== window.location.hostname) {
              data.thirdPartyScripts++;
            }
          } catch (e) {
            // Ignore invalid URLs
          }
        });
        
        // Store updated data (try both APIs)
        if (typeof browser !== 'undefined' && browser.storage) {
          browser.storage.local.set({ 
            [`security_data_${window.location.hostname}`]: data 
          });
        } else if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.set({ 
            [`security_data_${window.location.hostname}`]: data 
          });
        }
      }
    });
    
    // Wait a moment then reload the popup data
    setTimeout(loadSecurityData, 500);
    
  } catch (error) {
    console.error('Error refreshing data:', error);
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  loadSecurityData();
  
  document.getElementById('refresh').addEventListener('click', refreshData);
});