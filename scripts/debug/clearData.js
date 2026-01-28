/**
 * Quick data clearing script for development
 * Run with: node clearData.js
 */

const { execSync } = require('child_process');

console.log('🧹 Clearing AsyncStorage data...');

try {
  // For React Native web, we can clear localStorage
  console.log('Clearing browser localStorage...');
  
  // Create a simple HTML file to clear localStorage
  const clearScript = `
    <!DOCTYPE html>
    <html>
    <head><title>Clear Data</title></head>
    <body>
      <h1>Clearing App Data...</h1>
      <script>
        console.log('Keys before clear:', Object.keys(localStorage));
        localStorage.clear();
        sessionStorage.clear();
        console.log('Keys after clear:', Object.keys(localStorage));
        alert('Data cleared! Refresh the app.');
      </script>
    </body>
    </html>
  `;
  
  require('fs').writeFileSync('./web-build/clear-data.html', clearScript);
  console.log('✅ Created clear-data.html in web-build directory');
  console.log('📝 Open http://localhost:8081/clear-data.html to clear data');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}