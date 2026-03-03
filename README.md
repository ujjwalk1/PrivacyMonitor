#  Privacy Monitor Browser Extension

A lightweight Firefox extension that helps users monitor website security, analyze privacy risks, detect data breaches, and strengthen password security in real-time.

##  Features

### Current Features

####  **Password Security**
- **Real-time Password Strength Analysis**: Instant feedback as you type passwords
- **Smart Scoring System**: Comprehensive evaluation based on length, character diversity, and common patterns
- **Visual Feedback**: Color-coded strength indicators (Weak/Medium/Strong)
- **Improvement Suggestions**: Actionable tips to strengthen weak passwords
- **Pattern Detection**: Identifies and warns against common weak patterns like "123", "password", "qwerty"

####  **Security Headers Detection** *(New in v1.1)*
- **Header Interception**: Background script inspects HTTP response headers before the page finishes loading
- **Six Header Checks**: Evaluates CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy
- **Visual Header Pills**: Color-coded indicators (green = present, red = missing) in the popup
- **Header Score**: Missing headers are factored into the overall security score by importance level

####  **Data Breach Detection** *(New in v1.1)*
- **HaveIBeenPwned Integration**: Checks the current domain against a database of known data breaches
- **Breach Details**: Displays breach name, date, and number of affected accounts
- **Score Impact**: Breached domains receive a penalty in the overall security score

####  **Insecure Form Detection** *(New in v1.1)*
- **HTTP Form Scanning**: Detects forms that submit credentials over unencrypted HTTP
- **In-Page Warnings**: Injects a visible warning banner directly into insecure password forms on the page
- **Dynamic Monitoring**: Mutation observer watches for forms added after initial page load
- **Popup Summary**: Form security status surfaced in the extension popup

####  **Website Security Analysis**
- **HTTPS Detection**: Verifies secure connection protocols
- **Security Score**: Reworked overall security rating (0-100) now factors in headers, breaches, and form safety
- **Performance Optimized**: Throttled analysis to minimize browser impact
- **Real-time Monitoring**: Continuous security assessment as you browse

####  **Privacy Monitoring**
- **Cookie Tracking**: Counts and monitors HTTP cookies
- **Script Analysis**: Identifies total scripts and third-party scripts
- **Third-party Tracker Detection**: Highlights external scripts that may track you
- **Privacy Impact Assessment**: Evaluates overall privacy implications

####  **User Interface**
- **Redesigned Popup**: Score ring in the header, sectioned layout with clear visual hierarchy
- **Instant Updates**: Real-time refresh capability
- **Visual Status Indicators**: Color-coded security and privacy status
- **Responsive Design**: Works seamlessly across different screen sizes

##  Installation

### Firefox Installation
1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" → "Load Temporary Add-on"
4. Select the `manifest.json` file from the project directory
5. The extension icon will appear in your toolbar

### Manual Installation
```bash
git clone https://github.com/ujjwalk1/privacy-security-monitor.git
cd privacy-security-monitor
```

##  Project Structure

```
privacy-security-monitor/
├── manifest.json          # Extension configuration
├── background.js          # Header interception via webRequest API
├── content-script.js      # Password analysis and insecure form detection
├── popup.html             # Extension popup interface
├── popup.js               # Popup logic, breach check, and data processing
└── README.md              # This file
```

##  Technical Details

### Technologies Used
- **JavaScript ES6+**: Core functionality
- **HTML5 & CSS3**: User interface
- **WebExtensions API**: Browser integration
- **Firefox Browser API**: Storage, tab management, and webRequest interception
- **HaveIBeenPwned API v3**: Domain breach lookup

### Performance Features
- **Throttled Processing**: Limits analysis frequency to preserve performance
- **Efficient DOM Monitoring**: Smart mutation observer for dynamic content
- **Memory Optimization**: Reuses components and minimizes memory footprint
- **Debounced Updates**: Prevents excessive API calls
- **Background Header Capture**: Headers intercepted once at page load, not on every popup open

##  Upcoming Features

### **Advanced Security Analysis** *(Planned)*
- [ ] **Mixed Content Detection**: Identify HTTP resources on HTTPS pages
- [ ] **SSL Certificate Analysis**: Display cert details and expiration warnings
- [ ] **Vulnerable Library Scanner**: Detect outdated JavaScript libraries

### **Enhanced Privacy Features** *(Planned)*
- [ ] **Cookie Categorization**: Classify cookies by purpose (tracking, functional, etc.)
- [ ] **Local Storage Monitor**: Track localStorage and sessionStorage usage
- [ ] **Fingerprinting Detection**: Identify canvas fingerprinting and tracking attempts
- [ ] **Privacy Score History**: Track website privacy changes over time

### **Analytics & Reporting** *(Roadmap)*
- [ ] **Weekly Security Reports**: Comprehensive browsing security summary
- [ ] **Site Comparison Tools**: Compare security across similar websites
- [ ] **Export Functionality**: Data export for security auditing

### **User Experience** *(Future)*
- [ ] **Custom Security Rules**: User-defined security criteria
- [ ] **Whitelist/Blacklist Management**: Trusted and blocked site management
- [ ] **Notification System**: Real-time security alerts
- [ ] **Multi-browser Support**: Chrome and Edge compatibility

## Requirements

- **Firefox**: Version 60 or higher
- **Permissions**: The extension requires the following permissions
  - `activeTab`: Access current tab information
  - `storage`: Store security analysis data
  - `cookies`: Monitor cookie usage
  - `webRequest`: Intercept HTTP response headers

##  Known Issues

- Extension may not work on internal browser pages (`about:`, `moz-extension:`)
- Some dynamically loaded content may require manual refresh
- Third-party script detection limited to scripts loaded at analysis time
- Breach check requires an internet connection; shows an error state if the HaveIBeenPwned API is unreachable
- Security headers are only captured on full page loads — refreshing a tab after installing the extension ensures accurate header data

##  Version History

### v1.1.0 *(Current)*
- Security headers detection (CSP, HSTS, X-Frame-Options, and more)
- HaveIBeenPwned breach database integration
- Insecure form detection with in-page warning banners
- Reworked security score factoring in headers, breaches, and form safety
- Redesigned popup UI with score ring and sectioned layout
- Added background.js for webRequest-based header interception

### v1.0.0
- Initial release with password strength analysis
- Basic security scoring system
- Cookie and script monitoring
- Clean popup interface

##  License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

##  Support

- **Issues**: [GitHub Issues](https://github.com/ujjwalk1/privacy-security-monitor/issues)
- **Email**: kaulujjwal1@gmail.com

**🔒 Stay secure, stay private!**
