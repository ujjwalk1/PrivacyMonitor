// Background script: intercepts HTTP response headers for security analysis

const SECURITY_HEADERS = {
  'content-security-policy':    { name: 'CSP',                   importance: 'high'   },
  'strict-transport-security':  { name: 'HSTS',                  importance: 'high'   },
  'x-frame-options':            { name: 'X-Frame-Options',       importance: 'high'   },
  'x-content-type-options':     { name: 'X-Content-Type-Options',importance: 'medium' },
  'referrer-policy':            { name: 'Referrer-Policy',       importance: 'medium' },
  'permissions-policy':         { name: 'Permissions-Policy',    importance: 'low'    },
};

const api = typeof browser !== 'undefined' ? browser : chrome;

api.webRequest.onHeadersReceived.addListener(
  (details) => {
    // Only analyze main page loads, not sub-resources
    if (details.type !== 'main_frame') return;

    try {
      const hostname = new URL(details.url).hostname;
      const present = {};
      const missing = [];

      for (const [headerKey, info] of Object.entries(SECURITY_HEADERS)) {
        const found = details.responseHeaders.find(
          h => h.name.toLowerCase() === headerKey
        );
        if (found) {
          present[info.name] = found.value;
        } else {
          missing.push(info.name);
        }
      }

      // Compute a header sub-score (0–100)
      let headerScore = 100;
      for (const missing_name of missing) {
        const entry = Object.values(SECURITY_HEADERS).find(v => v.name === missing_name);
        if (!entry) continue;
        if (entry.importance === 'high')   headerScore -= 10;
        if (entry.importance === 'medium') headerScore -= 5;
        if (entry.importance === 'low')    headerScore -= 2;
      }

      api.storage.local.set({
        [`headers_${hostname}`]: {
          present,
          missing,
          headerScore: Math.max(0, headerScore),
          timestamp: Date.now(),
        },
      });
    } catch (e) {
      console.error('[Privacy Monitor] Header analysis error:', e);
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);
