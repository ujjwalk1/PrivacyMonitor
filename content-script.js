// Optimized content script with performance improvements
let isInitialized = false;
let passwordInputs = new Set();
let indicator = null;

// Throttle function to limit how often functions run
function throttle(func, delay) {
  let timeoutId;
  let lastExecTime = 0;
  return function (...args) {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func.apply(this, args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
}

// Password strength checker (same as before)
function checkPasswordStrength(password) {
  let score = 0;
  let feedback = [];
  
  if (password.length >= 8) score += 2;
  else feedback.push("Use at least 8 characters");
  
  if (password.length >= 12) score += 1;
  
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push("Add lowercase letters");
  
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push("Add uppercase letters");
  
  if (/[0-9]/.test(password)) score += 1;
  else feedback.push("Add numbers");
  
  if (/[^A-Za-z0-9]/.test(password)) score += 2;
  else feedback.push("Add special characters");
  
  if (/(123|abc|password|qwerty)/i.test(password)) {
    score -= 2;
    feedback.push("Avoid common patterns");
  }
  
  let strength = "Very Weak";
  let color = "#ff4444";
  
  if (score >= 7) {
    strength = "Strong";
    color = "#44ff44";
  } else if (score >= 5) {
    strength = "Medium";  
    color = "#ffaa44";
  } else if (score >= 3) {
    strength = "Weak";
    color = "#ff8844";
  }
  
  return { strength, score, feedback, color };
}

// Create indicator only once
function getOrCreateIndicator() {
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'password-strength-indicator';
    indicator.style.cssText = `
      position: absolute;
      background: white;
      border: 2px solid #ddd;
      border-radius: 4px;
      padding: 8px;
      font-size: 12px;
      z-index: 10000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      max-width: 250px;
      display: none;
    `;
    document.body.appendChild(indicator);
  }
  return indicator;
}

// Position indicator (throttled)
const positionIndicator = throttle((indicator, input) => {
  const rect = input.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  
  indicator.style.top = (rect.bottom + scrollTop + 5) + 'px';
  indicator.style.left = (rect.left + scrollLeft) + 'px';
}, 100);

// Add event listeners to a password input
function addPasswordListeners(input) {
  if (passwordInputs.has(input)) return; // Already processed
  
  passwordInputs.add(input);
  const indicator = getOrCreateIndicator();
  
  input.addEventListener('focus', () => {
    indicator.style.display = 'block';
    positionIndicator(indicator, input);
  });
  
  input.addEventListener('blur', () => {
    setTimeout(() => {
      indicator.style.display = 'none';
    }, 200);
  });
  
  // Throttled input handler
  const handleInput = throttle((e) => {
    const password = e.target.value;
    if (password.length === 0) {
      indicator.style.display = 'none';
      return;
    }
    
    const result = checkPasswordStrength(password);
    
    indicator.innerHTML = `
      <div style="font-weight: bold; color: ${result.color};">
        Password Strength: ${result.strength}
      </div>
      <div style="margin-top: 4px;">
        ${result.feedback.length > 0 ? 
          '<strong>Suggestions:</strong><br>' + 
          result.feedback.slice(0, 3).map(f => '• ' + f).join('<br>') // Limit suggestions
          : '✓ Strong password!'}
      </div>
    `;
    
    indicator.style.display = 'block';
    positionIndicator(indicator, input);
  }, 300); // Only run every 300ms
  
  input.addEventListener('input', handleInput);
}

// Find and monitor password inputs (optimized)
function findPasswordInputs() {
  const newInputs = document.querySelectorAll('input[type="password"]');
  newInputs.forEach(addPasswordListeners);
}

// Analyze page security (run only once)
function analyzePageSecurity() {
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
  
  // Store data (try both Firefox and Chrome APIs)
  try {
    if (typeof browser !== 'undefined' && browser.storage) {
      browser.storage.local.set({ 
        [`security_data_${window.location.hostname}`]: data 
      });
    } else if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ 
        [`security_data_${window.location.hostname}`]: data 
      });
    }
  } catch (e) {
    console.log('Storage error:', e);
  }
}

// Optimized mutation observer
const debouncedFindInputs = throttle(findPasswordInputs, 1000); // Only run once per second

function setupMutationObserver() {
  const observer = new MutationObserver((mutations) => {
    let shouldCheck = false;
    
    for (let mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        for (let node of mutation.addedNodes) {
          if (node.nodeType === 1) { // Element node
            if (node.tagName === 'INPUT' || node.querySelector && node.querySelector('input[type="password"]')) {
              shouldCheck = true;
              break;
            }
          }
        }
      }
      if (shouldCheck) break;
    }
    
    if (shouldCheck) {
      debouncedFindInputs();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Initialize only once
function initialize() {
  if (isInitialized) return;
  isInitialized = true;
  
  // Find existing password inputs
  findPasswordInputs();
  
  // Analyze page security once
  analyzePageSecurity();
  
  // Set up mutation observer for dynamic content
  setupMutationObserver();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}