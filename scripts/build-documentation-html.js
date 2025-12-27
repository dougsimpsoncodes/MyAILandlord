#!/usr/bin/env node
/**
 * Build Documentation HTML
 *
 * Generates an interactive HTML documentation file from screenshots and metadata
 */

const fs = require('fs').promises;
const path = require('path');

const METADATA_DIR = path.join(__dirname, '../docs/metadata');
const SCREENSHOTS_DIR = path.join(__dirname, '../docs/screenshots');
const OUTPUT_FILE = path.join(__dirname, '../docs/COMPLETE_APP_DOCUMENTATION.html');

/**
 * Load all metadata files
 */
async function loadMetadata() {
  const files = await fs.readdir(METADATA_DIR);
  const metadataFiles = files.filter(f => f.endsWith('.json') && f !== '_master.json');

  const metadata = [];
  for (const file of metadataFiles) {
    const content = await fs.readFile(path.join(METADATA_DIR, file), 'utf-8');
    metadata.push(JSON.parse(content));
  }

  // Sort by flow and step
  metadata.sort((a, b) => {
    if (a.flow !== b.flow) return a.flow.localeCompare(b.flow);
    return (a.step || 0) - (b.step || 0);
  });

  return metadata;
}

/**
 * Group screens by flow
 */
function groupByFlow(metadata) {
  const flows = {};

  for (const screen of metadata) {
    const flowName = screen.flow || 'Other';
    if (!flows[flowName]) {
      flows[flowName] = [];
    }
    flows[flowName].push(screen);
  }

  return flows;
}

/**
 * Generate HTML for sidebar navigation
 */
function generateSidebar(flows) {
  let html = '<nav class="sidebar">\n';
  html += '  <div class="sidebar-header">\n';
  html += '    <h1>🏠 MyAI Landlord</h1>\n';
  html += '    <p class="subtitle">App Documentation</p>\n';
  html += '  </div>\n';
  html += '  <div class="sidebar-nav">\n';

  for (const [flowName, screens] of Object.entries(flows)) {
    html += `    <div class="nav-section">\n`;
    html += `      <h3 class="nav-section-title">${flowName}</h3>\n`;
    html += `      <ul class="nav-list">\n`;

    for (const screen of screens) {
      html += `        <li><a href="#${screen.screenName}" class="nav-link">${formatScreenName(screen.screenName)}</a></li>\n`;
    }

    html += `      </ul>\n`;
    html += `    </div>\n`;
  }

  html += '  </div>\n';
  html += '</nav>\n';

  return html;
}

/**
 * Format screen name for display
 */
function formatScreenName(screenName) {
  return screenName
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate HTML for a single screen section
 */
function generateScreenSection(screen) {
  let html = `<section id="${screen.screenName}" class="screen-section">\n`;

  // Header
  html += `  <div class="screen-header">\n`;
  html += `    <h2>${formatScreenName(screen.screenName)}</h2>\n`;
  if (screen.purpose) {
    html += `    <p class="purpose">${screen.purpose}</p>\n`;
  }
  html += `  </div>\n`;

  // Screenshot
  html += `  <div class="screenshot-container">\n`;
  html += `    <img src="screenshots/${screen.screenName}.png" alt="${screen.purpose || screen.screenName}" class="screenshot" onclick="zoomImage(this)" />\n`;
  html += `    <button class="zoom-btn" onclick="zoomImage(this.previousElementSibling)">🔍 Zoom</button>\n`;
  html += `  </div>\n`;

  // Metadata
  html += `  <div class="metadata-grid">\n`;

  // Flow info
  html += `    <div class="metadata-card">\n`;
  html += `      <h3>Flow Information</h3>\n`;
  html += `      <dl>\n`;
  if (screen.flow) html += `        <dt>Flow:</dt><dd>${screen.flow}</dd>\n`;
  if (screen.role) html += `        <dt>Role:</dt><dd><span class="badge role-${screen.role}">${screen.role}</span></dd>\n`;
  if (screen.step) html += `        <dt>Step:</dt><dd>${screen.step}</dd>\n`;
  html += `      </dl>\n`;
  html += `    </div>\n`;

  // Navigation
  html += `    <div class="metadata-card">\n`;
  html += `      <h3>Technical Details</h3>\n`;
  html += `      <dl>\n`;
  html += `        <dt>Screen ID:</dt><dd><code>${screen.screenName}</code></dd>\n`;
  html += `        <dt>URL:</dt><dd><code>${screen.url || 'N/A'}</code></dd>\n`;
  html += `        <dt>Captured:</dt><dd>${new Date(screen.timestamp).toLocaleString()}</dd>\n`;
  html += `      </dl>\n`;
  html += `    </div>\n`;

  html += `  </div>\n`; // end metadata-grid
  html += `</section>\n`;

  return html;
}

/**
 * Generate complete HTML document
 */
async function generateHTML(metadata) {
  const flows = groupByFlow(metadata);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MyAI Landlord - App Documentation</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :root {
      --primary: #007AFF;
      --primary-dark: #0056B3;
      --bg-primary: #FFFFFF;
      --bg-secondary: #F8F9FA;
      --bg-tertiary: #F0F2F5;
      --text-primary: #2C3E50;
      --text-secondary: #7F8C8D;
      --text-tertiary: #95A5A6;
      --border: #E5E7EB;
      --success: #10B981;
      --sidebar-width: 280px;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: var(--text-primary);
      background: var(--bg-secondary);
    }

    .container {
      display: flex;
      min-height: 100vh;
    }

    /* Sidebar */
    .sidebar {
      width: var(--sidebar-width);
      background: var(--bg-primary);
      border-right: 1px solid var(--border);
      position: fixed;
      height: 100vh;
      overflow-y: auto;
      padding: 24px;
    }

    .sidebar-header {
      margin-bottom: 32px;
      padding-bottom: 16px;
      border-bottom: 2px solid var(--primary);
    }

    .sidebar-header h1 {
      font-size: 24px;
      color: var(--primary);
      margin-bottom: 4px;
    }

    .subtitle {
      font-size: 14px;
      color: var(--text-secondary);
    }

    .nav-section {
      margin-bottom: 24px;
    }

    .nav-section-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .nav-list {
      list-style: none;
    }

    .nav-link {
      display: block;
      padding: 8px 12px;
      color: var(--text-primary);
      text-decoration: none;
      border-radius: 6px;
      font-size: 14px;
      transition: all 0.2s;
    }

    .nav-link:hover {
      background: var(--bg-secondary);
      color: var(--primary);
    }

    /* Main content */
    .content {
      margin-left: var(--sidebar-width);
      flex: 1;
      padding: 48px;
      max-width: 1200px;
    }

    .screen-section {
      background: var(--bg-primary);
      border-radius: 12px;
      padding: 32px;
      margin-bottom: 32px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .screen-header {
      margin-bottom: 24px;
    }

    .screen-header h2 {
      font-size: 28px;
      color: var(--text-primary);
      margin-bottom: 8px;
    }

    .purpose {
      font-size: 16px;
      color: var(--text-secondary);
      font-style: italic;
    }

    .screenshot-container {
      margin: 24px 0;
      position: relative;
    }

    .screenshot {
      width: 100%;
      max-width: 100%;
      border-radius: 8px;
      border: 1px solid var(--border);
      cursor: pointer;
      transition: transform 0.2s;
    }

    .screenshot:hover {
      transform: scale(1.01);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .zoom-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid var(--border);
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }

    .zoom-btn:hover {
      background: white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .metadata-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
      margin-top: 24px;
    }

    .metadata-card {
      background: var(--bg-secondary);
      padding: 20px;
      border-radius: 8px;
      border: 1px solid var(--border);
    }

    .metadata-card h3 {
      font-size: 16px;
      margin-bottom: 12px;
      color: var(--text-primary);
    }

    .metadata-card dl {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 8px;
    }

    .metadata-card dt {
      font-weight: 600;
      color: var(--text-secondary);
      font-size: 14px;
    }

    .metadata-card dd {
      color: var(--text-primary);
      font-size: 14px;
    }

    code {
      background: var(--bg-tertiary);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: "SF Mono", Monaco, "Courier New", monospace;
      font-size: 13px;
    }

    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .role-landlord {
      background: #DBEAFE;
      color: #1E40AF;
    }

    .role-tenant {
      background: #D1FAE5;
      color: #065F46;
    }

    .role-both {
      background: #FEF3C7;
      color: #92400E;
    }

    /* Modal for zoomed images */
    .modal {
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      align-items: center;
      justify-content: center;
    }

    .modal.active {
      display: flex;
    }

    .modal-content {
      max-width: 90%;
      max-height: 90%;
      border-radius: 8px;
    }

    .modal-close {
      position: absolute;
      top: 20px;
      right: 40px;
      color: white;
      font-size: 40px;
      font-weight: bold;
      cursor: pointer;
    }

    @media (max-width: 768px) {
      .sidebar {
        position: static;
        width: 100%;
        height: auto;
        border-right: none;
        border-bottom: 1px solid var(--border);
      }

      .content {
        margin-left: 0;
        padding: 24px 16px;
      }

      .metadata-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    ${generateSidebar(flows)}

    <main class="content">
      <h1 style="margin-bottom: 12px; font-size: 36px;">MyAI Landlord Documentation</h1>
      <p style="color: var(--text-secondary); margin-bottom: 48px; font-size: 18px;">
        Complete visual reference of all app screens and user flows
      </p>

      ${metadata.map(screen => generateScreenSection(screen)).join('\n')}

      <div style="margin-top: 48px; padding: 24px; background: var(--bg-secondary); border-radius: 8px; text-align: center;">
        <p style="color: var(--text-secondary);">
          Generated on ${new Date().toLocaleDateString()} • ${metadata.length} screens documented
        </p>
      </div>
    </main>
  </div>

  <!-- Image zoom modal -->
  <div id="imageModal" class="modal" onclick="closeModal()">
    <span class="modal-close">&times;</span>
    <img class="modal-content" id="modalImage" />
  </div>

  <script>
    // Smooth scrolling for navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Highlight active link
        document.querySelectorAll('.nav-link').forEach(l => l.style.fontWeight = 'normal');
        this.style.fontWeight = '600';
      });
    });

    // Image zoom functionality
    function zoomImage(img) {
      const modal = document.getElementById('imageModal');
      const modalImg = document.getElementById('modalImage');
      modal.classList.add('active');
      modalImg.src = img.src;
    }

    function closeModal() {
      document.getElementById('imageModal').classList.remove('active');
    }

    // Highlight current section in navigation
    window.addEventListener('scroll', function() {
      const sections = document.querySelectorAll('.screen-section');
      let current = '';

      sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (window.pageYOffset >= sectionTop - 100) {
          current = section.getAttribute('id');
        }
      });

      document.querySelectorAll('.nav-link').forEach(link => {
        link.style.fontWeight = 'normal';
        if (link.getAttribute('href') === '#' + current) {
          link.style.fontWeight = '600';
        }
      });
    });
  </script>
</body>
</html>`;

  return html;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔨 Building HTML Documentation...\n');

  try {
    // Load metadata
    console.log('📂 Loading metadata...');
    const metadata = await loadMetadata();
    console.log(`   Found ${metadata.length} screens\n`);

    // Generate HTML
    console.log('📝 Generating HTML...');
    const html = await generateHTML(metadata);

    // Write to file
    console.log('💾 Writing to file...');
    await fs.writeFile(OUTPUT_FILE, html, 'utf-8');

    console.log(`\n✅ Documentation generated successfully!\n`);
    console.log(`📁 Output: ${OUTPUT_FILE}`);
    console.log(`📊 Screens: ${metadata.length}`);
    console.log(`\n💡 To view: open ${OUTPUT_FILE}\n`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateHTML, loadMetadata };
