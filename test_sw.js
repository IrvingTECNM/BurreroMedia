const { execSync } = require('child_process');
const html = execSync('curl -s -L -H "User-Agent: Mozilla/5.0" "https://streamwish.to/e/ehg2ep6t0v8k"', { encoding: 'utf-8' });
const match = html.match(/sources:\s*\[\s*\{\s*file:\s*["']([^"']+)["']/i);
console.log(match ? match[1] : 'Not found');
// Save for manual inspection just in case
require('fs').writeFileSync('test_streamwish.html', html);
